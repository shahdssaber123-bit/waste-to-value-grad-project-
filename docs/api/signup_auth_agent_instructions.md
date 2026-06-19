# Agent Instructions: Signup & Auth System
## Stack: Laravel 11 + Sanctum + MySQL

---

## 1. Overview & Business Context

This is a **contract-based B2B waste-to-value platform**. There is **no open self-registration**. All user accounts are created by a `superadmin`. The only public-facing entry point is an **application lead form** for Factories and Suppliers, which is NOT account creation — it is a contact/interest form that feeds into the SuperAdmin's dashboard.

The full flow is:

```
Factory/Supplier          Driver/HubManager
      │                         │
Visits landing page      Off-system interview
Clicks "Join Us"                │
Fills lead form          SuperAdmin accepts
      │                         │
Stored as Application    SuperAdmin creates
      │                   user account
SuperAdmin reviews              │
Contacts off-system      Credentials sent
Signs contract                  │
      │                    User can login
SuperAdmin creates
  user account
      │
 User can login
```

---

## 2. Database Migrations

Create the following migrations **in this order**.

---

### 2.1 Modify `users` table (default Laravel migration)

The default Laravel `create_users_table` migration must be modified to include:

```php
$table->id();
$table->string('name');
$table->string('email')->unique();
$table->string('password');
$table->enum('role', ['superadmin', 'driver', 'factory', 'supplier', 'hub_manager']);
$table->string('phone_no', 20)->nullable();
$table->boolean('is_active')->default(true);
$table->rememberToken();
$table->timestamps();
// Do NOT add email_verified_at — will be added in a future task
```

---

### 2.2 Create `drivers` table

```php
$table->id();
$table->foreignId('user_id')->constrained('users')->onDelete('cascade');
$table->string('fname');
$table->string('lname');
$table->string('ssn')->unique();
$table->string('driver_license_number')->unique();
$table->timestamps();
```

---

### 2.3 Create `factories` table

```php
$table->id();
$table->foreignId('user_id')->constrained('users')->onDelete('cascade');
$table->string('company_name');
$table->string('tax_id')->unique();
$table->string('required_commodity');
$table->timestamps();
```

---

### 2.4 Create `suppliers` table

```php
$table->id();
$table->foreignId('user_id')->constrained('users')->onDelete('cascade');
$table->string('company_name');
$table->string('tax_id')->unique();
$table->timestamps();
```

---

### 2.5 Create `hub_managers` table

```php
$table->id();
$table->foreignId('user_id')->constrained('users')->onDelete('cascade');
$table->string('hub_location');
$table->timestamps();
```

---

### 2.6 Create `applications` table

This stores the public lead form submissions. It is **not** a user account.

```php
$table->id();
$table->string('company_name');
$table->string('contact_name');
$table->string('email');
$table->string('phone_no', 20);
$table->enum('role', ['factory', 'supplier']);
$table->string('tax_id');
$table->string('required_commodity')->nullable(); // required only when role = factory
$table->text('message')->nullable();
$table->enum('status', ['pending', 'contacted', 'rejected', 'converted'])->default('pending');
$table->foreignId('converted_user_id')->nullable()->constrained('users')->nullOnDelete();
$table->timestamps();
```

---

## 3. Models

### 3.1 `User` model

- `$fillable`: `name`, `email`, `password`, `role`, `phone_no`, `is_active`
- `$hidden`: `password`, `remember_token`
- `$casts`: `password => 'hashed'`, `is_active => 'boolean'`
- Relationships:
  - `hasOne(Driver::class)`
  - `hasOne(Factory::class)`
  - `hasOne(Supplier::class)`
  - `hasOne(HubManager::class)`
- Add a helper method `isAdmin(): bool` that returns `$this->role === 'superadmin'`

### 3.2 `Driver` model

- `$fillable`: `user_id`, `fname`, `lname`, `ssn`, `driver_license_number`
- Relationship: `belongsTo(User::class)`

