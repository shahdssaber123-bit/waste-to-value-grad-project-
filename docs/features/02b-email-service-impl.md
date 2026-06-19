# Agent Instructions: Email Service
## Stack: Laravel 13 + Built-in Mail (Symfony Mailer) + Database Queue
## No additional composer packages required
## Dependency: `0b-auth-spec-v2.md` must be fully implemented first

---

## 1. Overview

This document defines the complete email sending layer. All emails are triggered by existing controllers. All sending is queued — no mail is sent synchronously during a request.

**Emails in scope:**

| # | Mailable | Trigger | Recipient |
|---|---|---|---|
| 1 | `ApplicationVerificationMail` | Application submitted | Applicant |
| 2 | `AdminNewApplicationMail` | Applicant verifies email | Super Admin |
| 3 | `AccountActivatedMail` | Super Admin creates user | New user |
| 4 | `ContractActivatedMail` | Contract activated | Supplier or Factory user |

**Frontend note:** The platform has a React frontend. Email links that require user interaction (e.g. email verification) point to the **React app URL**, not the API. The React app handles the route, extracts the token, and calls the API. This means the API verification endpoint stays unchanged — only the URL built inside the email changes.

---

## 2. Environment Configuration

Symfony Mailer is the transport layer built into Laravel 13. For local development, the team uses **Mailtrap** — a shared sandbox inbox where all outgoing emails are intercepted and visible to everyone on the team without reaching real recipients.

```env
# Mail — Mailtrap sandbox for local/staging development
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@platform.com
MAIL_FROM_NAME="Waste-to-Value Platform"

# Queue
QUEUE_CONNECTION=database

# Frontend — used to build links inside emails that the user clicks
FRONTEND_URL=http://localhost:3000
```

**Getting Mailtrap credentials:** Sign up at mailtrap.io → Email Testing → your inbox → SMTP Settings → select Laravel from the integrations dropdown. It will show the exact values to paste.

For production, replace these values with real SMTP credentials. The rest of the codebase does not change — only `.env`.

**Fallback (solo dev, no Mailtrap account):** Set `MAIL_MAILER=log` to write emails to `storage/logs/laravel.log` instead. No other changes needed.

Add `FRONTEND_URL` to `config/app.php` so it is accessible via `config()`:

```php
// config/app.php
'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
```

---

## 3. Queue Setup

Laravel 13 ships with a built-in database queue driver. No extra packages needed.

```bash
php artisan make:queue-table
php artisan migrate
```

This creates the `jobs` and `failed_jobs` tables.

To process the queue in development:
```bash
php artisan queue:work
```

In production, use a process supervisor (e.g. Supervisor) to keep `queue:work` running. Document this in the deployment runbook — it is outside the current implementation scope.

---

## 4. Mailable Classes

Create all Mailables in `app/Mail/`. Each extends `Mailable`, uses `SerializesModels`, and implements `ShouldQueue` — all built into Laravel 13, no extra packages required.

---

### 4.1 `ApplicationVerificationMail`

**File:** `app/Mail/ApplicationVerificationMail.php`

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApplicationVerificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $contactName,
        public readonly string $verificationUrl,  // points to React frontend route
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify Your Email — Waste-to-Value Platform',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.application-verification',
        );
    }
}
```

---

### 4.2 `AdminNewApplicationMail`

**File:** `app/Mail/AdminNewApplicationMail.php`

```php
<?php

namespace App\Mail;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminNewApplicationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Application $application,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Verified Application — Action Required',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-new-application',
        );
    }
}
```

---

### 4.3 `AccountActivatedMail`

**File:** `app/Mail/AccountActivatedMail.php`

```php
<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountActivatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User   $user,
        public readonly string $plainPassword,
        // TODO: Replace plainPassword with a password-set link
        // once the password reset flow is implemented.
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Account Is Active — Waste-to-Value Platform',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-activated',
        );
    }
}
```

---

### 4.4 `ContractActivatedMail`

**File:** `app/Mail/ContractActivatedMail.php`

```php
<?php

namespace App\Mail;

use App\Models\Contract;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContractActivatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User     $user,
        public readonly Contract $contract,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Contract Is Now Active',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contract-activated',
        );
    }
}
```

---

## 5. Email Blade Templates

Create all templates in `resources/views/emails/`. These are used for email rendering only — they are never served to the React frontend. Blade is built into Laravel 13.

---

### 5.1 Shared Layout: `resources/views/emails/layout.blade.php`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .wrapper {
            background-color: #f4f4f4;
            padding: 40px 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 6px;
            padding: 32px 40px;
        }
        .btn {
            display: inline-block;
            padding: 12px 28px;
            background-color: #1a7a4a;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-size: 15px;
            margin: 20px 0;
        }
        .info-table td {
            padding: 6px 0;
        }
        .info-table td:first-child {
            color: #888888;
            padding-right: 16px;
            white-space: nowrap;
        }
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #eeeeee;
            font-size: 12px;
            color: #aaaaaa;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            @yield('content')
            <div class="footer">
                This email was sent by Waste-to-Value Platform. Please do not reply.
            </div>
        </div>
    </div>
</body>
</html>
```

