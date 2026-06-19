<?php

namespace Database\Seeders;

use App\Models\Commodity;
use App\Models\CommodityPrice;
use App\Models\Contract;
use App\Models\Factory;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\Pickup;
use App\Models\Supplier;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MassiveGraduationDemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $adminId = User::where('role', 'super_admin')->value('id') ?: User::query()->value('id');

            $materialNames = [
                'PET Plastic', 'HDPE Plastic', 'LDPE Film', 'PP Plastic', 'PVC Plastic', 'Mixed Plastic', 'Cardboard', 'Mixed Paper', 'Office Paper', 'Newspaper',
                'Aluminum', 'Steel Cans', 'Copper Scrap', 'Glass Clear', 'Glass Mixed', 'Textile Waste', 'Wood Pallets', 'Organic Waste', 'Food Waste', 'Used Cooking Oil',
                'E-Waste Small Devices', 'Battery Scrap', 'Rubber Waste', 'Tire Shreds', 'Construction Plastic', 'Agricultural Film', 'Carton Drink Packs', 'Metal Bottle Caps', 'Foam Packaging', 'Compostable Bags'
            ];
            $commodities = [];
            foreach ($materialNames as $i => $name) {
                $commodity = Commodity::firstOrCreate(['title' => $name]);
                $commodities[] = $commodity;
                if (! CommodityPrice::where('commodity_id', $commodity->id)->whereNull('effective_to')->exists()) {
                    CommodityPrice::create(['commodity_id' => $commodity->id, 'price' => round(2 + ($i * 1.13), 2), 'effective_from' => now()->subDays(30), 'effective_to' => null, 'created_by_admin_id' => $adminId]);
                }
            }

            $hubNames = ['Cairo Smart Sorting Hub','Giza Circular Economy Hub','Alexandria Coastal Recovery Hub','Delta Recovery Hub','Suez Industrial Recycling Hub','Mansoura Green Hub','Aswan Organic Recovery Hub','6 October Materials Hub'];
            $hubs = [];
            foreach ($hubNames as $i => $name) {
                $hubs[] = Hub::firstOrCreate(['location' => $name], ['size_sq_meters' => 1600 + $i * 300, 'capacity' => 80000 + $i * 15000]);
            }
            foreach ($hubs as $hi => $hub) {
                foreach ($commodities as $ci => $commodity) {
                    HubCommodity::firstOrCreate(['hub_id' => $hub->id, 'commodity_id' => $commodity->id], ['current_inventory_total' => 900 + (($hi + 1) * ($ci + 3) * 117) % 8500]);
                }
            }

            $supplierUsers = [];
            for ($i = 1; $i <= 25; $i++) {
                $email = 'supplier.bulk'.$i.'@demo.com';
                $user = User::firstOrCreate(['email' => $email], ['fname' => 'Supplier', 'lname' => 'Partner '.$i, 'phone' => '+20 110 '.str_pad((string)$i, 7, '0', STR_PAD_LEFT), 'password' => Hash::make('Waste@2026'), 'role' => 'supplier', 'email_verified_at' => now()]);
                Supplier::firstOrCreate(['user_id' => $user->id], ['company_name' => 'Supplier Partner Company '.$i]);
                $supplierUsers[] = $user;
            }
            $factoryUsers = [];
            for ($i = 1; $i <= 18; $i++) {
                $email = 'factory.bulk'.$i.'@demo.com';
                $user = User::firstOrCreate(['email' => $email], ['fname' => 'Factory', 'lname' => 'Client '.$i, 'phone' => '+20 120 '.str_pad((string)$i, 7, '0', STR_PAD_LEFT), 'password' => Hash::make('Waste@2026'), 'role' => 'factory', 'email_verified_at' => now()]);
                Factory::firstOrCreate(['user_id' => $user->id], ['company_name' => 'Factory Client Company '.$i, 'tax_id' => 'BULK-TAX-'.$i, 'required_commodity' => $commodities[$i % count($commodities)]->title]);
                $factoryUsers[] = $user;
            }

            foreach ($supplierUsers as $i => $user) {
                $commodity = $commodities[$i % count($commodities)];
                $contract = Contract::firstOrCreate(['party_id' => $user->id, 'party_type' => 'supplier', 'commodity_id' => $commodity->id], ['status' => 'active', 'payment_terms' => 'Bank transfer net 7', 'material_type' => $commodity->title, 'shipment_threshold_kg' => 700 + ($i * 50), 'signed_date' => now()->subDays(25)->toDateString()]);
                Pickup::firstOrCreate(['contract_id' => $contract->id, 'supplier_user_id' => $user->id, 'schedule_date' => now()->addDays(($i % 10) + 1)], ['hub_id' => $hubs[$i % count($hubs)]->id, 'scheduled_by_admin_id' => $adminId, 'status' => ['scheduled','in_progress','completed'][$i % 3], 'estimated_weight' => 600 + ($i * 75)]);
            }
            foreach ($factoryUsers as $i => $user) {
                $commodity = $commodities[($i + 4) % count($commodities)];
                Contract::firstOrCreate(['party_id' => $user->id, 'party_type' => 'factory', 'commodity_id' => $commodity->id], ['status' => 'active', 'payment_terms' => 'Bank transfer net 14', 'material_type' => $commodity->title, 'shipment_threshold_kg' => 1200 + ($i * 70), 'signed_date' => now()->subDays(18)->toDateString()]);
                DB::table('material_requests')->updateOrInsert(['factory_user_id' => $user->id, 'commodity_id' => $commodity->id, 'quantity_kg' => 500 + $i * 120], ['preferred_grade' => ['A','B','C'][$i % 3], 'preferred_delivery_date' => now()->addDays(($i % 12) + 2)->toDateString(), 'status' => ['requested','matched','scheduled'][$i % 3], 'matched_hub_id' => $hubs[$i % count($hubs)]->id, 'created_at' => now()->subDays($i), 'updated_at' => now()]);
            }

            foreach ($hubs as $i => $hub) {
                for ($j = 1; $j <= 3; $j++) {
                    Truck::firstOrCreate(['plate_number' => 'WTX-B'.$i.$j.Str::upper(Str::random(2))], ['hub_id' => $hub->id, 'payload_capacity' => 2500 + ($j * 1200), 'truck_type' => ['Box Truck','Compactor','Flatbed'][$j-1], 'status' => ['available','in_use','maintenance'][($i+$j)%3]]);
                }
            }
        });
    }
}