### 3.3 `Factory` model

- `$fillable`: `user_id`, `company_name`, `tax_id`, `required_commodity`
- Relationship: `belongsTo(User::class)`

### 3.4 `Supplier` model

- `$fillable`: `user_id`, `company_name`, `tax_id`
- Relationship: `belongsTo(User::class)`

### 3.5 `HubManager` model

- `$fillable`: `user_id`, `hub_location`
- Relationship: `belongsTo(User::class)`

### 3.6 `Application` model

- `$fillable`: `company_name`, `contact_name`, `email`, `phone_no`, `role`, `tax_id`, `required_commodity`, `message`, `status`, `converted_user_id`
- Relationship: `belongsTo(User::class, 'converted_user_id')`

---

## 4. Seeders

Create a `SuperAdminSeeder` that creates the initial superadmin account:

```php
User::create([
    'name'     => 'Super Admin',
    'email'    => 'admin@platform.com',
    'password' => bcrypt('changeme123'), // force change on first login — future task
    'role'     => 'superadmin',
    'phone_no' => null,
]);
```

Register this seeder in `DatabaseSeeder`. Run once on deployment.

---

## 5. Middleware

### 5.1 `EnsureUserIsActive` middleware

After Sanctum authenticates the user, check `is_active`. If false, return:

```json
{ "message": "Your account has been deactivated. Please contact support." }
```
HTTP 403.

Apply this middleware globally to all `auth:sanctum` routes.

### 5.2 `EnsureSuperAdmin` middleware

Check `auth()->user()->role === 'superadmin'`. If not, return:

```json
{ "message": "Forbidden. SuperAdmin access required." }
```
HTTP 403.

Apply this to all `/api/admin/*` routes.

Register both middleware in `bootstrap/app.php` (Laravel 11 style).

---

## 6. API Routes (`routes/api.php`)

```
Public:
  POST   /api/applications

Auth:
  POST   /api/auth/login
  POST   /api/auth/logout          [auth:sanctum, active]
  GET    /api/auth/me              [auth:sanctum, active]

SuperAdmin:
  GET    /api/admin/applications              [auth:sanctum, active, superadmin]
  GET    /api/admin/applications/{id}         [auth:sanctum, active, superadmin]
  PATCH  /api/admin/applications/{id}/status  [auth:sanctum, active, superadmin]

  POST   /api/admin/users                     [auth:sanctum, active, superadmin]
  GET    /api/admin/users                     [auth:sanctum, active, superadmin]
  GET    /api/admin/users/{id}                [auth:sanctum, active, superadmin]
  PATCH  /api/admin/users/{id}/status         [auth:sanctum, active, superadmin]
  DELETE /api/admin/users/{id}                [auth:sanctum, active, superadmin]
```

---

## 7. Controllers & Logic

---

### 7.1 `ApplicationController@store` — Public Lead Form

**Route:** `POST /api/applications`

**Validation rules:**

| Field | Rules |
|---|---|
| `company_name` | required, string, max:255 |
| `contact_name` | required, string, max:255 |
| `email` | required, string, email, max:255 |
| `phone_no` | required, string, max:20 |
| `role` | required, in:factory,supplier |
| `tax_id` | required, string, max:50 |
| `required_commodity` | required_if:role,factory, nullable, string, max:255 |
| `message` | nullable, string, max:1000 |

**Logic:**
1. Validate input.
2. Create `Application` record with `status = pending`.
3. Return HTTP 201 with:
```json
{
  "message": "Your application has been submitted. Our team will contact you shortly.",
  "data": { "id": 1, "status": "pending" }
}
```

---

### 7.2 `AuthController@login`

**Route:** `POST /api/auth/login`

**Validation rules:**

| Field | Rules |
|---|---|
| `email` | required, string, email |
| `password` | required, string |

