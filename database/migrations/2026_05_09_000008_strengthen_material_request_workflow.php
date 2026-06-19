<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('material_requests')) {
            return;
        }

        Schema::table('material_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('material_requests', 'company_details')) {
                $table->string('company_details', 500)->nullable()->after('preferred_delivery_date');
            }
            if (! Schema::hasColumn('material_requests', 'notes')) {
                $table->text('notes')->nullable()->after('company_details');
            }
            if (! Schema::hasColumn('material_requests', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('notes');
            }
            if (! Schema::hasColumn('material_requests', 'outbound_delivery_id')) {
                $table->unsignedBigInteger('outbound_delivery_id')->nullable()->after('matched_hub_id');
            }
            if (! Schema::hasColumn('material_requests', 'invoice_id')) {
                $table->unsignedBigInteger('invoice_id')->nullable()->after('outbound_delivery_id');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY status ENUM('draft','requested','matched','matched_reserved','scheduled','fulfilled','cancelled','rejected') NOT NULL DEFAULT 'requested'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('material_requests')) {
            return;
        }

        Schema::table('material_requests', function (Blueprint $table) {
            foreach (['invoice_id', 'outbound_delivery_id', 'rejection_reason', 'notes', 'company_details'] as $column) {
                if (Schema::hasColumn('material_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
