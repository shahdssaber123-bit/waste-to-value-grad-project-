<?php

namespace Database\Factories;

use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Hub;
use App\Models\OutboundDelivery;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OutboundDelivery>
 */
class OutboundDeliveryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contract_id' => Contract::factory(),
            'hub_id' => Hub::factory(),
            'commodity_id' => Commodity::factory(),
            'status' => 'scheduled',
            'quantity_kg' => 100,
            'scheduled_date' => now()->addDays(2),
        ];
    }
}
