# WasteToValue System Complete v2.2 — Run Guide

## What was completed in this package

- Removed the unwanted `Platform Admin` actor from the visible frontend flow.
- Frontend is connected to Laravel `/api/v1` only; legacy Base44 client is disabled.
- Local bundled material images were added under `public/materials`, so marketplace/profile images work offline.
- Admin live-control buttons are status-aware and refresh live records after API actions.
- Supplier pickup request flow writes to database and appears in Admin/Operations.
- Driver mission flow includes start, record weight, upload proof photo, complete at hub, and problem report.
- Hub Manager flow includes receive pickup, quality check, automatic contamination calculation, bale creation, and inventory update.
- Factory flow includes material request, matching, scheduling, shipping, confirm/reject, 48h rejection window, and invoice path.
- Lists in Admin, Supplier, Driver, Hub Manager, Factory, and Operations display 5 records per page with Next/Previous.
- Seeded SQLite database is included and already populated with a complete demo ecosystem.

## Demo accounts

All seeded accounts use password:

```text
password
```

Main accounts:

```text
admin@demo.com
supplier@demo.com
industry@demo.com
driver@demo.com
hub@demo.com
```

Extra seeded accounts include:

```text
supplier1@demo.com ... supplier35@demo.com
factory1@demo.com ... factory26@demo.com
driver1_1@demo.com ... driver10_3@demo.com
hub.manager1@demo.com ... hub.manager10@demo.com
sorter1@demo.com ... sorter10@demo.com
operations@demo.com
```

## Seeded database counts

The included `database/database.sqlite` is already populated with approximately:

- 119 users
- 36 suppliers
- 53 employees
- 27 factories
- 10 hubs
- 31 trucks
- 35 commodities
- 124 contracts
- 61 pickups
- 46 pickup proof photos
- 31 inbound records
- 31 bale cubes
- 54 material requests
- 32 outbound deliveries
- 18 invoices
- 124 notifications
- 89 activity logs

## How to run

Install PHP/Composer dependencies if your `vendor` folder is incomplete:

```bash
composer install
```

Install Node packages if needed:

```bash
npm install
```

Run frontend build check:

```bash
npm run build
```

Run lint check:

```bash
npm run lint
```

Run Laravel:

```bash
php artisan serve
```

If you want to recreate the database from migrations/seeders:

```bash
php artisan migrate:fresh --seed
```

Important: automatic jobs need queue/scheduler:

```bash
php artisan queue:work
php artisan schedule:work
```

## Function verification checklist

### Admin

- Add User creates a real user/profile/contract.
- Add Material creates commodity.
- Set Price creates active commodity price.
- Add Hub creates hub.
- Add Truck creates truck.
- Create Pickup creates pickup from supplier contract.
- Approve/Reject application updates application status.
- Activate/Terminate contract updates contract.
- Dispatch pickup assigns driver/truck.
- Cancel pickup updates pickup status.
- Match/Schedule/Ship/Confirm/Reject material request follows status order.
- Mark paid updates invoice status.

### Supplier

- New Pickup Request writes to DB.
- Pickups list refreshes from DB.
- Materials list comes from active contracts.
- Send Message creates notification/activity for operations.

### Driver

- Start works only for scheduled pickup.
- Record Weight works only in progress.
- Upload Proof writes pickup photo record.
- Complete requires photo + weight + note.
- Problem Report writes issue to DB.

### Hub Manager

- Receive creates inbound record.
- Quality Check calculates contamination from rejected/tier1.
- Bale creates bale cube and updates inventory.

### Factory

- Request material writes material request.
- Confirm Receipt opens 48h rejection window.
- Open Dispute writes rejection reason.

