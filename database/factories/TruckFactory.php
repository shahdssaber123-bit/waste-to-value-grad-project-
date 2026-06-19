<?php

namespace Database\Factories;

use App\Models\Hub;
use App\Models\Truck;
use Illuminate\Database\Eloquent\Factories\Factory;

class TruckFactory extends Factory
{
    protected $model = Truck::class;

    public function definition(): array
    {
        return [
            'hub_id' => Hub::factory(),
            'payload_capacity' => $this->faker->numberBetween(1000, 5000),
            'truck_type' => $this->faker->randomElement(['Box Truck', 'Flatbed', 'Refrigerated']),
            'plate_number' => $this->faker->unique()->bothify('??-####'),
            'status' => 'available',
        ];
    }
}
