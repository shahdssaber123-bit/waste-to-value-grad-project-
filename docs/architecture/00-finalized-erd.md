# Waste-to-Value — Finalized ERD Reference
**Version:** 2.0 — Canonical schema for all implementation docs  
**Status:** Locked. All implementation docs must derive from this file.

---

## Changelog from Optimized ERD v1

| # | Change | Affected Table | Reason |
|---|---|---|---|
| 1 | Added `contract_id FK` | `pickups` | Pickup must know which supplier contract it belongs to |
| 2 | Added `penalties` table | New table | Late penalty logic requires a ledger, not just an in-place amount update |
| 3 | Added `'completed'` to status enum | `inbound_records` | Baling stage produces a `completed` terminal state missing from v1 |
| 4 | Changed `pickup_photos` to one-to-many | `pickup_photos` | A driver may upload multiple photos per load |
| 5 | `equipment` marked out of scope | `equipment` | Table exists in schema but no system interaction is implemented |
| 6 | `chatbots` marked deferred | `chatbots` | In scope but implemented in a later phase |
| 7 | `supplier_id` added to `pickups` | `pickups` | Direct FK for query clarity alongside `contract_id` |

---

## Full Entity Definitions

---

### `users`
The single authentication and identity table. All roles share this table. Role-specific data lives in subtype tables.

```
id                  BIGINT          PK, auto-increment
fname               VARCHAR(100)    not null
lname               VARCHAR(100)    not null
phone               VARCHAR(20)     nullable
email               VARCHAR(191)    unique, not null
email_verified_at   TIMESTAMP       nullable
password            VARCHAR(255)    not null
ssn                 VARCHAR(20)     nullable  -- employees only; nullable for other roles
role                ENUM            not null
                    ('super_admin','supplier','factory','employee')
remember_token      VARCHAR(100)    nullable
created_at          TIMESTAMP
updated_at          TIMESTAMP
deleted_at          TIMESTAMP       nullable  -- soft delete
```

**Notes:**
- `ssn` is stored on the base `users` table rather than `employees` because it is a universal identity document, not a role-specific attribute. It remains nullable for non-employee roles.
- Soft delete via `deleted_at` applies to all users. Hard deletes are not permitted.
- `email_verified_at` is required for login. NULL = unverified.

---

### `super_admins`
Profile table for the super_admin role. Currently has no extra attributes beyond user identity.

```
user_id     BIGINT      PK, FK → users.id (cascade delete)
```

---

### `suppliers`
Profile table for the supplier role.

```
user_id         BIGINT          PK, FK → users.id (cascade delete)
company_name    VARCHAR(255)    not null
```

---

### `factories`
Profile table for the factory role.

```
user_id                 BIGINT          PK, FK → users.id (cascade delete)
tax_id                  VARCHAR(50)     unique, not null
company_name            VARCHAR(255)    not null
required_commodity      VARCHAR(100)    nullable
```

---

### `employees`
Profile table for all staff — drivers, hub managers, sorters, loaders. Distinguished by the `role` field.

```
user_id                 BIGINT      PK, FK → users.id (cascade delete)
role                    VARCHAR(50) not null  -- e.g. 'driver', 'hub_manager', 'sorter'
driver_license_number   VARCHAR(50) nullable  -- required when role = 'driver'
hire_date               DATE        nullable
shift                   VARCHAR(20) nullable  -- e.g. 'morning', 'night'
employment_status       ENUM        not null, default 'active'
                        ('active','terminated','on_leave')
```

**Notes:**
- Hub managers are employees with `role = 'hub_manager'`. The hub they manage is expressed via `hubs.manager_employee_id`.
- Drivers are employees with `role = 'driver'`. `driver_license_number` must be populated for this role.
- `employment_status` controls operational access independently of `users.deleted_at`.

---

### `hubs`
A physical processing hub location managed by a hub manager employee.

