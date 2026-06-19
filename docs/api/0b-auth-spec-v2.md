# Agent Instructions: Auth & User Management System (v2)
## Stack: Laravel 11 + Sanctum + MySQL
## Supersedes: `signup_auth_agent_instructions.md` (v1) — do not implement v1

---

## 1. Overview & Business Context

This is a **contract-based B2B waste-to-value platform**. There is **no open self-registration** for employees. The only public entry point is an **application lead form** for Factories and Suppliers — this is NOT account creation. It is an interest form with email verification, which feeds into the Super Admin's dashboard for review.

**Two distinct onboarding flows exist:**

```
Supplier / Factory                    Employee (Driver / Hub Manager / etc.)
        │                                          │
Visits landing page                    Off-system interview
Submits application form               SuperAdmin accepts
  (with idempotency token)                         │
        │                              SuperAdmin creates
Verification email sent                  user account
        │                                (email_verified_at set
User clicks link                          automatically — admin
  (email_verified_at set)                   has vouched for them)
        │                                          │
SuperAdmin reviews                       Credentials sent
Contacts off-system                      off-system
Signs contract                                     │
        │                                  User can login
SuperAdmin creates
  user account
  (email_verified_at
   already confirmed)
        │
User can login
```

---

## 2. Database Migrations

Create the following migrations **in this exact order**. Order matters because of foreign key dependencies.

---

### 2.1 Modify `users` table

Replace the default Laravel `create_users_table` migration entirely with:

```php
$table->id();
$table->string('fname', 100);
$table->string('lname', 100);
$table->string('phone', 20)->nullable();
$table->string('email', 191)->unique();
$table->timestamp('email_verified_at')->nullable();
$table->string('password');
$table->string('ssn', 20)->nullable();   // nullable — only meaningful for employees
$table->enum('role', ['super_admin', 'supplier', 'factory', 'employee']);
$table->rememberToken();
$table->timestamps();
$table->softDeletes();   // adds deleted_at
```

**Key differences from v1:**
- `name` → split into `fname` + `lname`
- `is_active` removed → replaced by `email_verified_at` + `employees.employment_status`
- `phone_no` → renamed `phone`
- `role` enum values changed: `super_admin`, `supplier`, `factory`, `employee`
- `ssn` moved from the old `drivers` table to `users` (it is a universal identity document)
- `email_verified_at` is now active (was deferred in v1)
- `softDeletes()` added — no user record is ever hard deleted

---

### 2.2 Create `super_admins` table

```php
$table->unsignedBigInteger('user_id')->primary();
$table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
```

No extra columns. Existence of the row confirms the user is a super admin.

---

### 2.3 Create `suppliers` table

```php
$table->unsignedBigInteger('user_id')->primary();
$table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
$table->string('company_name');
```

---

### 2.4 Create `factories` table

```php
$table->unsignedBigInteger('user_id')->primary();
$table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
$table->string('tax_id', 50)->unique();
$table->string('company_name');
$table->string('required_commodity', 100)->nullable();
```

---

### 2.5 Create `employees` table

Consolidates all staff roles (drivers, hub managers, sorters, loaders, etc.).

```php
$table->unsignedBigInteger('user_id')->primary();
$table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
$table->string('role', 50);                     // 'driver', 'hub_manager', 'sorter', etc.
$table->string('driver_license_number', 50)->nullable()->unique();  // required when role = driver
$table->date('hire_date')->nullable();
$table->string('shift', 20)->nullable();        // 'morning', 'evening', 'night'
$table->enum('employment_status', ['active', 'terminated', 'on_leave'])->default('active');
```

---

### 2.6 Create `applications` table

Stores public lead form submissions from suppliers and factories. Updated from v1 to include idempotency and email verification.

```php
$table->id();
$table->string('company_name');
$table->string('contact_name');
$table->string('email');
$table->string('phone', 20);
$table->enum('role', ['factory', 'supplier']);
$table->string('tax_id', 50);
$table->string('required_commodity')->nullable();   // required only when role = factory
$table->text('message')->nullable();
$table->enum('status', ['pending', 'contacted', 'rejected', 'converted'])->default('pending');
$table->string('idempotency_token', 100)->unique()->nullable();   // client-generated UUID
$table->string('email_verification_token', 100)->unique()->nullable();  // server-generated
$table->timestamp('email_verified_at')->nullable();
$table->unsignedBigInteger('converted_user_id')->nullable();
$table->foreign('converted_user_id')->references('id')->on('users')->nullOnDelete();
$table->timestamps();
```

