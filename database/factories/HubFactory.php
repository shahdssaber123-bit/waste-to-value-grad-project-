<?php

namespace Database\Factories;

use App\Models\Hub;
use Illuminate\Database\Eloquent\Factories\Factory;

class HubFactory extends Factory
{
    protected $model = Hub::class;

    public function definition(): array
    {
        return [
            'location' => $this->faker->address(),
            'size_sq_meters' => $this->faker->numberBetween(50, 500),
            'capacity' => $this->faker->numberBetween(1000, 10000),
        ];
    }
}