```
id                      BIGINT          PK, auto-increment
location                VARCHAR(255)    not null
size_sq_meters          DECIMAL(10,2)   nullable
capacity                DECIMAL(10,2)   nullable  -- max storage capacity in kg
manager_employee_id     BIGINT          FK → employees.user_id, nullable
created_at              TIMESTAMP
updated_at              TIMESTAMP
deleted_at              TIMESTAMP       nullable  -- soft delete
```

---

### `equipment`
⚠️ **OUT OF SCOPE FOR IMPLEMENTATION.** Table is defined in the schema for future use but no service, controller, or endpoint interacts with it in the current build. The Hub Manager oversees physical equipment operationally but does not input or manage equipment records in the system.

```
id                      BIGINT      PK, auto-increment
hub_id                  BIGINT      FK → hubs.id
equipment_name          VARCHAR(100)
equipment_type          VARCHAR(50)
operational_status      ENUM('operational','maintenance','broken')
last_maintenance_date   DATE        nullable
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

---

### `hub_commodity`
Composite junction table tracking real-time inventory levels per commodity per hub. This is the inventory ledger — not a static config table.

```
hub_id                      BIGINT          PK/FK → hubs.id
commodity_id                BIGINT          PK/FK → commodities.id
current_inventory_total     DECIMAL(12,2)   not null, default 0.00
updated_at                  TIMESTAMP
```

**Notes:**
- Composite PK on `(hub_id, commodity_id)`.
- `current_inventory_total` is updated atomically using `SELECT FOR UPDATE` during hub processing (see hub processing sequence diagram).
- A row must be seeded here for every hub-commodity pair before inbound processing can begin.
- The `StockMonitoringService` queries this table hourly against each contract's threshold.

---

### `trucks`
Fleet vehicles registered to a hub.

```
id                  BIGINT          PK, auto-increment
hub_id              BIGINT          FK → hubs.id, not null
payload_capacity    DECIMAL(10,2)   not null  -- in kg
truck_type          VARCHAR(50)     not null
plate_number        VARCHAR(20)     unique, not null
status              ENUM            not null, default 'available'
                    ('available','in_use','maintenance')
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Status transitions:**
```
available → in_use        (on pickup assignment)
in_use → available        (on hub arrival confirmation + inbound record creation)
available → maintenance   (manual admin action)
maintenance → available   (manual admin action)
```

---

### `pickups`
A scheduled waste collection from a supplier's location, performed by a driver using a truck.

```
id                      BIGINT          PK, auto-increment
contract_id             BIGINT          FK → contracts.id, not null
supplier_user_id        BIGINT          FK → users.id, not null  -- the supplier being collected from
hub_id                  BIGINT          FK → hubs.id, not null
truck_id                BIGINT          FK → trucks.id, not null
driver_employee_id      BIGINT          FK → employees.user_id, not null
scheduled_by_admin_id   BIGINT          FK → users.id, not null  -- super_admin who created the pickup
status                  ENUM            not null, default 'scheduled'
                        ('scheduled','in_progress','completed','cancelled')
schedule_date           DATETIME        not null
estimated_weight        DECIMAL(10,2)   nullable  -- filled by driver at pickup
started_at              DATETIME        nullable  -- when driver scans QR / starts pickup
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

**Notes:**
- `contract_id` links the pickup to the governing supplier contract. It determines which commodity is expected and the pricing baseline to apply downstream.
- `supplier_user_id` is a direct FK for query clarity — it is always derivable from `contract_id` but denormalized here for performance.
- `SELECT FOR UPDATE` on the truck's time slot is required at creation time to prevent double-booking (see pickup sequence diagram).
- A composite unique constraint on `(truck_id, schedule_date)` enforces the time slot lock at the DB level.

---

### `pickup_photos`
Photos uploaded by the driver at the supplier's site. One-to-many per pickup.

```
id          BIGINT          PK, auto-increment
pickup_id   BIGINT          FK → pickups.id, not null
photo_path  VARCHAR(255)    not null  -- file path in storage, not BLOB
uploaded_at TIMESTAMP       not null
```

---

### `contracts`
Governs the commercial relationship between the platform and either a supplier or a factory. Uses a polymorphic pattern.

```
id              BIGINT          PK, auto-increment
party_id        BIGINT          not null  -- references suppliers.user_id OR factories.user_id
party_type      VARCHAR(50)     not null  -- 'supplier' or 'factory'
commodity_id    BIGINT          FK → commodities.id, not null
status          ENUM            not null, default 'draft'
                ('draft','active','expired','terminated')
