<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hub extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'location',
        'size_sq_meters',
        'capacity',
        'manager_employee_id',
    ];

    /**
     * Get the manager of the hub.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'manager_employee_id', 'user_id');
    }

    /**
     * Get the trucks assigned to the hub.
     */
    public function trucks(): HasMany
    {
        return $this->hasMany(Truck::class);
    }

    /**
     * Get the hub commodity links.
     */
    public function hubCommodities(): HasMany
    {
        return $this->hasMany(HubCommodity::class);
    }

    /**
     * Get the commodities tracked at this hub.
     */
    public function commodities(): BelongsToMany
    {
        return $this->belongsToMany(Commodity::class, 'hub_commodity')
            ->withPivot('current_inventory_total')
            ->withTimestamps();
    }
}
