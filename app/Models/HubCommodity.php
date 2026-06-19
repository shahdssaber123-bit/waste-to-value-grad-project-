<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HubCommodity extends Model
{
    protected $table = 'hub_commodity';

    protected $primaryKey = null;

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'hub_id',
        'commodity_id',
        'current_inventory_total',
        'reserved_inventory_total',
    ];

    protected $casts = [
        'current_inventory_total' => 'decimal:2',
        'reserved_inventory_total' => 'decimal:2',
    ];

    /**
     * Get the hub for this link.
     */
    public function hub(): BelongsTo
    {
        return $this->belongsTo(Hub::class);
    }

    /**
     * Get the commodity for this link.
     */
    public function commodity(): BelongsTo
    {
        return $this->belongsTo(Commodity::class);
    }
}
