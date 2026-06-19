<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\InboundBaleRequest;
use App\Http\Requests\Api\V1\InboundQualityCheckRequest;
use App\Http\Requests\Api\V1\InboundStoreRequest;
use App\Http\Requests\Api\V1\ListInboundRecordsRequest;
use App\Http\Requests\Api\V1\ShowInboundRecordRequest;
use App\Models\BaleCube;
use App\Models\Commodity;
use App\Models\CommodityPrice;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Pickup;
use App\Models\SuperAdmin;
use App\Models\Truck;
use App\Models\User;
use App\Notifications\HubShipmentReadyNotification;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

#[Group('Inbound Processing', weight: 40)]
class InboundRecordController extends ApiController
{
    /**
     * Receive Inbound Load
     *
     * Scan a completed pickup to open an inbound record. This transitions the pickup to 'processing' and marks the assigned truck as 'available' again.
     *
     * @response 201 {
     *   "message": "Inbound record created.",
     *   "data": { "id": 9, "pickup_id": 22, "contract_id": 7, "hub_id": 2, "status": "received" }
     * }
     */
    public function store(InboundStoreRequest $request): JsonResponse
    {
        try {
            return DB::transaction(function () use ($request) {
                $pickup = Pickup::where('id', $request->pickup_id)->lockForUpdate()->firstOrFail();

                if ($pickup->status !== 'completed') {
                    throw new \Exception('Only completed pickups can be received for inbound processing.');
                }

                if (InboundRecord::where('pickup_id', $pickup->id)->exists()) {
                    throw new \Exception('An inbound record already exists for this pickup.');
                }

                $hubManager = $request->user()->employee;
                $effectiveHubId = $pickup->effectiveHubId();

                if (! $hubManager || ! $hubManager->managedHub || $effectiveHubId !== $hubManager->managedHub->id) {
                    throw new \Exception('You can only process pickups for your own hub.', 403);
                }

                $inboundRecord = InboundRecord::create([
                    'pickup_id' => $pickup->id,
                    'contract_id' => $pickup->contract_id,
                    'hub_id' => $effectiveHubId,
                    'status' => 'received',
                    'received_at' => now(),
                    'inspected_by_hub_manager_id' => $request->user()->id,
                ]);

                $pickup->update(['status' => 'processing']);

                if ($pickup->truck_id) {
                    Truck::where('id', $pickup->truck_id)->update(['status' => 'available']);
                }

                return response()->json([
                    'message' => 'Inbound record created.',
                    'data' => [
                        'id' => $inboundRecord->id,
                        'pickup_id' => $inboundRecord->pickup_id,
                        'contract_id' => $inboundRecord->contract_id,
                        'hub_id' => $inboundRecord->hub_id,
                        'status' => $inboundRecord->status,
                        'received_at' => $inboundRecord->received_at,
                        'inspected_by' => $request->user()->id,
                    ],
                ], 201);
            });
        } catch (\Exception $e) {
            $code = $e->getCode();

            return response()->json(['message' => $e->getMessage()], ($code >= 400 && $code < 600) ? $code : 422);
        }
    }

    /**
     * List Inbound Records
     *
     * Returns a paginated list of inbound records for the Hub Manager's managed hub.
     *
     * @queryParam status string Filter by status (received, quality_checked, completed, rejected). Example: received
     */
    public function index(ListInboundRecordsRequest $request): JsonResponse
    {
        $hubManager = $request->user()->employee;
        if (! $hubManager || ! $hubManager->managedHub) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = InboundRecord::with(['pickup.supplier.user', 'baleCubes'])
            ->where('hub_id', $hubManager->managedHub->id);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $records = $query->latest()->paginate(15);

        return response()->json($records);
    }

