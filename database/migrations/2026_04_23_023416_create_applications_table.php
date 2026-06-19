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
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('contact_name');
            $table->string('email');
            $table->string('phone', 20);
            $table->enum('role', ['factory', 'supplier']);
            $table->string('tax_id', 50);
            $table->string('required_commodity')->nullable();   // required only when role = factory
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'contacted', 'rejected', 'converted'])->default('pending');
            $table->string('idempotency_token', 100)->unique()->nullable();   // client-generated UUID
            $table->string('email_verification_token', 100)->unique()->nullable();  // server-generated
            $table->timestamp('email_verified_at')->nullable();
            $table->unsignedBigInteger('converted_user_id')->nullable();
            $table->foreign('converted_user_id')->references('id')->on('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
