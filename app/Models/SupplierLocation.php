<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupplierLocation extends Model
{
    protected $table = 'supplier_locations';

    protected $fillable = ['user_id', 'location_name', 'address'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'user_id', 'user_id');
    }

    public function pickups(): HasMany
    {
        return $this->hasMany(Pickup::class, 'supplier_location_id');
    }
}
