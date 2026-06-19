<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InboundRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'pickup_id', 'contract_id', 'hub_id',
        'tier1_weight', 'tier2_weight',
        'contamination_ratio', 'accepted_weight', 'status',
        'quality_notes', 'sorter_count', 'decontamination_notes',
        'received_at', 'inspected_by_hub_manager_id',
        'tier1_weighted_at', 'sorting_started_at', 'sorting_completed_at',
        'sorter_names', 'tier2_weighted_at',
        'pricing_unit_price', 'pricing_total_amount',
        'supplier_invoice_number', 'supplier_invoice_generated_at',
    ];

    protected $casts = [
        'tier1_weight' => 'decimal:2',
        'tier2_weight' => 'decimal:2',
        'contamination_ratio' => 'decimal:4',
        'accepted_weight' => 'decimal:2',
        'pricing_unit_price' => 'decimal:2',
        'pricing_total_amount' => 'decimal:2',
        'received_at' => 'datetime',
        'tier1_weighted_at' => 'datetime',
        'sorting_started_at' => 'datetime',
        'sorting_completed_at' => 'datetime',
        'tier2_weighted_at' => 'datetime',
        'supplier_invoice_generated_at' => 'datetime',
    ];

    public function pickup(): BelongsTo
    {
        return $this->belongsTo(Pickup::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function hub(): BelongsTo
    {
        return $this->belongsTo(Hub::class);
    }

    /**
     * Get the hub manager who inspected this inbound record.
     */
    public function inspectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by_hub_manager_id');
    }

    public function baleCubes(): HasMany
    {
        return $this->hasMany(BaleCube::class);
    }

    /**
     * Granular hub processing stages:
     *   received → weighted_tier1 → sorting → sorted → weighted_tier2 → baled
     *   Any stage before baled can also transition to rejected.
     *   Legacy statuses (quality_checked, completed) are kept for backward compatibility.
     */
    private const TRANSITIONS = [
        'received' => ['weighted_tier1', 'rejected'],
        'weighted_tier1' => ['sorting', 'rejected'],
        'sorting' => ['sorted', 'rejected'],
        'sorted' => ['weighted_tier2', 'rejected'],
        'weighted_tier2' => ['baled', 'rejected'],
        'baled' => [],
        // Legacy statuses for backward compatibility
        'quality_checked' => ['completed', 'baled', 'rejected'],
        'completed' => [],
        'rejected' => [],
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::TRANSITIONS[$this->status] ?? []);
    }
}
