<?php

namespace App\Notifications;

use App\Models\OutboundDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class DeliveryRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly OutboundDelivery $delivery) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'delivery_id' => $this->delivery->id,
            'factory_id' => $this->delivery->contract->party_id,
            'rejection_reason' => $this->delivery->rejection_reason,
            'message' => 'A factory has rejected delivery #'.$this->delivery->id.'. Review required.',
        ];
    }
}
