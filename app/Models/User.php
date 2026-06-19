<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'fname',
        'lname',
        'phone',
        'email',
        'email_verified_at',
        'password',
        'ssn',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function superAdmin(): HasOne
    {
        return $this->hasOne(SuperAdmin::class);
    }

    public function supplier(): HasOne
    {
        return $this->hasOne(Supplier::class);
    }

    public function factoryProfile(): HasOne
    {
        return $this->hasOne(Factory::class);
    }

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function isVerified(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function profile(): HasOne
    {
        return match ($this->role) {
            'super_admin' => $this->superAdmin(),
            'supplier' => $this->supplier(),
            'factory' => $this->factoryProfile(),
            'employee' => $this->employee(),
        };
    }
}
