<?php

namespace App\Notifications;

use App\Models\Pickup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PickupDispatchedNotification extends Notification implements ShouldQueue
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
            'schedule_date' => $this->pickup->schedule_date,
            'hub_location' => $this->pickup->hub->location,
            'message' => 'You have a new pickup scheduled for '.$this->pickup->schedule_date->format('d M Y, H:i'),
        ];
    }
}
