# Agent Instructions: Core Reference Data
## Stack: Laravel 11 + Sanctum + MySQL
## Dependency: `0b-auth-spec-v2.md` must be fully implemented first

---

## 1. Overview

This document covers the five foundational tables that the rest of the system reads from:

| Table | What it represents |
|---|---|
| `hubs` | Physical processing hub locations |
| `trucks` | Fleet vehicles assigned to hubs |
| `commodities` | Waste material types the platform handles |
| `commodity_prices` | Time-series pricing history per commodity |
| `hub_commodity` | Per-hub inventory levels per commodity |

All management endpoints are Super Admin only. No other role creates or modifies these records. There is no public-facing access to any of these resources.

---

## 2. Database Migrations

Run **in this order** — foreign key dependencies require it.

---

### 2.1 Create `hubs` table

```php
$table->id();
$table->string('location', 255);
$table->decimal('size_sq_meters', 10, 2)->nullable();
$table->decimal('capacity', 10, 2)->nullable();       // max storage in kg
$table->unsignedBigInteger('manager_employee_id')->nullable();
$table->foreign('manager_employee_id')
      ->references('user_id')->on('employees')
      ->nullOnDelete();
$table->timestamps();
$table->softDeletes();
```

---

### 2.2 Create `trucks` table

```php
$table->id();
$table->unsignedBigInteger('hub_id');
$table->foreign('hub_id')->references('id')->on('hubs')->onDelete('cascade');
$table->decimal('payload_capacity', 10, 2);           // in kg
$table->string('truck_type', 50);
$table->string('plate_number', 20)->unique();
$table->enum('status', ['available', 'in_use', 'maintenance'])->default('available');
$table->timestamps();
```

---

### 2.3 Create `commodities` table

```php
$table->id();
$table->string('title', 100)->unique();
$table->timestamps();
```

---

### 2.4 Create `commodity_prices` table

```php
$table->id();
$table->unsignedBigInteger('commodity_id');
$table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('cascade');
$table->decimal('price', 10, 2);                      // base market price per kg
$table->dateTime('effective_from');
$table->dateTime('effective_to')->nullable();          // NULL = currently active
$table->unsignedBigInteger('created_by_admin_id');
$table->foreign('created_by_admin_id')->references('id')->on('users')->onDelete('restrict');
$table->timestamp('created_at')->useCurrent();

// Indexes
$table->index(['commodity_id', 'effective_from']);
$table->index(['commodity_id', 'effective_to']);
```

Note: No `updated_at` — this table is append-only. Rows are never updated after insert.

---

### 2.5 Create `hub_commodity` table

```php
$table->unsignedBigInteger('hub_id');
$table->unsignedBigInteger('commodity_id');
$table->primary(['hub_id', 'commodity_id']);
$table->foreign('hub_id')->references('id')->on('hubs')->onDelete('cascade');
$table->foreign('commodity_id')->references('id')->on('commodities')->onDelete('cascade');
$table->decimal('current_inventory_total', 12, 2)->default(0.00);
$table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
```

Note: No `id`, no `created_at`. Composite PK on `(hub_id, commodity_id)`.

---

## 3. Models

---

### 3.1 `Hub` model

```php
protected $fillable = ['location', 'size_sq_meters', 'capacity', 'manager_employee_id'];
protected $casts    = ['deleted_at' => 'datetime'];
```

Use `SoftDeletes` trait.

**Relationships:**
```php
public function manager(): BelongsTo        // belongsTo(Employee::class, 'manager_employee_id', 'user_id')
public function trucks(): HasMany           // hasMany(Truck::class)
public function hubCommodities(): HasMany   // hasMany(HubCommodity::class)
public function commodities(): BelongsToMany // belongsToMany(Commodity::class, 'hub_commodity')
                                             //   ->withPivot('current_inventory_total')
                                             //   ->withTimestamps()
```

---

### 3.2 `Truck` model

```php
protected $fillable = ['hub_id', 'payload_capacity', 'truck_type', 'plate_number', 'status'];
```

**Relationships:**
```php
public function hub(): BelongsTo    // belongsTo(Hub::class)
```

**Helper:**
```php
public function isAvailable(): bool
{
    return $this->status === 'available';
}
```

---

### 3.3 `Commodity` model

```php
protected $fillable = ['title'];
```

**Relationships:**
```php
public function prices(): HasMany           // hasMany(CommodityPrice::class)
public function hubCommodities(): HasMany   // hasMany(HubCommodity::class)
public function hubs(): BelongsToMany      // belongsToMany(Hub::class, 'hub_commodity')
                                            //   ->withPivot('current_inventory_total')
```

