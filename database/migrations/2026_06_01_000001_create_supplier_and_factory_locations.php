<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('supplier_locations')) {
            Schema::create('supplier_locations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('location_name', 255);
                $table->string('address', 255);
                $table->timestamps();
                $table->foreign('user_id')->references('user_id')->on('suppliers')->cascadeOnDelete();
                $table->index('user_id');
            });
        }

        if (! Schema::hasTable('factory_locations')) {
            Schema::create('factory_locations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('location_name', 255);
                $table->string('address', 255);
                $table->timestamps();
                $table->foreign('user_id')->references('user_id')->on('factories')->cascadeOnDelete();
                $table->index('user_id');
            });
        }

        if (Schema::hasTable('pickups') && ! Schema::hasColumn('pickups', 'supplier_location_id')) {
            Schema::table('pickups', function (Blueprint $table) {
                $table->unsignedBigInteger('supplier_location_id')->nullable()->after('supplier_user_id');
                $table->foreign('supplier_location_id')->references('id')->on('supplier_locations')->restrictOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pickups') && Schema::hasColumn('pickups', 'supplier_location_id')) {
            Schema::table('pickups', function (Blueprint $table) {
                $table->dropForeign(['supplier_location_id']);
                $table->dropColumn('supplier_location_id');
            });
        }
        Schema::dropIfExists('factory_locations');
        Schema::dropIfExists('supplier_locations');
    }
};
