<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\HubCommodity;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MaterialRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DB::table('material_requests')
            ->join('commodities', 'commodities.id', '=', 'material_requests.commodity_id')
            ->leftJoin('hubs', 'hubs.id', '=', 'material_requests.matched_hub_id')
            ->leftJoin('users', 'users.id', '=', 'material_requests.factory_user_id')
            ->select(
                'material_requests.*',
                'commodities.title as material',
                'hubs.location as matched_hub',
                DB::raw("CONCAT(users.fname, ' ', users.lname) as factory_name")
            );

        if ($request->user() && $request->user()->role === 'factory') {
            $query->where('factory_user_id', $request->user()->id);
        }

        return response()->json([
            'message' => 'Material requests retrieved.',
            'data' => $query->latest('material_requests.created_at')->paginate((int) $request->integer('per_page', 5)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'factory_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'commodity_id' => ['required', 'integer', 'exists:commodities,id'],
            'preferred_grade' => ['nullable', 'in:A,B,C'],
            'quantity_kg' => ['required', 'numeric', 'min:1'],
            'preferred_delivery_date' => ['nullable', 'date'],
            'company_details' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $factoryUserId = $this->resolveFactoryUserId($request, $validated);
        if (! $factoryUserId) {
            return response()->json([
                'message' => 'Please select a factory account before creating the material request.',
                'errors' => ['factory_user_id' => ['A valid factory account is required.']],
            ], 422);
        }

        $quantity = (float) $validated['quantity_kg'];
        $commodityId = (int) $validated['commodity_id'];
        $grade = $validated['preferred_grade'] ?? 'A';

        try {
            $result = DB::transaction(function () use ($request, $factoryUserId, $commodityId, $quantity, $grade, $validated) {
                $match = $this->findBestHubForReservation($commodityId, $quantity);
                $status = $match ? 'matched' : 'requested';

                if ($match) {
                    $this->reserveStock($match->hub_id, $commodityId, $quantity);
                }

                $payload = [
                    'factory_user_id' => $factoryUserId,
                    'commodity_id' => $commodityId,
                    'preferred_grade' => $grade,
                    'quantity_kg' => $quantity,
                    'preferred_delivery_date' => $validated['preferred_delivery_date'] ?? null,
                    'status' => $status,
                    'matched_hub_id' => $match?->hub_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                if (Schema::hasColumn('material_requests', 'company_details')) {
                    $payload['company_details'] = $validated['company_details'] ?? null;
                }
                if (Schema::hasColumn('material_requests', 'notes')) {
                    $payload['notes'] = $validated['notes'] ?? null;
                }

                $id = DB::table('material_requests')->insertGetId($payload);

                $this->logAction($request->user()?->id, 'created_material_request', 'MaterialRequest', $id, [
                    'quantity_kg' => $quantity,
                    'matched_hub_id' => $match?->hub_id,
                    'company_details' => $validated['company_details'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]);

                $this->notifyAdmins('New factory material request', 'A factory requested '.number_format($quantity).'kg of material.', '/admin');

                return ['row' => $this->materialRequestRow($id), 'match' => $match, 'status' => $status];
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'We could not create this material request right now. Please review the selected material, quantity and stock availability, then try again.',
            ], 422);
        }

        return response()->json([
            'message' => $result['match']
                ? 'Material request created and stock reserved at the best available hub.'
                : 'Material request created and waiting for stock match.',
            'data' => $result['row'],
        ], 201);
    }

    public function match(Request $request, int $id): JsonResponse
    {
        try {
            $row = DB::transaction(function () use ($request, $id) {
                $requestRow = DB::table('material_requests')->where('id', $id)->lockForUpdate()->first();
                abort_if(! $requestRow, 404);

                if (! in_array($requestRow->status, ['requested', 'matched'], true)) {
                    return $this->materialRequestRow($id);
                }

                $match = $this->findBestHubForReservation((int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                if (! $match) {
                    throw new \RuntimeException('No hub has enough available stock for this request yet.');
                }

                if (! $requestRow->matched_hub_id) {
                    $this->reserveStock($match->hub_id, (int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                }

                DB::table('material_requests')->where('id', $id)->update([
                    'status' => 'matched',
                    'matched_hub_id' => $match->hub_id,
                    'updated_at' => now(),
                ]);

                $this->logAction($request->user()?->id, 'matched_material_request', 'MaterialRequest', $id, ['hub_id' => $match->hub_id]);
                $this->notifyUser((int) $requestRow->factory_user_id, 'Material request matched', 'Your material request was matched with an available hub.', '/factory');

                return $this->materialRequestRow($id);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => $e->getMessage() ?: 'Material request could not be matched.'], 422);
        }

        return response()->json(['message' => 'Material request matched successfully.', 'data' => $row]);
    }

    public function schedule(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_date' => ['nullable', 'date'],
        ]);

        try {
            $result = DB::transaction(function () use ($request, $id, $validated) {
                $requestRow = DB::table('material_requests')->where('id', $id)->lockForUpdate()->first();
                abort_if(! $requestRow, 404);

                if (! $requestRow->matched_hub_id) {
                    $match = $this->findBestHubForReservation((int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                    if (! $match) throw new \RuntimeException('No hub is ready for scheduling this request yet.');
                    $this->reserveStock($match->hub_id, (int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                    DB::table('material_requests')->where('id', $id)->update(['matched_hub_id' => $match->hub_id]);
                    $requestRow->matched_hub_id = $match->hub_id;
                }

                $contract = $this->factoryContract((int) $requestRow->factory_user_id, (int) $requestRow->commodity_id);
                $delivery = OutboundDelivery::firstOrCreate(
                    ['idempotency_key' => 'material-request-'.$id],
                    [
                        'contract_id' => $contract->id,
                        'hub_id' => $requestRow->matched_hub_id,
                        'commodity_id' => $requestRow->commodity_id,
                        'status' => 'scheduled',
                        'quantity_kg' => $requestRow->quantity_kg,
                        'scheduled_date' => $validated['scheduled_date'] ?? ($requestRow->preferred_delivery_date ? $requestRow->preferred_delivery_date.' 09:00:00' : now()->addDay()),
                    ]
                );

                $update = ['status' => 'scheduled', 'updated_at' => now()];
                if (Schema::hasColumn('material_requests', 'outbound_delivery_id')) $update['outbound_delivery_id'] = $delivery->id;
                DB::table('material_requests')->where('id', $id)->update($update);

                $this->logAction($request->user()?->id, 'scheduled_material_delivery', 'MaterialRequest', $id, ['outbound_delivery_id' => $delivery->id]);
                $this->notifyUser((int) $requestRow->factory_user_id, 'Delivery scheduled', 'Your requested material has been scheduled for delivery.', '/factory');

                return ['request' => $this->materialRequestRow($id), 'delivery' => $delivery->fresh()];
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => $e->getMessage() ?: 'Delivery could not be scheduled.'], 422);
        }

        return response()->json(['message' => 'Delivery scheduled successfully.', 'data' => $result]);
    }


    public function ship(Request $request, int $id): JsonResponse
    {
        try {
            $result = DB::transaction(function () use ($request, $id) {
                $requestRow = DB::table('material_requests')->where('id', $id)->lockForUpdate()->first();
                abort_if(! $requestRow, 404);

                if (! in_array($requestRow->status, ['scheduled', 'matched'], true)) {
                    throw new \RuntimeException('Only matched or scheduled material requests can be shipped.');
                }

                $delivery = $this->deliveryForMaterialRequest($requestRow);
                if ($delivery->status === 'scheduled') {
                    $delivery->update(['status' => 'shipped']);
                    $this->releaseReservedAndDeductStock((int) $requestRow->matched_hub_id, (int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                }

                $update = ['status' => 'shipped', 'updated_at' => now()];
                if (Schema::hasColumn('material_requests', 'outbound_delivery_id')) $update['outbound_delivery_id'] = $delivery->id;
                DB::table('material_requests')->where('id', $id)->update($update);

                $this->logAction($request->user()?->id, 'shipped_material_request', 'MaterialRequest', $id, ['delivery_id' => $delivery->id, 'external_carrier' => 'Trella/Trukker']);
                $this->notifyUser((int) $requestRow->factory_user_id, 'Delivery shipped', 'Your material has left the hub through the external carrier. Please confirm receipt when it arrives.', '/factory');

                return ['request' => $this->materialRequestRow($id), 'delivery' => $delivery->fresh()];
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => $e->getMessage() ?: 'Delivery could not be shipped.'], 422);
        }

        return response()->json(['message' => 'Delivery shipped. Factory confirmation is now required before invoicing.', 'data' => $result]);
    }

    public function adminConfirm(Request $request, int $id): JsonResponse
    {
        try {
            $result = DB::transaction(function () use ($request, $id) {
                $requestRow = DB::table('material_requests')->where('id', $id)->lockForUpdate()->first();
                abort_if(! $requestRow, 404);

                $delivery = $this->deliveryForMaterialRequest($requestRow);
                if ($delivery->status !== 'shipped') {
                    throw new \RuntimeException('Only shipped deliveries can be confirmed.');
                }

                $delivery->update([
                    'status' => 'delivered',
                    'confirmed_at' => now(),
                    'rejection_window_end' => now()->addHours(48),
                ]);

                \App\Jobs\AutoConfirmDelivery::dispatch($delivery->id)->delay(now()->addHours(48));

                $update = ['status' => 'delivered', 'updated_at' => now()];
                if (Schema::hasColumn('material_requests', 'outbound_delivery_id')) $update['outbound_delivery_id'] = $delivery->id;
                DB::table('material_requests')->where('id', $id)->update($update);

                $this->logAction($request->user()?->id, 'admin_confirmed_material_receipt', 'MaterialRequest', $id, ['delivery_id' => $delivery->id, 'rejection_window_hours' => 48]);
                $this->notifyUser((int) $requestRow->factory_user_id, 'Receipt confirmation recorded', 'The 48-hour rejection window is now open. The invoice is generated after the window closes.', '/factory');

                return ['request' => $this->materialRequestRow($id), 'delivery' => $delivery->fresh()];
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => $e->getMessage() ?: 'Delivery could not be confirmed.'], 422);
        }

        return response()->json(['message' => 'Receipt confirmed. Invoice waits for the 48-hour rejection window.', 'data' => $result]);
    }

    /**
     * Deprecated direct delivery endpoint intentionally removed from routes and controller flow.
     * Use match -> schedule -> ship -> adminConfirm/factory confirm -> 48h auto-confirm instead.
     */

    public function reject(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        try {
            $row = DB::transaction(function () use ($request, $id, $validated) {
                $requestRow = DB::table('material_requests')->where('id', $id)->lockForUpdate()->first();
                abort_if(! $requestRow, 404);

                if ($requestRow->matched_hub_id && in_array($requestRow->status, ['matched', 'scheduled', 'requested'], true)) {
                    $this->releaseReservationOnly((int) $requestRow->matched_hub_id, (int) $requestRow->commodity_id, (float) $requestRow->quantity_kg);
                }

                $update = ['status' => 'cancelled', 'updated_at' => now()];
                if (Schema::hasColumn('material_requests', 'rejection_reason')) $update['rejection_reason'] = $validated['reason'] ?? 'Rejected by admin.';
                DB::table('material_requests')->where('id', $id)->update($update);

                $this->logAction($request->user()?->id, 'rejected_material_request', 'MaterialRequest', $id, ['reason' => $validated['reason'] ?? null]);
                $this->notifyUser((int) $requestRow->factory_user_id, 'Material request declined', 'The platform could not approve this material request right now.', '/factory');

                return $this->materialRequestRow($id);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'Material request could not be rejected.'], 422);
        }

        return response()->json(['message' => 'Material request rejected and reservation released.', 'data' => $row]);
    }

    private function resolveFactoryUserId(Request $request, array $validated): ?int
    {
        $user = $request->user();

        if ($user && $user->role === 'factory') {
            return $user->id;
        }

        if (! empty($validated['factory_user_id'])) {
            $exists = User::where('id', $validated['factory_user_id'])->where('role', 'factory')->exists();
            return $exists ? (int) $validated['factory_user_id'] : null;
        }

        return User::where('role', 'factory')->value('id');
    }

    private function findBestHubForReservation(int $commodityId, float $quantity): ?HubCommodity
    {
        return HubCommodity::where('commodity_id', $commodityId)
            ->whereRaw('(current_inventory_total - COALESCE(reserved_inventory_total, 0)) >= ?', [$quantity])
            ->orderByDesc(DB::raw('(current_inventory_total - COALESCE(reserved_inventory_total, 0))'))
            ->lockForUpdate()
            ->first();
    }

    private function reserveStock(int $hubId, int $commodityId, float $quantity): void
    {
        DB::table('hub_commodity')
            ->where('hub_id', $hubId)
            ->where('commodity_id', $commodityId)
            ->update([
                'reserved_inventory_total' => DB::raw('COALESCE(reserved_inventory_total, 0) + '.$quantity),
                'updated_at' => now(),
            ]);
    }

    private function releaseReservationOnly(int $hubId, int $commodityId, float $quantity): void
    {
        DB::table('hub_commodity')
            ->where('hub_id', $hubId)
            ->where('commodity_id', $commodityId)
            ->update([
                'reserved_inventory_total' => DB::raw('GREATEST(COALESCE(reserved_inventory_total, 0) - '.$quantity.', 0)'),
                'updated_at' => now(),
            ]);
    }

    private function releaseReservedAndDeductStock(int $hubId, int $commodityId, float $quantity): void
    {
        DB::table('hub_commodity')
            ->where('hub_id', $hubId)
            ->where('commodity_id', $commodityId)
            ->update([
                'reserved_inventory_total' => DB::raw('GREATEST(COALESCE(reserved_inventory_total, 0) - '.$quantity.', 0)'),
                'current_inventory_total' => DB::raw('GREATEST(current_inventory_total - '.$quantity.', 0)'),
                'updated_at' => now(),
            ]);

        if (Schema::hasTable('inventory_movements')) {
            DB::table('inventory_movements')->insert([
                'hub_id' => $hubId,
                'commodity_id' => $commodityId,
                'movement_type' => 'outbound_delivery',
                'quantity_kg' => -$quantity,
                'notes' => 'Factory material request delivered and reserved stock released.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function factoryContract(int $factoryUserId, int $commodityId): Contract
    {
        return Contract::firstOrCreate(
            ['party_id' => $factoryUserId, 'party_type' => 'factory', 'commodity_id' => $commodityId],
            ['status' => 'active', 'payment_terms' => 'Bank transfer within 14 days', 'material_type' => DB::table('commodities')->where('id', $commodityId)->value('title')]
        );
    }

    private function deliveryForMaterialRequest(object $requestRow): OutboundDelivery
    {
        $deliveryId = Schema::hasColumn('material_requests', 'outbound_delivery_id') ? ($requestRow->outbound_delivery_id ?? null) : null;
        if ($deliveryId && ($delivery = OutboundDelivery::with('contract')->find($deliveryId))) return $delivery;

        $contract = $this->factoryContract((int) $requestRow->factory_user_id, (int) $requestRow->commodity_id);
        return OutboundDelivery::firstOrCreate(
            ['idempotency_key' => 'material-request-'.$requestRow->id],
            [
                'contract_id' => $contract->id,
                'hub_id' => $requestRow->matched_hub_id,
                'commodity_id' => $requestRow->commodity_id,
                'status' => 'scheduled',
                'quantity_kg' => $requestRow->quantity_kg,
                'scheduled_date' => $requestRow->preferred_delivery_date ? $requestRow->preferred_delivery_date.' 09:00:00' : now(),
            ]
        );
    }

    private function materialRequestRow(int $id): ?object
    {
        return DB::table('material_requests')
            ->join('commodities', 'commodities.id', '=', 'material_requests.commodity_id')
            ->leftJoin('hubs', 'hubs.id', '=', 'material_requests.matched_hub_id')
            ->leftJoin('users', 'users.id', '=', 'material_requests.factory_user_id')
            ->where('material_requests.id', $id)
            ->select('material_requests.*', 'commodities.title as material', 'hubs.location as matched_hub', DB::raw("CONCAT(users.fname, ' ', users.lname) as factory_name"))
            ->first();
    }

    private function logAction(?int $userId, string $action, string $entityType, int $entityId, array $meta = []): void
    {
        if (! Schema::hasTable('activity_logs')) return;
        DB::table('activity_logs')->insert([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'meta' => json_encode($meta),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function notifyAdmins(string $title, string $message, string $url = '/admin'): void
    {
        foreach (User::where('role', 'super_admin')->limit(10)->get() as $admin) {
            $this->notifyUser($admin->id, $title, $message, $url);
        }
    }

    private function notifyUser(int $userId, string $title, string $message, string $url = '/'): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'platform.workflow',
            'notifiable_type' => User::class,
            'notifiable_id' => $userId,
            'data' => json_encode(['title' => $title, 'message' => $message, 'url' => $url]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