---

### 5.2 `resources/views/emails/application-verification.blade.php`

```html
@extends('emails.layout')

@section('content')
    <p>Hello {{ $contactName }},</p>
    <p>Thank you for your interest in the Waste-to-Value Platform.</p>
    <p>Please verify your email address by clicking the button below.</p>
    <a href="{{ $verificationUrl }}" class="btn">Verify Email Address</a>
    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all; font-size: 13px; color: #555;">
        {{ $verificationUrl }}
    </p>
    <p>If you did not submit this application, you can safely ignore this email.</p>
@endsection
```

---

### 5.3 `resources/views/emails/admin-new-application.blade.php`

```html
@extends('emails.layout')

@section('content')
    <p>Hello,</p>
    <p>A new application has been submitted and the applicant has verified their email. Please review it in the admin dashboard.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Company</td>
            <td>{{ $application->company_name }}</td>
        </tr>
        <tr>
            <td>Contact</td>
            <td>{{ $application->contact_name }}</td>
        </tr>
        <tr>
            <td>Email</td>
            <td>{{ $application->email }}</td>
        </tr>
        <tr>
            <td>Type</td>
            <td>{{ ucfirst($application->role) }}</td>
        </tr>
        <tr>
            <td>Submitted</td>
            <td>{{ $application->created_at->format('d M Y, H:i') }}</td>
        </tr>
    </table>
@endsection
```

---

### 5.4 `resources/views/emails/account-activated.blade.php`

```html
@extends('emails.layout')

@section('content')
    <p>Hello {{ $user->fname }},</p>
    <p>Your account on the Waste-to-Value Platform has been activated. Use the credentials below to log in.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Email</td>
            <td>{{ $user->email }}</td>
        </tr>
        <tr>
            <td>Password</td>
            <td>{{ $plainPassword }}</td>
        </tr>
        <tr>
            <td>Role</td>
            <td>{{ ucfirst(str_replace('_', ' ', $user->role)) }}</td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Please change your password after your first login.</p>
@endsection
```

---

### 5.5 `resources/views/emails/contract-activated.blade.php`

```html
@extends('emails.layout')

@section('content')
    <p>Hello {{ $user->fname }},</p>
    <p>Your contract with the Waste-to-Value Platform is now active.</p>
    <table class="info-table" style="width: 100%; margin-top: 16px;">
        <tr>
            <td>Commodity</td>
            <td>{{ $contract->commodity->title }}</td>
        </tr>
        <tr>
            <td>Payment Terms</td>
            <td>{{ $contract->payment_terms ?? '—' }}</td>
        </tr>
        <tr>
            <td>Signed Date</td>
            <td>{{ $contract->signed_date?->format('d M Y') ?? '—' }}</td>
        </tr>
    </table>
    <p style="margin-top: 20px;">Log in to your dashboard to view your contract details.</p>
@endsection
```

---

## 6. Where to Dispatch Each Mail

Exact insertion points in already-written controllers.

---

### 6.1 `ApplicationController@store`

After creating the `Application` record, add:

```php
$verificationUrl = config('app.frontend_url')
    . '/verify-email?token='
    . $application->email_verification_token;

Mail::to($application->email)
    ->queue(new \App\Mail\ApplicationVerificationMail(
        contactName:     $application->contact_name,
        verificationUrl: $verificationUrl,
    ));
```

The React app's `/verify-email` route reads the `token` query param and calls `GET /api/applications/verify-email/{token}`.

---

### 6.2 `ApplicationController@verifyEmail`

After setting `email_verified_at` on the application, add:

```php
$admins = \App\Models\User::where('role', 'super_admin')
    ->whereNotNull('email_verified_at')
    ->whereNull('deleted_at')
    ->get();

foreach ($admins as $admin) {
    Mail::to($admin->email)
        ->queue(new \App\Mail\AdminNewApplicationMail($application));
}
```

---

### 6.3 `AdminUserController@store`

After the transaction commits and before returning the response, add:

```php
// Plain password is captured from the validated request before the
// User model's hashed cast processes it on assignment.
// TODO: Replace with a password-set link once password reset is built.
Mail::to($user->email)
    ->queue(new \App\Mail\AccountActivatedMail(
        user:          $user,
        plainPassword: $request->validated('password'),
    ));
```

---

### 6.4 `AdminContractController@updateStatus`

After updating the contract status, add:

```php
if ($contract->status === 'active') {
    $partyUser = \App\Models\User::find($contract->party_id);

    if ($partyUser) {
        $contract->loadMissing('commodity');

        Mail::to($partyUser->email)
            ->queue(new \App\Mail\ContractActivatedMail($partyUser, $contract));
    }
}
```

