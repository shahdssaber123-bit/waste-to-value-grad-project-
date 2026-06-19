<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreHubCommodityRequest;
use App\Models\Hub;
use App\Models\HubCommodity;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Hubs', weight: 10)]
class AdminHubCommodityController extends Controller
{
    /**
     * List Hub Commodities.
     *
     * List all commodities tracked at a specific hub with their current inventory levels.
     */
    public function index(string $id): JsonResponse
    {
        $hub = Hub::findOrFail($id);

        $commodities = $hub->hubCommodities()->with('commodity')->get();

        return response()->json([
            'message' => 'Hub commodities retrieved successfully.',
            'data' => $commodities,
        ]);
    }

    /**
     * Link Commodity to Hub.
     *
     * Enable inventory tracking for a specific commodity at a specific hub.
     */
    public function store(StoreHubCommodityRequest $request, string $id): JsonResponse
    {
        $hub = Hub::findOrFail($id);
        $validated = $request->validated();

        $exists = HubCommodity::where('hub_id', $hub->id)
            ->where('commodity_id', $validated['commodity_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This commodity is already linked to this hub.',
            ], 422);
        }

        $hubCommodity = HubCommodity::create([
            'hub_id' => $hub->id,
            'commodity_id' => $validated['commodity_id'],
            'current_inventory_total' => 0.00,
        ]);

        $hubCommodity->load('commodity');

        return response()->json([
            'message' => 'Commodity linked to hub successfully.',
            'data' => [
                'hub_id' => $hubCommodity->hub_id,
                'commodity_id' => $hubCommodity->commodity_id,
                'commodity_title' => $hubCommodity->commodity->title,
                'current_inventory_total' => $hubCommodity->current_inventory_total,
            ],
        ], 201);
    }

    /**
     * Unlink Commodity from Hub.
     *
     * Remove inventory tracking for a commodity at a specific hub.
     * Cannot unlink if current inventory is greater than zero.
     */
    public function destroy(string $hubId, string $commodityId): JsonResponse
    {
        $hubCommodity = HubCommodity::where('hub_id', $hubId)
            ->where('commodity_id', $commodityId)
            ->firstOrFail();

        if ($hubCommodity->current_inventory_total > 0) {
            return response()->json([
                'message' => 'Cannot unlink a commodity that still has inventory at this hub.',
            ], 422);
        }

        $hubCommodity->delete();

        return response()->json([
            'message' => 'Commodity unlinked from hub successfully.',
        ]);
    }
}