---

### 2.7 Create `chatbots` table *(schema only — deferred)*

> **Do not build any service, controller, or endpoint for this table.** Migration runs to keep the schema complete. Implementation is deferred to a later phase.

```php
$table->id();
$table->string('model_id', 100);
$table->string('api_key', 255);
$table->timestamps();
```

---

### 2.8 Create `equipment` table *(schema only — out of scope)*

> **Do not build any service, controller, or endpoint for this table.** Migration runs to keep the schema complete. No system interaction is implemented.

```php
$table->id();
$table->unsignedBigInteger('hub_id');   // FK added in hubs migration (later phase)
$table->string('equipment_name', 100);
$table->string('equipment_type', 50);
$table->enum('operational_status', ['operational', 'maintenance', 'broken'])->default('operational');
$table->date('last_maintenance_date')->nullable();
$table->timestamps();
```

---

## 3. Models

---

### 3.1 `User` model

```php
// app/Models/User.php

protected $fillable = [
    'fname', 'lname', 'phone', 'email', 'email_verified_at',
    'password', 'ssn', 'role',
];

protected $hidden = ['password', 'remember_token'];

protected $casts = [
    'password'          => 'hashed',
    'email_verified_at' => 'datetime',
    'deleted_at'        => 'datetime',
];
```

Use `SoftDeletes` trait.

**Relationships:**
```php
public function superAdmin(): HasOne    // hasOne(SuperAdmin::class)
public function supplier(): HasOne      // hasOne(Supplier::class)
public function factory(): HasOne       // hasOne(Factory::class)
public function employee(): HasOne      // hasOne(Employee::class)
```

**Helper methods:**
```php
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

// Returns the role-specific profile relation based on users.role
public function profile(): HasOne
{
    return match($this->role) {
        'super_admin' => $this->superAdmin(),
        'supplier'    => $this->supplier(),
        'factory'     => $this->factory(),
        'employee'    => $this->employee(),
    };
}
```

---

### 3.2 `SuperAdmin` model

```php
protected $table = 'super_admins';
protected $primaryKey = 'user_id';
public $incrementing = false;
protected $fillable = ['user_id'];

public function user(): BelongsTo  // belongsTo(User::class)
```

---

### 3.3 `Supplier` model

```php
protected $table = 'suppliers';
protected $primaryKey = 'user_id';
public $incrementing = false;
protected $fillable = ['user_id', 'company_name'];

public function user(): BelongsTo
```

---

### 3.4 `Factory` model

```php
protected $table = 'factories';
protected $primaryKey = 'user_id';
public $incrementing = false;
protected $fillable = ['user_id', 'tax_id', 'company_name', 'required_commodity'];

public function user(): BelongsTo
```

---

### 3.5 `Employee` model

```php
protected $table = 'employees';
protected $primaryKey = 'user_id';
public $incrementing = false;
protected $fillable = [
    'user_id', 'role', 'driver_license_number',
    'hire_date', 'shift', 'employment_status',
];
protected $casts = ['hire_date' => 'date'];

public function user(): BelongsTo

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
```

---

### 3.6 `Application` model

```php
protected $fillable = [
    'company_name', 'contact_name', 'email', 'phone',
    'role', 'tax_id', 'required_commodity', 'message',
    'status', 'idempotency_token', 'email_verification_token',
    'email_verified_at', 'converted_user_id',
];

protected $casts = ['email_verified_at' => 'datetime'];

public function convertedUser(): BelongsTo  // belongsTo(User::class, 'converted_user_id')
```

---

## 4. Seeders

Create `SuperAdminSeeder`:

```php
use Illuminate\Support\Facades\DB;

DB::transaction(function () {
    $user = User::create([
        'fname'             => 'Super',
        'lname'             => 'Admin',
        'email'             => 'admin@platform.com',
        'password'          => 'changeme123',   // cast to hashed automatically
        'role'              => 'super_admin',
        'email_verified_at' => now(),            // admin accounts start verified
        'phone'             => null,
        'ssn'               => null,
    ]);

    SuperAdmin::create(['user_id' => $user->id]);
});
```

Register in `DatabaseSeeder`. Run once on deployment.

---

## 5. Rate Limiting

Configure in `App\Providers\AppServiceProvider::boot()`:

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