---

## 7. Testing Without the Frontend

Since verification links point to the React app which may not be running yet, the backend team needs a way to test the full email flow independently using only a REST client (Postman, Insomnia, or curl).

---

### 7.1 Reading emails in Mailtrap

With `MAIL_MAILER=smtp` pointing to Mailtrap, every queued email lands in the shared Mailtrap inbox at **mailtrap.io** once the queue worker processes it. The whole team can see all emails there without needing access to the server.

```bash
# Run the queue worker — emails are sent when jobs are processed
php artisan queue:work
```

Open the Mailtrap inbox in the browser to see the rendered email, including the verification link. Copy the token from the link URL and use it in the next step.

**Fallback if Mailtrap is unavailable:** temporarily switch to `MAIL_MAILER=log` and tail the log:

```bash
tail -f storage/logs/laravel.log | grep "verify-email"
```

---

### 7.2 Add a local-only token lookup endpoint

Add the following route to `routes/api.php`, gated strictly to the `local` environment. This lets the backend team retrieve a verification token by email without needing to parse the log:

```php
// LOCAL DEVELOPMENT ONLY — never exposed in production
if (app()->environment('local')) {
    Route::get('/dev/application-token/{email}', function (string $email) {
        $application = \App\Models\Application::where('email', $email)
            ->whereNull('email_verified_at')
            ->latest()
            ->firstOrFail();

        return response()->json([
            'email'                    => $application->email,
            'email_verification_token' => $application->email_verification_token,
            'verify_url'               => url("/api/applications/verify-email/{$application->email_verification_token}"),
        ]);
    });
}
```

With this in place, the full testable flow using only Postman is:

```
1. POST /api/applications           → submit application form
2. GET  /dev/application-token/{email} → retrieve token (local only)
3. GET  /api/applications/verify-email/{token} → verify email
4. POST /api/auth/login             → log in with created credentials
```

This endpoint is completely absent in any environment other than `local`. No middleware, no auth — it exists purely to unblock backend testing.

---

### 7.3 Viewing rendered email templates

To preview how an email template looks without sending it, add these local-only preview routes:

```php
if (app()->environment('local')) {
    Route::get('/dev/email-preview/verification', function () {
        return new \App\Mail\ApplicationVerificationMail(
            contactName:     'Ahmed Khaled',
            verificationUrl: 'http://localhost:3000/verify-email?token=test-token-here',
        );
    });

    Route::get('/dev/email-preview/account-activated', function () {
        $user = \App\Models\User::where('role', '!=', 'super_admin')->first();
        return new \App\Mail\AccountActivatedMail($user, 'TestPassword123');
    });
}
```

Opening these URLs in the browser renders the email exactly as it would appear in an inbox.

---

## 8. CORS

Since the React frontend runs on a separate origin, confirm `config/cors.php` allows it:

```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:3000'),
],
```

This matters for the verification flow: the user clicks the link in their email, lands on the React app, and the React app immediately makes an API call from the frontend origin.

---

## 9. Failed Job Handling

```bash
php artisan queue:failed        # list failed jobs
php artisan queue:retry {id}    # retry one
php artisan queue:retry all     # retry all
php artisan queue:flush         # clear all failed jobs
```

---

## 10. Checklist

- [ ] `MAIL_MAILER=smtp` with Mailtrap credentials set in `.env`
- [ ] Mailtrap credentials obtained from mailtrap.io → SMTP Settings → Laravel integration
- [ ] `FRONTEND_URL` added to `.env` and `config/app.php`
- [ ] `QUEUE_CONNECTION=database` set in `.env`
- [ ] `php artisan make:queue-table` run and migrated
- [ ] All 4 Mailable classes created in `app/Mail/` with `Queueable + SerializesModels + ShouldQueue`
- [ ] Shared layout created at `resources/views/emails/layout.blade.php`
- [ ] All 4 Blade email templates created
- [ ] Verification URL in `ApplicationController@store` uses `config('app.frontend_url')` — not `url()`
- [ ] `ApplicationController@verifyEmail` queries all non-deleted verified super admins
- [ ] `AdminUserController@store` dispatches mail **after** transaction commits
- [ ] `AdminContractController@updateStatus` dispatches only when new status is `'active'`
- [ ] `AccountActivatedMail` plain password usage marked with TODO comment
- [ ] CORS `allowed_origins` includes `FRONTEND_URL`
- [ ] `/dev/application-token/{email}` route exists and is gated to `local` environment only
- [ ] `/dev/email-preview/*` routes exist and are gated to `local` environment only
- [ ] `php artisan queue:work` running and emails appearing in Mailtrap inbox
- [ ] Full flow tested end-to-end via Postman using the 4-step sequence in section 7.2
