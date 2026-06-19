<?php

use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Hub;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => 'super_admin']);
    $this->commodity = Commodity::create(['title' => 'Plastic']);
    $this->hub = Hub::create([
        'location' => 'Main Hub Location',
        'size_sq_meters' => 100,
        'capacity' => 1000,
    ]);
});

test('admin can create supplier and it auto-creates a draft contract', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/users', [
        'fname' => 'John',
        'lname' => 'Doe',
        'email' => 'supplier@example.com',
        'password' => 'password123',
        'phone' => '1234567890',
        'role' => 'supplier',
        'company_name' => 'Supplier Co',
        'commodity_id' => $this->commodity->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.contract.status', 'draft')
        ->assertJsonPath('data.contract.commodity_id', $this->commodity->id);

    $this->assertDatabaseHas('contracts', [
        'party_type' => 'supplier',
        'status' => 'draft',
        'commodity_id' => $this->commodity->id,
    ]);
});

test('admin can update contract terms', function () {
    $user = User::factory()->create(['role' => 'supplier']);
    $user->supplier()->create(['company_name' => 'Test Supplier']);
    $contract = Contract::create([
        'party_id' => $user->id,
        'party_type' => 'supplier',
        'commodity_id' => $this->commodity->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->admin)->patchJson("/api/v1/admin/contracts/{$contract->id}", [
        'payment_terms' => 'Net 30',
        'shipment_threshold_kg' => 500,
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('contracts', [
        'id' => $contract->id,
        'payment_terms' => 'Net 30',
        'shipment_threshold_kg' => 500.00,
    ]);
});

test('admin can activate contract after setting threshold', function () {
    $user = User::factory()->create(['role' => 'supplier']);
    $user->supplier()->create(['company_name' => 'Test Supplier']);
    $contract = Contract::create([
        'party_id' => $user->id,
        'party_type' => 'supplier',
        'commodity_id' => $this->commodity->id,
        'status' => 'draft',
        'shipment_threshold_kg' => 500,
    ]);

    $response = $this->actingAs($this->admin)->patchJson("/api/v1/admin/contracts/{$contract->id}/status", [
        'status' => 'active',
    ]);

    $response->assertStatus(200);
    $this->assertEquals('active', $contract->fresh()->status);
});

test('admin cannot activate contract without threshold', function () {
    $user = User::factory()->create(['role' => 'supplier']);
    $user->supplier()->create(['company_name' => 'Test Supplier']);
    $contract = Contract::create([
        'party_id' => $user->id,
        'party_type' => 'supplier',
        'commodity_id' => $this->commodity->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->admin)->patchJson("/api/v1/admin/contracts/{$contract->id}/status", [
        'status' => 'active',
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'A shipment threshold must be set before activating a contract.']);
});

test('admin can schedule a pickup for active supplier contract', function () {
    $user = User::factory()->create(['role' => 'supplier']);
    $user->supplier()->create(['company_name' => 'Test Supplier']);
    $contract = Contract::create([
        'party_id' => $user->id,
        'party_type' => 'supplier',
        'commodity_id' => $this->commodity->id,
        'status' => 'active',
        'shipment_threshold_kg' => 500,
    ]);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/pickups', [
        'contract_id' => $contract->id,
        'hub_id' => $this->hub->id,
        'schedule_date' => now()->addDay()->toIso8601String(),
        'estimated_weight' => 200,
    ]);

    $response->assertStatus(201);
    $this->assertDatabaseHas('pickups', [
        'contract_id' => $contract->id,
        'hub_id' => $this->hub->id,
        'status' => 'scheduled',
    ]);
});

test('admin cannot schedule pickup for inactive contract', function () {
    $user = User::factory()->create(['role' => 'supplier']);
    $user->supplier()->create(['company_name' => 'Test Supplier']);
    $contract = Contract::create([
        'party_id' => $user->id,
        'party_type' => 'supplier',
        'commodity_id' => $this->commodity->id,
        'status' => 'draft',
    ]);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/pickups', [
        'contract_id' => $contract->id,
        'hub_id' => $this->hub->id,
        'schedule_date' => now()->addDay()->toIso8601String(),
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Pickups can only be scheduled against an active contract.']);
});
