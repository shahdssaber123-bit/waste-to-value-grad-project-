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
        Schema::create('hubs', function (Blueprint $table) {
            $table->id();
            $table->string('location', 255);
            $table->decimal('size_sq_meters', 10, 2)->nullable();
            $table->decimal('capacity', 10, 2)->nullable();       // max storage in kg
            $table->unsignedBigInteger('manager_employee_id')->nullable();
            $table->foreign('manager_employee_id')
                ->references('user_id')->on('employees')
                ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hubs');
    }
};
