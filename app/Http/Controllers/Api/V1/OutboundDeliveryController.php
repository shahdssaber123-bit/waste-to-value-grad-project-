<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListOutboundDeliveriesRequest;
use App\Http\Requests\Api\V1\ShipOutboundRequest;
use App\Models\OutboundDelivery;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Outbound Deliveries', weight: 20)]
class OutboundDeliveryController extends Controller
{
    /**
     * List Outbound Deliveries.
     *
     * Returns a paginated list of scheduled or shipped outbound loads.
     */
    public function index(ListOutboundDeliveriesRequest $request): JsonResponse
    {
        $query = OutboundDelivery::with(['contract', 'hub', 'commodity']);

        if ($request->has('hub_id')) {
            $query->where('hub_id', $request->hub_id);
        }

        if ($request->has('commodity_id')) {
            $query->where('commodity_id', $request->commodity_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $deliveries = $query->paginate(15);

        return response()->json([
            'message' => 'Success',
            'data' => $deliveries,
        ]);
    }

    /**
     * View Outbound Delivery.
     *
     * Detailed delivery data including hub origin and linked invoice.
     */
    public function show(string $id): JsonResponse
    {
        $delivery = OutboundDelivery::with(['contract', 'hub', 'commodity', 'invoice.penalties'])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Success',
            'data' => $delivery,
        ]);
    }

    /**
     * Mark Delivery as Shipped.
     *
     * Transitions a scheduled delivery to 'shipped' status.
     *
     * @response 200 {
     *   "message": "Delivery marked as shipped.",
     *   "data": { "id": 1, "status": "shipped" }
     * }
     */
    public function ship(ShipOutboundRequest $request, string $id): JsonResponse
    {
        $delivery = OutboundDelivery::findOrFail($id);

        if ($delivery->status !== 'scheduled') {
            return response()->json(['message' => 'Only scheduled deliveries can be marked as shipped.'], 422);
        }

        $delivery->update(['status' => 'shipped']);

        return response()->json([
            'message' => 'Delivery marked as shipped.',
            'data' => $delivery,
        ]);
    }
}
