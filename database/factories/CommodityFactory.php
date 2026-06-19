<?php

namespace Database\Factories;

use App\Models\Commodity;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommodityFactory extends Factory
{
    protected $model = Commodity::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->unique()->word(),
        ];
    }
}
