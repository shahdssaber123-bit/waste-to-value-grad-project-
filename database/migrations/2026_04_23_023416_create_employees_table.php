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
        Schema::create('employees', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->primary();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('role', 50);                     // 'driver', 'hub_manager', 'sorter', etc.
            $table->string('driver_license_number', 50)->nullable()->unique();  // required when role = driver
            $table->date('hire_date')->nullable();
            $table->string('shift', 20)->nullable();        // 'morning', 'evening', 'night'
            $table->enum('employment_status', ['active', 'terminated', 'on_leave'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