// Login: 5 attempts per minute per IP
RateLimiter::for('login', function (Request $request) {
    return Limit::perMinute(5)->by($request->ip());
});
```

Apply to the login route via `throttle:login` middleware (see Section 6).

When the limit is exceeded, Laravel automatically returns HTTP 429. The JSON exception handler (Section 8) must format this as:
```json
{ "message": "Too many login attempts. Please try again in 60 seconds." }
```

---

## 6. Middleware

---

### 6.1 `EnsureAccountAccessible`

Replaces v1's `EnsureUserIsActive`. Applied to all `auth:sanctum` protected routes.

**Checks (in order):**

1. `$user->email_verified_at` is not null. If null → HTTP 403:
```json
{ "message": "Your email address is not verified." }
```

2. `$user->deleted_at` is null (handled automatically by SoftDeletes, but double-check). If deleted → HTTP 403:
```json
{ "message": "This account no longer exists." }
```

3. If `$user->role === 'employee'`: load the `employee` relation and check `employment_status !== 'terminated'`. If terminated → HTTP 403:
```json
{ "message": "Your account has been deactivated. Please contact support." }
```

Register as `accessible` alias in `bootstrap/app.php`.

---

### 6.2 `EnsureSuperAdmin`

Check `auth()->user()->role === 'super_admin'`. If not → HTTP 403:
```json
{ "message": "Forbidden. Super Admin access required." }
```

Register as `superadmin` alias in `bootstrap/app.php`.

Apply to all `/api/admin/*` routes.

---

### 6.3 Registering in `bootstrap/app.php` (Laravel 11 style)

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'accessible' => \App\Http\Middleware\EnsureAccountAccessible::class,
        'superadmin' => \App\Http\Middleware\EnsureSuperAdmin::class,
    ]);
})
```

---

## 7. API Routes (`routes/api.php`)

```
Public:
  POST   /api/applications                          throttle:60,1
  GET    /api/applications/verify-email/{token}     (no throttle — one-time link)
  POST   /api/auth/login                            throttle:login

MFA (Super Admin only — second step after login):
  POST   /api/auth/mfa/verify                       throttle:10,1

Auth:
  POST   /api/auth/logout       [auth:sanctum, accessible]
  GET    /api/auth/me           [auth:sanctum, accessible]

Super Admin:
  GET    /api/admin/applications              [auth:sanctum, accessible, superadmin]
  GET    /api/admin/applications/{id}         [auth:sanctum, accessible, superadmin]
  PATCH  /api/admin/applications/{id}/status  [auth:sanctum, accessible, superadmin]

  POST   /api/admin/users                     [auth:sanctum, accessible, superadmin]
  GET    /api/admin/users                     [auth:sanctum, accessible, superadmin]
  GET    /api/admin/users/{id}                [auth:sanctum, accessible, superadmin]
  PATCH  /api/admin/users/{id}/status         [auth:sanctum, accessible, superadmin]
  DELETE /api/admin/users/{id}                [auth:sanctum, accessible, superadmin]
```

---

## 8. Controllers & Logic

---

### 8.1 `ApplicationController@store` — Public Lead Form

**Route:** `POST /api/applications`

**Validation rules:**

| Field | Rules |
|---|---|
| `idempotency_token` | required, string, max:100 |
| `company_name` | required, string, max:255 |
| `contact_name` | required, string, max:255 |
| `email` | required, email, max:191 |
| `phone` | required, string, max:20 |
| `role` | required, in:factory,supplier |
| `tax_id` | required, string, max:50 |
| `required_commodity` | required_if:role,factory, nullable, string, max:100 |
| `message` | nullable, string, max:1000 |

**Logic:**

1. Validate input.
2. Check if `idempotency_token` already exists in `applications` table:
   - If found → return HTTP 200 (not 4xx — this is a safe retry):
   ```json
   { "message": "Your application has already been submitted. Please check your email to verify it." }
   ```
3. Generate a server-side `email_verification_token` (use `Str::random(64)`).
4. Create `Application` record with `status = pending`, both tokens, `email_verified_at = null`.
5. Dispatch a queued job to send the verification email containing a link to:
   `GET /api/applications/verify-email/{email_verification_token}`
6. Return HTTP 201:
```json
{
  "message": "Your application has been submitted. Please check your email to verify your address.",
  "data": { "id": 1, "status": "pending" }
}
```

---

### 8.2 `ApplicationController@verifyEmail` — Email Verification

**Route:** `GET /api/applications/verify-email/{token}`

**Logic:**

1. Find application by `email_verification_token` or return HTTP 404:
```json
{ "message": "Verification link is invalid or has expired." }
```
2. If `email_verified_at` is already set → return HTTP 200:
```json
{ "message": "Email already verified. Your application is under review." }
```
3. Set `email_verified_at = now()` on the application.
4. Dispatch a queued job to notify the Super Admin of a new verified application awaiting review.
5. Return HTTP 200:
```json
{ "message": "Email verified successfully. Your application is now under review." }
```

---

### 8.3 `AuthController@login`

**Route:** `POST /api/auth/login`  
**Middleware:** `throttle:login`

**Validation rules:**

| Field | Rules |
|---|---|
| `email` | required, email |
| `password` | required, string |

**Logic:**

1. Validate input.
2. Find user by email where `deleted_at IS NULL`. If not found → HTTP 401:
```json
{ "message": "Invalid credentials." }
```
3. Check `Hash::check($password, $user->password)`. If fails → HTTP 401, same message.
4. Check `$user->email_verified_at`. If null → HTTP 403:
```json
{ "message": "Your email address is not verified." }
```
5. If `$user->role === 'employee'`: load `employee` relation, check `employment_status !== 'terminated'`. If terminated → HTTP 403:
```json
{ "message": "Your account has been deactivated. Please contact support." }
```
6. **MFA gate for Super Admin:**
   If `$user->role === 'super_admin'`:
   - Generate a 6-digit numeric OTP code.
   - Generate a `mfa_token` using `Str::random(40)`.
   - Store in cache: key = `"mfa:{$mfa_token}"`, value = `json_encode(['user_id' => $user->id, 'otp' => $otp_code])`, TTL = 5 minutes.
   - Dispatch queued job to send OTP via email to the super admin. *(SMS provider TBD — email OTP is the default.)*
   - Return HTTP 200:
   ```json
   {
     "mfa_required": true,
     "mfa_token": "...",
     "message": "A verification code has been sent to your email."
   }
   ```
   **Do not issue a Sanctum token at this step.**

7. *(Non-super-admin users reach this step)*  
   Revoke all existing tokens: `$user->tokens()->delete()`.
8. Create Sanctum token: `$user->createToken('auth_token')->plainTextToken`.
9. Load the role-specific profile using `$user->profile()` (see User model helper).
10. Return HTTP 200:
```json
{
  "message": "Login successful.",
  "data": {
    "token": "...",
    "token_type": "Bearer",
    "user": {
      "id": 1,
      "fname": "Ahmed",
      "lname": "Khaled",
      "email": "ahmed@example.com",
      "role": "supplier",
      "phone": "...",
      "profile": { /* role-specific fields */ }
    }
  }
}
```

---

### 8.4 `AuthController@verifyMfa` — MFA Second Step (Super Admin only)

**Route:** `POST /api/auth/mfa/verify`  
**Middleware:** `throttle:10,1`

**Validation rules:**

| Field | Rules |
|---|---|
| `mfa_token` | required, string |
| `code` | required, string, size:6 |

**Logic:**

1. Validate input.
2. Retrieve from cache using key `"mfa:{$mfa_token}"`. If not found or expired → HTTP 401:
```json
{ "message": "Verification code is invalid or has expired." }
```
3. Decode the cached payload, compare `$request->code` with stored OTP. If mismatch → HTTP 401, same message.
4. Forget the cache key immediately (one-time use).
5. Load user by `user_id` from payload.
6. Revoke all existing tokens: `$user->tokens()->delete()`.
7. Create Sanctum token.
8. Return HTTP 200 with same structure as step 10 in `@login`.

---

### 8.5 `AuthController@logout`

**Route:** `POST /api/auth/logout`  
**Middleware:** `auth:sanctum`, `accessible`

**Logic:**
1. `$request->user()->currentAccessToken()->delete()`.
2. Return HTTP 200:
```json
{ "message": "Logged out successfully." }
```

---

### 8.6 `AuthController@me`

**Route:** `GET /api/auth/me`  
**Middleware:** `auth:sanctum`, `accessible`

**Logic:**
1. Load `$request->user()` with profile relation.
2. Return HTTP 200 with the same user + profile structure as login response.

---

### 8.7 `AdminApplicationController@index`

**Route:** `GET /api/admin/applications`  
**Middleware:** `auth:sanctum`, `accessible`, `superadmin`

**Logic:**
1. Accept optional query params:
   - `?status=pending|contacted|rejected|converted`
   - `?verified=true|false` — filter by `email_verified_at IS NOT NULL` or IS NULL
2. Apply filters. Paginate (15 per page).
3. Return HTTP 200 with paginated results.

---

### 8.8 `AdminApplicationController@show`

**Route:** `GET /api/admin/applications/{id}`

**Logic:**
1. Find application by ID or return HTTP 404.
2. Load `convertedUser` relation.
3. Return HTTP 200.

---

### 8.9 `AdminApplicationController@updateStatus`

**Route:** `PATCH /api/admin/applications/{id}/status`

**Validation:**

| Field | Rules |
|---|---|
| `status` | required, in:contacted,rejected,converted |
| `converted_user_id` | required_if:status,converted, exists:users,id |

**Logic:**
1. Find application or 404.
2. If `status = converted`:
   - Ensure `converted_user_id` is provided.
   - Set `converted_user_id` and `status = converted`.
3. Otherwise, update `status` only.
4. Return HTTP 200 with updated application.

---

### 8.10 `AdminUserController@store` — Super Admin Creates Any User

**Route:** `POST /api/admin/users`

**Common validation (all roles):**

| Field | Rules |
|---|---|
| `fname` | required, string, max:100 |
| `lname` | required, string, max:100 |
| `email` | required, email, max:191, unique:users |
| `password` | required, string, min:8 |
| `phone` | nullable, string, max:20 |
| `role` | required, in:employee,factory,supplier |

**Employee-specific (required when `role = employee`):**

| Field | Rules |
|---|---|
| `employee_role` | required_if:role,employee, string, in:driver,hub_manager,sorter |
| `ssn` | required_if:role,employee, string, max:20, unique:users |
| `driver_license_number` | required_if:employee_role,driver, string, max:50, unique:employees |
| `hire_date` | nullable, date |
| `shift` | nullable, string, in:morning,evening,night |

**Factory-specific (required when `role = factory`):**

| Field | Rules |
|---|---|
| `company_name` | required_if:role,factory, string, max:255 |
| `tax_id` | required_if:role,factory, string, max:50, unique:factories |
| `required_commodity` | nullable, string, max:100 |

**Supplier-specific (required when `role = supplier`):**

| Field | Rules |
|---|---|
| `company_name` | required_if:role,supplier, string, max:255 |

**Optional (factory and supplier only):**

| Field | Rules |
|---|---|
| `application_id` | nullable, exists:applications,id |

**Logic — use `DB::transaction`:**

1. Validate all fields.
2. Create `User` record. **Always set `email_verified_at = now()`** — the Super Admin vouches for all accounts they create directly.
3. Based on `role`:
   - `employee` → create `Employee` record with `user_id`, `role = $employee_role`, `driver_license_number`, `hire_date`, `shift`, `employment_status = active`
   - `factory` → create `Factory` record with `user_id`, `tax_id`, `company_name`, `required_commodity`
   - `supplier` → create `Supplier` record with `user_id`, `company_name`
4. If `role = super_admin` creation is attempted → reject with HTTP 403. Super admin accounts are seeded, not created via API.
5. If `application_id` is provided (factory or supplier only):
   - Update `Application` record: `status = converted`, `converted_user_id = $user->id`.
6. Return HTTP 201:
```json
{
  "message": "User created successfully.",
  "data": {
    "user": { ... },
    "profile": { ... }
  }
}
```

**On transaction failure:** Roll back, return HTTP 500:
```json
{ "message": "Failed to create user. Please try again." }
```

---

### 8.11 `AdminUserController@index`

**Route:** `GET /api/admin/users`

**Logic:**
1. Accept optional query params:
   - `?role=employee|factory|supplier` — filters `users.role`
   - `?employee_role=driver|hub_manager|sorter` — filters `employees.role` (only meaningful when `role=employee`)
   - `?employment_status=active|terminated|on_leave` — filters `employees.employment_status`
2. Eager-load `employee`, `factory`, or `supplier` based on role filter (or all if no filter).
3. Paginate (15 per page).
4. Return HTTP 200 with paginated results. Include soft-deleted users only if `?with_deleted=true` is passed.

---

### 8.12 `AdminUserController@show`

**Route:** `GET /api/admin/users/{id}`

**Logic:**
1. Find user (excluding soft-deleted) or return HTTP 404.
2. Load all four profile relations: `superAdmin`, `employee`, `factory`, `supplier`.
3. Return HTTP 200.

---

### 8.13 `AdminUserController@updateStatus` — Employee Employment Status

**Route:** `PATCH /api/admin/users/{id}/status`

> This endpoint applies to **employees only**. For factory/supplier account suspension, use soft delete (`DELETE`).

**Validation:**

| Field | Rules |
|---|---|
| `employment_status` | required, in:active,terminated,on_leave |

**Logic:**

1. Find user or 404.
2. If `$user->role !== 'employee'` → HTTP 422:
```json
{ "message": "Employment status can only be updated for employees." }
```
3. Load `employee` relation.
4. If updating to `terminated`:
   - Revoke all Sanctum tokens: `$user->tokens()->delete()`.
5. Update `employee->employment_status`.
6. Return HTTP 200 with updated user + employee profile.

---

### 8.14 `AdminUserController@destroy` — Soft Delete User

**Route:** `DELETE /api/admin/users/{id}`

**Logic:**

1. Find user or 404.
2. Prevent deleting a `super_admin` account → HTTP 403:
```json
{ "message": "Super Admin accounts cannot be deleted." }
```
3. Revoke all tokens: `$user->tokens()->delete()`.
4. Soft delete: `$user->delete()` (sets `deleted_at`, does not remove the record).
5. Return HTTP 200:
```json
{ "message": "User deleted successfully." }
```

---

## 9. Response Format Conventions

All responses follow this envelope. Configure Laravel's exception handler in `bootstrap/app.php` to format all exceptions as JSON automatically.

**Success:**
```json
{
  "message": "Human-readable success message.",
  "data": { }
}
```

**Validation error (HTTP 422):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["Error message."]
  }
}
```

