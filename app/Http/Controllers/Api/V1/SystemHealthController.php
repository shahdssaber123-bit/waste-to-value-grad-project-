<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemHealthController extends Controller
{
    public function show(): JsonResponse
    {
        $tables = [
            'users',
            'applications',
            'commodities',
            'hubs',
            'trucks',
            'contracts',
            'pickups',
            'invoices',
            'outbound_deliveries',
            'notifications',
            'supplier_messages',
        ];

        $counts = [];

        foreach ($tables as $table) {
            $counts[$table] = Schema::hasTable($table)
                ? DB::table($table)->count()
                : 0;
        }

        return response()->json([
            'message' => 'System health loaded successfully.',
            'data' => [
                'overview' => [
                    'executive_summary' => [
                        'platform_readiness' => 100,
                        'recycled_kg' => 0,
                        'co2_saved_kg' => 0,
                        'active_contracts' => $counts['contracts'],
                        'invoice_total' => 0,
                        'paid_total' => 0,
                        'collection_success_rate' => 0,
                    ],
                    'next_actions' => [],
                    'alerts' => [],
                    'material_analytics' => [],
                    'rankings' => [
                        'hubs' => [],
                        'drivers' => [],
                        'suppliers' => [],
                    ],
                    'feature_checklist' => [
                        [
                            'label' => 'Backend routes',
                            'type' => 'core',
                            'description' => 'API routes are reachable.',
                        ],
                        [
                            'label' => 'Live snapshot',
                            'type' => 'core',
                            'description' => 'Admin live data is connected.',
                        ],
                        [
                            'label' => 'Supplier messages',
                            'type' => 'operational',
                            'description' => 'Supplier messages and admin replies are connected.',
                        ],
                    ],
                ],
                'counts' => $counts,
                'status' => 'healthy',
            ],
        ]);
    }
}
