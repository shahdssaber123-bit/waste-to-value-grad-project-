<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('hub_commodity', function (Blueprint $table) {
            $table->unsignedBigInteger('hub_id');
            $table->unsignedBigInteger('commodity_id');
            $table->primary(['hub_id', 'commodity_id']);
            $table->foreign('hub_id')->references('id')->on('hubs')->onDelete('cascade');
            $table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('cascade');
            $table->decimal('current_inventory_total', 12, 2)->default(0.00);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hub_commodity');
    }
};
