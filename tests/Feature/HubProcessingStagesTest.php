<?php

use App\Models\Commodity;
use App\Models\CommodityPrice;
use App\Models\Contract;
use App\Models\Employee;
use App\Models\Hub;
use App\Models\HubCommodity;
use App\Models\InboundRecord;
use App\Models\Pickup;
use App\Models\PickupPhoto;
use App\Models\Supplier;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

function createDriverWithPickup(): array
{
    $commodity = Commodity::factory()->create();
    CommodityPrice::create([
        'commodity_id' => $commodity->id,
        'price' => 100.00,
        'effective_from' => now()->subDay(),
        'created_by_admin_id' => User::factory()->superAdmin()->create()->id,
    ]);

    $supplier = Supplier::factory()->create();
    $hub = Hub::factory()->create();

    $hubManagerUser = User::factory()->employee()->create();
    Employee::factory()->create(['user_id' => $hubManagerUser->id, 'role' => 'hub_manager']);
    $hub->update(['manager_employee_id' => $hubManagerUser->id]);

    HubCommodity::create([
        'hub_id' => $hub->id,
        'commodity_id' => $commodity->id,
        'current_inventory_total' => 0,
    ]);

    $contract = Contract::factory()->create([
        'party_id' => $supplier->user_id,
        'commodity_id' => $commodity->id,
    ]);

    $driverUser = User::factory()->employee()->create();
    Employee::factory()->create(['user_id' => $driverUser->id, 'role' => 'driver']);
    $truck = Truck::factory()->create(['hub_id' => $hub->id]);

    $pickup = Pickup::factory()->create([
        'contract_id' => $contract->id,
        'supplier_user_id' => $supplier->user_id,
        'hub_id' => $hub->id,
        'driver_employee_id' => $driverUser->id,
        'truck_id' => $truck->id,
        'status' => 'in_progress',
        'estimated_weight' => 500,
        'departed_to_hub_at' => now(),
        'started_at' => now(),
    ]);

    PickupPhoto::create([
        'pickup_id' => $pickup->id,
        'photo_path' => 'test/photo.jpg',
        'uploaded_at' => now(),
    ]);

    return compact('driverUser', 'hubManagerUser', 'pickup', 'hub', 'commodity', 'contract');
}

test('driver can select delivery hub on completion', function () {
    $data = createDriverWithPickup();
    $otherHub = Hub::factory()->create();

    $response = $this->actingAs($data['driverUser'])->patchJson("/api/v1/driver/pickups/{$data['pickup']->id}/complete", [
        'proof_note' => 'Delivered to alternate hub due to capacity.',
        'delivered_to_hub_id' => $otherHub->id,
    ]);

    $response->assertOk();
    expect($data['pickup']->fresh()->delivered_to_hub_id)->toBe($otherHub->id);
    expect($data['pickup']->fresh()->status)->toBe('completed');
});

test('driver can complete without selecting hub (uses default)', function () {
    $data = createDriverWithPickup();

    $response = $this->actingAs($data['driverUser'])->patchJson("/api/v1/driver/pickups/{$data['pickup']->id}/complete", [
        'proof_note' => 'Standard delivery to assigned hub.',
    ]);

    $response->assertOk();
    expect($data['pickup']->fresh()->delivered_to_hub_id)->toBeNull();
    expect($data['pickup']->fresh()->effectiveHubId())->toBe($data['hub']->id);
});

test('hub manager can inspect a completed pickup', function () {
    $data = createDriverWithPickup();
    $data['pickup']->update(['status' => 'completed', 'completed_at' => now()]);

    $response = $this->actingAs($data['hubManagerUser'])->postJson("/api/v1/hub/pickups/{$data['pickup']->id}/inspect");

    $response->assertOk();
    $response->assertJsonPath('data.effective_hub_id', $data['hub']->id);
});

test('hub manager can receive and step through inbound stages', function () {
    $data = createDriverWithPickup();
    $data['pickup']->update(['status' => 'completed', 'completed_at' => now()]);

    // Step 1: Receive
    $receive = $this->actingAs($data['hubManagerUser'])->postJson('/api/v1/hub/inbound', [
        'pickup_id' => $data['pickup']->id,
    ]);
    $receive->assertCreated();
    $inboundId = $receive->json('data.id');

    // Step 2: Weigh Tier 1
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inboundId}/status", [
        'status' => 'weighted_tier1',
        'tier1_weight' => 500,
    ])->assertOk();
    expect(InboundRecord::find($inboundId)->status)->toBe('weighted_tier1');

    // Step 3: Start Sorting
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inboundId}/status", [
        'status' => 'sorting',
        'sorter_names' => 'Ahmed, Mohamed',
    ])->assertOk();
    expect(InboundRecord::find($inboundId)->status)->toBe('sorting');

    // Step 4: Sorting Complete
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inboundId}/status", [
        'status' => 'sorted',
    ])->assertOk();
    expect(InboundRecord::find($inboundId)->status)->toBe('sorted');
});

test('quality check auto-calculates pricing at 70 percent of market price', function () {
    $data = createDriverWithPickup();
    $data['pickup']->update(['status' => 'completed', 'completed_at' => now()]);

    $this->actingAs($data['hubManagerUser'])->postJson('/api/v1/hub/inbound', [
        'pickup_id' => $data['pickup']->id,
    ]);

    $inbound = InboundRecord::where('pickup_id', $data['pickup']->id)->first();

    // Move through stages
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inbound->id}/status", ['status' => 'weighted_tier1', 'tier1_weight' => 500]);
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inbound->id}/status", ['status' => 'sorting']);
    $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inbound->id}/status", ['status' => 'sorted']);

    // Quality check with tier weights
    $response = $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inbound->id}/quality", [
        'tier1_weight' => 500,
        'tier2_weight' => 450,
    ]);

    $response->assertOk();
    $inbound->refresh();

    expect($inbound->status)->toBe('weighted_tier2');
    expect((float) $inbound->pricing_unit_price)->toBe(70.00); // 100 * 0.70
    expect((float) $inbound->pricing_total_amount)->toBe(31500.00); // 70 * 450
    expect($inbound->supplier_invoice_number)->toStartWith('WTV-SQ-');
});

test('invalid status transition is rejected', function () {
    $data = createDriverWithPickup();
    $data['pickup']->update(['status' => 'completed', 'completed_at' => now()]);

    $this->actingAs($data['hubManagerUser'])->postJson('/api/v1/hub/inbound', [
        'pickup_id' => $data['pickup']->id,
    ]);

    $inbound = InboundRecord::where('pickup_id', $data['pickup']->id)->first();

    // Try to jump from received directly to sorted (should fail)
    $response = $this->actingAs($data['hubManagerUser'])->patchJson("/api/v1/hub/inbound/{$inbound->id}/status", [
        'status' => 'sorted',
    ]);

    $response->assertUnprocessable();
});
