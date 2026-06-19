<?php

namespace App\Notifications;

use App\Models\OutboundDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class DeliveryScheduledNotification extends Notification implements ShouldQueue
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
            'commodity' => $this->delivery->commodity->title,
            'quantity_kg' => $this->delivery->quantity_kg,
            'scheduled_date' => $this->delivery->scheduled_date,
            'message' => 'A delivery of '.$this->delivery->quantity_kg.'kg of '.$this->delivery->commodity->title.' has been scheduled.',
        ];
    }
}