**Helper:**
```php
// Returns the single currently-active price record, or null if none set
public function currentPrice(): ?CommodityPrice
{
    return $this->prices()->whereNull('effective_to')->latest('effective_from')->first();
}
```

---

### 3.4 `CommodityPrice` model

```php
protected $table    = 'commodity_prices';
protected $fillable = ['commodity_id', 'price', 'effective_from', 'effective_to', 'created_by_admin_id'];
protected $casts    = [
    'price'          => 'decimal:2',
    'effective_from' => 'datetime',
    'effective_to'   => 'datetime',
];
```

No `updated_at` — set `public $timestamps = false` and manage `created_at` manually.

**Relationships:**
```php
public function commodity(): BelongsTo  // belongsTo(Commodity::class)
public function createdBy(): BelongsTo  // belongsTo(User::class, 'created_by_admin_id')
```

---

### 3.5 `HubCommodity` model

```php
protected $table      = 'hub_commodity';
protected $primaryKey = null;
public    $incrementing = false;
protected $fillable   = ['hub_id', 'commodity_id', 'current_inventory_total'];
protected $casts      = ['current_inventory_total' => 'decimal:2'];

public $timestamps = false;   // only updated_at exists, managed manually
```

**Relationships:**
```php
public function hub(): BelongsTo        // belongsTo(Hub::class)
public function commodity(): BelongsTo  // belongsTo(Commodity::class)
```

---

## 4. API Routes (`routes/api.php`)

All routes require `[auth:sanctum, accessible, superadmin]` middleware. Not repeated on each line for brevity — apply as a group.

```
Hubs:
  POST    /api/admin/hubs
  GET     /api/admin/hubs
  GET     /api/admin/hubs/{id}
  PATCH   /api/admin/hubs/{id}
  DELETE  /api/admin/hubs/{id}

Trucks:
  POST    /api/admin/trucks
  GET     /api/admin/trucks
  GET     /api/admin/trucks/{id}
  PATCH   /api/admin/trucks/{id}
  PATCH   /api/admin/trucks/{id}/status

Commodities:
  POST    /api/admin/commodities
  GET     /api/admin/commodities
  GET     /api/admin/commodities/{id}
  PATCH   /api/admin/commodities/{id}

Commodity Prices:
  POST    /api/admin/commodities/{id}/prices
  GET     /api/admin/commodities/{id}/prices

Hub–Commodity Links (inventory setup):
  POST    /api/admin/hubs/{id}/commodities
  GET     /api/admin/hubs/{id}/commodities
  DELETE  /api/admin/hubs/{hub_id}/commodities/{commodity_id}
```

---

## 5. Controllers & Logic

---

### 5.1 `AdminHubController@store`

**Route:** `POST /api/admin/hubs`

**Validation:**

| Field | Rules |
|---|---|
| `location` | required, string, max:255 |
| `size_sq_meters` | nullable, numeric, min:0 |
| `capacity` | nullable, numeric, min:0 |
| `manager_employee_id` | nullable, exists:employees,user_id |

**Logic:**
1. Validate.
2. If `manager_employee_id` provided, verify that employee has `role = 'hub_manager'`. If not → HTTP 422:
```json
{ "message": "The selected employee is not a hub manager." }
```
3. Create `Hub` record.
4. Return HTTP 201 with hub + manager relation loaded.

---

### 5.2 `AdminHubController@index`

**Route:** `GET /api/admin/hubs`

**Logic:**
1. Accept optional `?with_deleted=true` to include soft-deleted hubs.
2. Eager-load `manager` (employee + user).
3. Paginate (15 per page).
4. Return HTTP 200.

---

### 5.3 `AdminHubController@show`

**Route:** `GET /api/admin/hubs/{id}`

**Logic:**
1. Find hub (excluding soft-deleted) or 404.
2. Load `manager`, `trucks`, `hubCommodities.commodity`.
3. Return HTTP 200.

---

### 5.4 `AdminHubController@update`

**Route:** `PATCH /api/admin/hubs/{id}`

**Validation:** Same fields as `@store`, all nullable (partial update).

**Logic:**
1. Find hub or 404.
2. Validate.
3. If `manager_employee_id` is being changed, apply the same hub_manager role check.
4. Update only provided fields.
5. Return HTTP 200 with updated hub.

---

### 5.5 `AdminHubController@destroy`

**Route:** `DELETE /api/admin/hubs/{id}`

