# Waste to Value — Full Linked System Audit

This build focuses on fixing the previously identified gaps between UI features and real backend workflows.

## Backend workflow fixes
- Application approval now converts an application into a real user profile, active contract, notification and activity log.
- Factory material requests now support the full flow: request, match, schedule delivery, deliver, generate invoice and reject.
- Outbound deliveries can now be generated from a material request.
- Invoices can now be generated automatically after delivery completion.
- Stock reservation is released or deducted when requests are rejected or delivered.
- Inventory movement records are created for outbound delivery deductions.
- Admin dispatch can assign driver and truck to a pickup.
- Material request notes and company details are stored and shown.
- Deep profile popup prints the selected live record.
- Navbar notifications read from the backend notifications API.

## Frontend workflow fixes
- Admin material requests now show notes, company details and workflow buttons.
- Admin applications now use a real approval flow.
- Admin pickups now include driver/truck dispatch controls.
- Admin material price is now a real form instead of random quick pricing.
- Delete/deactivate uses a confirmation message.
- Factory material cards use real product-style images by material type.
- Factory requests refresh after submission and reserved stock is reflected.
- Profiles are deeper and printable.

## Verification performed
- React production build: passed.
- Laravel route list: passed, 91 API routes shown.
- PHP syntax checks for modified controllers: passed.

## Required local run
Run on your Windows/XAMPP environment:

```bat
C:\php84\php.exe artisan optimize:clear
C:\php84\php.exe artisan migrate:fresh --seed
C:\php84\php.exe artisan serve
```

Then:

```bat
npm run dev
```

