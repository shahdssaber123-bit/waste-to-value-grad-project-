<?php

namespace Database\Seeders;

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
use App\Models\Pickup;
use App\Models\PickupPhoto;
use App\Models\Supplier;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class FinalReadinessSeeder extends Seeder
{
    private const PASSWORD = 'Waste@2026';

    public function run(): void
    {
        DB::transaction(function () {
            $admin = $this->user('Sarah', 'Al-Fahad', 'admin@wastetovalue.com', 'super_admin', '+20 100 900 0001');
            DB::table('super_admins')->updateOrInsert(['user_id' => $admin->id], ['user_id' => $admin->id]);

            $supplier = $this->supplier('Al-Rashid', 'Recycling Co.', 'supplier@wastetovalue.com', 'Al-Rashid Recycling Co.', '+20 100 900 0002');
            $factory = $this->factory('GreenPack', 'Industries', 'factory@wastetovalue.com', 'GreenPack Industries', 'FINAL-TAX-2026', 'PET Plastic');
            $driver = $this->employee('Omar', 'Al-Mansouri', 'driver@wastetovalue.com', 'driver', 'morning', 'FINAL-DRV-2026');
            $hubManager = $this->employee('Nora', 'Al-Sulaiman', 'hub@wastetovalue.com', 'hub_manager', 'morning');

            $commodity = Commodity::firstOrCreate(['title' => 'PET Plastic']);
            CommodityPrice::updateOrCreate(
                ['commodity_id' => $commodity->id, 'effective_to' => null],
                ['price' => 9.75, 'effective_from' => now()->subDays(20), 'created_by_admin_id' => $admin->id]
            );

            $hub = Hub::firstOrCreate(
                ['location' => 'Final Cairo Demonstration Hub'],
                ['size_sq_meters' => 1900, 'capacity' => 95000, 'manager_employee_id' => $hubManager->id]
            );
            $hub->update(['manager_employee_id' => $hubManager->id]);

            HubCommodity::updateOrCreate(
                ['hub_id' => $hub->id, 'commodity_id' => $commodity->id],
                ['current_inventory_total' => 6200, 'reserved_inventory_total' => 900]
            );

            $truck = Truck::updateOrCreate(
                ['plate_number' => 'FINAL-777'],
                ['hub_id' => $hub->id, 'payload_capacity' => 3200, 'truck_type' => 'Box Truck', 'status' => 'in_use']
            );

            $supplierContract = Contract::updateOrCreate(
                ['party_id' => $supplier->id, 'party_type' => 'supplier', 'commodity_id' => $commodity->id],
                ['status' => 'active', 'payment_terms' => 'Net 7 after QA accepted weight', 'material_type' => $commodity->title, 'shipment_threshold_kg' => 900, 'signed_date' => now()->subDays(14)->toDateString()]
            );
            $factoryContract = Contract::updateOrCreate(
                ['party_id' => $factory->id, 'party_type' => 'factory', 'commodity_id' => $commodity->id],
                ['status' => 'active', 'payment_terms' => 'Net 14 after 48h rejection window', 'material_type' => $commodity->title, 'shipment_threshold_kg' => 1100, 'signed_date' => now()->subDays(10)->toDateString()]
            );

            $pickup = Pickup::firstOrCreate(
                ['contract_id' => $supplierContract->id, 'supplier_user_id' => $supplier->id, 'schedule_date' => now()->addDay()->setTime(10, 30)],
                [
                    'hub_id' => $hub->id,
                    'truck_id' => $truck->id,
                    'driver_employee_id' => $driver->id,
                    'scheduled_by_admin_id' => $admin->id,
                    'status' => 'in_progress',
                    'estimated_weight' => 1250,
                    'proof_note' => 'Admin demo mission: driver must upload proof, record weight, depart to hub, then complete.',
                    'pickup_location' => 'Final Supplier Warehouse - Nasr City',
                    'material_condition' => 'Sorted PET bags, dry and ready for loading',
                    'reported_contamination_percent' => 3.5,
                    'supplier_notes' => 'Seeded from database to show the driver a real admin-assigned mission.',
                    'started_at' => now()->subHours(1),
                    'supplier_arrived_at' => now()->subMinutes(45),
                ]
            );
            $pickup->update([
                'hub_id' => $hub->id,
                'truck_id' => $truck->id,
                'driver_employee_id' => $driver->id,
                'scheduled_by_admin_id' => $admin->id,
                'status' => 'in_progress',
            ]);

            $this->createProofImage();
            PickupPhoto::firstOrCreate(
                ['pickup_id' => $pickup->id, 'photo_path' => 'pickups/final-demo-proof.png'],
                ['uploaded_at' => now()->subMinutes(35)]
            );

            $completedPickup = Pickup::firstOrCreate(
                ['contract_id' => $supplierContract->id, 'supplier_user_id' => $supplier->id, 'schedule_date' => now()->subDay()->setTime(9, 0)],
                [
                    'hub_id' => $hub->id,
                    'truck_id' => $truck->id,
                    'driver_employee_id' => $driver->id,
                    'scheduled_by_admin_id' => $admin->id,
                    'status' => 'completed',
                    'estimated_weight' => 1180,
                    'proof_note' => 'Completed seeded mission for hub receiving and QA demo.',
                    'pickup_location' => 'Final Supplier Warehouse - Nasr City',
                    'material_condition' => 'Clean PET bottles',
                    'started_at' => now()->subDay()->setTime(9, 5),
                    'supplier_arrived_at' => now()->subDay()->setTime(9, 20),
                    'departed_to_hub_at' => now()->subDay()->setTime(10, 0),
                    'hub_arrived_at' => now()->subDay()->setTime(10, 45),
                    'completed_at' => now()->subDay()->setTime(10, 50),
                ]
            );

            $inbound = InboundRecord::firstOrCreate(
                ['pickup_id' => $completedPickup->id],
                [
                    'contract_id' => $supplierContract->id,
                    'hub_id' => $hub->id,
                    'tier1_weight' => 1180,
                    'tier2_weight' => 1095,
                    'contamination_ratio' => round((1180 - 1095) / 1180, 4),
                    'accepted_weight' => 1095,
                    'status' => 'completed',
                    'sorter_count' => 4,
                    'quality_notes' => 'Final demo QA completed by 4 sorters.',
                    'decontamination_notes' => 'Labels and caps removed before baling.',
                ]
            );
            BaleCube::firstOrCreate(['inbound_record_id' => $inbound->id, 'bale_code' => 'FINAL-PET-A-001'], ['commodity_id' => $commodity->id, 'weight' => 600, 'quality_score' => 'A', 'quality_notes' => 'Dense clean PET cube']);
            BaleCube::firstOrCreate(['inbound_record_id' => $inbound->id, 'bale_code' => 'FINAL-PET-B-002'], ['commodity_id' => $commodity->id, 'weight' => 495, 'quality_score' => 'B', 'quality_notes' => 'Minor label residue']);

            $delivery = OutboundDelivery::updateOrCreate(
                ['idempotency_key' => 'final-demo-delivery-48h'],
                [
                    'contract_id' => $factoryContract->id,
                    'hub_id' => $hub->id,
                    'commodity_id' => $commodity->id,
                    'status' => 'delivered',
                    'quantity_kg' => 900,
                    'scheduled_date' => now()->subHours(2),
                    'confirmed_at' => now()->subHour(),
                    'rejection_window_end' => now()->addHours(47),
                ]
            );
            Invoice::updateOrCreate(
                ['idempotency_key' => 'final-demo-factory-invoice'],
                [
                    'contract_id' => $factoryContract->id,
                    'outbound_delivery_id' => $delivery->id,
                    'party_id' => $factory->id,
                    'party_type' => 'factory',
                    'invoice_number' => 'INV-FINAL-2026-001',
                    'due_date' => now()->addDays(14)->toDateString(),
                    'status' => 'pending',
                    'total_amount' => round(900 * 9.75 * 1.10, 2),
                    'invoice_type' => 'factory',
                ]
            );

            DB::table('material_requests')->updateOrInsert(
                ['factory_user_id' => $factory->id, 'commodity_id' => $commodity->id, 'quantity_kg' => 900],
                ['preferred_grade' => 'A', 'preferred_delivery_date' => now()->addDays(4)->toDateString(), 'status' => 'delivered', 'matched_hub_id' => $hub->id, 'outbound_delivery_id' => $delivery->id, 'company_details' => 'Seeded final demo factory request', 'notes' => 'Shows factory outbound flow from DB, not frontend mock.', 'created_at' => now()->subDays(2), 'updated_at' => now()]
            );

            $openQuestionId = DB::table('activity_logs')->insertGetId([
                'user_id' => $supplier->id,
                'action' => 'supplier_message_to_admin',
                'entity_type' => 'Message',
                'entity_id' => null,
                'meta' => json_encode(['message' => 'Can you confirm tomorrow pickup slot and driver assignment?', 'status' => 'open']),
                'created_at' => now()->subMinutes(50),
                'updated_at' => now()->subMinutes(50),
            ]);
            $repliedQuestionId = DB::table('activity_logs')->insertGetId([
                'user_id' => $supplier->id,
                'action' => 'supplier_message_to_admin',
                'entity_type' => 'Message',
                'entity_id' => null,
                'meta' => json_encode(['message' => 'Please confirm the accepted weight used for my last invoice.', 'status' => 'replied', 'admin_reply' => 'Accepted weight is 1095kg after QA. Invoice uses 70% of active market price.', 'replied_at' => now()->subMinutes(20)->toISOString(), 'replied_by' => $admin->id]),
                'created_at' => now()->subMinutes(40),
                'updated_at' => now()->subMinutes(20),
            ]);
            DB::table('activity_logs')->insert([
                'user_id' => $admin->id,
                'action' => 'admin_reply_to_supplier',
                'entity_type' => 'Message',
                'entity_id' => $repliedQuestionId,
                'meta' => json_encode(['reply' => 'Accepted weight is 1095kg after QA. Invoice uses 70% of active market price.', 'original_message_id' => $repliedQuestionId, 'supplier_user_id' => $supplier->id]),
                'created_at' => now()->subMinutes(20),
                'updated_at' => now()->subMinutes(20),
            ]);

            $this->notify($admin, 'supplier.message.created', 'New supplier question waiting for admin reply.', '/admin', ['activity_log_id' => $openQuestionId]);
            $this->notify($supplier, 'admin.message.replied', 'Admin replied: Accepted weight is 1095kg after QA.', '/supplier', ['activity_log_id' => $repliedQuestionId]);
            $this->notify($driver, 'driver.pickup.assigned', 'Final demo pickup mission assigned by admin with truck FINAL-777.', '/driver', ['pickup_id' => $pickup->id]);
            $this->notify($hubManager, 'hub.inbound.ready', 'Completed pickup is ready for receiving and QA.', '/hub-manager', ['pickup_id' => $completedPickup->id]);
            $this->notify($factory, 'factory.delivery.review', 'Delivery is confirmed. 48-hour rejection window is open.', '/industry', ['delivery_id' => $delivery->id]);
        });
    }

    private function user(string $fname, string $lname, string $email, string $role, string $phone): User
    {
        return User::updateOrCreate(['email' => $email], [
            'fname' => $fname,
            'lname' => $lname,
            'phone' => $phone,
            'password' => Hash::make(self::PASSWORD),
            'role' => $role,
            'email_verified_at' => now(),
        ]);
    }

    private function supplier(string $fname, string $lname, string $email, string $company, string $phone): User
    {
        $user = $this->user($fname, $lname, $email, 'supplier', $phone);
        Supplier::updateOrCreate(['user_id' => $user->id], ['company_name' => $company]);
        return $user;
    }

    private function factory(string $fname, string $lname, string $email, string $company, string $taxId, string $requiredCommodity): User
    {
        $user = $this->user($fname, $lname, $email, 'factory', '+20 100 900 0003');
        Factory::updateOrCreate(['user_id' => $user->id], ['company_name' => $company, 'tax_id' => $taxId, 'required_commodity' => $requiredCommodity]);
        return $user;
    }

    private function employee(string $fname, string $lname, string $email, string $role, string $shift, ?string $license = null): User
    {
        $user = $this->user($fname, $lname, $email, 'employee', '+20 100 900 '.($license ? '0004' : '0005'));
        Employee::updateOrCreate(['user_id' => $user->id], ['role' => $role, 'driver_license_number' => $license, 'hire_date' => now()->subMonths(8)->toDateString(), 'shift' => $shift, 'employment_status' => 'active']);
        return $user;
    }

    private function notify(User $user, string $type, string $message, string $url, array $extra = []): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode(array_merge(['title' => Str::headline(str_replace('.', ' ', $type)), 'message' => $message, 'url' => $url], $extra)),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createProofImage(): void
    {
        $dir = storage_path('app/public/pickups');
        File::ensureDirectoryExists($dir);
        $file = $dir.'/final-demo-proof.png';
        if (File::exists($file)) return;
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAQAAAAAwCAYAAABsYwNRAAAACXBIWXMAAAsTAAALEwEAmpwYAAABrElEQVR4nO3aQW6DMAwF0P7/T7sDyhIQhEAwjAtK7WyZLJnlAnGTzvLcvQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCk9h6wquu6j9b1vVbXdV3Xdd33F/tj5uz7PvM8z+u6rmtVVZVlmf9ybZzP83me53med10XhmGcz3Nu2/a2bZuqqqqq6n3f93nfdV3XdZ7nOTfP833f9/0wDOf7vk+S5DlJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJ0n8KJwAJAL8a5QAIAH41ygEQAPxqlAMgAPjVKAdAAPCrUQ6AAOBXoxwAAcCvRjkAAoBfjXIApKx5r4/5cJ7nufd930+SJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSftw4BxAAX4JwAAQAvxrlAAgAfjXKARAA/GqUAyAA+NUoB0AA8KtRDoAA4FejHAABwK9GOQACgF+NcgAkb3mvj/lwnue5933fT5IkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIk6cc9TwASAH41ygEQAPxqlAMgAPjVKAdAAPCrUQ6AAOBXoxwAAcCvRjkAAoBfjXIApKx5r49JkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkqS/9gDDfDgU64BgRwAAAABJRU5ErkJggg==');
        File::put($file, $png);
    }
}
