<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('material_requests')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY status ENUM('draft','requested','matched','matched_reserved','scheduled','fulfilled','cancelled') NOT NULL DEFAULT 'requested'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('material_requests')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("UPDATE material_requests SET status = 'matched' WHERE status = 'matched_reserved'");
            DB::statement("ALTER TABLE material_requests MODIFY status ENUM('draft','requested','matched','scheduled','fulfilled','cancelled') NOT NULL DEFAULT 'requested'");
        }
    }
};
