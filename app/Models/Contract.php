<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'party_id', 'party_type', 'commodity_id', 'status',
        'payment_terms', 'material_type', 'shipment_threshold_kg', 'signed_date',
    ];

    protected $casts = [
        'signed_date' => 'date',
        'shipment_threshold_kg' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    public function commodity(): BelongsTo
    {
        return $this->belongsTo(Commodity::class);
    }

    /**
     * Get the party (supplier or factory) associated with the contract.
     */
    public function party(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'party_type', 'party_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function pickups(): HasMany
    {
        return $this->hasMany(Pickup::class);
    }
}
