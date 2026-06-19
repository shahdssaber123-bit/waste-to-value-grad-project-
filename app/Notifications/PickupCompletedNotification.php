<?php

namespace App\Notifications;

use App\Models\Pickup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PickupCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Pickup $pickup) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'pickup_id' => $this->pickup->id,
            'supplier_name' => $this->pickup->supplier->user->fname.' '.$this->pickup->supplier->user->lname,
            'estimated_weight' => $this->pickup->estimated_weight,
            'message' => 'A new inbound load has arrived and is ready for processing.',
        ];
    }
}
