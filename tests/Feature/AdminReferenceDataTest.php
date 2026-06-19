<?php

use App\Models\Commodity;
use App\Models\Hub;
use App\Models\Truck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::create([
        'fname' => 'Super',
        'lname' => 'Admin',
        'email' => 'admin@test.com',
        'password' => bcrypt('password'),
        'role' => 'super_admin',
        'email_verified_at' => now(),
    ]);

    $this->admin->superAdmin()->create([]);

    $this->actingAs($this->admin);
});

test('admin can create a hub', function () {
    $manager = User::create([
        'fname' => 'Hub',
        'lname' => 'Manager',
        'email' => 'manager@test.com',
        'password' => bcrypt('password'),
        'role' => 'employee',
        'email_verified_at' => now(),
    ]);

    $manager->employee()->create([
        'role' => 'hub_manager',
        'employment_status' => 'active',
    ]);

    $response = $this->postJson('/api/v1/admin/hubs', [
        'location' => 'Test Location',
        'size_sq_meters' => 500,
        'capacity' => 10000,
        'manager_employee_id' => $manager->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.location', 'Test Location');

    $this->assertDatabaseHas('hubs', [
        'location' => 'Test Location',
        'manager_employee_id' => $manager->id,
    ]);
});

test('admin cannot create a hub with non-hub-manager employee', function () {
    $nonManager = User::create([
        'fname' => 'Driver',
        'lname' => 'User',
        'email' => 'driver@test.com',
        'password' => bcrypt('password'),
        'role' => 'employee',
        'email_verified_at' => now(),
    ]);

    $nonManager->employee()->create([
        'role' => 'driver',
        'employment_status' => 'active',
    ]);

    $response = $this->postJson('/api/v1/admin/hubs', [
        'location' => 'Test Location',
        'manager_employee_id' => $nonManager->id,
    ]);

    $response->assertStatus(422)
        ->assertJson(['message' => 'The selected employee is not a hub manager.']);
});

test('admin can list hubs', function () {
    Hub::create(['location' => 'Hub 1']);
    Hub::create(['location' => 'Hub 2']);

    $response = $this->getJson('/api/v1/admin/hubs');

    $response->assertOk()
        ->assertJsonCount(2, 'data.data');
});

test('admin can create a truck', function () {
    $hub = Hub::create(['location' => 'Test Hub']);

    $response = $this->postJson('/api/v1/admin/trucks', [
        'hub_id' => $hub->id,
        'payload_capacity' => 2000,
        'truck_type' => 'Flatbed',
        'plate_number' => 'TEST-001',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.plate_number', 'TEST-001');

    $this->assertDatabaseHas('trucks', [
        'plate_number' => 'TEST-001',
        'status' => 'available',
    ]);
});

test('admin can update truck status', function () {
    $hub = Hub::create(['location' => 'Test Hub']);
    $truck = Truck::create([
        'hub_id' => $hub->id,
        'payload_capacity' => 2000,
        'truck_type' => 'Flatbed',
        'plate_number' => 'TEST-001',
        'status' => 'available',
    ]);

    $response = $this->patchJson("/api/v1/admin/trucks/{$truck->id}/status", [
        'status' => 'maintenance',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.status', 'maintenance');

    $this->assertEquals('maintenance', $truck->fresh()->status);
});

test('admin cannot set truck status to in_use manually', function () {
    $hub = Hub::create(['location' => 'Test Hub']);
    $truck = Truck::create([
        'hub_id' => $hub->id,
        'payload_capacity' => 2000,
        'truck_type' => 'Flatbed',
        'plate_number' => 'TEST-001',
        'status' => 'available',
    ]);

    $response = $this->patchJson("/api/v1/admin/trucks/{$truck->id}/status", [
        'status' => 'in_use',
    ]);

    $response->assertStatus(422);
});

test('admin can create a commodity', function () {
    $response = $this->postJson('/api/v1/admin/commodities', [
        'title' => 'Cardboard',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Cardboard');

    $this->assertDatabaseHas('commodities', ['title' => 'Cardboard']);
});

test('admin can set commodity price', function () {
    $commodity = Commodity::create(['title' => 'Cardboard']);

    $response = $this->postJson("/api/v1/admin/commodities/{$commodity->id}/prices", [
        'price' => 2.50,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.price', '2.50');

    $this->assertDatabaseHas('commodity_prices', [
        'commodity_id' => $commodity->id,
        'price' => 2.50,
        'effective_to' => null,
    ]);
});

test('admin can link commodity to hub', function () {
    $hub = Hub::create(['location' => 'Test Hub']);
    $commodity = Commodity::create(['title' => 'Cardboard']);

    $response = $this->postJson("/api/v1/admin/hubs/{$hub->id}/commodities", [
        'commodity_id' => $commodity->id,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.commodity_title', 'Cardboard');

    $this->assertDatabaseHas('hub_commodity', [
        'hub_id' => $hub->id,
        'commodity_id' => $commodity->id,
    ]);
});

test('admin cannot delete hub with active trucks', function () {
    $hub = Hub::create(['location' => 'Test Hub']);
    Truck::create([
        'hub_id' => $hub->id,
        'payload_capacity' => 2000,
        'truck_type' => 'Flatbed',
        'plate_number' => 'TEST-001',
        'status' => 'available',
    ]);

    $response = $this->deleteJson("/api/v1/admin/hubs/{$hub->id}");

    $response->assertStatus(422)
        ->assertJson(['message' => 'Cannot delete a hub that has active trucks assigned to it.']);
});

test('admin can delete hub with no active trucks', function () {
    $hub = Hub::create(['location' => 'Test Hub']);
    Truck::create([
        'hub_id' => $hub->id,
        'payload_capacity' => 2000,
        'truck_type' => 'Flatbed',
        'plate_number' => 'TEST-001',
        'status' => 'maintenance',
    ]);

    $response = $this->deleteJson("/api/v1/admin/hubs/{$hub->id}");

    $response->assertOk()
        ->assertJson(['message' => 'Hub deleted successfully.']);

    $this->assertSoftDeleted('hubs', ['id' => $hub->id]);
});
