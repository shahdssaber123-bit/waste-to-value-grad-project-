<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BaleCube extends Model
{
    use HasFactory;

    protected $table = 'bale_cubes';

    protected $fillable = ['inbound_record_id', 'commodity_id', 'weight', 'quality_score', 'bale_code', 'quality_notes'];

    public $timestamps = false;   // only created_at, managed via useCurrent()

    protected $casts = [
        'weight' => 'decimal:2',
    ];

    public function inboundRecord(): BelongsTo
    {
        return $this->belongsTo(InboundRecord::class);
    }

    public function commodity(): BelongsTo
    {
        return $this->belongsTo(Commodity::class);
    }
}
