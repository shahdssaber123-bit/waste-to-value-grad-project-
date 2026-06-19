<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
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
            'party_id' => Supplier::factory(),
            'party_type' => 'supplier',
            'invoice_number' => Invoice::generateInvoiceNumber(),
            'due_date' => now()->addDays(30),
            'status' => 'pending',
            'total_amount' => 1000,
            'invoice_type' => 'supplier',
        ];
    }
}
