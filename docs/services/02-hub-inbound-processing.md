# Service Spec: Hub Inbound & Processing
**Actors:** Driver / Loader, Hub Manager, QA Sorters, Super Admin  
**Source diagrams:** Sequence Diagram — Driver, Truck & Hub Manager (Stage 2: Hub Inbound) + Sequence Diagram — Hub Manager Detailed Hub Processing (Stages 2 & 3)

---

## Overview

This service is a **direct continuation** of [Pickup & Inbound Transport](./01-pickup-inbound-transport.md). It begins the moment the driver confirms arrival at the Hub and covers the complete in-hub lifecycle of the waste load: arrival registration → two-tier weighing → sorting & decontamination → contamination ratio calculation → supplier pricing & invoice → baling into cubes → inventory update → stock alert to Super Admin.

Because Stage 2 of the inbound flow and the detailed hub processing stages share the same Hub Manager actor and are causally sequential, they are documented together here.

---

## Services

---

### `HubArrivalService`

**Responsibility:** Register the truck's arrival at the Hub, notify the Hub Manager, and formally receive the load into the hub's custody.

| | |
|---|---|
| **Trigger** | Driver taps "Confirm Arrived at Hub" in the Driver Dashboard |
| **Inputs** | `driver_id`, `truck_id`, `pickup_id`, `hub_id`, `timestamp` |
| **Logic** | Record hub arrival timestamp. Update truck status to `at_hub`. Notify the Hub Manager (in-app notification). Hub Manager confirms receipt and updates load status to `received`. |
| **Outputs** | `Truck` status = `at_hub`. `Pickup/Load` status = `received`. Hub Manager notification sent. |
| **Emits** | `TruckArrivedAtHub`, `LoadStatusUpdated(received)` |
| **Consumes** | `TruckDepartedToHub` |

---

### `WeighingService`

**Responsibility:** Record the two-tier weighing of the load and compute the contamination ratio and accepted weight between them.

This service is invoked **twice** for every load:

#### Tier 1 Weigh-In

| | |
|---|---|
| **Trigger** | Hub Manager enters Tier 1 weight reading |
| **Inputs** | `load_id`, `hub_id`, `weight_kg` (gross weight at arrival) |
| **Logic** | Record `tier1_weight`. Update load status to `weighted_tier1`. Generate digital weight receipt for Hub Manager. |
| **Outputs** | `Load` updated: `tier1_weight`, `status = weighted_tier1`. Digital weight receipt (PDF or on-screen). |
| **Emits** | `LoadWeighedTier1` |

#### Tier 2 Weigh-In + Contamination Calculation

| | |
|---|---|
| **Trigger** | Hub Manager enters Tier 2 weight reading (after sorting & decontamination) |
| **Inputs** | `load_id`, `tier2_weight_kg` |
| **Logic** | Record `tier2_weight`. Update load status to `weighted_tier2`. Calculate: **contamination_ratio** = `(tier1_weight - tier2_weight) / tier1_weight`. Calculate: **accepted_weight** = if contamination_ratio > 5% then `tier1_weight × (1 - contamination_ratio)` else `tier2_weight`. Generate digital weight receipt with accepted weight. |
| **Outputs** | `Load` updated: `tier2_weight`, `contamination_ratio`, `accepted_weight`, `status = weighted_tier2`. Digital weight receipt generated. |
| **Emits** | `LoadWeighedTier2`, `ContaminationRatioCalculated`, `AcceptedWeightFinalised` |

---

### `SortingService`

**Responsibility:** Track the sorting and decontamination stage supervised by the Hub Manager and 4 QA Sorters.

| | |
|---|---|
| **Trigger** | Hub Manager marks sorting as started (after Tier 1 weighing) |
| **Inputs** | `load_id`, `hub_manager_id` |
| **Logic** | Update load status to `sorting_in_progress`. When Hub Manager marks completion, update status to `sorted_decontaminated`. |
| **Outputs** | `Load` status transitions: `weighted_tier1` → `sorting_in_progress` → `sorted_decontaminated`. |
| **Emits** | `SortingStarted`, `SortingCompleted` |

---

### `SupplierPricingService`

**Responsibility:** Apply the algorithmic pricing engine to determine the amount owed to the Supplier, then generate and deliver the Supplier invoice/quotation.

| | |
|---|---|
| **Trigger** | `AcceptedWeightFinalised` event |
| **Inputs** | `load_id`, `supplier_id`, `accepted_weight_kg`, `commodity_type`, `base_market_price` (per kg, maintained by Super Admin) |
| **Logic** | Apply pricing formula: **supplier_price** = `base_market_price × 0.70`. Calculate total: `accepted_weight_kg × supplier_price`. Generate PDF invoice/quotation. Send notification to Supplier. |
| **Outputs** | `SupplierInvoice` record created with amount, commodity, load reference. PDF generated and stored. Supplier notified in-app. |
| **Emits** | `SupplierInvoiceGenerated` |

> **Note:** Base market price is periodically updated by the Super Admin. The pricing engine always uses the current price at the time of invoice generation.

---

### `BalingService`

