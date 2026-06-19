<?php

namespace Database\Seeders;

use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\Hub;
use App\Models\Pickup;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Hub and Hub Manager exist (from ReferenceDataSeeder)
        $hmUser = User::where('email', 'manager1@example.com')->first();
        $hub = Hub::where('manager_employee_id', $hmUser->id)->first();
        $commodity = Commodity::first();
        $admin = User::where('role', 'super_admin')->first();

        // 2. Create a Driver
        $driverUser = User::create([
            'fname' => 'Driver',
            'lname' => 'Bob',
            'email' => 'driver1@example.com',
            'password' => Hash::make('Waste@2026'),
            'role' => 'employee',
            'ssn' => 'SSN-BOB-001',
            'email_verified_at' => now(),
        ]);

        Employee::create([
            'user_id' => $driverUser->id,
            'role' => 'driver',
            'employment_status' => 'active',
            'driver_license_number' => 'DL-BOB-001',
            'hire_date' => now(),
        ]);

        // 3. Create a Supplier and Contract
        $supplierUser = User::create([
            'fname' => 'Supplier',
            'lname' => 'Alice',
            'email' => 'supplier1@example.com',
            'password' => Hash::make('Waste@2026'),
            'role' => 'supplier',
            'email_verified_at' => now(),
        ]);

        Supplier::create([
            'user_id' => $supplierUser->id,
            'company_name' => 'Alice Recyclables',
        ]);

        $contract = Contract::create([
            'party_id' => $supplierUser->id,
            'party_type' => 'supplier',
            'commodity_id' => $commodity->id,
            'status' => 'active',
            'shipment_threshold_kg' => 500,
            'payment_terms' => 'Net 15',
        ]);

        // 4. Schedule a Pickup
        Pickup::create([
            'contract_id' => $contract->id,
            'supplier_user_id' => $supplierUser->id,
            'hub_id' => $hub->id,
            'scheduled_by_admin_id' => $admin->id,
            'schedule_date' => now()->addDay(),
            'status' => 'scheduled',
            'estimated_weight' => 1200,
        ]);
    }
}
