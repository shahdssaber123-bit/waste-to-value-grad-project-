# Service Spec: Pickup & Inbound Transport
**Actors:** Driver / Loader  
**Source diagram:** Sequence Diagram — Driver, Truck & Hub Manager (Stage 1: Source Extraction)

---

## Overview

This service covers everything from the moment a Driver logs in and gets a truck assignment through to the moment the loaded truck departs toward the Hub. It is the **first stage** of the inbound logistics pipeline and hands off to the [Hub Inbound & Processing](./02-hub-inbound-processing.md) service when the driver confirms arrival at the Hub.

---

## Services

---

### `TruckAssignmentService`

**Responsibility:** Determine and assign an available, suitable truck to a driver for a given day's routes.

| | |
|---|---|
| **Trigger** | Driver logs in and requests today's pickup routes via the Driver Dashboard |
| **Inputs** | `driver_id`, `date` |
| **Logic** | Query available trucks (not already assigned for the day, status = `available`). Match by capacity and type suitable for the route's expected load. Assign the selected truck to the driver and route. |
| **Outputs** | Truck record updated with `driver_id`, `route_id`, `assigned_date`, `status = assigned`. Driver Dashboard receives: plate number, truck type, capacity. |
| **Emits** | `TruckAssigned` |

---

### `PickupArrivalService`

**Responsibility:** Log the driver's confirmed arrival at a supplier's location and associate it with the assigned truck.

| | |
|---|---|
| **Trigger** | Driver taps "Confirm Arrived at Supplier" in the Driver Dashboard |
| **Inputs** | `driver_id`, `truck_id`, `supplier_id`, `timestamp` |
| **Logic** | Record arrival timestamp. Update pickup record status to `arrived`. |
| **Outputs** | Pickup record created/updated with `status = arrived`, `arrived_at` timestamp. |
| **Emits** | `PickupArrivalConfirmed` |

---

### `LoadUploadService`

**Responsibility:** Capture the physical load details at the supplier site — photo evidence and an estimated weight — before the truck departs.

| | |
|---|---|
| **Trigger** | Driver submits load details form (photo + estimated weight) in the Driver Dashboard |
| **Inputs** | `driver_id`, `truck_id`, `pickup_id`, `photo` (file), `estimated_weight` (kg), `commodity_type` |
| **Logic** | Store photo to file storage. Save load details against the pickup record. Update pickup status to `loaded`. |
| **Outputs** | `Pickup` record updated: `estimated_weight`, `photo_url`, `status = loaded`. |
| **Emits** | `LoadDetailsUploaded` |

---

### `TransitService`

**Responsibility:** Mark the truck as in-transit to the Hub and record departure metadata.

| | |
|---|---|
| **Trigger** | Driver taps "On Way to Hub" in the Driver Dashboard |
| **Inputs** | `driver_id`, `truck_id`, `pickup_id`, `timestamp` |
| **Logic** | Update truck status to `in_transit_to_hub`. Record departure time and route on the truck record. Update pickup status to `in_transit`. |
| **Outputs** | `Truck` status = `in_transit_to_hub`, `departed_at` timestamp recorded. `Pickup` status = `in_transit`. |
| **Emits** | `TruckDepartedToHub` |

---

## Events

### `TruckAssigned`
```json
{
  "event": "TruckAssigned",
  "driver_id": 12,
  "truck_id": 5,
  "route_id": 3,
  "assigned_date": "2025-09-01",
  "plate_number": "ABC-1234",
  "truck_type": "flatbed",
  "capacity_kg": 5000
}
```

### `PickupArrivalConfirmed`
```json
{
  "event": "PickupArrivalConfirmed",
  "pickup_id": 88,
  "driver_id": 12,
  "truck_id": 5,
  "supplier_id": 7,
  "arrived_at": "2025-09-01T09:15:00Z"
}
```

### `LoadDetailsUploaded`
```json
{
  "event": "LoadDetailsUploaded",
  "pickup_id": 88,
  "driver_id": 12,
  "truck_id": 5,
  "estimated_weight_kg": 1800,
  "commodity_type": "cardboard",
  "photo_url": "storage/pickups/88/load.jpg",
  "uploaded_at": "2025-09-01T09:45:00Z"
}
```

### `TruckDepartedToHub`
```json
{
  "event": "TruckDepartedToHub",
  "pickup_id": 88,
  "truck_id": 5,
  "driver_id": 12,
  "hub_id": 2,
  "departed_at": "2025-09-01T10:00:00Z"
}
```

---

## State Transitions

```
Truck:   available → assigned → in_transit_to_hub
Pickup:  (created) → arrived → loaded → in_transit
```

---

## Handoff

`TruckDepartedToHub` is consumed by the **Hub Inbound & Processing** service, which takes ownership of the load from the moment the driver confirms arrival at the Hub.

→ See [02-hub-inbound-processing.md](./02-hub-inbound-processing.md)

---

## Out of Scope

- GPS live tracking of the truck en route
- Route optimization or multi-stop routing
- Driver rating or performance metrics
