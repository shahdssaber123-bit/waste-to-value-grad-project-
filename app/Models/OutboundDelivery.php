<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OutboundDelivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id', 'hub_id', 'commodity_id', 'status',
        'quantity_kg', 'scheduled_date', 'confirmed_at',
        'rejection_window_end', 'rejected_at', 'rejection_reason', 'idempotency_key',
    ];

    protected $casts = [
        'quantity_kg' => 'decimal:2',
        'scheduled_date' => 'datetime',
        'confirmed_at' => 'datetime',
        'rejection_window_end' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function hub(): BelongsTo
    {
        return $this->belongsTo(Hub::class);
    }

    public function commodity(): BelongsTo
    {
        return $this->belongsTo(Commodity::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function isWithinRejectionWindow(): bool
    {
        return $this->status === 'delivered'
            && $this->rejection_window_end !== null
            && now()->lessThan($this->rejection_window_end);
    }
}
