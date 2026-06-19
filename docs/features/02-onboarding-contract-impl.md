# Agent Instructions: Onboarding & Contract Management
## Stack: Laravel 11 + Sanctum + MySQL
## Dependencies: `0b-auth-spec-v2.md` + `01-core-reference-data-impl.md` must be fully implemented first

---

## 1. Overview

This document covers everything that happens after a Supplier or Factory submits their interest form and through to their contract going live and pickups being schedulable.

The application submission and email verification flow is already implemented in the auth spec (`ApplicationController@store` and `@verifyEmail`). This document picks up from the point where the Super Admin reviews a verified application and takes action.

**What is new in this document:**

| # | What |
|---|---|
| 1 | `contracts` migration + model |
| 2 | `pickups` migration + model *(partial — only the scheduling side; pickup execution is covered in doc 03)* |
| 3 | `AdminUserController@store` — extended to auto-create a draft contract on user creation |
| 4 | `AdminContractController` — full contract lifecycle management |
| 5 | `AdminPickupController@store` + `@index` — Super Admin schedules pickups for suppliers |

---

## 2. Database Migrations

Run after all migrations from the auth spec and core reference data docs.

---

### 2.1 Create `contracts` table

```php
$table->id();
$table->unsignedBigInteger('party_id');           // suppliers.user_id OR factories.user_id
$table->string('party_type', 50);                 // 'supplier' or 'factory'
$table->unsignedBigInteger('commodity_id');
$table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('restrict');
$table->enum('status', ['draft', 'active', 'expired', 'terminated'])->default('draft');
$table->string('payment_terms', 100)->nullable();
$table->string('material_type', 100)->nullable();  // human-readable label
$table->decimal('shipment_threshold_kg', 10, 2)->nullable(); // triggers outbound stock alert
$table->date('signed_date')->nullable();
$table->timestamps();
$table->softDeletes();

// Indexes
$table->index(['party_id', 'party_type', 'status']);
```

Note: No FK constraint on `party_id` because it is polymorphic. Application code is responsible for resolving the correct party.

---

### 2.2 Create `pickups` table

```php
$table->id();
$table->unsignedBigInteger('contract_id');
$table->foreign('contract_id')->references('id')->on('contracts')->onDelete('restrict');
$table->unsignedBigInteger('supplier_user_id');
$table->foreign('supplier_user_id')->references('user_id')->on('suppliers')->onDelete('restrict');
$table->unsignedBigInteger('hub_id');
$table->foreign('hub_id')->references('id')->on('hubs')->onDelete('restrict');
$table->unsignedBigInteger('truck_id')->nullable();  // assigned at dispatch time, not at scheduling
$table->foreign('truck_id')->references('id')->on('trucks')->nullOnDelete();
$table->unsignedBigInteger('driver_employee_id')->nullable();  // assigned at dispatch time
$table->foreign('driver_employee_id')->references('user_id')->on('employees')->nullOnDelete();
$table->unsignedBigInteger('scheduled_by_admin_id');
$table->foreign('scheduled_by_admin_id')->references('id')->on('users')->onDelete('restrict');
$table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
$table->dateTime('schedule_date');
$table->decimal('estimated_weight', 10, 2)->nullable();  // filled by driver at execution time
$table->dateTime('started_at')->nullable();              // filled when driver begins pickup
$table->timestamps();

// Indexes
$table->index(['hub_id', 'status', 'schedule_date']);
$table->unique(['truck_id', 'schedule_date']);  // time slot lock — prevents double-booking
```

Note: `truck_id` and `driver_employee_id` are nullable at creation. They are assigned when the Hub Manager dispatches the pickup (covered in doc 03). The unique constraint on `(truck_id, schedule_date)` enforces the time-slot lock described in the concurrency rules.

---

## 3. Models

---

### 3.1 `Contract` model

```php
protected $fillable = [
    'party_id', 'party_type', 'commodity_id', 'status',
    'payment_terms', 'material_type', 'shipment_threshold_kg', 'signed_date',
];

protected $casts = [
    'signed_date'             => 'date',
    'shipment_threshold_kg'   => 'decimal:2',
    'deleted_at'              => 'datetime',
];
```

Use `SoftDeletes` trait.

