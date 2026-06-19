<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('applications') && ! Schema::hasColumn('applications', 'location')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->string('location', 255)->nullable()->after('required_commodity');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('applications') && Schema::hasColumn('applications', 'location')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->dropColumn('location');
            });
        }
    }
};
