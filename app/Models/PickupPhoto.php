<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PickupPhoto extends Model
{
    protected $table = 'pickup_photos';

    protected $fillable = ['pickup_id', 'photo_path'];

    protected $casts = ['uploaded_at' => 'datetime'];

    protected $appends = ['photo_url'];

    public $timestamps = false;

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null;
    }

    public function pickup(): BelongsTo
    {
        return $this->belongsTo(Pickup::class);
    }
}
