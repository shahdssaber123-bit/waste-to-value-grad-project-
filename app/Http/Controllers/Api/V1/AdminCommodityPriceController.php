<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCommodityPriceRequest;
use App\Models\Commodity;
use App\Models\CommodityPrice;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

#[Group('Commodities', weight: 11)]
class AdminCommodityPriceController extends Controller
{
    /**
     * List Price History.
     *
     * Retrieve full time-series pricing history for a specific commodity.
     */
    public function index(string $id): JsonResponse
    {
        $commodity = Commodity::findOrFail($id);

        $prices = CommodityPrice::query()
            ->where('commodity_id', $commodity->id)
            ->latest('effective_from')
            ->get()
            ->map(function ($price) {
                $price->is_current = is_null($price->effective_to);

                return $price;
            });

        return response()->json([
            'message' => 'Price history retrieved successfully.',
            'data' => $prices,
        ]);
    }

    /**
     * Set New Price.
     *
     * Close current active price and set a new market price for a commodity.
     */
    public function store(StoreCommodityPriceRequest $request, string $id): JsonResponse
    {
        $commodity = Commodity::findOrFail($id);
        $validated = $request->validated();
        $priceValue = round((float) $validated['price'], 2);

        return DB::transaction(function () use ($commodity, $priceValue, $request) {
            $currentPriceRecord = CommodityPrice::query()
                ->where('commodity_id', $commodity->id)
                ->whereNull('effective_to')
                ->latest('effective_from')
                ->lockForUpdate()
                ->first();

            $previousPrice = $currentPriceRecord?->price;

            if ($currentPriceRecord) {
                $currentPriceRecord->update([
                    'effective_to' => now(),
                ]);
            }

            $newPrice = CommodityPrice::create([
                'commodity_id' => $commodity->id,
                'price' => $priceValue,
                'effective_from' => now(),
                'effective_to' => null,
                'created_by_admin_id' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Price updated successfully.',
                'data' => [
                    ...$newPrice->toArray(),
                    'previous_price' => $previousPrice,
                    'commodity' => [
                        'id' => $commodity->id,
                        'title' => $commodity->title,
                        'current_price' => [
                            'id' => $newPrice->id,
                            'price' => $newPrice->price,
                            'effective_from' => $newPrice->effective_from,
                        ],
                    ],
                ],
            ], 201);
        });
    }
}
