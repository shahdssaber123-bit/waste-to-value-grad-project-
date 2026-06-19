<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Hub;
use App\Models\Pickup;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class SupplierPortalController extends Controller
{
    public function pickups(Request $request): JsonResponse
    {
        $user = $request->user();

        $pickups = Pickup::with([
                'contract.commodity',
                'hub',
                'truck',
                'driver.user',
                'inboundRecord.baleCubes'
            ])
            ->where('supplier_user_id', $user->id)
            ->latest('schedule_date')
            ->paginate((int) $request->integer('per_page', 5));

        return response()->json([
            'message' => 'Supplier pickups loaded.',
            'data' => $pickups,
        ]);
    }

    public function materials(Request $request): JsonResponse
    {
        $contracts = Contract::with(['commodity.currentPrice'])
            ->where('party_type', 'supplier')
            ->where('party_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->integer('per_page', 5));

        return response()->json([
            'message' => 'Supplier materials loaded.',
            'data' => $contracts,
        ]);
    }

    public function requestPickup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'commodity_id' => ['nullable', 'integer', 'exists:commodities,id'],
            'material' => ['nullable', 'string', 'max:255'],
            'estimated_weight' => ['required', 'numeric', 'min:1'],
            'schedule_date' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:500'],
            'condition' => ['nullable', 'string', 'max:255'],
            'contamination' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();

        $contractQuery = Contract::with('commodity')
            ->where('party_type', 'supplier')
            ->where('party_id', $user->id)
            ->where('status', 'active');

        if (!empty($validated['commodity_id'])) {
            $contractQuery->where('commodity_id', $validated['commodity_id']);
        }

        $contract = $contractQuery->first();

        if (!$contract) {
            $contract = Contract::with('commodity')
                ->where('party_type', 'supplier')
                ->where('party_id', $user->id)
                ->latest()
                ->first();
        }

        if (!$contract) {
            return response()->json([
                'message' => 'No supplier contract exists yet. Please ask the admin to create a contract first.',
            ], 422);
        }

        $hubId = DB::table('hub_commodity')
            ->join('hubs', 'hubs.id', '=', 'hub_commodity.hub_id')
            ->where('hub_commodity.commodity_id', $contract->commodity_id)
            ->select(
                'hub_commodity.hub_id',
                DB::raw('(hubs.capacity - COALESCE(hub_commodity.current_inventory_total, 0) - COALESCE(hub_commodity.reserved_inventory_total, 0)) as free_capacity')
            )
            ->whereRaw(
                '(hubs.capacity - COALESCE(hub_commodity.current_inventory_total, 0) - COALESCE(hub_commodity.reserved_inventory_total, 0)) >= ?',
                [(float) $validated['estimated_weight']]
            )
            ->orderByDesc('free_capacity')
            ->value('hub_id') ?: Hub::query()->orderByDesc('capacity')->value('id');

        if (!$hubId) {
            return response()->json([
                'message' => 'No hub exists to receive this pickup.'
            ], 422);
        }

        $pickup = Pickup::create([
            'contract_id' => $contract->id,
            'supplier_user_id' => $user->id,
            'hub_id' => $hubId,
            'scheduled_by_admin_id' => User::where('role', 'super_admin')->value('id') ?: $user->id,
            'status' => 'scheduled',
            'schedule_date' => $validated['schedule_date'],
            'estimated_weight' => $validated['estimated_weight'],
            'truck_id' => null,
            'driver_employee_id' => null,
            'pickup_location' => $validated['location'] ?? null,
            'material_condition' => $validated['condition'] ?? null,
            'reported_contamination_percent' => $validated['contamination'] ?? null,
            'supplier_notes' => $validated['notes'] ?? null,
        ]);

        DB::table('activity_logs')->insert([
            'user_id' => $user->id,
            'action' => 'supplier_requested_pickup',
            'entity_type' => 'Pickup',
            'entity_id' => $pickup->id,
            'meta' => json_encode([
                'material' => $validated['material'] ?? $contract->commodity?->title,
                'location' => $validated['location'] ?? null,
                'condition' => $validated['condition'] ?? null,
                'contamination' => $validated['contamination'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (User::where('role', 'super_admin')->limit(5)->get() as $admin) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'supplier.pickup.requested',
                'notifiable_type' => User::class,
                'notifiable_id' => $admin->id,
                'data' => json_encode([
                    'title' => 'New supplier pickup request',
                    'message' => $user->fname . ' requested a pickup for ' . ($contract->commodity?->title ?: 'material'),
                    'url' => '/admin',
                ]),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Pickup request created and sent to operations.',
            'data' => $pickup->load(['contract.commodity', 'hub']),
        ], 201);
    }

    public function messageAdmin(Request $request): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string'],
            'subject' => ['nullable', 'string'],
        ]);

        if (!Schema::hasTable('supplier_messages')) {
            return response()->json([
                'message' => 'Supplier messages table is missing.',
            ], 500);
        }

        DB::table('supplier_messages')->insert([
            'supplier_id' => optional($request->user()->supplier)->id,
            'user_id' => $request->user()->id,
            'subject' => $request->subject,
            'message' => $request->message,
            'admin_reply' => null,
            'replied_by' => null,
            'replied_at' => null,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Message sent successfully.',
        ]);
    }
}
