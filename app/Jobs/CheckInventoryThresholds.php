<?php

namespace App\Jobs;

use App\Models\HubCommodity;
use App\Models\OutboundDelivery;
use App\Models\User;
use App\Notifications\DeliveryScheduledNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class CheckInventoryThresholds implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $candidates = HubCommodity::query()
            ->join('contracts', function ($join) {
                $join->on('contracts.commodity_id', '=', 'hub_commodity.commodity_id')
                    ->where('contracts.status', '=', 'active')
                    ->where('contracts.party_type', '=', 'factory');
            })
            ->whereRaw('hub_commodity.current_inventory_total >= contracts.shipment_threshold_kg')
            ->select('hub_commodity.hub_id', 'hub_commodity.commodity_id', 'contracts.id as contract_id', 'contracts.shipment_threshold_kg', 'hub_commodity.current_inventory_total')
            ->get();

        foreach ($candidates as $candidate) {
            $alreadyAllocated = OutboundDelivery::where('hub_id', $candidate->hub_id)
                ->where('commodity_id', $candidate->commodity_id)
                ->whereNotIn('status', ['delivered', 'confirmed', 'rejected'])
                ->exists();

            if ($alreadyAllocated) {
                continue;
            }

            $idempotencyKey = 'outbound-'.$candidate->hub_id.'-'.$candidate->commodity_id.'-'.now()->format('YmdH');

            $alreadyCreated = OutboundDelivery::where('idempotency_key', $idempotencyKey)->exists();
            if ($alreadyCreated) {
                continue;
            }

            DB::transaction(function () use ($candidate, $idempotencyKey) {
                $hubCommodity = HubCommodity::where('hub_id', $candidate->hub_id)
                    ->where('commodity_id', $candidate->commodity_id)
                    ->lockForUpdate()
                    ->first();

                if (! $hubCommodity || $hubCommodity->current_inventory_total < $candidate->shipment_threshold_kg) {
                    return;
                }

                $quantity = $hubCommodity->current_inventory_total;

                OutboundDelivery::create([
                    'contract_id' => $candidate->contract_id,
                    'hub_id' => $candidate->hub_id,
                    'commodity_id' => $candidate->commodity_id,
                    'status' => 'scheduled',
                    'quantity_kg' => $quantity,
                    'scheduled_date' => now()->addDays(2),
                    'idempotency_key' => $idempotencyKey,
                ]);

                $hubCommodity->decrement('current_inventory_total', $quantity);
            });

            $delivery = OutboundDelivery::where('idempotency_key', $idempotencyKey)->first();
            $factoryUser = User::find($delivery->contract->party_id);
            $factoryUser->notify(new DeliveryScheduledNotification($delivery));
        }
    }
}
