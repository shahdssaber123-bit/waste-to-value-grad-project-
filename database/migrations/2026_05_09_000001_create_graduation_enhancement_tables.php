<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('factory_user_id');
            $table->foreign('factory_user_id')->references('user_id')->on('factories')->cascadeOnDelete();
            $table->unsignedBigInteger('commodity_id');
            $table->foreign('commodity_id')->references('id')->on('commodities')->restrictOnDelete();
            $table->string('preferred_grade', 10)->default('A');
            $table->decimal('quantity_kg', 12, 2);
            $table->date('preferred_delivery_date')->nullable();
            $table->enum('status', ['draft', 'requested', 'matched', 'matched_reserved', 'scheduled', 'fulfilled', 'cancelled'])->default('requested');
            $table->unsignedBigInteger('matched_hub_id')->nullable();
            $table->foreign('matched_hub_id')->references('id')->on('hubs')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pickup_problem_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pickup_id');
            $table->foreign('pickup_id')->references('id')->on('pickups')->cascadeOnDelete();
            $table->unsignedBigInteger('driver_employee_id');
            $table->foreign('driver_employee_id')->references('user_id')->on('employees')->cascadeOnDelete();
            $table->string('problem_type');
            $table->text('description')->nullable();
            $table->enum('status', ['open', 'reviewing', 'resolved'])->default('open');
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('pickup_problem_reports');
        Schema::dropIfExists('material_requests');
    }
};
