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
        Schema::create('bale_cubes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('inbound_record_id');
            $table->foreign('inbound_record_id')->references('id')->on('inbound_records')->onDelete('restrict');
            $table->unsignedBigInteger('commodity_id');
            $table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('restrict');
            $table->decimal('weight', 10, 2);
            $table->enum('quality_score', ['A', 'B', 'C', 'reject']);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bale_cubes');
    }
};
