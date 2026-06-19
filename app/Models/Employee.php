<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['user_id', 'role', 'driver_license_number', 'hire_date', 'shift', 'employment_status'])]
class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'hire_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function managedHub(): HasOne
    {
        return $this->hasOne(Hub::class, 'manager_employee_id', 'user_id');
    }

    public function isDriver(): bool
    {
        return $this->role === 'driver';
    }

    public function isHubManager(): bool
    {
        return $this->role === 'hub_manager';
    }

    public function isActive(): bool
    {
        return $this->employment_status === 'active';
    }
}
