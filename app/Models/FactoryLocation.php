<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FactoryLocation extends Model
{
    protected $table = 'factory_locations';

    protected $fillable = ['user_id', 'location_name', 'address'];

    public function factory(): BelongsTo
    {
        return $this->belongsTo(Factory::class, 'user_id', 'user_id');
    }
}
