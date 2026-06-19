<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pickups')) {
            Schema::table('pickups', function (Blueprint $table) {
                if (! Schema::hasColumn('pickups', 'pickup_location')) $table->string('pickup_location', 500)->nullable()->after('schedule_date');
                if (! Schema::hasColumn('pickups', 'material_condition')) $table->string('material_condition')->nullable()->after('pickup_location');
                if (! Schema::hasColumn('pickups', 'reported_contamination_percent')) $table->decimal('reported_contamination_percent', 5, 2)->nullable()->after('material_condition');
                if (! Schema::hasColumn('pickups', 'supplier_notes')) $table->text('supplier_notes')->nullable()->after('reported_contamination_percent');
                if (! Schema::hasColumn('pickups', 'departed_to_hub_at')) $table->dateTime('departed_to_hub_at')->nullable()->after('supplier_arrived_at');
            });
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive for graduation demo packages.
    }
};
