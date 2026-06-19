# Waste-to-Value Platform — Services & Events Master Reference

This document is the top-level index and summary of all services and domain events across the platform. Each section links to its detailed spec file. Read this first to understand how the services connect end-to-end.

---

## Service Map

```
                    ┌─────────────────────────────┐
                    │   04 - Onboarding & Contract │
                    │  (Registration → Account     │
                    │   Activation → Schedule)     │
                    └────────────┬────────────────┘
                                 │ PickupScheduleCreated
                                 ▼
┌───────────────────────────────────────────────────────────────┐
│              01 - Pickup & Inbound Transport                  │
│   (Driver login → Truck Assignment → Supplier Arrival         │
│    → Load Upload → Depart to Hub)                             │
└───────────────────────────────┬───────────────────────────────┘
                                │ TruckDepartedToHub
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              02 - Hub Inbound & Processing                    │
│   (Hub Arrival → Tier 1 Weigh → Sort/Decontaminate           │
│    → Tier 2 Weigh → Contamination Calc → Supplier Invoice     │
│    → Baling → Inventory Update → Stock Alert)                 │
└───────────────────────────────┬───────────────────────────────┘
                                │ StockThresholdReached
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              03 - Outbound & Payment                          │
│   (Delivery Note → Factory Notification → Receipt Confirm     │
│    → 48hr Window → Factory Invoice → Payment Tracking)        │
└───────────────────────────────────────────────────────────────┘
```

---

## File Index

| # | File | Source Diagrams | Primary Actors |
|---|---|---|---|
| 01 | [pickup-inbound-transport.md](./01-pickup-inbound-transport.md) | Driver/Truck/Hub Manager — Stage 1 | Driver |
| 02 | [hub-inbound-processing.md](./02-hub-inbound-processing.md) | Driver/Truck/Hub Manager — Stage 2 + Hub Manager Detailed (Stages 2 & 3) | Hub Manager, Driver |
| 03 | [outbound-payment.md](./03-outbound-payment.md) | Factory & Super Admin — Outbound & Payment | Super Admin, Factory |
| 04 | [onboarding-contract.md](./04-onboarding-contract.md) | Supplier/Factory & Super Admin — Registration & Contract | Super Admin, Supplier, Factory |

> Files 01 and 02 were intentionally split from the same source diagram because the Driver's inbound transport (Stage 1) and the Hub Manager's processing pipeline (Stage 2 + detailed) are distinct operational domains with a clean handoff event (`TruckDepartedToHub` / `TruckArrivedAtHub`) between them.
>
> Files 02 and the Hub Manager detailed diagram were **combined** into one file because they are causally sequential and share the same actor (Hub Manager) with no meaningful break between them.

---

## Full Event Catalogue

All domain events across the system, in operational order:

### Onboarding & Contract (04)

| Event | Trigger | Consumed By |
|---|---|---|
| `ApplicationSubmitted` | Supplier/Factory submits lead form | Super Admin dashboard |
| `ApplicationStatusUpdated` | SA updates application status | — |
| `ContractRegistered` | SA registers signed contract | `InventoryService` (reads threshold) |
| `PickupScheduleCreated` | SA creates pickup schedule | `TruckAssignmentService` (daily routes) |
| `UserAccountCreated` | SA creates user account | Auth system |
| `ApplicationConverted` | Account created, application closed | — |
| `BasePriceUpdated` | SA updates commodity base price | `SupplierPricingService`, `InvoiceGenerationService` |

### Pickup & Inbound Transport (01)

| Event | Trigger | Consumed By |
|---|---|---|
| `TruckAssigned` | System assigns truck to driver | Driver Dashboard |
| `PickupArrivalConfirmed` | Driver confirms arrival at supplier | — |
| `LoadDetailsUploaded` | Driver uploads load photo + weight | — |
| `TruckDepartedToHub` | Driver confirms "On Way to Hub" | `HubArrivalService` |

### Hub Inbound & Processing (02)

| Event | Trigger | Consumed By |
|---|---|---|
| `TruckArrivedAtHub` | Driver confirms hub arrival | Hub Manager notification |
| `LoadStatusUpdated(received)` | Hub Manager confirms receipt | — |
| `LoadWeighedTier1` | HM records Tier 1 weight | `SortingService` (triggers sort) |
| `SortingStarted` | HM starts sorting supervision | — |
| `SortingCompleted` | HM marks sorting done | `WeighingService` (Tier 2) |
| `LoadWeighedTier2` | HM records Tier 2 weight | Contamination calculation |
| `ContaminationRatioCalculated` | System calculates ratio | Accepted weight calc |
| `AcceptedWeightFinalised` | System finalises accepted weight | `SupplierPricingService` |
| `SupplierInvoiceGenerated` | Pricing engine runs | Supplier notified |
| `BalesCreated` | HM records baled cubes | `InventoryService` |
| `InventoryUpdated` | Bales added to inventory | `StockMonitoringService` |
| `StockThresholdReached` | Stock hits contract threshold | `OutboundDeliveryService` |

### Outbound & Payment (03)

| Event | Trigger | Consumed By |
|---|---|---|
| `OutboundDeliveryNoteCreated` | SA creates delivery note | Factory notification |
| `FactoryDeliveryNotified` | System notifies factory | — |
| `DeliveryReceiptConfirmed` | Factory confirms receipt | Rejection window timer |
| `RejectionWindowStarted` | Receipt confirmed | 48hr scheduled job |
| `FactoryInvoiceGenerated` | 48hr window closes, no rejection | Factory notified |
| `DeliveryRejected` | Factory rejects within 48hr | SA alerted |
| `InvoiceMarkedPaid` | SA marks invoice paid | — |
| `LatePenaltyApplied` | Overdue date passed (5% → 10%) | Factory notified |

---

## Pricing Model Summary

| Party | Formula | Rate |
|---|---|---|
| Supplier payout | `accepted_weight × base_market_price × 0.70` | 70% of market |
| Factory invoice | `quantity × base_market_price × 1.10` | 110% of market |
| Platform margin | difference between supplier cost and factory revenue | ~40% gross spread |
| Late penalty stage 1 | `outstanding × 0.05` | 5% |
| Late penalty stage 2 | `outstanding × 0.10` | 10% |

---

## Load Status Reference (Full Lifecycle)

```
Truck:   available → assigned → in_transit_to_hub → at_hub → available
Pickup:  (created) → arrived → loaded → in_transit → received
Load:    received → weighted_tier1 → sorting_in_progress
           → sorted_decontaminated → weighted_tier2 → baled
Bale:    created → in_stock → dispatched
Delivery Note: created → dispatched → received → invoiced → paid
                                               ↘ rejected
Invoice (Supplier): generated → paid
Invoice (Factory):  generated → pending → paid
                                       ↘ overdue (penalty applied)
Application: pending → contacted → rejected
                              ↘ converted
```

---

## Auth System Mapping

The following services map directly to endpoints already specified in `signup_auth_agent_instructions.md`:

| Service | Controller | Endpoint |
|---|---|---|
| `ApplicationSubmissionService` | `ApplicationController@store` | `POST /api/applications` |
| `ApplicationReviewService` | `AdminApplicationController@updateStatus` | `PATCH /api/admin/applications/{id}/status` |
| `AccountActivationService` | `AdminUserController@store` | `POST /api/admin/users` |
