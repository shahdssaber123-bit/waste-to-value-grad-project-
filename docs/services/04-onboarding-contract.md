# Service Spec: Onboarding & Contract
**Actors:** Supplier / Factory, Super Admin  
**Source diagram:** Sequence Diagram — Supplier / Factory & Super Admin (Registration & Contract Flow)

---

## Overview

This service covers the full onboarding pipeline for Suppliers and Factories — from the moment they submit a registration interest via the landing page through to contract signing, pickup schedule creation, and account activation. It directly feeds into the Auth system documented in [signup_auth_agent_instructions.md](../signup_auth_agent_instructions.md).

> There is **no open self-registration**. The landing page form is an interest/lead form only. All account creation is performed manually by the Super Admin after a contract is agreed off-system.

---

## Services

---

### `ApplicationSubmissionService`

**Responsibility:** Accept a Supplier or Factory's registration interest submitted via the landing page popup form and store it as a pending application for Super Admin review.

| | |
|---|---|
| **Trigger** | Supplier or Factory submits the landing page interest form |
| **Inputs** | `company_name`, `contact_name`, `email`, `phone_no`, `role` (factory \| supplier), `tax_id`, `required_commodity` (factory only), `message` (optional) |
| **Logic** | Validate all fields. Create `Application` record with `status = pending`. |
| **Outputs** | `Application` record created. Super Admin dashboard reflects new pending lead. |
| **Emits** | `ApplicationSubmitted` |

> This service maps directly to `ApplicationController@store` in the auth spec.

---

### `ApplicationReviewService`

**Responsibility:** Allow the Super Admin to review pending applications, update their status through the contact lifecycle, and schedule off-system meetings.

| | |
|---|---|
| **Trigger** | Super Admin views or updates an application in the dashboard |
| **Inputs** | `application_id`, `new_status` (`contacted` \| `rejected` \| `converted`) |
| **Logic** | Update `Application.status`. If `rejected`, no further action. If `contacted`, record that the team has reached out — meeting and contract negotiation happen off-system. |
| **Outputs** | `Application` status updated. |
| **Emits** | `ApplicationStatusUpdated` |

> Maps to `AdminApplicationController@updateStatus`.

---

### `ContractRegistrationService`

**Responsibility:** Record a signed contract for a Supplier or Factory in the system after it has been agreed and signed off-system.

| | |
|---|---|
| **Trigger** | Super Admin manually enters contract details after signing |
| **Inputs** | `entity_type` (supplier \| factory), `entity_id` (or `application_id`), `commodity_type`, `contract_value`, `shipment_threshold_kg`, `base_market_price`, `start_date`, `end_date` |
| **Logic** | Create `Contract` record linked to the entity. Set the commodity shipment threshold that will later trigger outbound stock alerts (see [03-outbound-payment.md](./03-outbound-payment.md)). |
| **Outputs** | `Contract` record created and linked to entity. |
| **Emits** | `ContractRegistered` |

> **Note:** Contract registration is a manual Super Admin action — no automated contract generation is in scope.

---

### `PickupScheduleService`

**Responsibility:** Allow the Super Admin to create a recurring or one-off pickup schedule for a Supplier after a contract is signed.

| | |
|---|---|
| **Trigger** | Super Admin creates a pickup schedule for a Supplier |
| **Inputs** | `supplier_id`, `hub_id`, `frequency` (daily \| weekly \| custom), `scheduled_dates[]`, `commodity_type`, `estimated_quantity_kg` |
| **Logic** | Create `PickupSchedule` record(s). These schedules will feed the Driver's daily route list (see [01-pickup-inbound-transport.md](./01-pickup-inbound-transport.md)). |
| **Outputs** | `PickupSchedule` records created. Driver dashboard will surface these as available routes. |
| **Emits** | `PickupScheduleCreated` |

---

### `AccountActivationService`

**Responsibility:** Create the Supplier or Factory user account and notify them that their account is active with login credentials.

| | |
|---|---|
| **Trigger** | Super Admin creates the user account after contract is signed |
| **Inputs** | `name`, `email`, `password`, `role` (factory \| supplier), `phone_no`, role-specific profile fields (`company_name`, `tax_id`, `required_commodity`, etc.), optional `application_id` to link and mark as converted |
| **Logic** | Create `User` record with role. Create role-specific profile (`Factory` or `Supplier` table). If `application_id` provided, update `Application.status = converted` and set `converted_user_id`. Notify the user of their credentials (off-system or via email — future task). |
| **Outputs** | `User` + profile record created. `Application` marked `converted`. |
| **Emits** | `UserAccountCreated`, `ApplicationConverted` |
| **Note** | Notification/credential delivery is out of scope for the current task. |

