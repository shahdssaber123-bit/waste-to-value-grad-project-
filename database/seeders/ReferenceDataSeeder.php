<?php

namespace Database\Seeders;

use App\Models\Commodity;
use App\Models\CommodityPrice;
use App\Models\Employee;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ReferenceDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Hub Managers
        $manager1 = User::create([
            'fname' => 'John',
            'lname' => 'Doe',
            'email' => 'manager1@example.com',
            'password' => Hash::make('Waste@2026'),
            'role' => 'employee',
            'email_verified_at' => now(),
        ]);

        Employee::create([
            'user_id' => $manager1->id,
            'role' => 'hub_manager',
            'employment_status' => 'active',
        ]);

        $manager2 = User::create([
            'fname' => 'Jane',
            'lname' => 'Smith',
            'email' => 'manager2@example.com',
            'password' => Hash::make('Waste@2026'),
            'role' => 'employee',
            'email_verified_at' => now(),
        ]);

        Employee::create([
            'user_id' => $manager2->id,
            'role' => 'hub_manager',
            'employment_status' => 'active',
        ]);

        // 2. Create Hubs
        $hub1 = Hub::create([
            'location' => 'Downtown Hub',
            'size_sq_meters' => 1000.00,
            'capacity' => 50000.00,
            'manager_employee_id' => $manager1->id,
        ]);

        $hub2 = Hub::create([
            'location' => 'Industrial Zone Hub',
            'size_sq_meters' => 2500.00,
            'capacity' => 150000.00,
            'manager_employee_id' => $manager2->id,
        ]);

        // 3. Create Trucks
        Truck::create([
            'hub_id' => $hub1->id,
            'payload_capacity' => 2000.00,
            'truck_type' => 'Flatbed',
            'plate_number' => 'ABC-123',
            'status' => 'available',
        ]);

        Truck::create([
            'hub_id' => $hub1->id,
            'payload_capacity' => 3500.00,
            'truck_type' => 'Box Truck',
            'plate_number' => 'DEF-456',
            'status' => 'available',
        ]);

        Truck::create([
            'hub_id' => $hub2->id,
            'payload_capacity' => 5000.00,
            'truck_type' => 'Heavy Duty',
            'plate_number' => 'GHI-789',
            'status' => 'available',
        ]);

        Truck::create([
            'hub_id' => $hub2->id,
            'payload_capacity' => 2000.00,
            'truck_type' => 'Flatbed',
            'plate_number' => 'JKL-012',
            'status' => 'maintenance',
        ]);

        // 4. Create Commodities and Prices
        $admin = User::where('role', 'super_admin')->first();
        if (! $admin) {
            $admin = User::create([
                'fname' => 'Admin',
                'lname' => 'User',
                'email' => 'admin_test@example.com',
                'password' => Hash::make('Waste@2026'),
                'role' => 'super_admin',
                'email_verified_at' => now(),
            ]);
        }

        $commodities = ['Cardboard', 'Plastic HDPE', 'Aluminum Cans'];
        foreach ($commodities as $title) {
            $commodity = Commodity::create(['title' => $title]);

            CommodityPrice::create([
                'commodity_id' => $commodity->id,
                'price' => rand(1, 5) + (rand(0, 99) / 100),
                'effective_from' => now()->subDays(30),
                'effective_to' => null,
                'created_by_admin_id' => $admin->id,
            ]);

            // 5. Hub-Commodity Links
            HubCommodity::create([
                'hub_id' => $hub1->id,
                'commodity_id' => $commodity->id,
                'current_inventory_total' => rand(100, 1000),
            ]);

            HubCommodity::create([
                'hub_id' => $hub2->id,
                'commodity_id' => $commodity->id,
                'current_inventory_total' => rand(500, 2000),
            ]);
        }
    }
}