payment_terms   VARCHAR(100)    nullable
material_type   VARCHAR(100)    not null  -- human-readable commodity description
shipment_threshold_kg DECIMAL(10,2) not null  -- stock level that triggers outbound alert
signed_date     DATE            nullable
created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted_at      TIMESTAMP       nullable  -- soft delete
```

**Notes:**
- `commodity_id` FK added over v1's plain `material_type` string, to properly link contracts to the `commodities` table. `material_type` is kept as a human-readable label.
- `shipment_threshold_kg` is the per-contract value that `StockMonitoringService` checks against `hub_commodity.current_inventory_total`.
- Polymorphic pattern: application code must always filter by both `party_id` AND `party_type` together.

---

### `invoices`
Financial invoices generated for both suppliers (payout) and factories (sales). Uses same polymorphic pattern as contracts.

```
id                  BIGINT          PK, auto-increment
contract_id         BIGINT          FK → contracts.id, not null
party_id            BIGINT          not null
party_type          VARCHAR(50)     not null  -- 'supplier' or 'factory'
invoice_number      VARCHAR(50)     unique, not null
due_date            DATE            not null
status              ENUM            not null, default 'pending'
                    ('pending','paid','overdue','cancelled')
total_amount        DECIMAL(12,2)   not null
invoice_type        ENUM            not null
                    ('supplier','factory')
idempotency_key     VARCHAR(100)    unique, nullable  -- prevents duplicate invoice generation
paid_at             TIMESTAMP       nullable
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

**Notes:**
- `idempotency_key` is required on factory invoices generated after the 48-hour rejection window closes. It prevents duplicate generation if the scheduled job fires more than once.
- `paid_at` is set manually by Super Admin — there is no payment gateway.
- `status` transitions: `pending → paid` (manual), `pending → overdue` (scheduled job), `overdue → paid` (manual).

---

### `penalties`
An append-only ledger of late payment penalties applied to overdue factory invoices.

```
id              BIGINT          PK, auto-increment
invoice_id      BIGINT          FK → invoices.id, not null
amount          DECIMAL(12,2)   not null
penalty_stage   TINYINT         not null  -- 1 = 5%, 2 = 10%
applied_at      TIMESTAMP       not null
created_at      TIMESTAMP
```

**Notes:**
- This is a ledger — rows are only ever inserted, never updated or deleted.
- `penalty_stage` tracks which penalty tier was applied. Stage 1 = 5% of outstanding. Stage 2 = 10%.
- When a penalty is applied, `invoices.total_amount` is also incremented and `invoices.status` is set/kept at `'overdue'`.
- The daily monitoring loop checks `invoices WHERE due_date < NOW() AND status = 'pending'` or `'overdue'` and inserts a penalty row if the stage hasn't been applied yet for that invoice.

---

### `inbound_records`
The processing record for a load that arrives at the hub. Created when the driver confirms arrival and the hub manager scans the pickup ID.

```
id                      BIGINT          PK, auto-increment
pickup_id               BIGINT          FK → pickups.id, unique, not null  -- one record per pickup
contract_id             BIGINT          FK → contracts.id, not null
hub_id                  BIGINT          FK → hubs.id, not null
tier1_weight            DECIMAL(10,2)   nullable  -- set at first weigh-in
tier2_weight            DECIMAL(10,2)   nullable  -- set after sorting
contamination_ratio     DECIMAL(5,4)    nullable  -- e.g. 0.0833 = 8.33%
accepted_weight         DECIMAL(10,2)   nullable  -- computed after tier 2
status                  ENUM            not null, default 'received'
                        ('received','quality_checked','completed','rejected')
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

**State machine (strict — no skipping states):**
```
received → quality_checked → completed
         ↘ rejected (can occur from received or quality_checked)
