<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ConfirmFactoryDeliveryRequest;
use App\Http\Requests\Api\V1\ListFactoryDeliveriesRequest;
use App\Http\Requests\Api\V1\RejectFactoryDeliveryRequest;
use App\Jobs\AutoConfirmDelivery;
use App\Models\HubCommodity;
use App\Models\OutboundDelivery;
use App\Models\User;
use App\Notifications\DeliveryRejectedNotification;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

#[Group('Factory Deliveries', weight: 20)]
class FactoryDeliveryController extends Controller
{
    /**
     * List Factory Deliveries.
     *
     * Returns a paginated list of deliveries (shipped, delivered, rejected) for the authenticated factory.
     */
    public function index(ListFactoryDeliveriesRequest $request): JsonResponse
    {
        $factoryId = $request->user()->id;

        $query = OutboundDelivery::whereHas('contract', function ($q) use ($factoryId) {
            $q->where('party_id', $factoryId)->where('party_type', 'factory');
        })->with(['commodity', 'hub', 'invoice']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $deliveries = $query->paginate((int) $request->integer('per_page', 5));

        return response()->json([
            'message' => 'Success',
            'data' => $deliveries,
        ]);
    }

    /**
     * Confirm Delivery Receipt.
     *
     * Mark a shipped delivery as 'delivered'. Starts the 48-hour rejection window.
     *
     * @response 200 {
     *   "message": "Receipt confirmed. You have 48 hours to raise a rejection if needed.",
     *   "data": { "delivery_id": 1, "status": "delivered", "rejection_window_end": "2025-09-03T12:00:00Z" }
     * }
     */
    public function confirm(ConfirmFactoryDeliveryRequest $request, string $id): JsonResponse
    {
        $delivery = OutboundDelivery::findOrFail($id);

        $this->authorizeFactoryAccess($delivery);

        if ($delivery->status !== 'shipped') {
            return response()->json(['message' => 'Only shipped deliveries can be confirmed.'], 422);
        }

        $delivery->update([
            'status' => 'delivered',
            'confirmed_at' => now(),
            'rejection_window_end' => now()->addHours(48),
        ]);

        AutoConfirmDelivery::dispatch($delivery->id)->delay(now()->addHours(48));

        return response()->json([
            'message' => 'Receipt confirmed. You have 48 hours to raise a rejection if needed.',
            'data' => [
                'delivery_id' => $delivery->id,
                'status' => 'delivered',
                'rejection_window_end' => $delivery->rejection_window_end,
            ],
        ]);
    }

    /**
     * Reject Delivery.
     *
     * Submit a rejection for a delivered load within the 48-hour window. Increases hub inventory atomically.
     *
     * @response 200 {
     *   "message": "Rejection submitted. The administrator has been notified."
     * }
     */
    public function reject(RejectFactoryDeliveryRequest $request, string $id): JsonResponse
    {
        $delivery = OutboundDelivery::findOrFail($id);

        $this->authorizeFactoryAccess($delivery);

        if (! $delivery->isWithinRejectionWindow()) {
            return response()->json(['message' => 'The rejection window for this delivery has closed.'], 422);
        }

        DB::transaction(function () use ($delivery, $request) {
            // Lock the delivery to prevent double rejection
            $delivery = OutboundDelivery::where('id', $delivery->id)->lockForUpdate()->first();

            if ($delivery->status === 'rejected') {
                throw new \Exception('This delivery has already been rejected.');
            }

            $delivery->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejection_reason' => $request->validated('rejection_reason'),
            ]);

            HubCommodity::where('hub_id', $delivery->hub_id)
                ->where('commodity_id', $delivery->commodity_id)
                ->lockForUpdate()
                ->first()
                ->increment('current_inventory_total', $delivery->quantity_kg);
        });

        $admins = User::where('role', 'super_admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new DeliveryRejectedNotification($delivery));
        }

        return response()->json(['message' => 'Rejection submitted. The administrator has been notified.']);
    }

    protected function authorizeFactoryAccess(OutboundDelivery $delivery): void
    {
        $factoryId = request()->user()->id;

        if ($delivery->contract->party_id !== $factoryId || $delivery->contract->party_type !== 'factory') {
            abort(403);
        }
    }
}
