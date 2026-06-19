<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('inventory_movements')) return;
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('hub_id')->nullable();
            $table->unsignedBigInteger('commodity_id')->nullable();
            $table->string('movement_type', 80);
            $table->decimal('quantity_kg', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['hub_id', 'commodity_id', 'movement_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