**Logic:**
1. Find hub or 404.
2. Check that the hub has no trucks with `status != 'maintenance'` — cannot delete an operational hub. If trucks exist → HTTP 422:
```json
{ "message": "Cannot delete a hub that has active trucks assigned to it." }
```
3. Soft delete: `$hub->delete()`.
4. Return HTTP 200:
```json
{ "message": "Hub deleted successfully." }
```

---

### 5.6 `AdminTruckController@store`

**Route:** `POST /api/admin/trucks`

**Validation:**

| Field | Rules |
|---|---|
| `hub_id` | required, exists:hubs,id |
| `payload_capacity` | required, numeric, min:1 |
| `truck_type` | required, string, max:50 |
| `plate_number` | required, string, max:20, unique:trucks |

**Logic:**
1. Validate.
2. Create `Truck` with `status = available`.
3. Return HTTP 201 with truck + hub.

---

### 5.7 `AdminTruckController@index`

**Route:** `GET /api/admin/trucks`

**Logic:**
1. Accept optional query params:
   - `?hub_id=` — filter by hub
   - `?status=available|in_use|maintenance` — filter by status
2. Eager-load `hub`.
3. Paginate (15 per page).
4. Return HTTP 200.

---

### 5.8 `AdminTruckController@show`

**Route:** `GET /api/admin/trucks/{id}`

**Logic:**
1. Find truck or 404.
2. Load `hub`.
3. Return HTTP 200.

---

### 5.9 `AdminTruckController@update`

**Route:** `PATCH /api/admin/trucks/{id}`

**Validation:**

| Field | Rules |
|---|---|
| `hub_id` | nullable, exists:hubs,id |
| `payload_capacity` | nullable, numeric, min:1 |
| `truck_type` | nullable, string, max:50 |
| `plate_number` | nullable, string, max:20, unique:trucks,plate_number,{id} |

**Logic:**
1. Find truck or 404.
2. Validate.
3. Update only provided fields.
4. Return HTTP 200 with updated truck.

---

### 5.10 `AdminTruckController@updateStatus`

**Route:** `PATCH /api/admin/trucks/{id}/status`

**Validation:**

| Field | Rules |
|---|---|
| `status` | required, in:available,maintenance |

**Logic:**
1. Find truck or 404.
2. Only `available` and `maintenance` are settable manually. `in_use` is set only by the pickup assignment system — reject if requested:
```json
{ "message": "The 'in_use' status is managed automatically by the system." }
```
3. If setting to `maintenance` and truck `status = in_use` → HTTP 422:
```json
{ "message": "Cannot set a truck to maintenance while it is currently in use." }
```
4. Update `status`.
5. Return HTTP 200 with updated truck.

---

### 5.11 `AdminCommodityController@store`

**Route:** `POST /api/admin/commodities`

**Validation:**

| Field | Rules |
|---|---|
| `title` | required, string, max:100, unique:commodities |

**Logic:**
1. Validate.
2. Create `Commodity`.
3. Return HTTP 201 with commodity.

---

### 5.12 `AdminCommodityController@index`

**Route:** `GET /api/admin/commodities`

**Logic:**
1. Load all commodities with their `currentPrice()` appended.
2. No pagination — commodity list is expected to be small.
3. Return HTTP 200.

---

### 5.13 `AdminCommodityController@show`

**Route:** `GET /api/admin/commodities/{id}`

**Logic:**
1. Find commodity or 404.
2. Load `prices` (full history, ordered by `effective_from DESC`) and `hubs`.
3. Return HTTP 200.

---

### 5.14 `AdminCommodityController@update`

**Route:** `PATCH /api/admin/commodities/{id}`

**Validation:**

| Field | Rules |
|---|---|
| `title` | required, string, max:100, unique:commodities,title,{id} |

**Logic:**
1. Find commodity or 404.
2. Update `title`.
3. Return HTTP 200.

---

### 5.15 `AdminCommodityPriceController@store` — Set New Price

**Route:** `POST /api/admin/commodities/{id}/prices`

**Validation:**

| Field | Rules |
|---|---|
| `price` | required, numeric, min:0.01 |

**Logic — use `DB::transaction`:**

1. Find commodity or 404.
2. Validate.
3. Close the current active price record for this commodity:
   ```php
   CommodityPrice::where('commodity_id', $commodity->id)
       ->whereNull('effective_to')
       ->update(['effective_to' => now()]);
   ```
4. Insert new `CommodityPrice` record:
   - `commodity_id` = commodity id
   - `price` = validated price
   - `effective_from` = `now()`
   - `effective_to` = `null`
   - `created_by_admin_id` = authenticated user's id
