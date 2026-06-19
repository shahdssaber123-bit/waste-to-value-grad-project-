<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'company_name', 'contact_name', 'email', 'phone',
    'role', 'tax_id', 'required_commodity', 'location', 'message',
    'status', 'idempotency_token', 'email_verification_token',
    'email_verified_at', 'converted_user_id','password',
])]
class Application extends Model
{
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
        ];
    }

    public function convertedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'converted_user_id');
    }
}
