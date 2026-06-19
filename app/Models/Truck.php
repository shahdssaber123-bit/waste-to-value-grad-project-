<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Truck extends Model
{
    use HasFactory;

    protected $fillable = [
        'hub_id',
        'payload_capacity',
        'truck_type',
        'plate_number',
        'status',
    ];

    /**
     * Get the hub that the truck belongs to.
     */
    public function hub(): BelongsTo
    {
        return $this->belongsTo(Hub::class);
    }

    /**
     * Determine if the truck is available.
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }
}
