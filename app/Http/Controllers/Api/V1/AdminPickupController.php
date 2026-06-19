<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePickupRequest;
use App\Models\Contract;
use App\Models\Pickup;
use App\Models\Truck;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

#[Group('Pickups', weight: 15)]
class AdminPickupController extends Controller
{
    /**
     * Schedule a Pickup.
     *
     * Create a new pickup appointment for an active supplier contract.
     */
    public function store(StorePickupRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $contract = Contract::findOrFail($validated['contract_id']);

        if ($contract->status !== 'active') {
            return response()->json(['message' => 'Pickups can only be scheduled against an active contract.'], 422);
        }

        if ($contract->party_type !== 'supplier') {
            return response()->json(['message' => 'Pickups can only be scheduled for supplier contracts.'], 422);
        }

        $pickup = Pickup::create([
            'contract_id' => $contract->id,
            'supplier_user_id' => $contract->party_id,
            'supplier_location_id' => $validated['supplier_location_id'] ?? null,
            'hub_id' => $validated['hub_id'],
            'scheduled_by_admin_id' => $request->user()->id,
            'status' => 'scheduled',
            'schedule_date' => $validated['schedule_date'],
            'estimated_weight' => $validated['estimated_weight'],
            'truck_id' => null,
            'driver_employee_id' => null,
        ]);

        return response()->json([
            'message' => 'Pickup scheduled successfully.',
            'data' => $pickup,
        ], 201);
    }

    /**
     * List Pickups.
     *
     * Paginated list of scheduled and historical pickups.
     *
     * @queryParam hub_id integer Filter by hub.
     * @queryParam supplier_user_id integer Filter by supplier.
     * @queryParam status string Filter by pickup status (scheduled, in_progress, completed, cancelled).
     * @queryParam date_from string Filter by schedule date range (start).
     * @queryParam date_to string Filter by schedule date range (end).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Pickup::with(['contract', 'supplier.user', 'supplierLocation', 'hub', 'truck', 'driver.user']);

        if ($request->has('hub_id')) {
            $query->where('hub_id', $request->input('hub_id'));
        }

        if ($request->has('supplier_user_id')) {
            $query->where('supplier_user_id', $request->input('supplier_user_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('date_from')) {
            $query->where('schedule_date', '>=', $request->input('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('schedule_date', '<=', $request->input('date_to'));
        }

        $pickups = $query->paginate(15);

        return response()->json([
            'message' => 'Success',
            'data' => $pickups,
        ]);
    }

    /**
     * View Pickup.
     *
     * Detailed view of a pickup, including assigned driver, truck, and uploaded photos.
     */
    public function show(string $id): JsonResponse
    {
        $pickup = Pickup::with(['contract', 'supplier.user', 'supplierLocation', 'hub', 'truck', 'driver.user', 'photos'])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Success',
            'data' => $pickup,
        ]);
    }

    /**
     * Cancel Pickup.
     *
     * Cancels a scheduled pickup. If a truck was already assigned, its status is reset to available.
     */
    public function cancel(string $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->status !== 'scheduled') {
            return response()->json(['message' => 'Only scheduled pickups can be cancelled.'], 422);
        }

        DB::transaction(function () use ($pickup) {
            if ($pickup->truck_id) {
                $truck = Truck::query()->lockForUpdate()->find($pickup->truck_id, ['*']);
                if ($truck) {
                    $truck->update(['status' => 'available']);
                }
            }

            $pickup->update(['status' => 'cancelled']);
        });

        return response()->json(['message' => 'Pickup cancelled successfully.']);
    }
}
