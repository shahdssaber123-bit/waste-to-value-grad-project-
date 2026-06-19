# Backlog: Multi-Factor Authentication (MFA) Implementation

## Status: Deferred (Commented Out)
**Date:** 2026-04-23  
**Reason:** The current implementation in `AuthController@login` was a mock (hardcoded OTP '123456' and no actual email/SMS dispatch). To maintain system stability and allow immediate testing of other Super Admin features, the MFA gate has been bypassed.

## Current Situation
- **Controller Logic:** The MFA trigger in `AuthController@login` is commented out. `super_admin` users currently receive a Bearer token immediately upon providing valid credentials.
- **Endpoints:** The `POST /api/v1/auth/mfa/verify` endpoint remains active and defined in routes, but is effectively unreachable in the standard login flow.
- **Middlewares:** All admin routes are still protected by `auth:sanctum`, `accessible`, and `superadmin`.

## Requirements for Full Implementation
To move this feature to production, the following must be completed:

1.  **Dynamic OTP Generation:** Replace the hardcoded `'123456'` with a cryptographically secure 6-digit random number.
2.  **Notification Service:** Integrate a mail driver or SMS provider (e.g., Twilio, AWS SNS, or Laravel Mail) to dispatch the OTP to the Super Admin.
3.  **Job Queueing:** Ensure the notification is dispatched via a background job to prevent blocking the login response.
4.  **MFA Token Management:** Continue using the `mfa_token` cache-based approach for session identification.
5.  **Rate Limiting:** Ensure the `throttle:10,1` on the verify endpoint is sufficient for the final provider.

## How to Re-enable
1.  Uncomment the MFA logic block in `app/Http/Controllers/Api/V1/AuthController.php` inside the `login` method.
2.  Implement the `// TODO` items related to OTP generation and email dispatch.
3.  Update tests to expect the `mfa_required` response instead of a direct token.
