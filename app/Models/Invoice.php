<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id', 'outbound_delivery_id', 'party_id', 'party_type',
        'invoice_number', 'due_date', 'status', 'total_amount',
        'invoice_type', 'idempotency_key', 'paid_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'total_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public static function generateInvoiceNumber(): string
    {
        $count = static::count() + 1;

        return 'INV-'.now()->year.'-'.str_pad($count, 6, '0', STR_PAD_LEFT);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function outboundDelivery(): BelongsTo
    {
        return $this->belongsTo(OutboundDelivery::class);
    }

    public function penalties(): HasMany
    {
        return $this->hasMany(Penalty::class);
    }
}