**Relationships:**
```php
public function commodity(): BelongsTo   // belongsTo(Commodity::class)
public function invoices(): HasMany      // hasMany(Invoice::class)
public function pickups(): HasMany       // hasMany(Pickup::class)
public function inboundRecords(): HasMany // hasMany(InboundRecord::class)
public function outboundDeliveries(): HasMany // hasMany(OutboundDelivery::class)
```

**Polymorphic party resolver:**
```php
// Returns the supplier or factory model for this contract's party
public function party(): Supplier|Factory|null
{
    return match($this->party_type) {
        'supplier' => Supplier::find($this->party_id),
        'factory'  => Factory::find($this->party_id),
        default    => null,
    };
}

public function isActive(): bool
{
    return $this->status === 'active';
}
```

---

### 3.2 `Pickup` model

```php
protected $fillable = [
    'contract_id', 'supplier_user_id', 'hub_id', 'truck_id',
    'driver_employee_id', 'scheduled_by_admin_id', 'status',
    'schedule_date', 'estimated_weight', 'started_at',
];

protected $casts = [
    'schedule_date' => 'datetime',
    'started_at'    => 'datetime',
];
```

**Relationships:**
```php
public function contract(): BelongsTo         // belongsTo(Contract::class)
public function supplier(): BelongsTo         // belongsTo(Supplier::class, 'supplier_user_id', 'user_id')
public function hub(): BelongsTo              // belongsTo(Hub::class)
public function truck(): BelongsTo            // belongsTo(Truck::class)
public function driver(): BelongsTo           // belongsTo(Employee::class, 'driver_employee_id', 'user_id')
public function scheduledBy(): BelongsTo      // belongsTo(User::class, 'scheduled_by_admin_id')
public function photos(): HasMany             // hasMany(PickupPhoto::class)
public function inboundRecord(): HasOne       // hasOne(InboundRecord::class)
```

**Helpers:**
```php
public function isScheduled(): bool  { return $this->status === 'scheduled'; }
public function isCompleted(): bool  { return $this->status === 'completed'; }
```

---

### 3.3 `PickupPhoto` model

```php
protected $table    = 'pickup_photos';
protected $fillable = ['pickup_id', 'photo_path'];
protected $casts    = ['uploaded_at' => 'datetime'];

public $timestamps = false;  // only uploaded_at, managed manually

public function pickup(): BelongsTo  // belongsTo(Pickup::class)
```

---

## 4. Extending `AdminUserController@store`

The auth spec defined `AdminUserController@store` to create a user and their role-specific profile. **This extension adds contract draft creation** for factory and supplier roles, inside the same `DB::transaction`.

Add the following step to the existing transaction, **after** the user and profile records are created:

```
// Step 3b — for factory and supplier roles only
if (in_array($role, ['factory', 'supplier'])) {
    Contract::create([
        'party_id'   => $user->id,
        'party_type' => $role,             // 'supplier' or 'factory'
        'commodity_id' => $validated['commodity_id'],  // see new validation field below
        'status'     => 'draft',
    ]);
}
```

**New validation field to add to `AdminUserController@store` for factory/supplier roles:**

| Field | Rules |
|---|---|
| `commodity_id` | required_if:role,factory\|supplier, exists:commodities,id |

**Updated response** — include the draft contract in the created user response:

```json
{
  "message": "User created successfully.",
  "data": {
    "user": { ... },
    "profile": { ... },
    "contract": {
      "id": 7,
      "status": "draft",
      "commodity_id": 1,
      "party_type": "supplier"
    }
  }
}
```

---

## 5. API Routes (`routes/api.php`)

All routes require `[auth:sanctum, accessible, superadmin]` unless noted.

```
Contracts:
  GET     /api/admin/contracts                      (list all, filterable)
  GET     /api/admin/contracts/{id}
  PATCH   /api/admin/contracts/{id}                 (update terms)
  PATCH   /api/admin/contracts/{id}/status          (activate / terminate / expire)
  DELETE  /api/admin/contracts/{id}                 (soft delete)

Pickups (scheduling only — execution is in doc 03):
  POST    /api/admin/pickups
  GET     /api/admin/pickups
  GET     /api/admin/pickups/{id}
  PATCH   /api/admin/pickups/{id}/cancel
```