```

**Notes:**
- `contamination_ratio` stored as a 4-decimal fraction (e.g. `0.0833`), not a percentage.
- `accepted_weight` formula: if `contamination_ratio > 0.05` then `tier1_weight × (1 - contamination_ratio)`, else `tier2_weight`.
- `SELECT FOR UPDATE` is required when transitioning status to prevent race conditions.

---

### `bale_cubes`
Individual bales produced from a processed inbound load, each assigned to a commodity.

```
id                  BIGINT          PK, auto-increment
inbound_record_id   BIGINT          FK → inbound_records.id, not null
commodity_id        BIGINT          FK → commodities.id, not null
weight              DECIMAL(10,2)   not null  -- in kg
quality_score       ENUM            not null
                    ('A','B','C','reject')
created_at          TIMESTAMP
```

---

### `commodities`
Master list of waste material types handled by the platform. Managed exclusively by Super Admin.

```
id          BIGINT          PK, auto-increment
title       VARCHAR(100)    unique, not null  -- e.g. 'Cardboard', 'Plastic PET'
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

---

### `commodity_prices`
Time-series pricing history per commodity. Only one record per commodity should have `effective_to = NULL` at any time — that is the current price.

```
id                      BIGINT          PK, auto-increment
commodity_id            BIGINT          FK → commodities.id, not null
price                   DECIMAL(10,2)   not null  -- base market price per kg
effective_from          DATETIME        not null
effective_to            DATETIME        nullable  -- NULL = currently active
created_by_admin_id     BIGINT          FK → users.id, not null
created_at              TIMESTAMP
```

**Price update logic:**
1. Set `effective_to = NOW()` on the current active record for this commodity.
2. Insert a new record with `effective_from = NOW()` and `effective_to = NULL`.

Both steps must run inside a single transaction.

**Invoice price resolution:** Always use the record where `effective_to IS NULL` for the commodity at invoice generation time. Never recalculate historical invoices when the price changes.

**Indexes required:**
- `(commodity_id, effective_from DESC)` — for efficient current price lookup
- `(commodity_id, effective_to)` — for monitoring active records

---

### `outbound_deliveries`
A scheduled outbound shipment of baled commodity from a hub to a factory. Triggered automatically when `hub_commodity.current_inventory_total` meets the contract threshold.

```
id                          BIGINT          PK, auto-increment
contract_id                 BIGINT          FK → contracts.id, not null
hub_id                      BIGINT          FK → hubs.id, not null
commodity_id                BIGINT          FK → commodities.id, not null
status                      ENUM            not null, default 'scheduled'
                            ('scheduled','shipped','delivered','confirmed','rejected')
quantity_kg                 DECIMAL(12,2)   not null  -- snapshot of inventory dispatched
scheduled_date              DATETIME        not null
confirmed_at                DATETIME        nullable  -- when factory confirms receipt
rejection_window_start      DATETIME        nullable  -- set on delivery confirmation
rejection_window_end        DATETIME        nullable  -- rejection_window_start + 48 hours
rejected_at                 DATETIME        nullable
rejection_reason            TEXT            nullable
idempotency_key             VARCHAR(100)    unique, nullable  -- prevents duplicate auto-creation
created_at                  TIMESTAMP
updated_at                  TIMESTAMP
```

**Status transitions:**
```
scheduled → shipped → delivered → confirmed
                    ↘ rejected (within 48h of delivered)
```

**Notes:**
- `SELECT FOR UPDATE` on `hub_commodity` is required at creation time to prevent double-allocation of the same stock to two deliveries.
- When status moves to `rejected`, `hub_commodity.current_inventory_total` is incremented back (inventory reversal).
- `confirmed` status is set automatically after the 48-hour window closes without a rejection.
- `idempotency_key` prevents the hourly monitoring job from creating duplicate delivery notes for the same hub-commodity threshold event.

---

### `chatbots`
⚠️ **DEFERRED — in scope but implemented in a later phase.** Table is defined and migrated but no service or endpoint is built in the current implementation sequence.