5. Return HTTP 201:
```json
{
  "message": "Price updated successfully.",
  "data": {
    "commodity_id": 1,
    "price": 2.75,
    "effective_from": "2025-10-01T00:00:00Z",
    "effective_to": null,
    "previous_price": 2.50
  }
}
```
Include `previous_price` in the response (the closed record's price, or null if this is the first price set).

---

### 5.16 `AdminCommodityPriceController@index` — Price History

**Route:** `GET /api/admin/commodities/{id}/prices`

**Logic:**
1. Find commodity or 404.
2. Return all `CommodityPrice` records for this commodity, ordered by `effective_from DESC`.
3. Mark which record is current (`effective_to IS NULL`).
4. Return HTTP 200.

---

### 5.17 `AdminHubCommodityController@store` — Link Commodity to Hub

**Route:** `POST /api/admin/hubs/{id}/commodities`

This creates the `hub_commodity` row that allows inventory tracking for a commodity at a specific hub. Must exist before any inbound records can be processed for that hub-commodity pair.

**Validation:**

| Field | Rules |
|---|---|
| `commodity_id` | required, exists:commodities,id |

**Logic:**
1. Find hub or 404.
2. Check if the `hub_commodity` row already exists for this `(hub_id, commodity_id)` pair → HTTP 422:
```json
{ "message": "This commodity is already linked to this hub." }
```
3. Create `HubCommodity` with `current_inventory_total = 0.00`.
4. Return HTTP 201:
```json
{
  "message": "Commodity linked to hub successfully.",
  "data": {
    "hub_id": 2,
    "commodity_id": 1,
    "commodity_title": "Cardboard",
    "current_inventory_total": 0.00
  }
}
```

---

### 5.18 `AdminHubCommodityController@index`

**Route:** `GET /api/admin/hubs/{id}/commodities`

**Logic:**
1. Find hub or 404.
2. Load `hubCommodities` with `commodity` relation.
3. Return HTTP 200 — list of commodities tracked at this hub with their current inventory totals.

---

### 5.19 `AdminHubCommodityController@destroy` — Unlink Commodity from Hub

**Route:** `DELETE /api/admin/hubs/{hub_id}/commodities/{commodity_id}`

**Logic:**
1. Find hub or 404.
2. Find `HubCommodity` row for the pair or 404.
3. If `current_inventory_total > 0` → HTTP 422:
```json
{ "message": "Cannot unlink a commodity that still has inventory at this hub." }
```
4. Delete the `HubCommodity` row (hard delete — this is a config record, not a transactional one).
5. Return HTTP 200:
```json
{ "message": "Commodity unlinked from hub successfully." }
```

---

## 6. Response Format

Follows the same envelope established in the auth spec:

```json
{
  "message": "...",
  "data": { }
}
```

Errors follow the same 422 / 404 / 403 / 401 patterns.

---

## 7. Seeding

No seeders are required for this layer — all reference data is entered by the Super Admin via the API after deployment. However, provide a `ReferenceDataSeeder` for local development and testing environments only:

```php
// database/seeders/ReferenceDataSeeder.php
// Creates 2 hubs, 4 trucks, 3 commodities with prices, and hub_commodity links
// NOT run in production — registered in DatabaseSeeder behind an environment check:
if (app()->environment('local', 'testing')) {
    $this->call(ReferenceDataSeeder::class);
}
```

---

## 8. Checklist

- [ ] Migrations created and run in correct order (hubs → trucks → commodities → commodity_prices → hub_commodity)
- [ ] `hub_commodity` has composite PK, no auto-increment id
- [ ] `commodity_prices` is append-only — no `updated_at`, no update logic ever touches existing rows
- [ ] All 5 models created with correct fillables, casts, relationships, and helpers
- [ ] `Commodity::currentPrice()` returns the row where `effective_to IS NULL`
- [ ] `CommodityPrice` has `public $timestamps = false`
- [ ] All 19 endpoints implemented with correct validation
- [ ] `AdminCommodityPriceController@store` closes the previous price in the same transaction
- [ ] `AdminTruckController@updateStatus` rejects `in_use` as a manual value
- [ ] `AdminHubController@destroy` blocks deletion if active trucks exist
- [ ] `AdminHubCommodityController@destroy` blocks unlinking if inventory > 0
- [ ] `AdminHubController@store` and `@update` validate that `manager_employee_id` has `employees.role = 'hub_manager'`
- [ ] `ReferenceDataSeeder` is local/testing only
- [ ] No public routes — all endpoints are `[auth:sanctum, accessible, superadmin]`