**Not found (HTTP 404):**
```json
{ "message": "Resource not found." }
```

**Unauthorized (HTTP 401):**
```json
{ "message": "Unauthenticated." }
```

**Forbidden (HTTP 403):**
```json
{ "message": "Forbidden." }
```

**Too many requests (HTTP 429):**
```json
{ "message": "Too many login attempts. Please try again in 60 seconds." }
```

---

## 10. Sanctum Configuration

API-only (no SPA cookie auth). Tokens exclusively.

In `config/auth.php`:
```php
'guards' => [
    'api' => [
        'driver'   => 'sanctum',
        'provider' => 'users',
    ],
],
```

Ensure `HasApiTokens` trait is on the `User` model.

---

## 11. Out of Scope for This Task

Do **not** implement the following:

- Password reset flow
- First-login forced password change
- SMS OTP provider for MFA (email OTP is sufficient for now — SMS is a future enhancement)
- Chatbot endpoints (`chatbots` table is migrated but no controller built)
- `equipment` table interaction
- Any other ERD entities: Truck, Hub, Contract, Invoice, Pickup, InboundRecord, etc.

---

## 12. Checklist

- [ ] All 8 migrations created and run in correct order
- [ ] `users` table uses `fname`/`lname`, `phone`, `role` enum matches ERD, `softDeletes()`
- [ ] `employees` table consolidates driver + hub_manager with `employment_status`
- [ ] `applications` table has `idempotency_token`, `email_verification_token`, `email_verified_at`
- [ ] `chatbots` and `equipment` migrations exist but no controllers built
- [ ] All 6 models created with correct fillables, casts, and relationships
- [ ] `User::profile()` helper resolves correct relation by role
- [ ] `SuperAdminSeeder` runs inside a DB transaction, sets `email_verified_at`
- [ ] `EnsureAccountAccessible` middleware checks verified + employment_status
- [ ] `EnsureSuperAdmin` middleware uses `super_admin` (underscore)
- [ ] Rate limiter `throttle:login` applied to login route (5/min per IP)
- [ ] MFA two-step flow implemented for super_admin using cache-stored OTP
- [ ] MFA OTP is single-use (cache key deleted after successful verify)
- [ ] Email verification flow on applications complete (store → verify-email)
- [ ] All `AdminUserController@store` accounts set `email_verified_at = now()`
- [ ] `AdminUserController@store` rejects `role = super_admin` creation attempts
- [ ] `AdminUserController@updateStatus` only applies to employees
- [ ] `AdminUserController@destroy` uses soft delete, not hard delete
- [ ] Token revocation on logout, termination, and soft delete
- [ ] Consistent JSON response envelope on all endpoints including 429
- [ ] No open self-registration endpoint for any role