```
id          BIGINT          PK, auto-increment
model_id    VARCHAR(100)    not null  -- e.g. 'gemini-1.5-pro'
api_key     VARCHAR(255)    not null
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

---

## Relationships Summary

```
users ──< super_admins         (1:0..1)  Is A
users ──< suppliers            (1:0..1)  Is A
users ──< factories            (1:0..1)  Is A
users ──< employees            (1:0..1)  Is A
users >──< chatbots            (M:1)     Assists (deferred)

hubs ──< trucks                (1:M)     Parks
hubs ──< pickups               (1:M)     Receives
hubs ──< inbound_records       (1:M)     Processes
hubs ──< outbound_deliveries   (1:M)     Ships from
hubs ──< equipment             (1:M)     Houses (out of scope)
hubs ──< hub_commodity         (1:M)     ─┐ composite junction
commodities ──< hub_commodity  (1:M)     ─┘

employees >──< hubs            managed_by via hubs.manager_employee_id

pickups ──< pickup_photos      (1:M)     Has
pickups >── trucks             (M:1)     Uses
pickups >── employees          (M:1)     Driven by
pickups >── users              (M:1)     Scheduled by (admin)
pickups >── contracts          (M:1)     Governed by
pickups >── users              (M:1)     Supplier

contracts >──< invoices        (1:M)     Generates
contracts ──< inbound_records  (1:M)     Governs
contracts ──< outbound_deliveries (1:M)  Governs
contracts >── commodities      (M:1)     Covers

invoices ──< penalties         (1:M)     Accrues

inbound_records ──< bale_cubes (1:M)     Produces
bale_cubes >── commodities     (M:1)     Categorized as

commodities ──< commodity_prices (1:M)   Has history
commodity_prices >── users     (M:1)     Updated by

outbound_deliveries >── commodities (M:1) Delivers
```

---

## Required Indexes (beyond auto-indexed FKs)

| Table | Index Columns | Purpose |
|---|---|---|
| `pickups` | `(hub_id, status, schedule_date)` | Dispatch query: available pickups at a hub |
| `pickups` | `(truck_id, schedule_date)` UNIQUE | Time slot lock — prevents double-booking |
| `invoices` | `(party_id, party_type, status, due_date)` | Monitoring query: overdue invoices |
| `contracts` | `(party_id, party_type, status)` | Contract lookup by party |
| `commodity_prices` | `(commodity_id, effective_from DESC)` | Current price lookup |
| `commodity_prices` | `(commodity_id, effective_to)` | Active record guard |
| `hub_commodity` | Composite PK `(hub_id, commodity_id)` | Already PK — no extra index needed |
| `outbound_deliveries` | `(hub_id, commodity_id, status)` | Monitoring query: active deliveries |

---

## Concurrency Rules

These are non-negotiable and must be implemented exactly as specified in the sequence diagrams:

| Operation | Lock Required | Table |
|---|---|---|
| Truck assignment to pickup | `SELECT FOR UPDATE` | `trucks` |
| Pickup time slot reservation | Unique constraint + transaction | `pickups (truck_id, schedule_date)` |
| Inbound record status transition | `SELECT FOR UPDATE` | `inbound_records` |
| Inventory increment (baling) | `SELECT FOR UPDATE` | `hub_commodity` |
| Outbound delivery creation | `SELECT FOR UPDATE` | `hub_commodity` |
| Inventory decrement (outbound) | Atomic, same transaction as above | `hub_commodity` |
| Invoice generation (factory) | Idempotency key check | `invoices` |
| Outbound delivery creation | Idempotency key check | `outbound_deliveries` |

---

## Deferred / Out of Scope

| Entity / Feature | Status | Notes |
|---|---|---|
| `equipment` | Schema only — no implementation | Hub manager oversees physically; system has no interaction |
| `chatbots` | Schema only — deferred | Gemini integration planned for later phase |
| Email delivery | Deferred | Queued jobs exist but actual mail driver config is a later task |
| MFA for Super Admin | In scope — Common Features doc | Implemented as part of auth rewrite |
| Rate limiting | In scope — Common Features doc | 5 login attempts/min, 10 chat requests/min |
| Password reset | Deferred | Planned for future iteration |