**Logic:**
1. Validate input.
2. Find user by email. If not found → HTTP 401 `{ "message": "Invalid credentials." }`
3. Check `Hash::check($password, $user->password)`. If fails → HTTP 401 same message.
4. Check `$user->is_active`. If false → HTTP 403 `{ "message": "Your account has been deactivated." }`
5. Revoke all existing tokens for this user (`$user->tokens()->delete()`).
6. Create new Sanctum token: `$user->createToken('auth_token')->plainTextToken`
7. Eager-load the role-specific profile based on `$user->role`:
   - `driver` → load `driver` relation
   - `factory` → load `factory` relation
   - `supplier` → load `supplier` relation
   - `hub_manager` → load `hubManager` relation
   - `superadmin` → no extra relation
8. Return HTTP 200:
```json
{
  "token": "...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "name": "...",
    "email": "...",
    "role": "...",
    "phone_no": "...",
    "profile": { /* role-specific fields */ }
  }
}
```

---

### 7.3 `AuthController@logout`

**Route:** `POST /api/auth/logout`
**Middleware:** `auth:sanctum`, `active`

**Logic:**
1. Call `$request->user()->currentAccessToken()->delete()`.
2. Return HTTP 200 `{ "message": "Logged out successfully." }`

---

### 7.4 `AuthController@me`

**Route:** `GET /api/auth/me`
**Middleware:** `auth:sanctum`, `active`

**Logic:**
1. Load the authenticated user.
2. Eager-load role-specific profile (same logic as login step 7).
3. Return HTTP 200 with user + profile object.

---

### 7.5 `AdminApplicationController@index`

**Route:** `GET /api/admin/applications`
**Middleware:** `auth:sanctum`, `active`, `superadmin`

**Logic:**
1. Accept optional query param `?status=pending|contacted|rejected|converted`.
2. Filter `Application` query by status if provided.
3. Paginate (15 per page).
4. Return HTTP 200 with paginated results.

---

### 7.6 `AdminApplicationController@show`

**Route:** `GET /api/admin/applications/{id}`

**Logic:**
1. Find application by ID or return 404.
2. Load `convertedUser` relation.
3. Return HTTP 200.

---

### 7.7 `AdminApplicationController@updateStatus`

**Route:** `PATCH /api/admin/applications/{id}/status`

**Validation:**

| Field | Rules |
|---|---|
| `status` | required, in:contacted,rejected,converted |

**Logic:**
1. Find application or 404.
2. If `status = converted` and application is not already converted, ensure `converted_user_id` is provided or will be set.
   - Optionally accept `converted_user_id` in this request body (if account was already created separately).
3. Update `status` (and `converted_user_id` if provided).
4. Return HTTP 200 with updated application.

---

### 7.8 `AdminUserController@store` — SuperAdmin Creates Any User

**Route:** `POST /api/admin/users`

**Validation rules:**

**Common (all roles):**

| Field | Rules |
|---|---|
| `name` | required, string, max:255 |
| `email` | required, string, email, max:255, unique:users |
| `password` | required, string, min:8 |
| `phone_no` | required, string, max:20 |
| `role` | required, in:driver,factory,supplier,hub_manager |

**Driver-specific (required when `role = driver`):**

| Field | Rules |
|---|---|
| `fname` | required_if:role,driver, string, max:255 |
| `lname` | required_if:role,driver, string, max:255 |
| `ssn` | required_if:role,driver, string, max:50, unique:drivers |
| `driver_license_number` | required_if:role,driver, string, max:50, unique:drivers |

**Factory-specific (required when `role = factory`):**

| Field | Rules |
|---|---|
| `company_name` | required_if:role,factory, string, max:255 |
| `tax_id` | required_if:role,factory, string, max:50, unique:factories |
| `required_commodity` | required_if:role,factory, string, max:255 |

**Supplier-specific (required when `role = supplier`):**

| Field | Rules |
|---|---|
| `company_name` | required_if:role,supplier, string, max:255 |
| `tax_id` | required_if:role,supplier, string, max:50, unique:suppliers |

