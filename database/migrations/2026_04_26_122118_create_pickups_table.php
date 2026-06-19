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
        Schema::create('pickups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('restrict');
            $table->unsignedBigInteger('supplier_user_id');
            $table->foreign('supplier_user_id')->references('user_id')->on('suppliers')->onDelete('restrict');
            $table->unsignedBigInteger('hub_id');
            $table->foreign('hub_id')->references('id')->on('hubs')->onDelete('restrict');
            $table->unsignedBigInteger('truck_id')->nullable();  // assigned at dispatch time, not at scheduling
            $table->foreign('truck_id')->references('id')->on('trucks')->nullOnDelete();
            $table->unsignedBigInteger('driver_employee_id')->nullable();  // assigned at dispatch time
            $table->foreign('driver_employee_id')->references('user_id')->on('employees')->nullOnDelete();
            $table->unsignedBigInteger('scheduled_by_admin_id');
            $table->foreign('scheduled_by_admin_id')->references('id')->on('users')->onDelete('restrict');
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->dateTime('schedule_date');
            $table->decimal('estimated_weight', 10, 2)->nullable();  // filled by driver at execution time
            $table->dateTime('started_at')->nullable();              // filled when driver begins pickup
            $table->timestamps();

            // Indexes
            $table->index(['hub_id', 'status', 'schedule_date']);
            $table->unique(['truck_id', 'schedule_date']);  // time slot lock — prevents double-booking
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pickups');
    }
};
