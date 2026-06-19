<?php

namespace Database\Seeders;

use App\Models\SuperAdmin;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            $user = User::updateOrCreate(
                ['email' => 'admin@wastetovalue.com'],
                [
                    'fname' => 'Shahd',
                    'lname' => 'Saber',
                    'password' => Hash::make('Waste@2026'),
                    'role' => 'super_admin',
                    'email_verified_at' => now(),
                    'phone' => '+20 100 000 0001',
                    'ssn' => null,
                ]
            );

            SuperAdmin::updateOrCreate(['user_id' => $user->id], ['user_id' => $user->id]);
        });
    }
}
