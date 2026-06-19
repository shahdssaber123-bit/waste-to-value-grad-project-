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
        Schema::create('outbound_deliveries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('restrict');
            $table->unsignedBigInteger('hub_id');
            $table->foreign('hub_id')->references('id')->on('hubs')->onDelete('restrict');
            $table->unsignedBigInteger('commodity_id');
            $table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('restrict');
            $table->enum('status', ['scheduled', 'shipped', 'delivered', 'confirmed', 'rejected'])
                ->default('scheduled');
            $table->decimal('quantity_kg', 12, 2);             // snapshot of inventory dispatched
            $table->dateTime('scheduled_date');
            $table->dateTime('confirmed_at')->nullable();       // when factory confirms receipt
            $table->dateTime('rejection_window_end')->nullable(); // confirmed_at + 48 hours
            $table->dateTime('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->string('idempotency_key', 100)->unique()->nullable(); // prevents duplicate auto-creation
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('outbound_deliveries');
    }
};