> Maps directly to `AdminUserController@store` in the auth spec.

---

### `BasePriceUpdateService`

**Responsibility:** Allow the Super Admin to periodically update the base market price per commodity type, which is used by both the `SupplierPricingService` and `InvoiceGenerationService`.

| | |
|---|---|
| **Trigger** | Super Admin manually updates the base market price for a commodity |
| **Inputs** | `commodity_type`, `new_price_per_kg`, `effective_from` |
| **Logic** | Create or update the `BaseMarketPrice` record for the commodity. The new price takes effect for all invoices generated after `effective_from`. |
| **Outputs** | `BaseMarketPrice` record updated. |
| **Emits** | `BasePriceUpdated` |

---

## Events

### `ApplicationSubmitted`
```json
{
  "event": "ApplicationSubmitted",
  "application_id": 14,
  "role": "supplier",
  "company_name": "GreenSource Co.",
  "contact_name": "Ahmed Khaled",
  "email": "ahmed@greensource.com",
  "status": "pending",
  "submitted_at": "2025-08-15T10:00:00Z"
}
```

### `ApplicationStatusUpdated`
```json
{
  "event": "ApplicationStatusUpdated",
  "application_id": 14,
  "previous_status": "pending",
  "new_status": "contacted",
  "updated_by": "superadmin",
  "updated_at": "2025-08-16T09:00:00Z"
}
```

### `ContractRegistered`
```json
{
  "event": "ContractRegistered",
  "contract_id": 7,
  "entity_type": "supplier",
  "entity_id": 4,
  "commodity_type": "cardboard",
  "shipment_threshold_kg": 24000,
  "base_market_price_per_kg": 2.50,
  "start_date": "2025-09-01",
  "end_date": "2026-08-31",
  "registered_by": "superadmin",
  "registered_at": "2025-08-20T14:00:00Z"
}
```

### `PickupScheduleCreated`
```json
{
  "event": "PickupScheduleCreated",
  "schedule_id": 22,
  "supplier_id": 4,
  "hub_id": 2,
  "frequency": "weekly",
  "scheduled_dates": ["2025-09-01", "2025-09-08", "2025-09-15"],
  "commodity_type": "cardboard",
  "estimated_quantity_kg": 2000,
  "created_by": "superadmin"
}
```

### `UserAccountCreated`
```json
{
  "event": "UserAccountCreated",
  "user_id": 31,
  "role": "supplier",
  "email": "ahmed@greensource.com",
  "application_id": 14,
  "created_by": "superadmin",
  "created_at": "2025-08-21T09:00:00Z"
}
```

### `ApplicationConverted`
```json
{
  "event": "ApplicationConverted",
  "application_id": 14,
  "converted_user_id": 31,
  "converted_at": "2025-08-21T09:00:00Z"
}
```

### `BasePriceUpdated`
```json
{
  "event": "BasePriceUpdated",
  "commodity_type": "cardboard",
  "previous_price_per_kg": 2.50,
  "new_price_per_kg": 2.75,
  "effective_from": "2025-10-01",
  "updated_by": "superadmin"
}
```

---

## Full Onboarding Flow Summary

```
1. Supplier/Factory submits landing page form
        ↓ [ApplicationSubmitted]
2. Super Admin reviews → contacts off-system
        ↓ [ApplicationStatusUpdated: contacted]
3. Meeting held & contract agreed off-system
        ↓
4. Super Admin registers contract in system
        ↓ [ContractRegistered]
5. Super Admin creates pickup schedule (suppliers only)
        ↓ [PickupScheduleCreated]
6. Super Admin creates user account
        ↓ [UserAccountCreated, ApplicationConverted]
7. Credentials sent to user (off-system / future email task)
        ↓
8. User can now log in
```

---

## Cross-Service Dependencies

| Event emitted here | Consumed by |
|---|---|
| `ContractRegistered` | `InventoryService` — reads `shipment_threshold_kg` to trigger stock alerts |
| `PickupScheduleCreated` | `TruckAssignmentService` — surfaces routes in Driver Dashboard |
| `BasePriceUpdated` | `SupplierPricingService`, `InvoiceGenerationService` — use current price at invoice time |

---

## Out of Scope

- Automated email delivery of login credentials (future task)
- Email verification flow (future task)
- Forced password change on first login (future task)
- Website analytics visible to Super Admin
- Digital contract generation or e-signature
