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
        Schema::create('inbound_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pickup_id')->unique();   // one record per pickup
            $table->foreign('pickup_id')->references('id')->on('pickups')->onDelete('restrict');
            $table->unsignedBigInteger('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('restrict');
            $table->unsignedBigInteger('hub_id');
            $table->foreign('hub_id')->references('id')->on('hubs')->onDelete('restrict');
            $table->decimal('tier1_weight', 10, 2)->nullable();
            $table->decimal('tier2_weight', 10, 2)->nullable();
            $table->decimal('contamination_ratio', 5, 4)->nullable();  // stored as fraction e.g. 0.0833
            $table->decimal('accepted_weight', 10, 2)->nullable();
            $table->enum('status', ['received', 'quality_checked', 'completed', 'rejected'])
                ->default('received');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inbound_records');
    }
};
