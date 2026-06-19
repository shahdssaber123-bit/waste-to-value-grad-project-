<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Hub;
use App\Models\Pickup;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PickupFactory extends Factory
{
    protected $model = Pickup::class;

    public function definition(): array
    {
        return [
            'contract_id' => Contract::factory(),
            'supplier_user_id' => Supplier::factory(),
            'hub_id' => Hub::factory(),
            'scheduled_by_admin_id' => User::factory(['role' => 'super_admin']),
            'status' => 'scheduled',
            'schedule_date' => now()->addDay(),
            'estimated_weight' => $this->faker->numberBetween(100, 500),
        ];
    }
}