---

## 6. Controllers & Logic

---

### 6.1 `AdminContractController@index`

**Route:** `GET /api/admin/contracts`

**Logic:**
1. Accept optional query params:
   - `?party_type=supplier|factory`
   - `?status=draft|active|expired|terminated`
   - `?commodity_id=`
2. Eager-load `commodity`, and resolve `party()` for each result.
3. Paginate (15 per page).
4. Return HTTP 200.

---

### 6.2 `AdminContractController@show`

**Route:** `GET /api/admin/contracts/{id}`

**Logic:**
1. Find contract (excluding soft-deleted) or 404.
2. Load `commodity`, resolved `party()`, and `invoices`.
3. Return HTTP 200.

---

### 6.3 `AdminContractController@update` — Enter Contract Terms

**Route:** `PATCH /api/admin/contracts/{id}`

This is the step where the Super Admin manually enters the terms after a contract is agreed and signed off-system. Can only be applied to contracts in `draft` or `active` status.

**Validation:**

| Field | Rules |
|---|---|
| `commodity_id` | nullable, exists:commodities,id |
| `payment_terms` | nullable, string, max:100 |
| `material_type` | nullable, string, max:100 |
| `shipment_threshold_kg` | nullable, numeric, min:1 |
| `signed_date` | nullable, date |

**Logic:**
1. Find contract or 404.
2. If `status` is `expired` or `terminated` → HTTP 422:
```json
{ "message": "Cannot update a contract that is expired or terminated." }
```
3. Update only provided fields.
4. Return HTTP 200 with updated contract.

---

### 6.4 `AdminContractController@updateStatus` — Activate / Terminate / Expire

**Route:** `PATCH /api/admin/contracts/{id}/status`

**Validation:**

| Field | Rules |
|---|---|
| `status` | required, in:active,terminated,expired |

**Allowed transitions:**

| From | To | Allowed |
|---|---|---|
| `draft` | `active` | ✓ |
| `draft` | `terminated` | ✓ |
| `active` | `terminated` | ✓ |
| `active` | `expired` | ✓ |
| `expired` | anything | ✗ |
| `terminated` | anything | ✗ |

**Logic:**
1. Find contract or 404.
2. Validate the transition against the table above. If invalid → HTTP 422:
```json
{ "message": "This status transition is not allowed." }
```
3. If transitioning to `active`:
   - Ensure `shipment_threshold_kg` is set. If not → HTTP 422:
   ```json
   { "message": "A shipment threshold must be set before activating a contract." }
   ```
   - Ensure `commodity_id` is set. If not → HTTP 422:
   ```json
   { "message": "A commodity must be linked before activating a contract." }
   ```
4. Update `status`.
5. Return HTTP 200 with updated contract.

---

### 6.5 `AdminContractController@destroy`

**Route:** `DELETE /api/admin/contracts/{id}`

**Logic:**
1. Find contract or 404.
2. If `status = active` → HTTP 422:
```json
{ "message": "Cannot delete an active contract. Terminate it first." }
```
3. Soft delete.
4. Return HTTP 200:
```json
{ "message": "Contract deleted successfully." }
```

---

### 6.6 `AdminPickupController@store` — Schedule a Pickup

**Route:** `POST /api/admin/pickups`

The Super Admin schedules one or more pickups for a supplier. Truck and driver are **not** assigned here — that happens at dispatch time by the Hub Manager (covered in doc 03).

**Validation:**

| Field | Rules |
|---|---|
| `contract_id` | required, exists:contracts,id |
| `hub_id` | required, exists:hubs,id |
| `schedule_date` | required, date, after:now |
| `estimated_weight` | nullable, numeric, min:1 |

**Logic:**
1. Validate.
2. Load the contract. If `status !== 'active'` → HTTP 422:
```json
{ "message": "Pickups can only be scheduled against an active contract." }
```
3. Verify the contract's `party_type = 'supplier'`. Factory contracts do not have pickups — they receive deliveries. If not supplier → HTTP 422:
```json
{ "message": "Pickups can only be scheduled for supplier contracts." }
```
4. Resolve `supplier_user_id` from `contract->party_id`.
5. Create `Pickup` record:
   - `status = scheduled`
   - `scheduled_by_admin_id` = authenticated user's id
   - `truck_id = null`, `driver_employee_id = null` (assigned at dispatch)
