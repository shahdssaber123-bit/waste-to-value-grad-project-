<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Pickup extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_id', 'supplier_user_id', 'supplier_location_id', 'hub_id', 'delivered_to_hub_id', 'truck_id',
        'driver_employee_id', 'scheduled_by_admin_id', 'status',
        'schedule_date', 'estimated_weight', 'proof_note', 'pickup_location', 'material_condition', 'reported_contamination_percent', 'supplier_notes', 'started_at', 'supplier_arrived_at', 'departed_to_hub_at', 'hub_arrived_at', 'completed_at',
    ];

    protected $casts = [
        'schedule_date' => 'datetime',
        'started_at' => 'datetime',
        'supplier_arrived_at' => 'datetime',
        'departed_to_hub_at' => 'datetime',
        'hub_arrived_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_user_id', 'user_id');
    }

    public function supplierLocation(): BelongsTo
    {
        return $this->belongsTo(SupplierLocation::class, 'supplier_location_id');
    }

    public function hub(): BelongsTo
    {
        return $this->belongsTo(Hub::class);
    }

    /**
     * Get the hub the driver actually delivered to (may differ from assigned hub).
     */
    public function deliveredToHub(): BelongsTo
    {
        return $this->belongsTo(Hub::class, 'delivered_to_hub_id');
    }

    /**
     * Return the effective hub ID (driver's chosen hub or originally assigned).
     */
    public function effectiveHubId(): int
    {
        return $this->delivered_to_hub_id ?? $this->hub_id;
    }

    public function truck(): BelongsTo
    {
        return $this->belongsTo(Truck::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'driver_employee_id', 'user_id');
    }

    public function scheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by_admin_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(PickupPhoto::class);
    }

    public function inboundRecord(): HasOne
    {
        return $this->hasOne(InboundRecord::class);
    }

    public function isScheduled(): bool
    {
        return $this->status === 'scheduled';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