    /**
     * Get Inbound Record Details
     *
     * Returns the full details of a specific inbound record, including related pickup photos and bale cubes.
     */
    public function show(ShowInboundRecordRequest $request, int $id): JsonResponse
    {
        $hubManager = $request->user()->employee;
        if (! $hubManager || ! $hubManager->managedHub) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $record = InboundRecord::with(['pickup.photos', 'pickup.truck', 'pickup.driver.user', 'contract.commodity', 'baleCubes'])
            ->where('hub_id', $hubManager->managedHub->id)
            ->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    /**
     * Record Quality Check
     *
     * Record tier weights and contamination ratio. The system automatically computes the 'accepted_weight'.
     *
     * @response 200 {
     *   "message": "Quality check recorded.",
     *   "data": { "id": 9, "tier1_weight": "1200.00", "tier2_weight": "1150.00", "contamination_ratio": "0.0800", "accepted_weight": "1104.00", "status": "quality_checked" }
     * }
     */
    public function qualityCheck(InboundQualityCheckRequest $request, int $id): JsonResponse
    {
        $hubManager = $request->user()->employee;
        if (! $hubManager || ! $hubManager->managedHub) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $record = InboundRecord::where('hub_id', $hubManager->managedHub->id)->findOrFail($id);

        // Support both new and legacy status flows
        $canCheck = $record->canTransitionTo('quality_checked')
            || in_array($record->status, ['weighted_tier2', 'sorted', 'received']);

        if (! $canCheck) {
            return response()->json(['message' => 'This inbound record cannot be quality-checked in its current state.'], 422);
        }

        $tier1 = (float) $request->tier1_weight;
        $tier2 = (float) $request->tier2_weight;
        if ($tier2 > $tier1) {
            return response()->json(['message' => 'Tier 2 accepted weight cannot be greater than Tier 1 received weight.'], 422);
        }
        $ratio = $request->filled('contamination_ratio')
            ? (float) $request->contamination_ratio
            : round(($tier1 - $tier2) / max($tier1, 0.01), 4);

        $accepted_weight = $tier2;

        // Auto-calculate supplier pricing at 70% of active base market price
        $commodityId = $record->contract->commodity_id ?? null;
        $unitPrice = null;
        $totalAmount = null;
        $invoiceNumber = null;

        if ($commodityId) {
            $currentPrice = CommodityPrice::where('commodity_id', $commodityId)
                ->whereNull('effective_to')
                ->orderByDesc('effective_from')
                ->first();

            if ($currentPrice) {
                $unitPrice = round((float) $currentPrice->price * 0.70, 2);
                $totalAmount = round($unitPrice * $accepted_weight, 2);
                $invoiceNumber = 'WTV-SQ-'.$record->id.'-'.now()->format('YmdHis');
            }
        }

        // Determine the correct status based on contamination
        $newStatus = $ratio > 0.50 ? 'rejected' : 'weighted_tier2';

        $record->update([
            'tier1_weight' => $tier1,
            'tier2_weight' => $tier2,
            'contamination_ratio' => $ratio,
            'accepted_weight' => $accepted_weight,
            'quality_notes' => $request->input('quality_notes'),
            'sorter_count' => $request->input('sorter_count', 1),
            'decontamination_notes' => $request->input('decontamination_notes'),
            'tier1_weighted_at' => $record->tier1_weighted_at ?? now(),
            'tier2_weighted_at' => now(),
            'pricing_unit_price' => $unitPrice,
            'pricing_total_amount' => $totalAmount,
            'supplier_invoice_number' => $invoiceNumber,
            'supplier_invoice_generated_at' => $invoiceNumber ? now() : null,
            'status' => $newStatus,
        ]);

        return response()->json([
            'message' => 'Quality check recorded.',
            'data' => $record,
        ]);
    }

    /**
     * Confirm Baling & Update Inventory
     *
     * Finalize the inbound process by creating a bale cube record and atomically updating the hub's commodity inventory.
     *
     * @response 200 {
     *   "message": "Baling complete. Inventory updated.",
     *   "data": { "inbound_record_id": 9, "bale_cube": { "id": 14, "weight": "1104.00", "quality_score": "A" }, "hub_inventory": { "hub_id": 1, "current_inventory_total": "15000.00" } }
     * }
     */
    public function bale(InboundBaleRequest $request, int $id): JsonResponse
    {
        $record = InboundRecord::findOrFail($id);

        $hubManager = $request->user()->employee;
        if (! $hubManager || ! $hubManager->managedHub || $record->hub_id !== $hubManager->managedHub->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($request->quality_score === 'reject') {
            $record->update(['status' => 'rejected']);

            return response()->json(['message' => 'Load rejected during baling QA. Inventory was not updated.', 'data' => $record]);
        }

        // Support both new flow (weighted_tier2 → baled) and legacy (quality_checked → completed/baled)
        $canBale = $record->canTransitionTo('baled')
            || $record->canTransitionTo('completed');

        if (! $canBale) {
            return response()->json(['message' => 'This inbound record cannot be baled in its current state.'], 422);
        }

        $commodityId = $record->contract->commodity_id;

        try {
            return DB::transaction(function () use ($record, $request, $commodityId) {
                // Lock commodity
                Commodity::where('id', $commodityId)->lockForUpdate()->firstOrFail();

                $baleCube = BaleCube::create([
                    'inbound_record_id' => $record->id,
                    'commodity_id' => $commodityId,
                    'weight' => $record->accepted_weight,
                    'quality_score' => $request->quality_score,
                    'bale_code' => 'WTV-BL-'.$record->id.'-'.now()->format('YmdHis'),
                    'quality_notes' => $request->input('quality_notes'),
                ]);

                // Lock and update inventory
                $hubInventory = HubCommodity::firstOrCreate(
                    ['hub_id' => $record->hub_id, 'commodity_id' => $commodityId],
                    ['current_inventory_total' => 0, 'reserved_inventory_total' => 0]
                );

                // Re-acquire lock after potential creation
                $hubInventory = HubCommodity::where('hub_id', $record->hub_id)
                    ->where('commodity_id', $commodityId)
                    ->lockForUpdate()
                    ->first();

                $hubInventory->increment('current_inventory_total', $record->accepted_weight);

                $record->update(['status' => 'baled']);

                // Check shipment readiness: alert super admins if hub inventory crosses 24,000 kg
                $totalInventoryKg = (float) HubCommodity::where('hub_id', $record->hub_id)->sum('current_inventory_total');
                if ($totalInventoryKg >= 24000) {
                    $superAdmins = User::where('role', 'super_admin')->get();
                    foreach ($superAdmins as $admin) {
                        $admin->notify(new HubShipmentReadyNotification($record->hub_id, $totalInventoryKg));
                    }
                }

                return response()->json([
                    'message' => 'Baling complete. Inventory updated.',
                    'data' => [
                        'inbound_record_id' => $record->id,
                        'bale_cube' => $baleCube,
                        'hub_inventory' => $hubInventory,
                        'supplier_invoice_number' => $record->supplier_invoice_number,
                        'pricing_total_amount' => $record->pricing_total_amount,
                    ],
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
