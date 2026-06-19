# Service Spec: Outbound & Payment
**Actors:** Super Admin, Factory (Buyer)  
**Source diagram:** Sequence Diagram — Factory & Super Admin (Outbound & Payment)

---

## Overview

This service handles everything from the point where hub stock reaches the contract threshold through to invoice settlement. It covers outbound delivery coordination, factory receipt confirmation, the 48-hour rejection window, invoice generation, and payment status management including late penalties.

> **Important:** Physical outbound shipping is handled entirely outside the system by a third-party logistics provider (e.g., Trella / Trukker). The system's role is to trigger the process, notify the Factory, and track the invoice and payment lifecycle.

This service is triggered by the `StockThresholdReached` event from the [Hub Inbound & Processing](./02-hub-inbound-processing.md) service.

---

## Services

---

### `StockMonitoringService`

**Responsibility:** Continuously monitor per-commodity stock levels per hub and notify the Super Admin when a contract shipment threshold is met.

| | |
|---|---|
| **Trigger** | `InventoryUpdated` event from `InventoryService` |
| **Inputs** | `hub_id`, `commodity_type`, `current_stock_kg`, configured `threshold_kg` per contract |
| **Logic** | On each inventory update, compare current stock against the factory contract threshold. If met or exceeded, generate an automatic in-app alert and a daily report for the Super Admin. |
| **Outputs** | Super Admin alert + daily report. |
| **Emits** | `StockThresholdReached` |
| **Consumes** | `InventoryUpdated` |

---

### `OutboundDeliveryService`

**Responsibility:** Allow the Super Admin to create an outbound delivery note once stock is ready, and notify the Factory with the estimated delivery date and time.

| | |
|---|---|
| **Trigger** | Super Admin manually creates an outbound delivery note (prompted by the `StockThresholdReached` alert) |
| **Inputs** | `hub_id`, `factory_id`, `commodity_type`, `quantity_kg`, `bale_ids[]`, `estimated_delivery_at` |
| **Logic** | Create `OutboundDeliveryNote` record. Link bales to delivery note. Update bale statuses to `dispatched`. Notify Factory of estimated delivery (date & time). |
| **Outputs** | `OutboundDeliveryNote` record created. Bale statuses updated. Factory notified in-app. |
| **Emits** | `OutboundDeliveryNoteCreated`, `FactoryDeliveryNotified` |
| **Consumes** | `StockThresholdReached` |

---

### `DeliveryReceiptService`

**Responsibility:** Record the Factory's confirmation of physical delivery receipt and start the 48-hour rejection window.

| | |
|---|---|
| **Trigger** | Factory user taps "Confirm Receipt of Delivery" |
| **Inputs** | `delivery_note_id`, `factory_id`, `confirmed_at` |
| **Logic** | Update delivery note status to `received`. Record `received_at` timestamp. Start the 48-hour rejection window by computing `rejection_deadline = received_at + 48 hours`. Schedule a job to auto-close the window if no rejection occurs. |
| **Outputs** | `OutboundDeliveryNote` updated: `status = received`, `received_at`, `rejection_deadline`. |
| **Emits** | `DeliveryReceiptConfirmed`, `RejectionWindowStarted` |

---

### `InvoiceGenerationService`

**Responsibility:** Automatically generate a Factory sales invoice at a 110% premium of the base commodity price if no rejection is received within 48 hours of delivery confirmation.

| | |
|---|---|
| **Trigger** | 48-hour rejection window closes with no rejection (scheduled job fires) |
| **Inputs** | `delivery_note_id`, `factory_id`, `quantity_kg`, `commodity_type`, `base_market_price` |
| **Logic** | Calculate invoice total: `quantity_kg × base_market_price × 1.10`. Generate PDF invoice with due dates. Deliver invoice to Factory (in-app + PDF). Update delivery note status to `invoiced`. |
| **Outputs** | `FactoryInvoice` record created. PDF stored and linked. Factory notified. |
| **Emits** | `FactoryInvoiceGenerated` |
| **Consumes** | `RejectionWindowExpired` |

---

### `RejectionHandlingService`

**Responsibility:** Handle a Factory rejection within the 48-hour window.

| | |
|---|---|
| **Trigger** | Factory raises a rejection before the window expires |
| **Inputs** | `delivery_note_id`, `factory_id`, `rejection_reason`, `rejected_at` |
| **Logic** | Cancel the auto-close job. Update delivery note status to `rejected`. Alert Super Admin. Rejection resolution (re-pickup, credit, dispute) is handled off-system or in a future task. |
| **Outputs** | `OutboundDeliveryNote` status = `rejected`. Super Admin alerted. |
| **Emits** | `DeliveryRejected` |

---

### `PaymentService`

