<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hub_commodity', function (Blueprint $table) {
            if (! Schema::hasColumn('hub_commodity', 'reserved_inventory_total')) {
                $table->decimal('reserved_inventory_total', 12, 2)->default(0)->after('current_inventory_total');
            }
        });
    }

    public function down(): void
    {
        Schema::table('hub_commodity', function (Blueprint $table) {
            if (Schema::hasColumn('hub_commodity', 'reserved_inventory_total')) {
                $table->dropColumn('reserved_inventory_total');
            }
        });
    }
};
