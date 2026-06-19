<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommodityPrice extends Model
{
    protected $table = 'commodity_prices';

    public $timestamps = false;

    protected $fillable = [
        'commodity_id',
        'price',
        'effective_from',
        'effective_to',
        'created_by_admin_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'effective_from' => 'datetime',
        'effective_to' => 'datetime',
    ];

    /**
     * Get the commodity this price belongs to.
     */
    public function commodity(): BelongsTo
    {
        return $this->belongsTo(Commodity::class);
    }

    /**
     * Get the admin who created this price record.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_admin_id');
    }
}
