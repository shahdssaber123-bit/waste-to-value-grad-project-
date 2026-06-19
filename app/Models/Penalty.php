<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Penalty extends Model
{
    protected $table = 'penalties';

    protected $fillable = ['invoice_id', 'amount', 'penalty_stage', 'applied_at'];

    public $timestamps = false;   // only created_at, managed via useCurrent()

    protected $casts = ['amount' => 'decimal:2'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
