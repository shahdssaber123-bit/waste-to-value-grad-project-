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
        Schema::create('commodity_prices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('commodity_id');
            $table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('cascade');
            $table->decimal('price', 10, 2);                      // base market price per kg
            $table->dateTime('effective_from');
            $table->dateTime('effective_to')->nullable();          // NULL = currently active
            $table->unsignedBigInteger('created_by_admin_id');
            $table->foreign('created_by_admin_id')->references('id')->on('users')->onDelete('restrict');
            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index(['commodity_id', 'effective_from']);
            $table->index(['commodity_id', 'effective_to']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commodity_prices');
    }
};
