<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Hub;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use App\Models\Pickup;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AdminLiveSnapshotController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->integer('limit', 200), 25), 250);
        $cacheKey = 'admin-live-snapshot-' . $limit;

        if (! $request->boolean('fresh') && Cache::has($cacheKey)) {
            return response()->json(Cache::get($cacheKey));
        }

        $payload = [
            'message' => 'Admin live snapshot loaded successfully.',
            'data' => [
                'users' => $this->safe(fn () => User::query()
                    ->with(['employee', 'supplier', 'factoryProfile'])
                    ->latest('id')
                    ->limit($limit)
                    ->get()),

                'applications' => $this->safe(fn () => Application::query()->latest('id')->limit($limit)->get()),
                'commodities' => $this->safe(fn () => Commodity::query()->with('currentPrice')->latest('id')->limit($limit)->get()),
                'hubs' => $this->safe(fn () => Hub::query()->latest('id')->limit($limit)->get()),
                'trucks' => $this->safe(fn () => Truck::query()->with('hub')->latest('id')->limit($limit)->get()),
                'contracts' => $this->safe(fn () => Contract::query()->with('commodity')->latest('id')->limit($limit)->get()),
                'pickups' => $this->safe(fn () => Pickup::query()
                    ->with(['contract', 'supplier.user', 'hub', 'truck', 'driver.user'])
                    ->latest('id')
                    ->limit($limit)
                    ->get()),

                'invoices' => $this->safe(fn () => Invoice::query()->latest('id')->limit($limit)->get()),
                'outbound' => $this->safe(fn () => OutboundDelivery::query()->with(['hub', 'commodity'])->latest('id')->limit($limit)->get()),
                'notifications' => $this->safe(fn () => DB::table('notifications')->latest('created_at')->limit(50)->get()),
                'materialRequests' => $this->safe(fn () => Schema::hasTable('material_requests') ? DB::table('material_requests')->latest('id')->limit($limit)->get() : collect()),
                'adminMessages' => $this->adminMessages($limit),
            ],
        ];

        Cache::put($cacheKey, $payload, now()->addSeconds(8));

        return response()->json($payload);
    }

    private function safe(callable $callback)
    {
        try {
            return $callback();
        } catch (Throwable $e) {
            report($e);
            return collect();
        }
    }

    private function adminMessages(int $limit)
    {
        try {
            if (Schema::hasTable('supplier_messages')) {
                $query = DB::table('supplier_messages');

                if (Schema::hasColumn('supplier_messages', 'replied_at')) {
                    $query->whereNull('replied_at');
                }

                return $query->latest('id')->limit($limit)->get();
            }

            if (Schema::hasTable('messages')) {
                return DB::table('messages')->latest('id')->limit($limit)->get();
            }

            return collect();
        } catch (Throwable $e) {
            report($e);
            return collect();
        }
    }
}
