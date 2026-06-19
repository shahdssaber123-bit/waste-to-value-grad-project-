<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('material_requests') && DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE material_requests MODIFY status ENUM('draft','requested','matched','matched_reserved','scheduled','shipped','delivered','confirmed','fulfilled','cancelled','rejected') NOT NULL DEFAULT 'requested'");
        }
    }

    public function down(): void {}
};
