<?php

use App\Models\Application;
use Database\Factories\UserFactory;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SuperAdminSeeder::class);
});

test('superadmin can login directly (MFA deferred)', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'admin@platform.com',
        'password' => 'changeme123',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'token',
                'user' => ['id', 'fname', 'role'],
            ],
        ]);
});

test('public user can submit application and verify email', function () {
    $response = $this->postJson('/api/v1/applications', [
        'idempotency_token' => (string) Str::uuid(),
        'company_name' => 'Test Factory',
        'contact_name' => 'John Doe',
        'email' => 'john@factory.com',
        'phone' => '1234567890',
        'role' => 'factory',
        'tax_id' => 'TAX123',
        'required_commodity' => 'Plastic',
    ]);

    $response->assertStatus(201);

    $application = Application::first();
    $token = $application->email_verification_token;

    $verifyResponse = $this->getJson("/api/v1/applications/verify-email/{$token}");
    $verifyResponse->assertOk();

    $this->assertNotNull($application->fresh()->email_verified_at);
});

test('unverified user cannot login', function () {
    $user = UserFactory::new()->unverified()->create([
        'email' => 'unverified@test.com',
        'password' => Hash::make('password'),
        'role' => 'supplier',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'unverified@test.com',
        'password' => 'password',
    ]);

    $response->assertForbidden()
        ->assertJson(['message' => 'Your email address is not verified.']);
});

test('terminated employee cannot login', function () {
    $user = UserFactory::new()->employee()->create([
        'email' => 'terminated@test.com',
        'password' => Hash::make('password'),
    ]);

    $user->employee()->create([
        'role' => 'driver',
        'employment_status' => 'terminated',
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'terminated@test.com',
        'password' => 'password',
    ]);

    $response->assertForbidden()
        ->assertJson(['message' => 'Your account has been deactivated. Please contact support.']);
});
