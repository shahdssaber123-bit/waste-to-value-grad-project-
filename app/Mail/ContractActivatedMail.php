<?php

namespace App\Mail;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContractActivatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Contract $contract,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Contract Is Now Active',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contract-activated',
        );
    }
}
