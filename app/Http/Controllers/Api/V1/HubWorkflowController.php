<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use App\Models\Pickup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class HubWorkflowController extends Controller
{
    public function receivingQueue(Request $request): JsonResponse
    {
        $employee = $request->user()->employee;
        if (! $employee || ! $employee->managedHub) {
            return response()->json(['message' => 'Your account is not assigned to a hub.'], 403);
        }

        $hubId = $employee->managedHub->id;
        $perPage = min(max((int) $request->integer('per_page', 100), 10), 200);

        // Show pickups completed to this hub (original or driver-selected)
        $completedPickups = Pickup::with(['contract.commodity', 'supplier.user', 'supplierLocation', 'driver.user', 'truck', 'hub', 'deliveredToHub'])
            ->where(function ($query) use ($hubId) {
                $query->where(function ($q) use ($hubId) {
                    $q->where('delivered_to_hub_id', $hubId);
                })->orWhere(function ($q) use ($hubId) {
                    $q->where('hub_id', $hubId)->whereNull('delivered_to_hub_id');
                });
            })
            ->where('status', 'completed')
            ->whereDoesntHave('inboundRecord')
            ->latest('updated_at')
            ->limit($perPage)
            ->get();

        $inboundRecords = InboundRecord::with(['pickup.contract.commodity', 'pickup.supplier.user', 'pickup.supplierLocation', 'pickup.driver.user', 'baleCubes.commodity', 'inspectedBy'])
            ->where('hub_id', $hubId)
            ->latest()
            ->limit($perPage)
            ->get();

        $inventory = HubCommodity::with(['commodity'])
            ->where('hub_id', $hubId)
            ->orderByDesc('current_inventory_total')
            ->limit($perPage)
            ->get();

        $factoryRequests = collect();
        if (Schema::hasTable('material_requests')) {
            $factoryRequests = DB::table('material_requests')
                ->join('commodities', 'commodities.id', '=', 'material_requests.commodity_id')
                ->leftJoin('users', 'users.id', '=', 'material_requests.factory_user_id')
                ->select(
                    'material_requests.*',
                    'commodities.title as material',
                    DB::raw("CONCAT(users.fname, ' ', users.lname) as factory_name")
                )
                ->where(function ($query) use ($hubId) {
                    $query->where('material_requests.matched_hub_id', $hubId)
                        ->orWhereNull('material_requests.matched_hub_id');
                })
                ->latest('material_requests.updated_at')
                ->limit($perPage)
                ->get();
        }

        $outboundDeliveries = OutboundDelivery::with(['commodity', 'contract.party.user', 'invoice'])
            ->where('hub_id', $hubId)
            ->latest('updated_at')
            ->limit($perPage)
            ->get();

        $outboundIds = $outboundDeliveries->pluck('id')->filter()->values();
        $invoices = Invoice::with(['outboundDelivery.commodity', 'contract.party.user'])
            ->where(function ($query) use ($outboundIds) {
                if ($outboundIds->isNotEmpty()) {
                    $query->whereIn('outbound_delivery_id', $outboundIds);
                } else {
                    $query->whereRaw('1 = 0');
                }
            })
            ->latest('updated_at')
            ->limit($perPage)
            ->get();

        $problemReports = collect();
        if (Schema::hasTable('pickup_problem_reports')) {
            $problemReports = DB::table('pickup_problem_reports')
                ->join('pickups', 'pickups.id', '=', 'pickup_problem_reports.pickup_id')
                ->leftJoin('users', 'users.id', '=', 'pickup_problem_reports.driver_employee_id')
                ->select(
                    'pickup_problem_reports.*',
                    'pickups.hub_id',
                    DB::raw("CONCAT(users.fname, ' ', users.lname) as driver_name")
                )
                ->where('pickups.hub_id', $hubId)
                ->latest('pickup_problem_reports.updated_at')
                ->limit($perPage)
                ->get();
        }

        $acceptedKg = (float) $inboundRecords->sum('accepted_weight');
        $inventoryKg = (float) $inventory->sum('current_inventory_total');
        $reservedKg = (float) $inventory->sum('reserved_inventory_total');
        $openAlerts = (int) $problemReports->where('status', 'open')->count();

        return response()->json([
            'message' => 'Hub operations workspace loaded.',
            'data' => [
                'completed_pickups' => $completedPickups,
                'inbound_records' => $inboundRecords,
                'inventory' => $inventory,
                'factory_requests' => $factoryRequests,
                'outbound_deliveries' => $outboundDeliveries,
                'invoices' => $invoices,
                'problem_reports' => $problemReports,
                'alerts' => $problemReports->where('status', 'open')->values(),
                'stats' => [
                    'ready_to_receive' => $completedPickups->count(),
                    'pending_qa_bale' => $inboundRecords->whereIn('status', ['received', 'weighted_tier1', 'sorting', 'sorted', 'weighted_tier2', 'quality_checked'])->count(),
                    'completed_inbound' => $inboundRecords->whereIn('status', ['baled', 'completed'])->count(),
                    'accepted_kg' => $acceptedKg,
                    'inventory_kg' => $inventoryKg,
                    'reserved_kg' => $reservedKg,
                    'factory_requests' => $factoryRequests->count(),
                    'outbound_deliveries' => $outboundDeliveries->count(),
                    'invoices' => $invoices->count(),
                    'open_alerts' => $openAlerts,
                ],
                'hub' => $employee->managedHub,
            ],
        ]);
    }

    /**
     * Inspect a completed pickup before receiving it.
     * Logs the inspection timestamp and manager ID.
     */
    public function inspectPickup(Request $request, int $id): JsonResponse
    {
        $employee = $request->user()->employee;
        if (! $employee || ! $employee->managedHub) {
            return response()->json(['message' => 'Your account is not assigned to a hub.'], 403);
        }

        $pickup = Pickup::with(['contract.commodity', 'supplier.user', 'driver.user', 'hub', 'deliveredToHub', 'photos'])
            ->findOrFail($id);

        $effectiveHubId = $pickup->effectiveHubId();
        if ($effectiveHubId !== $employee->managedHub->id) {
            return response()->json(['message' => 'This pickup is not assigned to your hub.'], 403);
        }

        if ($pickup->status !== 'completed') {
            return response()->json(['message' => 'Only completed pickups can be inspected.'], 422);
        }

        return response()->json([
            'message' => 'Pickup inspection details loaded.',
            'data' => [
                'pickup' => $pickup,
                'inspected_at' => now()->toIso8601String(),
                'inspected_by' => $request->user()->id,
                'effective_hub_id' => $effectiveHubId,
                'delivered_to_hub' => $pickup->deliveredToHub,
            ],
        ]);
    }

    /**
     * Step an inbound record through the processing stages.
     *
     * Allowed transitions:
     *   received → weighted_tier1 → sorting → sorted → weighted_tier2 → baled
     */
    public function updateInboundStatus(Request $request, int $id): JsonResponse
    {
        $employee = $request->user()->employee;
        if (! $employee || ! $employee->managedHub) {
            return response()->json(['message' => 'Your account is not assigned to a hub.'], 403);
        }

        $request->validate([
            'status' => ['required', 'string', 'in:weighted_tier1,sorting,sorted,weighted_tier2,baled,rejected'],
            'tier1_weight' => ['nullable', 'numeric', 'min:0.01'],
            'sorter_names' => ['nullable', 'string', 'max:500'],
        ]);

        $record = InboundRecord::where('hub_id', $employee->managedHub->id)->findOrFail($id);
        $newStatus = $request->input('status');

        if (! $record->canTransitionTo($newStatus)) {
            return response()->json([
                'message' => "Cannot transition from '{$record->status}' to '{$newStatus}'.",
            ], 422);
        }

        $updates = ['status' => $newStatus];

        // Record timestamps and data for each stage
        match ($newStatus) {
            'weighted_tier1' => $updates += [
                'tier1_weighted_at' => now(),
                'tier1_weight' => $request->input('tier1_weight', $record->tier1_weight),
            ],
            'sorting' => $updates += [
                'sorting_started_at' => now(),
                'sorter_names' => $request->input('sorter_names', $record->sorter_names),
            ],
            'sorted' => $updates += [
                'sorting_completed_at' => now(),
            ],
            'weighted_tier2' => $updates += [
                'tier2_weighted_at' => now(),
            ],
            'rejected' => $updates += [],
            default => null,
        };

        $record->update($updates);

        return response()->json([
            'message' => "Inbound record #{$record->id} status updated to '{$newStatus}'.",
            'data' => $record->fresh(),
        ]);
    }

    /**
     * List available hubs for driver hub selection or hub manager reference.
     */
    public function availableHubs(): JsonResponse
    {
        $hubs = Hub::select('id', 'location', 'capacity', 'manager_employee_id')
            ->with(['manager.user:id,fname,lname'])
            ->get();

        return response()->json([
            'data' => $hubs,
        ]);
    }
}