**Responsibility:** Allow the Super Admin to manually mark a Factory invoice as paid (payment itself happens off-system via bank transfer), and apply late payment penalties when needed.

| | |
|---|---|
| **Trigger** | Super Admin changes invoice status to `paid`, or a scheduled job detects an overdue invoice |
| **Inputs** | `invoice_id`, `new_status` (`pending → paid`), optional `penalty_stage` |
| **Logic (status update)** | Super Admin sets invoice status to `paid`. Record `paid_at` timestamp. |
| **Logic (late penalty)** | System monitors invoice due dates. First overdue stage: apply 5% penalty on outstanding amount. Second stage: escalate to 10%. Update invoice `penalty_pct` and `total_due`. Notify Factory. |
| **Outputs** | `FactoryInvoice` updated: `status`, `paid_at`, `penalty_pct`, `total_due`. |
| **Emits** | `InvoiceMarkedPaid`, `LatePenaltyApplied` |

---

## Events

### `StockThresholdReached`
```json
{
  "event": "StockThresholdReached",
  "hub_id": 2,
  "commodity_type": "cardboard",
  "current_stock_kg": 24100,
  "threshold_kg": 24000,
  "alerted_at": "2025-09-01T14:35:00Z"
}
```
> Also emitted by `InventoryService` in hub processing. Listed here to show this service consumes it.

### `OutboundDeliveryNoteCreated`
```json
{
  "event": "OutboundDeliveryNoteCreated",
  "delivery_note_id": 55,
  "hub_id": 2,
  "factory_id": 3,
  "commodity_type": "cardboard",
  "quantity_kg": 24100,
  "bale_ids": ["BALE-001-2025", "BALE-002-2025"],
  "estimated_delivery_at": "2025-09-03T10:00:00Z",
  "created_by": "superadmin",
  "created_at": "2025-09-01T15:00:00Z"
}
```

### `DeliveryReceiptConfirmed`
```json
{
  "event": "DeliveryReceiptConfirmed",
  "delivery_note_id": 55,
  "factory_id": 3,
  "received_at": "2025-09-03T11:30:00Z",
  "rejection_deadline": "2025-09-05T11:30:00Z"
}
```

### `RejectionWindowStarted`
```json
{
  "event": "RejectionWindowStarted",
  "delivery_note_id": 55,
  "rejection_deadline": "2025-09-05T11:30:00Z"
}
```

### `FactoryInvoiceGenerated`
```json
{
  "event": "FactoryInvoiceGenerated",
  "invoice_id": 301,
  "delivery_note_id": 55,
  "factory_id": 3,
  "commodity_type": "cardboard",
  "quantity_kg": 24100,
  "base_price_per_kg": 4.00,
  "premium_pct": 10,
  "unit_price_per_kg": 4.40,
  "total_amount": 106040.00,
  "due_date": "2025-09-20T23:59:59Z",
  "pdf_url": "storage/invoices/factory/301.pdf",
  "generated_at": "2025-09-05T11:31:00Z"
}
```

### `DeliveryRejected`
```json
{
  "event": "DeliveryRejected",
  "delivery_note_id": 55,
  "factory_id": 3,
  "rejection_reason": "Contamination above acceptable threshold",
  "rejected_at": "2025-09-04T09:00:00Z"
}
```

### `InvoiceMarkedPaid`
```json
{
  "event": "InvoiceMarkedPaid",
  "invoice_id": 301,
  "factory_id": 3,
  "paid_at": "2025-09-18T14:00:00Z",
  "updated_by": "superadmin"
}
```

### `LatePenaltyApplied`
```json
{
  "event": "LatePenaltyApplied",
  "invoice_id": 301,
  "factory_id": 3,
  "penalty_stage": 1,
  "penalty_pct": 5,
  "original_amount": 106040.00,
  "penalty_amount": 5302.00,
  "new_total_due": 111342.00,
  "applied_at": "2025-09-21T00:00:00Z"
}
```

---

## Invoice Pricing Formulas

```
# Factory sales invoice
unit_price   = base_market_price × 1.10   (110% premium)
total_amount = unit_price × quantity_kg

# Supplier payout (set in hub processing)
unit_price   = base_market_price × 0.70   (70% of market)

# Late penalty — Stage 1 (first overdue date passed)
penalty      = outstanding_amount × 0.05

# Late penalty — Stage 2 (second overdue date passed)
penalty      = outstanding_amount × 0.10
```

---

## Delivery Note Status Machine

```
created → dispatched → received → invoiced → paid
                              ↘ rejected
```

---

## Out of Scope

- Third-party logistics provider integration (Trella / Trukker API calls)
- Bank transfer confirmation or payment gateway
- Dispute resolution workflow for rejections
- Credit notes or partial delivery handling
