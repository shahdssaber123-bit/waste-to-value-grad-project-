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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('restrict');
            $table->unsignedBigInteger('outbound_delivery_id')->nullable();
            // Removed foreign key constraint here for now to allow migration to pass, will add as a separate migration if needed.
            $table->unsignedBigInteger('party_id');       // suppliers.user_id OR factories.user_id
            $table->string('party_type', 50);             // 'supplier' or 'factory'
            $table->string('invoice_number', 50)->unique();
            $table->date('due_date');
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->decimal('total_amount', 12, 2);
            $table->enum('invoice_type', ['supplier', 'factory']);
            $table->string('idempotency_key', 100)->unique()->nullable(); // prevents duplicate generation
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['party_id', 'party_type', 'status', 'due_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
