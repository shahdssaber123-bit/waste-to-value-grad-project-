<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\DispatchAssignRequest;
use App\Models\Employee;
use App\Models\Pickup;
use App\Models\SupplierLocation;
use App\Models\Truck;
use App\Models\User;
use App\Notifications\PickupDispatchedNotification;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

#[Group('Dispatch', weight: 15)]
class DispatchController extends ApiController
{
    /**
     * Dispatch Pickup
     *
     * Assign a truck and driver to a scheduled pickup. This action transitions the pickup
     * towards execution and locks the assigned truck as 'in_use'.
     *
     * @response 200 {
     *   "message": "Pickup dispatched successfully.",
     *   "data": {
     *     "pickup_id": 22,
     *     "truck_id": 5,
     *     "driver_employee_id": 12,
     *     "status": "scheduled"
     *   }
     * }
     * @response 422 {
     *   "message": "The selected truck is not available."
     * }
     * @response 403 {
     *   "message": "You can only dispatch pickups for your own hub."
     * }
     */
    public function assign(DispatchAssignRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->status !== 'scheduled') {
            return response()->json(['message' => 'Only scheduled pickups can be dispatched.'], 422);
        }

        $isSuperAdmin = $request->user()?->role === 'super_admin';
        $hubManager = $request->user()->employee;
        if (! $isSuperAdmin && (! $hubManager || ! $hubManager->managedHub || $pickup->hub_id !== $hubManager->managedHub->id)) {
            return response()->json(['message' => 'You can only dispatch pickups for your own hub.'], 403);
        }

        try {
            DB::transaction(function () use ($request, $pickup) {
                $truck = Truck::where('id', $request->truck_id)->lockForUpdate()->firstOrFail();

                if ($truck->status !== 'available') {
                    throw new \Exception('The selected truck is not available.');
                }

                // Check if the truck is already scheduled for this date (excluding cancelled pickups)
                $alreadyScheduled = Pickup::where('truck_id', $truck->id)
                    ->whereDate('schedule_date', $pickup->schedule_date)
                    ->where('status', '!=', 'cancelled')
                    ->exists();

                if ($alreadyScheduled) {
                    throw new \Exception('This truck already has a pickup scheduled at that time.');
                }

                $driver = Employee::where('user_id', $request->driver_employee_id)
                    ->where('role', 'driver')
                    ->where('employment_status', 'active')
                    ->first();

                if (! $driver) {
                    throw new \Exception('The selected employee is not an active driver.');
                }

                $location = SupplierLocation::query()->findOrFail($request->supplier_location_id);
                if ((int) $location->user_id !== (int) $pickup->supplier_user_id) {
                    throw new \Exception('The selected location does not belong to this pickup supplier.');
                }

                $pickup->update([
                    'truck_id' => $truck->id,
                    'driver_employee_id' => $driver->user_id,
                    'supplier_location_id' => $location->id,
                ]);

                $truck->update(['status' => 'in_use']);
            });

            // Log notification intent (for doc 06)
            $driver = User::find($pickup->driver_employee_id);
            $driver->notify(new PickupDispatchedNotification($pickup));

            return response()->json([
                'message' => 'Pickup dispatched successfully.',
                'data' => [
                    'pickup_id' => $pickup->id,
                    'truck_id' => $pickup->truck_id,
                    'driver_employee_id' => $pickup->driver_employee_id,
                    'supplier_location_id' => $pickup->supplier_location_id,
                    'status' => $pickup->status,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
