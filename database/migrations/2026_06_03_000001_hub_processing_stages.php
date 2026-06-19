<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add delivered_to_hub_id to pickups (driver selects actual delivery hub)
        if (Schema::hasTable('pickups') && ! Schema::hasColumn('pickups', 'delivered_to_hub_id')) {
            Schema::table('pickups', function (Blueprint $table) {
                $table->unsignedBigInteger('delivered_to_hub_id')->nullable()->after('hub_id');
                $table->foreign('delivered_to_hub_id')->references('id')->on('hubs')->nullOnDelete();
            });
        }

        // Add granular stage tracking and pricing fields to inbound_records
        if (Schema::hasTable('inbound_records')) {
            Schema::table('inbound_records', function (Blueprint $table) {
                if (! Schema::hasColumn('inbound_records', 'received_at')) {
                    $table->dateTime('received_at')->nullable()->after('status');
                }
                if (! Schema::hasColumn('inbound_records', 'inspected_by_hub_manager_id')) {
                    $table->unsignedBigInteger('inspected_by_hub_manager_id')->nullable()->after('received_at');
                    $table->foreign('inspected_by_hub_manager_id')->references('id')->on('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('inbound_records', 'tier1_weighted_at')) {
                    $table->dateTime('tier1_weighted_at')->nullable()->after('inspected_by_hub_manager_id');
                }
                if (! Schema::hasColumn('inbound_records', 'sorting_started_at')) {
                    $table->dateTime('sorting_started_at')->nullable()->after('tier1_weighted_at');
                }
                if (! Schema::hasColumn('inbound_records', 'sorting_completed_at')) {
                    $table->dateTime('sorting_completed_at')->nullable()->after('sorting_started_at');
                }
                if (! Schema::hasColumn('inbound_records', 'sorter_names')) {
                    $table->text('sorter_names')->nullable()->after('sorting_completed_at');
                }
                if (! Schema::hasColumn('inbound_records', 'tier2_weighted_at')) {
                    $table->dateTime('tier2_weighted_at')->nullable()->after('sorter_names');
                }
                if (! Schema::hasColumn('inbound_records', 'pricing_unit_price')) {
                    $table->decimal('pricing_unit_price', 10, 2)->nullable()->after('tier2_weighted_at');
                }
                if (! Schema::hasColumn('inbound_records', 'pricing_total_amount')) {
                    $table->decimal('pricing_total_amount', 12, 2)->nullable()->after('pricing_unit_price');
                }
                if (! Schema::hasColumn('inbound_records', 'supplier_invoice_number')) {
                    $table->string('supplier_invoice_number')->nullable()->after('pricing_total_amount');
                }
                if (! Schema::hasColumn('inbound_records', 'supplier_invoice_generated_at')) {
                    $table->dateTime('supplier_invoice_generated_at')->nullable()->after('supplier_invoice_number');
                }
            });

            // Expand the status enum to include granular stages
            DB::statement("ALTER TABLE inbound_records MODIFY COLUMN status ENUM(
                'received',
                'weighted_tier1',
                'sorting',
                'sorted',
                'weighted_tier2',
                'quality_checked',
                'baled',
                'completed',
                'rejected'
            ) NOT NULL DEFAULT 'received'");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pickups') && Schema::hasColumn('pickups', 'delivered_to_hub_id')) {
            Schema::table('pickups', function (Blueprint $table) {
                $table->dropForeign(['delivered_to_hub_id']);
                $table->dropColumn('delivered_to_hub_id');
            });
        }

        if (Schema::hasTable('inbound_records')) {
            $columns = [
                'received_at', 'inspected_by_hub_manager_id', 'tier1_weighted_at',
                'sorting_started_at', 'sorting_completed_at', 'sorter_names', 'tier2_weighted_at',
                'pricing_unit_price', 'pricing_total_amount', 'supplier_invoice_number',
                'supplier_invoice_generated_at',
            ];

            Schema::table('inbound_records', function (Blueprint $table) use ($columns) {
                if (Schema::hasColumn('inbound_records', 'inspected_by_hub_manager_id')) {
                    $table->dropForeign(['inspected_by_hub_manager_id']);
                }
                foreach ($columns as $col) {
                    if (Schema::hasColumn('inbound_records', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });

            DB::statement("ALTER TABLE inbound_records MODIFY COLUMN status ENUM(
                'received', 'quality_checked', 'completed', 'rejected'
            ) NOT NULL DEFAULT 'received'");
        }
    }
};
