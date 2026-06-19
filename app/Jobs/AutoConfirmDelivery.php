<?php

namespace App\Jobs;

use App\Models\CommodityPrice;
use App\Models\Invoice;
use App\Models\OutboundDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoConfirmDelivery implements ShouldQueue
{
    use Queueable;

    public function __construct(protected int $deliveryId) {}

    public function handle(): void
    {
        $delivery = OutboundDelivery::find($this->deliveryId);

        if (! $delivery || $delivery->status !== 'delivered') {
            return;
        }

        DB::transaction(function () use ($delivery) {
            $delivery->update(['status' => 'confirmed']);

            $idempotencyKey = 'invoice-factory-'.$delivery->id;
            $exists = Invoice::where('idempotency_key', $idempotencyKey)->exists();

            if ($exists) {
                return;
            }

            $price = CommodityPrice::where('commodity_id', $delivery->commodity_id)
                ->whereNull('effective_to')
                ->latest('effective_from')
                ->firstOrFail();

            $totalAmount = $delivery->quantity_kg * $price->price * 1.10;

            Invoice::create([
                'contract_id' => $delivery->contract_id,
                'outbound_delivery_id' => $delivery->id,
                'party_id' => $delivery->contract->party_id,
                'party_type' => 'factory',
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'due_date' => now()->addDays(30)->toDateString(),
                'status' => 'pending',
                'total_amount' => $totalAmount,
                'invoice_type' => 'factory',
                'idempotency_key' => $idempotencyKey,
            ]);
        });

        Log::info('Factory invoice generated', ['delivery_id' => $delivery->id]);
    }
}
