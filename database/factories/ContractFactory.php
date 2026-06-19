<?php

namespace Database\Factories;

use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContractFactory extends Factory
{
    protected $model = Contract::class;

    public function definition(): array
    {
        return [
            'party_id' => Supplier::factory(),
            'party_type' => 'supplier',
            'commodity_id' => Commodity::factory(),
            'status' => 'active',
            'shipment_threshold_kg' => $this->faker->numberBetween(100, 1000),
        ];
    }
}
