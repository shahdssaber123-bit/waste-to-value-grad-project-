<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(['role' => 'employee']),
            'role' => $this->faker->randomElement(['hub_manager', 'driver']),
            'employment_status' => 'active',
        ];
    }
}