**HubManager-specific (required when `role = hub_manager`):**

| Field | Rules |
|---|---|
| `hub_location` | required_if:role,hub_manager, string, max:255 |

**Logic:**

Use a **database transaction** (`DB::transaction`):

1. Validate all fields.
2. Create the `User` record.
3. Based on `role`, create the corresponding profile record:
   - `driver` → create `Driver` with `user_id`
   - `factory` → create `Factory` with `user_id`
   - `supplier` → create `Supplier` with `user_id`
   - `hub_manager` → create `HubManager` with `user_id`
4. If the role is `factory` or `supplier` and an `application_id` is optionally provided, update that application's `status` to `converted` and set `converted_user_id`.
5. Return HTTP 201 with user + profile.

**Error handling:** If transaction fails, roll back and return HTTP 500.

---

### 7.9 `AdminUserController@index`

**Route:** `GET /api/admin/users`

**Logic:**
1. Accept optional query params: `?role=driver|factory|supplier|hub_manager`, `?is_active=true|false`.
2. Eager-load role-specific relations.
3. Paginate (15 per page).
4. Return HTTP 200.

---

### 7.10 `AdminUserController@show`

**Route:** `GET /api/admin/users/{id}`

**Logic:**
1. Find user or 404.
2. Load all role-specific relations.
3. Return HTTP 200.

---

### 7.11 `AdminUserController@updateStatus`

**Route:** `PATCH /api/admin/users/{id}/status`

**Validation:**

| Field | Rules |
|---|---|
| `is_active` | required, boolean |

**Logic:**
1. Find user or 404.
2. Prevent deactivating the superadmin themselves.
3. Update `is_active`.
4. If deactivating, revoke all Sanctum tokens for that user: `$user->tokens()->delete()`.
5. Return HTTP 200.

---

### 7.12 `AdminUserController@destroy`

**Route:** `DELETE /api/admin/users/{id}`

**Logic:**
1. Find user or 404.
2. Prevent deleting the superadmin themselves.
3. Revoke all tokens: `$user->tokens()->delete()`.
4. Delete user (cascades to profile tables via FK).
5. Return HTTP 200 `{ "message": "User deleted successfully." }`.

---

## 8. Response Format Conventions

All responses must follow this envelope:

**Success:**
```json
{
  "message": "Human-readable success message",
  "data": { ... }
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

Use Laravel's built-in exception handler in `bootstrap/app.php` to format all these consistently as JSON.

---

## 9. Sanctum Configuration

In `config/sanctum.php`, ensure the `stateful` domains are set correctly for the frontend. For API-only usage (no SPA cookie auth), tokens are used exclusively. No changes to default Sanctum setup are required beyond ensuring `api` guard uses `sanctum` in `config/auth.php`:

```php
'guards' => [
    'api' => [
        'driver'   => 'sanctum',
        'provider' => 'users',
    ],
],
```

---

## 10. Out of Scope for This Task

Do NOT implement the following in this task — they are planned for future iterations:

- Email verification (`email_verified_at` column and flow)
- Password reset
- First-login forced password change
- Any endpoints beyond auth and user/application management
- Chatbot integration (`APIKey`, `ModelID` on User)
- Any other ERD entities (Truck, Invoice, Contract, Pickup, etc.)

---

## 11. Checklist

- [ ] Migrations created and run in correct order
- [ ] Models created with correct fillables, casts, and relationships
- [ ] SuperAdmin seeder created and run
- [ ] `EnsureUserIsActive` middleware applied to all `auth:sanctum` routes
- [ ] `EnsureSuperAdmin` middleware applied to all `/api/admin/*` routes
- [ ] All 12 endpoints implemented with correct validation
- [ ] DB transactions used in `AdminUserController@store`
- [ ] Token revocation on logout, deactivation, and deletion
- [ ] Consistent JSON response envelope across all endpoints
- [ ] No open self-registration endpoint exists
