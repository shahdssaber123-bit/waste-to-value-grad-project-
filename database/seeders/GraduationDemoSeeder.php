<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\BaleCube;
use App\Models\Commodity;
use App\Models\CommodityPrice;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\Factory;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use App\Models\Penalty;
use App\Models\Pickup;
use App\Models\Supplier;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GraduationDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $admin = $this->user('Shahd', 'Saber', 'admin@demo.com', 'super_admin', '+20 100 000 0001');
            DB::table('super_admins')->updateOrInsert(['user_id' => $admin->id], ['user_id' => $admin->id]);

            $suppliers = [
                $this->supplier('Ahmed', 'Kamal', 'supplier@demo.com', 'Green Source Suppliers', '+20 100 100 1001'),
                $this->supplier('Mona', 'Adel', 'cairo-scrap@demo.com', 'Cairo Scrap Collection', '+20 100 100 1002'),
                $this->supplier('Youssef', 'Hany', 'delta-pack@demo.com', 'Delta Packaging Waste', '+20 100 100 1003'),
                $this->supplier('Salma', 'Nour', 'eco-school@demo.com', 'Eco Schools Network', '+20 100 100 1004'),
            ];

            $factories = [
                $this->factory('Omar', 'Mostafa', 'industry@demo.com', 'GreenPack Industries', 'EG-GP-1001', 'PET Plastic'),
                $this->factory('Nada', 'Sherif', 'plastic-plus@demo.com', 'Plastic Plus Egypt', 'EG-PP-1002', 'HDPE Plastic'),
                $this->factory('Hassan', 'Saeed', 'paper-mill@demo.com', 'Nile Paper Mill', 'EG-NP-1003', 'Cardboard'),
                $this->factory('Laila', 'Maher', 'alumet@demo.com', 'AluMet Recycling', 'EG-AM-1004', 'Aluminum'),
            ];

            $hubManagers = [
                $this->employee('Nora', 'Suleiman', 'hub@demo.com', 'hub_manager', 'morning'),
                $this->employee('Mahmoud', 'Reda', 'hub-giza@demo.com', 'hub_manager', 'evening'),
                $this->employee('Farida', 'Ali', 'hub-alex@demo.com', 'hub_manager', 'morning'),
            ];

            $drivers = [
                $this->employee('Omar', 'Mansour', 'driver@demo.com', 'driver', 'morning', 'DRV-1001'),
                $this->employee('Kareem', 'Tarek', 'driver2@demo.com', 'driver', 'evening', 'DRV-1002'),
                $this->employee('Mostafa', 'Samir', 'driver3@demo.com', 'driver', 'night', 'DRV-1003'),
                $this->employee('Hady', 'Gamal', 'driver4@demo.com', 'driver', 'morning', 'DRV-1004'),
            ];

            $hubs = [
                Hub::create(['location' => 'Cairo Smart Sorting Hub', 'size_sq_meters' => 1800, 'capacity' => 90000, 'manager_employee_id' => $hubManagers[0]->id]),
                Hub::create(['location' => 'Giza Circular Economy Hub', 'size_sq_meters' => 2100, 'capacity' => 120000, 'manager_employee_id' => $hubManagers[1]->id]),
                Hub::create(['location' => 'Alexandria Coastal Recovery Hub', 'size_sq_meters' => 2500, 'capacity' => 160000, 'manager_employee_id' => $hubManagers[2]->id]),
            ];

            $materials = [
                ['PET Plastic', 9.50],
                ['HDPE Plastic', 11.25],
                ['Cardboard', 4.75],
                ['Aluminum', 38.00],
                ['Glass', 2.50],
                ['Mixed Paper', 3.25],
                ['Organic Waste', 1.50],
            ];

            $commodities = [];
            foreach ($materials as [$title, $price]) {
                $commodity = Commodity::create(['title' => $title]);
                $commodities[$title] = $commodity;

                CommodityPrice::create([
                    'commodity_id' => $commodity->id,
                    'price' => round($price * 0.92, 2),
                    'effective_from' => now()->subMonths(2),
                    'effective_to' => now()->subMonth(),
                    'created_by_admin_id' => $admin->id,
                ]);
                CommodityPrice::create([
                    'commodity_id' => $commodity->id,
                    'price' => $price,
                    'effective_from' => now()->subMonth(),
                    'effective_to' => null,
                    'created_by_admin_id' => $admin->id,
                ]);

                foreach ($hubs as $index => $hub) {
                    HubCommodity::create([
                        'hub_id' => $hub->id,
                        'commodity_id' => $commodity->id,
                        'current_inventory_total' => [
                            2200 + $index * 700,
                            1800 + $index * 600,
                            5200 + $index * 900,
                            850 + $index * 250,
                            900 + $index * 150,
                            1400 + $index * 400,
                            700 + $index * 300,
                        ][array_search($title, array_column($materials, 0))],
                    ]);
                }
            }

            $trucks = [
                Truck::create(['hub_id' => $hubs[0]->id, 'payload_capacity' => 2500, 'truck_type' => 'Box Truck', 'plate_number' => 'WTX-1101', 'status' => 'available']),
                Truck::create(['hub_id' => $hubs[0]->id, 'payload_capacity' => 5000, 'truck_type' => 'Compactor', 'plate_number' => 'WTX-1102', 'status' => 'in_use']),
                Truck::create(['hub_id' => $hubs[1]->id, 'payload_capacity' => 3500, 'truck_type' => 'Flatbed', 'plate_number' => 'WTX-2201', 'status' => 'available']),
                Truck::create(['hub_id' => $hubs[1]->id, 'payload_capacity' => 7000, 'truck_type' => 'Heavy Duty', 'plate_number' => 'WTX-2202', 'status' => 'maintenance']),
                Truck::create(['hub_id' => $hubs[2]->id, 'payload_capacity' => 4500, 'truck_type' => 'Box Truck', 'plate_number' => 'WTX-3301', 'status' => 'available']),
                Truck::create(['hub_id' => $hubs[2]->id, 'payload_capacity' => 8000, 'truck_type' => 'Trailer', 'plate_number' => 'WTX-3302', 'status' => 'available']),
            ];

            $supplierContracts = [];
            foreach ($suppliers as $i => $supplierUser) {
                $commodity = array_values($commodities)[$i % count($commodities)];
                $supplierContracts[] = Contract::create([
                    'party_id' => $supplierUser->id,
                    'party_type' => 'supplier',
                    'commodity_id' => $commodity->id,
                    'status' => 'active',
                    'payment_terms' => 'Bank transfer within 7 days after accepted weight confirmation',
                    'material_type' => $commodity->title,
                    'shipment_threshold_kg' => 800 + $i * 250,
                    'signed_date' => now()->subDays(45 - $i * 5)->toDateString(),
                ]);
            }

            $factoryContracts = [];
            foreach ($factories as $i => $factoryUser) {
                $commodity = array_values($commodities)[($i + 1) % count($commodities)];
                $factoryContracts[] = Contract::create([
                    'party_id' => $factoryUser->id,
                    'party_type' => 'factory',
                    'commodity_id' => $commodity->id,
                    'status' => $i === 3 ? 'draft' : 'active',
                    'payment_terms' => 'Bank transfer within 14 days from invoice date',
                    'material_type' => $commodity->title,
                    'shipment_threshold_kg' => 1200 + $i * 300,
                    'signed_date' => now()->subDays(30 - $i * 4)->toDateString(),
                ]);
            }

            $pickups = [];
            foreach ($supplierContracts as $i => $contract) {
                $pickups[] = Pickup::create([
                    'contract_id' => $contract->id,
                    'supplier_user_id' => $contract->party_id,
                    'hub_id' => $hubs[$i % count($hubs)]->id,
                    'truck_id' => $trucks[$i % count($trucks)]->id,
                    'driver_employee_id' => $drivers[$i % count($drivers)]->id,
                    'scheduled_by_admin_id' => $admin->id,
                    'status' => ['completed', 'completed', 'in_progress', 'scheduled'][$i],
                    'schedule_date' => now()->subDays(5 - $i)->addHours(10),
                    'estimated_weight' => 950 + $i * 280,
                    'started_at' => $i < 3 ? now()->subDays(5 - $i)->addHours(10) : null,
                ]);
            }

            foreach (array_slice($pickups, 0, 2) as $i => $pickup) {
                $accepted = 850 + $i * 260;
                $inbound = InboundRecord::create([
                    'pickup_id' => $pickup->id,
                    'contract_id' => $pickup->contract_id,
                    'hub_id' => $pickup->hub_id,
                    'tier1_weight' => $pickup->estimated_weight,
                    'tier2_weight' => $accepted,
                    'contamination_ratio' => $i === 0 ? 0.0450 : 0.0830,
                    'accepted_weight' => $accepted,
                    'status' => 'completed',
                ]);

                BaleCube::create(['inbound_record_id' => $inbound->id, 'commodity_id' => $pickup->contract->commodity_id, 'weight' => round($accepted * 0.55, 2), 'quality_score' => $i === 0 ? 'A' : 'B']);
                BaleCube::create(['inbound_record_id' => $inbound->id, 'commodity_id' => $pickup->contract->commodity_id, 'weight' => round($accepted * 0.35, 2), 'quality_score' => 'B']);
                BaleCube::create(['inbound_record_id' => $inbound->id, 'commodity_id' => $pickup->contract->commodity_id, 'weight' => round($accepted * 0.10, 2), 'quality_score' => 'C']);
            }

            $deliveries = [];
            foreach (array_slice($factoryContracts, 0, 3) as $i => $contract) {
                $delivery = OutboundDelivery::create([
                    'contract_id' => $contract->id,
                    'hub_id' => $hubs[$i % count($hubs)]->id,
                    'commodity_id' => $contract->commodity_id,
                    'status' => ['confirmed', 'shipped', 'scheduled'][$i],
                    'quantity_kg' => 700 + $i * 350,
                    'scheduled_date' => now()->addDays($i + 1)->setTime(11, 0),
                    'confirmed_at' => $i === 0 ? now()->subDays(1) : null,
                    'rejection_window_end' => $i === 0 ? now()->addDay() : null,
                    'idempotency_key' => 'delivery-demo-' . $i,
                ]);
                $deliveries[] = $delivery;

                $invoice = Invoice::create([
                    'contract_id' => $contract->id,
                    'outbound_delivery_id' => $delivery->id,
                    'party_id' => $contract->party_id,
                    'party_type' => 'factory',
                    'invoice_number' => Invoice::generateInvoiceNumber(),
                    'due_date' => now()->addDays($i === 0 ? -3 : 10)->toDateString(),
                    'status' => $i === 0 ? 'overdue' : 'pending',
                    'total_amount' => (700 + $i * 350) * (12 + $i * 4),
                    'invoice_type' => 'factory',
                    'idempotency_key' => 'invoice-demo-' . $i,
                    'paid_at' => null,
                ]);

                if ($i === 0) {
                    Penalty::create(['invoice_id' => $invoice->id, 'amount' => round($invoice->total_amount * 0.05, 2), 'penalty_stage' => 1, 'applied_at' => now()->subDay()]);
                }
            }

            $applicationRows = [
                ['Eco Mall Collection', 'Heba Samir', 'eco-mall@app.com', '+20 101 222 1001', 'supplier', 'TAX-APP-001', null, 'pending', 'Large cardboard and mixed paper supply.'],
                ['Future Bottles Factory', 'Tamer Ashraf', 'future-bottles@app.com', '+20 101 222 1002', 'factory', 'TAX-APP-002', 'PET Plastic', 'contacted', 'Needs clean PET bales monthly.'],
                ['Old Tires Group', 'Ali Fawzy', 'old-tires@app.com', '+20 101 222 1003', 'supplier', 'TAX-APP-003', null, 'rejected', 'Currently unsupported material category.'],
                ['GreenPack Industries', 'Omar Mostafa', 'industry@demo.com', '+20 101 222 1004', 'factory', 'EG-GP-1001', 'PET Plastic', 'converted', 'Converted into active factory account.'],
            ];
            foreach ($applicationRows as $row) {
                Application::create([
                    'company_name' => $row[0],
                    'contact_name' => $row[1],
                    'email' => $row[2],
                    'phone' => $row[3],
                    'role' => $row[4],
                    'tax_id' => $row[5],
                    'required_commodity' => $row[6],
                    'status' => $row[7],
                    'message' => $row[8],
                    'idempotency_token' => (string) Str::uuid(),
                    'email_verification_token' => (string) Str::uuid(),
                    'email_verified_at' => now()->subDays(2),
                    'converted_user_id' => $row[7] === 'converted' ? $factories[0]->id : null,
                ]);
            }

            DB::table('material_requests')->insert([
                ['factory_user_id' => $factories[0]->id, 'commodity_id' => $commodities['PET Plastic']->id, 'preferred_grade' => 'A', 'quantity_kg' => 1200, 'preferred_delivery_date' => now()->addDays(5)->toDateString(), 'status' => 'matched', 'matched_hub_id' => $hubs[0]->id, 'created_at' => now(), 'updated_at' => now()],
                ['factory_user_id' => $factories[1]->id, 'commodity_id' => $commodities['HDPE Plastic']->id, 'preferred_grade' => 'B', 'quantity_kg' => 1800, 'preferred_delivery_date' => now()->addDays(8)->toDateString(), 'status' => 'scheduled', 'matched_hub_id' => $hubs[1]->id, 'created_at' => now(), 'updated_at' => now()],
                ['factory_user_id' => $factories[2]->id, 'commodity_id' => $commodities['Cardboard']->id, 'preferred_grade' => 'A', 'quantity_kg' => 3000, 'preferred_delivery_date' => now()->addDays(10)->toDateString(), 'status' => 'requested', 'matched_hub_id' => null, 'created_at' => now(), 'updated_at' => now()],
            ]);

            DB::table('pickup_problem_reports')->insert([
                ['pickup_id' => $pickups[2]->id, 'driver_employee_id' => $drivers[2]->id, 'problem_type' => 'weight_mismatch', 'description' => 'Supplier reported 1500kg, actual load looks lower. Waiting for hub verification.', 'status' => 'reviewing', 'created_at' => now()->subHours(4), 'updated_at' => now()->subHours(2)],
            ]);

            $this->notify($admin, 'admin.application.pending', 'New supplier application is waiting for review.', '/admin');
            $this->notify($suppliers[0], 'supplier.pickup.completed', 'Your pickup was completed and moved to hub quality check.', '/supplier');
            $this->notify($drivers[0], 'driver.pickup.assigned', 'New pickup assigned to you at Cairo Smart Sorting Hub.', '/driver');
            $this->notify($hubManagers[0], 'hub.quality.required', 'A completed pickup is ready for quality check.', '/hub-manager');
            $this->notify($factories[0], 'factory.invoice.overdue', 'Invoice is overdue; please complete bank transfer.', '/industry');

            $logs = [
                [$admin->id, 'approved_application', 'Application', 4, ['result' => 'Factory user and draft contract created']],
                [$admin->id, 'created_contract', 'Contract', $factoryContracts[0]->id, ['status' => 'active']],
                [$hubManagers[0]->id, 'quality_checked', 'InboundRecord', 1, ['grade' => 'A/B', 'accepted_weight' => 850]],
                [$drivers[0]->id, 'completed_pickup', 'Pickup', $pickups[0]->id, ['proof' => 'photo uploaded']],
                [$factories[0]->id, 'confirmed_delivery', 'OutboundDelivery', $deliveries[0]->id, ['invoice_generated' => true]],
            ];
            foreach ($logs as [$userId, $action, $type, $id, $meta]) {
                DB::table('activity_logs')->insert(['user_id' => $userId, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id, 'meta' => json_encode($meta), 'created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    private function user(string $fname, string $lname, string $email, string $role, ?string $phone = null): User
    {
        return User::firstOrCreate(['email' => $email], [
            'fname' => $fname,
            'lname' => $lname,
            'phone' => $phone,
            'password' => Hash::make('Waste@2026'),
            'role' => $role,
            'email_verified_at' => now(),
        ]);
    }

    private function supplier(string $fname, string $lname, string $email, string $company, string $phone): User
    {
        $user = $this->user($fname, $lname, $email, 'supplier', $phone);
        Supplier::firstOrCreate(['user_id' => $user->id], ['company_name' => $company]);
        return $user;
    }

    private function factory(string $fname, string $lname, string $email, string $company, string $taxId, string $requiredCommodity): User
    {
        $user = $this->user($fname, $lname, $email, 'factory', '+20 100 200 ' . substr($taxId, -4));
        Factory::firstOrCreate(['user_id' => $user->id], ['company_name' => $company, 'tax_id' => $taxId, 'required_commodity' => $requiredCommodity]);
        return $user;
    }

    private function employee(string $fname, string $lname, string $email, string $role, string $shift, ?string $license = null): User
    {
        $user = $this->user($fname, $lname, $email, 'employee', '+20 100 300 ' . substr(md5($email), 0, 4));
        Employee::firstOrCreate(['user_id' => $user->id], ['role' => $role, 'driver_license_number' => $license, 'hire_date' => now()->subMonths(6)->toDateString(), 'shift' => $shift, 'employment_status' => 'active']);
        return $user;
    }

    private function notify(User $user, string $type, string $message, string $url): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode(['message' => $message, 'url' => $url, 'title' => Str::headline(str_replace('.', ' ', $type))]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
