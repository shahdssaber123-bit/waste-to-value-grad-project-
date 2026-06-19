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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('party_id');           // suppliers.user_id OR factories.user_id
            $table->string('party_type', 50);                 // 'supplier' or 'factory'
            $table->unsignedBigInteger('commodity_id');
            $table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('restrict');
            $table->enum('status', ['draft', 'active', 'expired', 'terminated'])->default('draft');
            $table->string('payment_terms', 100)->nullable();
            $table->string('material_type', 100)->nullable();  // human-readable label
            $table->decimal('shipment_threshold_kg', 10, 2)->nullable(); // triggers outbound stock alert
            $table->date('signed_date')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['party_id', 'party_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