**Responsibility:** Record the baling of processed waste material into cubes, assign each bale a unique ID and quality score, and associate bale weights.

| | |
|---|---|
| **Trigger** | Hub Manager submits bale details for a completed load |
| **Inputs** | `load_id`, `hub_id`, `commodity_type`, array of `{ weight_kg, quality_notes }` per cube |
| **Logic** | For each cube: create a `Bale` record, assign a unique `bale_id`, assign a `quality_score` (system-calculated or Hub Manager input). Link all bales to the originating load. |
| **Outputs** | `Bale` records created. `Load` status updated to `baled`. |
| **Emits** | `BalesCreated` |

---

### `InventoryService`

**Responsibility:** Maintain commodity-level stock tracking at each hub, and trigger automatic stock alerts to the Super Admin when a shipment threshold is reached.

| | |
|---|---|
| **Trigger** | `BalesCreated` event |
| **Inputs** | `hub_id`, `commodity_type`, bale weights |
| **Logic** | Add accepted weight to hub's running commodity inventory. Check if current stock meets or exceeds the contract shipment threshold (e.g., 24 tons). If threshold met: send automatic alert and daily report to Super Admin. |
| **Outputs** | `Inventory` record updated (quantity per commodity per hub). |
| **Emits** | `InventoryUpdated`, `StockThresholdReached` (conditional) |
| **Consumed by** | `OutboundDeliveryService` — see [03-outbound-payment.md](./03-outbound-payment.md) |

---

## Events

### `TruckArrivedAtHub`
```json
{
  "event": "TruckArrivedAtHub",
  "pickup_id": 88,
  "truck_id": 5,
  "driver_id": 12,
  "hub_id": 2,
  "hub_manager_id": 9,
  "arrived_at": "2025-09-01T12:10:00Z"
}
```

### `LoadWeighedTier1`
```json
{
  "event": "LoadWeighedTier1",
  "load_id": 88,
  "hub_id": 2,
  "tier1_weight_kg": 1800,
  "weighed_at": "2025-09-01T12:25:00Z"
}
```

### `SortingCompleted`
```json
{
  "event": "SortingCompleted",
  "load_id": 88,
  "hub_manager_id": 9,
  "completed_at": "2025-09-01T14:00:00Z"
}
```

### `LoadWeighedTier2`
```json
{
  "event": "LoadWeighedTier2",
  "load_id": 88,
  "tier2_weight_kg": 1650,
  "weighed_at": "2025-09-01T14:20:00Z"
}
```

### `ContaminationRatioCalculated`
```json
{
  "event": "ContaminationRatioCalculated",
  "load_id": 88,
  "tier1_weight_kg": 1800,
  "tier2_weight_kg": 1650,
  "contamination_ratio": 0.0833,
  "contamination_ratio_pct": "8.33%"
}
```

### `AcceptedWeightFinalised`
```json
{
  "event": "AcceptedWeightFinalised",
  "load_id": 88,
  "accepted_weight_kg": 1650,
  "contamination_ratio_pct": "8.33%",
  "calculation_note": "ratio > 5%, accepted = tier1 × (1 - ratio)"
}
```

### `SupplierInvoiceGenerated`
```json
{
  "event": "SupplierInvoiceGenerated",
  "invoice_id": 210,
  "load_id": 88,
  "supplier_id": 7,
  "commodity_type": "cardboard",
  "accepted_weight_kg": 1650,
  "base_market_price_per_kg": 2.50,
  "supplier_rate_per_kg": 1.75,
  "total_amount": 2887.50,
  "pdf_url": "storage/invoices/supplier/210.pdf",
  "generated_at": "2025-09-01T14:30:00Z"
}
```

### `BalesCreated`
```json
{
  "event": "BalesCreated",
  "load_id": 88,
  "hub_id": 2,
  "commodity_type": "cardboard",
  "bales": [
    { "bale_id": "BALE-001-2025", "weight_kg": 550, "quality_score": "A" },
    { "bale_id": "BALE-002-2025", "weight_kg": 560, "quality_score": "A" },
    { "bale_id": "BALE-003-2025", "weight_kg": 540, "quality_score": "B" }
  ]
}
```

### `InventoryUpdated`
```json
{
  "event": "InventoryUpdated",
  "hub_id": 2,
  "commodity_type": "cardboard",
  "added_weight_kg": 1650,
  "total_stock_kg": 18400,
  "updated_at": "2025-09-01T14:35:00Z"
}
```

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

---

## Load Status State Machine

```
received
  → weighted_tier1
    → sorting_in_progress
      → sorted_decontaminated
        → weighted_tier2
          → baled
```

---

## Contamination Ratio Formula

```
contamination_ratio = (tier1_weight - tier2_weight) / tier1_weight

if contamination_ratio > 0.05:
    accepted_weight = tier1_weight × (1 - contamination_ratio)
else:
    accepted_weight = tier2_weight
```

---

## Handoff

`StockThresholdReached` is consumed by the **Outbound & Payment** service, which triggers the Super Admin to create an outbound delivery note.

→ See [03-outbound-payment.md](./03-outbound-payment.md)
