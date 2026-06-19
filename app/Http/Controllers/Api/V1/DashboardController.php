<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BaleCube;
use App\Models\Contract;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use App\Models\Pickup;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function summary(): JsonResponse
    {
        $recycledKg = (float) BaleCube::where('quality_score', '!=', 'reject')->sum('weight');
        $acceptedKg = (float) InboundRecord::sum('accepted_weight');
        $invoiceTotal = (float) Invoice::sum('total_amount');

        return response()->json([
            'message' => 'Dashboard summary retrieved.',
            'data' => [
                'users' => User::count(),
                'pending_applications' => Application::where('status', 'pending')->count(),
                'active_contracts' => Contract::where('status', 'active')->count(),
                'scheduled_pickups' => Pickup::where('status', 'scheduled')->count(),
                'completed_pickups' => Pickup::where('status', 'completed')->count(),
                'deliveries_in_progress' => OutboundDelivery::whereIn('status', ['scheduled', 'shipped', 'delivered'])->count(),
                'pending_invoices' => Invoice::where('status', 'pending')->count(),
                'overdue_invoices' => Invoice::where('status', 'overdue')->count(),
                'available_trucks' => Truck::where('status', 'available')->count(),
                'low_stock_items' => HubCommodity::where('current_inventory_total', '<', 500)->count(),
                'recycled_kg' => round($recycledKg ?: $acceptedKg, 2),
                'co2_saved_kg' => round(($recycledKg ?: $acceptedKg) * 1.7, 2),
                'trees_equivalent' => round((($recycledKg ?: $acceptedKg) * 1.7) / 21.77, 1),
                'invoice_total' => round($invoiceTotal, 2),
            ],
        ]);
    }

    public function impact(): JsonResponse
    {
        $materials = BaleCube::query()
            ->selectRaw('commodity_id, SUM(weight) as total_kg')
            ->with('commodity')
            ->groupBy('commodity_id')
            ->get()
            ->map(fn ($row) => [
                'material' => $row->commodity?->title ?? 'Unknown',
                'total_kg' => (float) $row->total_kg,
                'co2_saved_kg' => round(((float) $row->total_kg) * 1.7, 2),
            ]);

        return response()->json([
            'message' => 'Environmental impact retrieved.',
            'data' => $materials,
        ]);
    }
}
