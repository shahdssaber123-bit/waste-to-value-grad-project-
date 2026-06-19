<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Commodity extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
    ];

    /**
     * Get the price history for the commodity.
     */
    public function prices(): HasMany
    {
        return $this->hasMany(CommodityPrice::class);
    }

    /**
     * Get the hub commodity links.
     */
    public function hubCommodities(): HasMany
    {
        return $this->hasMany(HubCommodity::class);
    }

    /**
     * Get the hubs where this commodity is tracked.
     */
    public function hubs(): BelongsToMany
    {
        return $this->belongsToMany(Hub::class, 'hub_commodity')
            ->withPivot('current_inventory_total');
    }

    /**
     * Get the single currently-active price record, or null if none set.
     */
    public function currentPrice(): HasOne
    {
        return $this->hasOne(CommodityPrice::class)
            ->whereNull('effective_to')
            ->latestOfMany('effective_from');
    }
}
