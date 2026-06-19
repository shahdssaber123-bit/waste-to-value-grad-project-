<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCommodityRequest;
use App\Http\Requests\Api\V1\UpdateCommodityRequest;
use App\Models\Commodity;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Commodities', weight: 11)]
class AdminCommodityController extends Controller
{
    /**
     * List Commodities.
     *
     * List all waste material types handled by the platform.
     */
    public function index(): JsonResponse
    {
        $commodities = Commodity::with('currentPrice')->get();

        $commodities->each(function ($commodity) {
            $commodity->current_price = $commodity->currentPrice;
        });

        return response()->json([
            'message' => 'Commodities retrieved successfully.',
            'data' => $commodities,
        ]);
    }

    /**
     * Create Commodity.
     *
     * Register a new waste material type.
     */
    public function store(StoreCommodityRequest $request): JsonResponse
    {
        $commodity = Commodity::create($request->validated());

        return response()->json([
            'message' => 'Commodity created successfully.',
            'data' => $commodity,
        ], 201);
    }

    /**
     * View Commodity.
     *
     * Detailed information about a commodity, including full price history.
     */
    public function show(string $id): JsonResponse
    {
        $commodity = Commodity::with([
            'prices' => fn ($query) => $query->latest('effective_from'),
            'hubs',
        ])->findOrFail($id);

        return response()->json([
            'message' => 'Commodity retrieved successfully.',
            'data' => $commodity,
        ]);
    }

    /**
     * Update Commodity.
     *
     * Update commodity metadata.
     */
    public function update(UpdateCommodityRequest $request, string $id): JsonResponse
    {
        $commodity = Commodity::findOrFail($id);

        $commodity->update($request->validated());

        return response()->json([
            'message' => 'Commodity updated successfully.',
            'data' => $commodity,
        ]);
    }
}
