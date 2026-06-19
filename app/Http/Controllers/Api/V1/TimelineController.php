<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OutboundDelivery;
use App\Models\Pickup;
use Illuminate\Http\JsonResponse;

class TimelineController extends Controller
{
    public function pickup(string $id): JsonResponse
    {
        $pickup = Pickup::with(['driver.user', 'truck', 'hub', 'inboundRecord.baleCubes'])->findOrFail($id);
        $steps = [
            ['key' => 'created', 'label' => 'Created', 'done' => true, 'at' => $pickup->created_at],
            ['key' => 'assigned', 'label' => 'Driver & truck assigned', 'done' => (bool) ($pickup->driver_employee_id && $pickup->truck_id), 'at' => $pickup->updated_at],
            ['key' => 'started', 'label' => 'Driver started pickup', 'done' => (bool) $pickup->started_at, 'at' => $pickup->started_at],
            ['key' => 'completed', 'label' => 'Pickup completed', 'done' => $pickup->status === 'completed', 'at' => $pickup->updated_at],
            ['key' => 'quality', 'label' => 'Hub quality checked', 'done' => $pickup->inboundRecord?->status === 'quality_checked' || $pickup->inboundRecord?->status === 'completed', 'at' => $pickup->inboundRecord?->updated_at],
            ['key' => 'baled', 'label' => 'Bale cubes created', 'done' => ($pickup->inboundRecord?->baleCubes?->count() ?? 0) > 0, 'at' => $pickup->inboundRecord?->updated_at],
        ];

        return response()->json(['message' => 'Pickup timeline retrieved.', 'data' => $steps]);
    }

    public function delivery(string $id): JsonResponse
    {
        $delivery = OutboundDelivery::with(['invoice'])->findOrFail($id);
        $steps = [
            ['key' => 'created', 'label' => 'Delivery created', 'done' => true, 'at' => $delivery->created_at],
            ['key' => 'shipped', 'label' => 'Shipped from hub', 'done' => in_array($delivery->status, ['shipped', 'delivered', 'confirmed']), 'at' => $delivery->updated_at],
            ['key' => 'delivered', 'label' => 'Arrived at factory', 'done' => in_array($delivery->status, ['delivered', 'confirmed']), 'at' => $delivery->updated_at],
            ['key' => 'confirmed', 'label' => 'Factory confirmed receipt', 'done' => $delivery->status === 'confirmed', 'at' => $delivery->confirmed_at],
            ['key' => 'invoiced', 'label' => 'Invoice generated', 'done' => (bool) $delivery->invoice, 'at' => $delivery->invoice?->created_at],
        ];

        return response()->json(['message' => 'Delivery timeline retrieved.', 'data' => $steps]);
    }
}
