<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Api\V1\CompletePickupRequest;
use App\Http\Requests\Api\V1\DriverRecordWeightRequest;
use App\Http\Requests\Api\V1\DriverUploadPhotoRequest;
use App\Http\Requests\Api\V1\ListDriverPickupsRequest;
use App\Http\Requests\Api\V1\StartPickupRequest;
use App\Models\Hub;
use App\Models\Pickup;
use App\Models\PickupPhoto;
use App\Models\User;
use App\Notifications\PickupCompletedNotification;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Driver Pickups', weight: 30)]
class DriverPickupController extends ApiController
{
    /**
     * List Assigned Pickups
     *
     * Returns today's pickups assigned to the authenticated driver that are either 'scheduled' or 'in_progress'.
     */
    public function index(ListDriverPickupsRequest $request): JsonResponse
    {
        $pickups = Pickup::with(['contract.commodity', 'hub', 'truck', 'photos'])
            ->where('driver_employee_id', $request->user()->id)
            ->whereIn('status', ['scheduled', 'in_progress', 'completed', 'processing'])
            ->latest('schedule_date')
            ->paginate((int) $request->integer('per_page', 5));

        return response()->json(['data' => $pickups]);
    }

    /**
     * Start Pickup
     *
     * Mark a scheduled pickup as 'in_progress'. This is typically called when the driver scans the QR code at the supplier site.
     *
     * @response 200 {
     *   "message": "Pickup started.",
     *   "data": { "id": 22, "status": "in_progress", "started_at": "2025-09-01T09:00:00Z" }
     * }
     */
    public function start(StartPickupRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->driver_employee_id !== $request->user()->id) {
            return response()->json(['message' => 'This pickup is not assigned to you.'], 403);
        }

        if ($pickup->status !== 'scheduled') {
            return response()->json(['message' => 'This pickup cannot be started.'], 422);
        }

        $pickup->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pickup started.',
            'data' => $pickup,
        ]);
    }

    /**
     * Upload Load Photo
     *
     * Upload one or more load photos at the supplier's site. Multiple calls are allowed — each adds a new photo record.
     *
     * @response 201 {
     *   "message": "Photo uploaded successfully.",
     *   "data": { "id": 5, "pickup_id": 22, "photo_path": "pickups/22/abc123.jpg", "uploaded_at": "2025-09-01T09:45:00Z" }
     * }
     */
    public function uploadPhoto(DriverUploadPhotoRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->driver_employee_id !== $request->user()->id) {
            return response()->json(['message' => 'This pickup is not assigned to you.'], 403);
        }

        if ($pickup->status !== 'in_progress') {
            return response()->json(['message' => 'Photos can only be uploaded for pickups that are in progress.'], 422);
        }

        $path = $request->file('photo')->store(
            'pickups/'.$pickup->id,
            'public'
        );

        $photo = PickupPhoto::create([
            'pickup_id' => $pickup->id,
            'photo_path' => $path,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'message' => 'Photo uploaded successfully.',
            'data' => [
                'id' => $photo->id,
                'pickup_id' => $photo->pickup_id,
                'photo_path' => $photo->photo_path,
                'photo_url' => $photo->photo_url,
                'uploaded_at' => $photo->uploaded_at,
            ],
        ], 201);
    }

    /**
     * Record Estimated Weight
     *
     * Record the estimated load weight before departing from the supplier site.
     *
     * @response 200 {
     *   "message": "Weight recorded.",
     *   "data": { "id": 22, "estimated_weight": "1200.50" }
     * }
     */
    public function recordWeight(DriverRecordWeightRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->driver_employee_id !== $request->user()->id) {
            return response()->json(['message' => 'This pickup is not assigned to you.'], 403);
        }

        if ($pickup->status !== 'in_progress') {
            return response()->json(['message' => 'Weight can only be recorded for pickups that are in progress.'], 422);
        }

        $pickup->update([
            'estimated_weight' => $request->estimated_weight,
        ]);

        return response()->json([
            'message' => 'Weight recorded.',
            'data' => $pickup,
        ]);
    }


    public function departToHub(StartPickupRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->driver_employee_id !== $request->user()->id) {
            return response()->json(['message' => 'This pickup is not assigned to you.'], 403);
        }

        if ($pickup->status !== 'in_progress') {
            return response()->json(['message' => 'Only in-progress pickups can depart to hub.'], 422);
        }

        if ($pickup->photos()->count() === 0) {
            return response()->json(['message' => 'Upload at least one load proof photo before departing to hub.'], 422);
        }

        if (! $pickup->estimated_weight || (float) $pickup->estimated_weight <= 0) {
            return response()->json(['message' => 'Record the estimated load weight before departing to hub.'], 422);
        }

        $pickup->update([
            'departed_to_hub_at' => now(),
        ]);

        return response()->json([
            'message' => 'Driver departed to hub. Hub arrival can now be completed.',
            'data' => $pickup->fresh(['contract.commodity', 'hub', 'truck', 'photos']),
        ]);
    }

    /**
     * Complete Pickup
     *
     * Confirm arrival at the hub. This closes the driver's side of the pickup and notifies the Hub Manager.
     * At least one photo must have been uploaded.
     *
     * @response 200 {
     *   "message": "Pickup completed. The hub manager has been notified.",
     *   "data": { "pickup_id": 22, "status": "completed" }
     * }
     */
    public function complete(CompletePickupRequest $request, int $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);

        if ($pickup->driver_employee_id !== $request->user()->id) {
            return response()->json(['message' => 'This pickup is not assigned to you.'], 403);
        }

        if ($pickup->status !== 'in_progress') {
            return response()->json(['message' => 'Only in-progress pickups can be completed.'], 422);
        }

        if ($pickup->photos()->count() === 0) {
            return response()->json(['message' => 'Upload at least one load proof photo before completing this pickup.'], 422);
        }

        if (! $pickup->estimated_weight || (float) $pickup->estimated_weight <= 0) {
            return response()->json(['message' => 'Record the estimated load weight before completing this pickup.'], 422);
        }

        if (! $pickup->departed_to_hub_at) {
            return response()->json(['message' => 'Depart to hub before completing this pickup.'], 422);
        }

        $deliveredToHubId = $request->validated('delivered_to_hub_id');

        $pickup->update([
            'status' => 'completed',
            'proof_note' => $request->validated('proof_note'),
            'delivered_to_hub_id' => $deliveredToHubId,
            'hub_arrived_at' => now(),
            'completed_at' => now(),
        ]);

        // Notify the hub manager of the effective hub (driver-selected or original)
        $effectiveHubId = $pickup->effectiveHubId();
        $hub = Hub::find($effectiveHubId);
        $hubManagerUser = $hub ? User::find($hub->manager_employee_id) : null;
        if ($hubManagerUser) {
            $hubManagerUser->notify(new PickupCompletedNotification($pickup));
        }

        return response()->json([
            'message' => 'Pickup completed. The hub manager has been notified.',
            'data' => [
                'pickup_id' => $pickup->id,
                'status' => $pickup->fresh()->status,
                'proof_note' => $pickup->fresh()->proof_note,
                'delivered_to_hub_id' => $deliveredToHubId,
                'effective_hub_id' => $effectiveHubId,
            ],
        ]);
    }
}
