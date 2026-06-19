<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class HubShipmentReadyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $hubId,
        public readonly float $totalInventoryKg,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array{hub_id: int, total_inventory_kg: float, message: string}
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'hub_id' => $this->hubId,
            'total_inventory_kg' => $this->totalInventoryKg,
            'message' => "Hub #{$this->hubId} has reached shipment readiness with {$this->totalInventoryKg} kg of inventory. Consider scheduling an outbound delivery.",
        ];
    }
}
