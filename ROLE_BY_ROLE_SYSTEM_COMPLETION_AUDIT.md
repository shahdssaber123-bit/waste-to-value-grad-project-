# Waste to Value — Actor-by-Actor System Completion Audit

Final acceptance rule for every feature:

`Button/UI action -> React handler -> platformV1 service -> Laravel route -> controller -> validation/request -> database change -> notification/timeline -> refreshed UI`

## Removed actor

- `Platform Admin` is removed from the final use-case model and quick-access UI.
- Final actor set: Supplier, Driver, Hub Manager, Factory, Super Admin/Admin.

## Supplier must be able to

1. Sign in and see supplier-owned data only.
2. View contracted materials from DB.
3. Create pickup requests from real DB contracts/materials.
4. Have requests appear for Admin/Operations.
5. Track request status after dispatch, driver progress, hub receiving, QA, and invoice.
6. Send operation messages stored in DB/notifications.
7. See no more than 5 rows per list with Next/Previous.

## Super Admin/Admin must be able to

1. Create users, materials, hubs, trucks, pickups, and requests from live DB forms.
2. Approve/reject applications.
3. Activate/terminate contracts.
4. Dispatch only available trucks/drivers.
5. Inspect every row with Profile/details.
6. Move outbound flow through match -> schedule -> ship -> confirm/reject -> invoice.
7. Mark invoices paid.
8. See no more than 5 rows per list with Next/Previous.

## Driver must be able to

1. See assigned live missions.
2. Start pickup.
3. Record estimated weight.
4. Upload proof photo.
5. Complete only with proof, weight, and note.
6. Report a problem.
7. Completed missions appear for hub receiving.
8. See no more than 5 rows per list with Next/Previous.

## Hub Manager must be able to

1. See completed driver pickups waiting for receiving.
2. Create inbound receiving records.
3. Run QA/quality step.
4. Calculate contamination from actual tier weights.
5. Bale accepted material and update inventory.
6. Trigger invoice/notifications where applicable.
7. See no more than 5 rows per list with Next/Previous.

## Factory must be able to

1. Browse marketplace materials from DB.
2. Request material from stock.
3. Track request and outbound statuses.
4. Confirm/reject deliveries.
5. Respect rejection window and invoice logic.
6. See no more than 5 rows per list with Next/Previous.

## Operations must be able to

1. Monitor live pickups, material requests, outbound deliveries, invoices, messages, and notifications.
2. Inspect item profiles/details.
3. See no more than 5 rows per list with Next/Previous.

## Run / seed commands

```bash
npm install
npm run lint
npm run build
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan schedule:work
php artisan queue:work
php artisan serve
```

Important: Laravel vendor dependencies must be regenerated with `composer install` on your machine before Artisan can run if the transferred vendor folder is incomplete.
