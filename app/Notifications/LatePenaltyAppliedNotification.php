<?php

namespace App\Notifications;

use App\Models\Invoice;
use App\Models\Penalty;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class LatePenaltyAppliedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Invoice $invoice,
        public readonly Penalty $penalty,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'invoice_id' => $this->invoice->id,
            'penalty_stage' => $this->penalty->penalty_stage,
            'penalty_amount' => $this->penalty->amount,
            'new_total' => $this->invoice->total_amount,
            'message' => 'Stage '.$this->penalty->penalty_stage.' late penalty of '.$this->penalty->amount.' applied to invoice #'.$this->invoice->invoice_number,
        ];
    }
}
