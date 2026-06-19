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
                if (! Schema::hasColumn('pickups', 'proof_note')) $table->text('proof_note')->nullable()->after('estimated_weight');
                if (! Schema::hasColumn('pickups', 'completed_at')) $table->dateTime('completed_at')->nullable()->after('started_at');
                if (! Schema::hasColumn('pickups', 'supplier_arrived_at')) $table->dateTime('supplier_arrived_at')->nullable()->after('started_at');
                if (! Schema::hasColumn('pickups', 'hub_arrived_at')) $table->dateTime('hub_arrived_at')->nullable()->after('supplier_arrived_at');
            });
        }

        if (Schema::hasTable('inbound_records')) {
            Schema::table('inbound_records', function (Blueprint $table) {
                if (! Schema::hasColumn('inbound_records', 'quality_notes')) $table->text('quality_notes')->nullable();
                if (! Schema::hasColumn('inbound_records', 'sorter_count')) $table->unsignedInteger('sorter_count')->default(1);
                if (! Schema::hasColumn('inbound_records', 'decontamination_notes')) $table->text('decontamination_notes')->nullable();
            });
        }

        if (Schema::hasTable('bale_cubes')) {
            Schema::table('bale_cubes', function (Blueprint $table) {
                if (! Schema::hasColumn('bale_cubes', 'bale_code')) $table->string('bale_code')->nullable()->unique();
                if (! Schema::hasColumn('bale_cubes', 'quality_notes')) $table->text('quality_notes')->nullable();
            });
        }
    }

    public function down(): void
    {
        // Non-destructive for graduation demo packages.
    }
};
