<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Commodity;
use App\Models\HubCommodity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmartMatchingController extends Controller
{
    public function suggestHub(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'commodity_id' => ['required_without:material', 'nullable', 'integer', 'exists:commodities,id'],
            'material' => ['required_without:commodity_id', 'nullable', 'string', 'max:100'],
            'quantity_kg' => ['required', 'numeric', 'min:1'],
        ]);

        $commodity = isset($validated['commodity_id'])
            ? Commodity::find($validated['commodity_id'])
            : Commodity::where('title', 'like', '%'.$validated['material'].'%')->first();

        if (! $commodity) {
            return response()->json(['message' => 'Material not found.', 'data' => []], 404);
        }

        $matches = HubCommodity::with(['hub', 'commodity'])
            ->where('commodity_id', $commodity->id)
            ->where('current_inventory_total', '>=', $validated['quantity_kg'])
            ->orderByDesc('current_inventory_total')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'hub_id' => $item->hub_id,
                'hub_location' => $item->hub?->location,
                'material' => $item->commodity?->title,
                'available_kg' => (float) $item->current_inventory_total,
                'requested_kg' => (float) $validated['quantity_kg'],
                'match_score' => min(100, round(($item->current_inventory_total / max($validated['quantity_kg'], 1)) * 40, 0)),
                'reason' => 'Enough stock is available and this hub can reserve the requested quantity.',
            ]);

        return response()->json(['message' => 'Smart hub matches retrieved.', 'data' => $matches]);
    }
}
