<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE pickups MODIFY COLUMN status ENUM(
            'scheduled',
            'in_progress',
            'completed',
            'processing',
            'cancelled'
        ) NOT NULL DEFAULT 'scheduled'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE pickups MODIFY COLUMN status ENUM(
            'scheduled',
            'in_progress',
            'completed',
            'cancelled'
        ) NOT NULL DEFAULT 'scheduled'");
    }
};
