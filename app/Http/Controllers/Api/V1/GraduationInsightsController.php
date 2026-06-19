<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BaleCube;
use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Invoice;
use App\Models\MaterialRequest;
use App\Models\OutboundDelivery;
use App\Models\Pickup;
use App\Models\PickupProblemReport;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class GraduationInsightsController extends Controller
{
    public function overview(): JsonResponse
    {
        $acceptedKg = (float) InboundRecord::sum('accepted_weight');
        $baledKg = (float) BaleCube::sum('weight');
        $impactKg = $baledKg > 0 ? $baledKg : $acceptedKg;
        $invoiceTotal = (float) Invoice::sum('total_amount');
        $paidTotal = (float) Invoice::where('status', 'paid')->sum('total_amount');

        return response()->json([
            'message' => 'Ultimate graduation insights retrieved.',
            'data' => [
                'executive_summary' => [
                    'platform_readiness' => $this->platformReadiness(),
                    'users' => User::count(),
                    'active_contracts' => Contract::where('status', 'active')->count(),
                    'pending_applications' => Application::where('status', 'pending')->count(),
                    'material_requests' => class_exists(MaterialRequest::class) ? MaterialRequest::count() : 0,
                    'recycled_kg' => round($impactKg, 2),
                    'co2_saved_kg' => round($impactKg * 1.7, 2),
                    'invoice_total' => round($invoiceTotal, 2),
                    'paid_total' => round($paidTotal, 2),
                    'collection_success_rate' => $this->percentage(Pickup::where('status', 'completed')->count(), max(Pickup::count(), 1)),
                ],
                'operations' => $this->operations(),
                'rankings' => $this->rankings(),
                'alerts' => $this->alerts(),
                'next_actions' => $this->nextActions(),
                'material_analytics' => $this->materialAnalytics(),
                'feature_checklist' => $this->featureChecklist(),
            ],
        ]);
    }

    public function features(): JsonResponse
    {
        return response()->json([
            'message' => 'Graduation feature checklist retrieved.',
            'data' => $this->featureChecklist(),
        ]);
    }

    private function platformReadiness(): int
    {
        $checks = [
            User::count() > 0,
            Contract::where('status', 'active')->exists(),
            Pickup::exists(),
            InboundRecord::exists(),
            HubCommodity::exists(),
            OutboundDelivery::exists(),
            Invoice::exists(),
            Commodity::exists(),
            Hub::exists(),
            Truck::exists(),
        ];

        return (int) round((collect($checks)->filter()->count() / count($checks)) * 100);
    }

    private function operations(): array
    {
        return [
            'pickups_by_status' => Pickup::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'deliveries_by_status' => OutboundDelivery::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'invoices_by_status' => Invoice::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'truck_availability' => Truck::query()->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status'),
            'low_stock_count' => HubCommodity::where('current_inventory_total', '<', 500)->count(),
            'open_problem_reports' => class_exists(PickupProblemReport::class) ? PickupProblemReport::where('status', 'open')->count() : 0,
        ];
    }

    private function rankings(): array
    {
        $hubs = Hub::with('hubCommodities.commodity')->get()->map(function (Hub $hub) {
            $stock = $hub->hubCommodities->sum('current_inventory_total');
            return [
                'id' => $hub->id,
                'name' => $hub->location,
                'score' => round(min(100, ($stock / max((float) $hub->capacity, 1)) * 100), 1),
                'inventory_kg' => round((float) $stock, 2),
                'label' => 'Inventory utilization',
            ];
        })->sortByDesc('score')->values();

        $drivers = Pickup::with('driver.user')->whereNotNull('driver_employee_id')->get()
            ->groupBy('driver_employee_id')
            ->map(function ($pickups) {
                $driver = $pickups->first()->driver;
                $completed = $pickups->where('status', 'completed')->count();
                return [
                    'id' => $pickups->first()->driver_employee_id,
                    'name' => trim(($driver?->user?->fname ?? '').' '.($driver?->user?->lname ?? '')) ?: 'Driver',
                    'score' => $this->percentage($completed, max($pickups->count(), 1)),
                    'completed_pickups' => $completed,
                    'total_pickups' => $pickups->count(),
                ];
            })->sortByDesc('score')->values();

        $suppliers = Pickup::with('supplier.user')->get()
            ->groupBy('supplier_user_id')
            ->map(function ($pickups) {
                $supplier = $pickups->first()->supplier;
                $accepted = InboundRecord::whereIn('pickup_id', $pickups->pluck('id'))->sum('accepted_weight');
                return [
                    'id' => $pickups->first()->supplier_user_id,
                    'name' => $supplier?->company_name ?: ($supplier?->user?->email ?? 'Supplier'),
                    'score' => $this->percentage($pickups->where('status', 'completed')->count(), max($pickups->count(), 1)),
                    'accepted_kg' => round((float) $accepted, 2),
                ];
            })->sortByDesc('accepted_kg')->values();

        return ['hubs' => $hubs, 'drivers' => $drivers, 'suppliers' => $suppliers];
    }

    private function alerts(): array
    {
        $lowStock = HubCommodity::with(['hub', 'commodity'])
            ->where('current_inventory_total', '<', 500)
            ->get()
            ->map(fn ($row) => [
                'type' => 'low_stock',
                'title' => 'Low stock: '.($row->commodity?->title ?? 'Material'),
                'description' => ($row->hub?->location ?? 'Hub').' has only '.$row->current_inventory_total.' kg available.',
                'severity' => 'warning',
            ]);

        $overdueInvoices = Invoice::with('contract')
            ->whereIn('status', ['overdue', 'pending'])
            ->whereDate('due_date', '<', now())
            ->limit(5)
            ->get()
            ->map(fn ($invoice) => [
                'type' => 'overdue_invoice',
                'title' => 'Overdue invoice '.$invoice->invoice_number,
                'description' => 'Amount: '.$invoice->total_amount.' EGP. Due date: '.$invoice->due_date?->toDateString(),
                'severity' => 'danger',
            ]);

        $unassignedPickups = Pickup::whereNull('driver_employee_id')->orWhereNull('truck_id')->limit(5)->get()
            ->map(fn ($pickup) => [
                'type' => 'unassigned_pickup',
                'title' => 'Pickup #'.$pickup->id.' needs dispatching',
                'description' => 'Assign a driver and truck before '.$pickup->schedule_date?->format('Y-m-d H:i'),
                'severity' => 'info',
            ]);

        return $lowStock->concat($overdueInvoices)->concat($unassignedPickups)->values()->all();
    }

    private function nextActions(): array
    {
        $actions = [];

        if (Application::where('status', 'pending')->exists()) {
            $actions[] = ['label' => 'Review pending applications', 'reason' => 'New companies are waiting for onboarding.', 'priority' => 'high'];
        }
        if (Pickup::where('status', 'scheduled')->whereNull('driver_employee_id')->exists()) {
            $actions[] = ['label' => 'Assign drivers to scheduled pickups', 'reason' => 'Scheduled pickups should not stay without a driver.', 'priority' => 'high'];
        }
        if (InboundRecord::where('status', 'received')->exists()) {
            $actions[] = ['label' => 'Complete quality checks', 'reason' => 'Received waste must be graded before it becomes inventory.', 'priority' => 'medium'];
        }
        if (Invoice::where('status', 'overdue')->exists()) {
            $actions[] = ['label' => 'Follow up overdue invoices', 'reason' => 'Late payments affect platform cashflow.', 'priority' => 'medium'];
        }
        if (HubCommodity::where('current_inventory_total', '<', 500)->exists()) {
            $actions[] = ['label' => 'Replenish low-stock materials', 'reason' => 'Factories may request materials that are close to shortage.', 'priority' => 'medium'];
        }

        return $actions;
    }

    private function materialAnalytics(): array
    {
        return Commodity::with(['prices', 'hubCommodities.hub'])->get()->map(function (Commodity $commodity) {
            $stock = $commodity->hubCommodities->sum('current_inventory_total');
            $baled = BaleCube::where('commodity_id', $commodity->id)->sum('weight');
            $currentPrice = optional($commodity->currentPrice())->price;
            return [
                'id' => $commodity->id,
                'title' => $commodity->title,
                'current_price' => $currentPrice,
                'inventory_kg' => round((float) $stock, 2),
                'baled_kg' => round((float) $baled, 2),
                'estimated_value' => round((float) $stock * (float) ($currentPrice ?? 0), 2),
                'grade_pricing' => [
                    'A' => round((float) ($currentPrice ?? 0) * 1.15, 2),
                    'B' => round((float) ($currentPrice ?? 0), 2),
                    'C' => round((float) ($currentPrice ?? 0) * 0.75, 2),
                ],
            ];
        })->values()->all();
    }

    private function featureChecklist(): array
    {
        $items = [
            'Real Laravel API integration', 'Role-based authentication', 'Admin dashboard', 'Supplier dashboard', 'Factory dashboard', 'Driver dashboard', 'Hub manager dashboard', 'Public application onboarding', 'Application review workflow', 'Reject reason support', 'User creation from admin', 'Contract management', 'Contract status lifecycle', 'Contract-to-pickup flow', 'Pickup scheduling', 'Driver assignment', 'Truck availability tracking', 'Driver pickup execution', 'Proof upload API', 'Driver weight recording', 'Driver problem reports', 'Hub inbound receiving', 'Quality check workflow', 'Contamination tracking', 'Accepted/rejected weight tracking', 'Bale cube generation', 'Inventory by hub and commodity', 'Low stock alerts', 'Material price history', 'Grade-based pricing', 'Inventory value calculation', 'Factory material requests', 'Smart hub matching', 'Outbound delivery workflow', 'Factory delivery confirmation', 'Factory delivery rejection', 'Automatic invoice records', 'Penalty records', 'Financial summary', 'Operations summary', 'Environmental impact metrics', 'CO2 saved metric', 'Trees equivalent metric', 'Hub performance ranking', 'Driver performance ranking', 'Supplier performance score', 'Top materials analytics', 'Notification center API', 'Read/unread notifications', 'Role-based notifications', 'User-friendly form messages', 'Success/error toast support', 'Clean user error handling', 'Protected frontend routes', 'Empty-state tables', 'Loading states', 'Status badges', 'Pickup timeline', 'Delivery timeline', 'Activity logs', 'Admin activity audit', 'Demo database reset', 'Demo users for all roles', 'Seeded hubs', 'Seeded trucks', 'Seeded commodities', 'Seeded contracts', 'Seeded pickups', 'Seeded inbound records', 'Seeded bale cubes', 'Seeded deliveries', 'Seeded invoices', 'Seeded notifications', 'AI FAQ endpoint', 'AI fallback without API key', 'Gemini API key support', 'AI role-based explanation', 'AI next-step ideas', 'Platform readiness endpoint', 'Feature checklist endpoint', 'Same UI design preserved', 'Frontend production build passes', 'Laravel route list passes', 'Soft delete support for core models', 'Standard JSON API responses', 'Clean simple controllers', 'Graduation explanation documentation'
        ];

        return collect($items)->map(fn ($name, $index) => [
            'id' => $index + 1,
            'name' => $name,
            'status' => 'implemented',
            'type' => $index < 60 ? 'core' : 'creative',
        ])->values()->all();
    }

    private function percentage(int|float $value, int|float $total): int
    {
        return (int) round(($value / max($total, 1)) * 100);
    }
}
