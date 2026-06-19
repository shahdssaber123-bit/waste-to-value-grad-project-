<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MarketplaceController extends Controller
{
    public function materials(Request $request): JsonResponse
    {
        $rows = DB::table('hub_commodity')
            ->join('commodities', 'commodities.id', '=', 'hub_commodity.commodity_id')
            ->join('hubs', 'hubs.id', '=', 'hub_commodity.hub_id')
            ->leftJoin('commodity_prices', function ($join) {
                $join->on('commodity_prices.commodity_id', '=', 'commodities.id')
                    ->whereNull('commodity_prices.effective_to');
            })
            ->select(
                'hub_commodity.hub_id',
                'hub_commodity.commodity_id',
                'commodities.title as material',
                'hubs.location as hub',
                'hub_commodity.current_inventory_total as inventory_kg',
                DB::raw('COALESCE(hub_commodity.reserved_inventory_total, 0) as reserved_kg'),
                DB::raw('(hub_commodity.current_inventory_total - COALESCE(hub_commodity.reserved_inventory_total, 0)) as available_kg'),
                DB::raw('COALESCE(commodity_prices.price, 1) as price_per_kg')
            )
            ->whereRaw('(hub_commodity.current_inventory_total - COALESCE(hub_commodity.reserved_inventory_total, 0)) > 0')
            ->orderBy('commodities.title')
            ->orderByDesc(DB::raw('(hub_commodity.current_inventory_total - COALESCE(hub_commodity.reserved_inventory_total, 0))'))
            ->get()
            ->map(function ($row) {
                $grade = $row->available_kg >= 3000 ? 'A' : ($row->available_kg >= 1200 ? 'B' : 'C');
                $supplierCount = DB::table('contracts')
                    ->where('party_type', 'supplier')
                    ->where('commodity_id', $row->commodity_id)
                    ->whereIn('status', ['active', 'draft'])
                    ->count();
                $factoryCount = DB::table('contracts')
                    ->where('party_type', 'factory')
                    ->where('commodity_id', $row->commodity_id)
                    ->whereIn('status', ['active', 'draft'])
                    ->count();

                return [
                    'id' => 'MKT-'.$row->commodity_id.'-'.$row->hub_id,
                    'commodity_id' => $row->commodity_id,
                    'material' => $row->material,
                    'hub_id' => $row->hub_id,
                    'hub' => $row->hub,
                    'available_kg' => (float) $row->available_kg,
                    'inventory_kg' => (float) $row->inventory_kg,
                    'reserved_kg' => (float) $row->reserved_kg,
                    'weight' => (float) $row->available_kg,
                    'grade' => $grade,
                    'purityGrade' => $grade === 'A' ? 'A+ (99%+)' : ($grade === 'B' ? 'B (90-95%)' : 'C (80-90%)'),
                    'price_per_kg' => (float) $row->price_per_kg,
                    'batchId' => 'BAT-'.$row->commodity_id.'-'.$row->hub_id,
                    'processingStage' => 'Stored in live inventory',
                    'condition' => $grade === 'A' ? 'Excellent' : 'Good',
                    'reserved' => ((float) $row->reserved_kg) > 0,
                    'supplier_count' => $supplierCount,
                    'factory_count' => $factoryCount,
                    'source_summary' => $supplierCount.' supplier contract(s) and '.$factoryCount.' factory demand contract(s)',
                    'image_url' => $this->imageForMaterial($row->material),
                    'impact_note' => $this->impactNoteForMaterial($row->material),
                ];
            })
            ->values();

        return response()->json([
            'message' => 'Marketplace materials retrieved successfully.',
            'data' => $rows,
        ]);
    }

    private function imageForMaterial(string $material): string
    {
        $name = strtolower($material);

        // Local bundled assets ensure marketplace photos always work offline and in submission demos.
        if (str_contains($name, 'wood')) return '/materials/wood.svg';
        if (str_contains($name, 'glass')) return '/materials/glass.svg';
        if (str_contains($name, 'aluminum') || str_contains($name, 'steel') || str_contains($name, 'metal') || str_contains($name, 'copper')) return '/materials/metal.svg';
        if (str_contains($name, 'paper') || str_contains($name, 'cardboard') || str_contains($name, 'carton') || str_contains($name, 'newspaper')) return '/materials/paper.svg';
        if (str_contains($name, 'organic') || str_contains($name, 'food') || str_contains($name, 'compost')) return '/materials/organic.svg';
        if (str_contains($name, 'oil')) return '/materials/oil.svg';
        if (str_contains($name, 'battery') || str_contains($name, 'e-waste') || str_contains($name, 'electronics')) return '/materials/ewaste.svg';
        if (str_contains($name, 'textile') || str_contains($name, 'fabric')) return '/materials/textile.svg';
        if (str_contains($name, 'rubber') || str_contains($name, 'tire')) return '/materials/rubber.svg';
        if (str_contains($name, 'film') || str_contains($name, 'pet') || str_contains($name, 'hdpe') || str_contains($name, 'ldpe') || str_contains($name, 'pp') || str_contains($name, 'pvc') || str_contains($name, 'plastic')) return '/materials/plastic.svg';

        return '/materials/generic.svg';
    }

    private function impactNoteForMaterial(string $material): string
    {
        $name = strtolower($material);
        if (str_contains($name, 'organic')) return 'Suitable for composting or biogas recovery after quality sorting.';
        if (str_contains($name, 'glass')) return 'Ready for cleaning, crushing, and remelting into new glass products.';
        if (str_contains($name, 'aluminum') || str_contains($name, 'metal')) return 'High-value recyclable stream with strong energy-saving potential.';
        if (str_contains($name, 'paper') || str_contains($name, 'cardboard')) return 'Prepared for pulping, packaging reuse, and landfill diversion.';
        if (str_contains($name, 'plastic') || str_contains($name, 'pet') || str_contains($name, 'hdpe')) return 'Sorted plastic stream ready for washing, shredding, and pelletizing.';
        return 'Ready for reuse through the Waste to Value circular supply chain.';
    }
}