6. Return HTTP 201:
```json
{
  "message": "Pickup scheduled successfully.",
  "data": {
    "id": 22,
    "contract_id": 7,
    "supplier_user_id": 4,
    "hub_id": 2,
    "status": "scheduled",
    "schedule_date": "2025-09-08T08:00:00Z",
    "estimated_weight": 2000,
    "truck_id": null,
    "driver_employee_id": null
  }
}
```

---

### 6.7 `AdminPickupController@index`

**Route:** `GET /api/admin/pickups`

**Logic:**
1. Accept optional query params:
   - `?hub_id=`
   - `?supplier_user_id=`
   - `?status=scheduled|in_progress|completed|cancelled`
   - `?date_from=` and `?date_to=` — filter by `schedule_date` range
2. Eager-load `contract`, `supplier.user`, `hub`, `truck`, `driver.user`.
3. Paginate (15 per page).
4. Return HTTP 200.

---

### 6.8 `AdminPickupController@show`

**Route:** `GET /api/admin/pickups/{id}`

**Logic:**
1. Find pickup or 404.
2. Load all relations: `contract`, `supplier.user`, `hub`, `truck`, `driver.user`, `photos`, `inboundRecord`.
3. Return HTTP 200.

---

### 6.9 `AdminPickupController@cancel`

**Route:** `PATCH /api/admin/pickups/{id}/cancel`

**Logic:**
1. Find pickup or 404.
2. If `status !== 'scheduled'` → HTTP 422:
```json
{ "message": "Only scheduled pickups can be cancelled." }
```
3. If `truck_id` is already assigned (dispatch has happened):
   - Set `trucks.status = 'available'` for the assigned truck.
4. Update `pickup.status = 'cancelled'`.
5. Return HTTP 200:
```json
{ "message": "Pickup cancelled successfully." }
```

---

## 7. Full Onboarding Flow (with endpoint mapping)

```
1. Supplier/Factory submits lead form
   POST /api/applications                       ← auth spec

2. Clicks email verification link
   GET  /api/applications/verify-email/{token}  ← auth spec

3. Super Admin reviews verified applications
   GET  /api/admin/applications?verified=true   ← auth spec

4. Super Admin contacts off-system, contract agreed

5. Super Admin creates user account
   POST /api/admin/users                        ← auth spec + this doc (draft contract auto-created)

6. Super Admin enters contract terms
   PATCH /api/admin/contracts/{id}              ← this doc

7. Super Admin activates contract
   PATCH /api/admin/contracts/{id}/status       ← this doc (status → active)

8. Super Admin marks application as converted
   PATCH /api/admin/applications/{id}/status    ← auth spec (status → converted)

9. Super Admin schedules first pickup (suppliers only)
   POST /api/admin/pickups                      ← this doc

10. User logs in with credentials
    POST /api/auth/login                        ← auth spec
```

---

## 8. Checklist

- [ ] `contracts` migration run after `commodities` and `users`
- [ ] `pickups` migration run after `contracts`, `hubs`, `trucks`, `employees`
- [ ] Unique constraint `(truck_id, schedule_date)` exists on `pickups`
- [ ] `Contract` model has `SoftDeletes`, polymorphic `party()` resolver, `isActive()` helper
- [ ] `Pickup` model has all relationships including nullable `truck` and `driver`
- [ ] `PickupPhoto` model has `public $timestamps = false`, uses `uploaded_at`
- [ ] `AdminUserController@store` extended with `commodity_id` validation and draft contract creation inside the existing transaction
- [ ] `AdminUserController@store` response includes `contract` object
- [ ] `AdminContractController@updateStatus` enforces allowed transition table — no skipping states
- [ ] `AdminContractController@updateStatus` blocks activation if `shipment_threshold_kg` or `commodity_id` is null
- [ ] `AdminPickupController@store` rejects non-supplier contracts
- [ ] `AdminPickupController@store` resolves `supplier_user_id` from contract, not from request
- [ ] `AdminPickupController@cancel` resets truck status to `available` if truck was already assigned
- [ ] No pickup is created with `truck_id` or `driver_employee_id` set — those are dispatch-time fields
