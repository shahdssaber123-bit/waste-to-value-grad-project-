# Waste To Value — System Complete v2 Notes

This package is a deeper rebuild focused on matching the official sequence/use-case flow end-to-end instead of only patching visible screens.

## What changed

### Frontend
- Added route-level protection using `ProtectedRoute` in `src/App.jsx`.
- Removed old automatic demo-login fallback behavior from `AuthContext`; portal pages now require real backend auth.
- Added a visible **System Complete v2** section to the home page so the change is obvious immediately.
- Added driver proof-photo upload UI on `Driver.jsx`.
- Driver mission completion now expects the real sequence: start → record weight → upload proof → complete with proof note.
- Admin dispatch truck dropdown now lists only `available` trucks to match backend validation.
- Admin material-request action changed from misleading “Deliver and invoice” to sequence-based ship/confirm actions.
- Added Vite config with alias + manual chunks to reduce the previous single huge bundle warning.

### Backend/API
- Added FormData support for frontend API requests.
- Added driver `uploadPhoto` service call.
- Driver completion validation now requires a proof note.
- Driver completion controller now requires at least one uploaded photo and a recorded weight.
- Added pickup proof/lifecycle fields: proof note, supplier arrival, hub arrival, completed time.
- Supplier pickup routing now selects hubs by free capacity instead of highest inventory.
- Hub quality check calculates contamination ratio automatically from tier 1/tier 2 weights when not supplied.
- Hub QA rejects impossible weights where tier 2 exceeds tier 1.
- Added QA notes, sorter count, decontamination notes, bale code, and bale QA notes fields.
- Baling now supports a reject path that does not update inventory.
- Added material request ship/admin-confirm API endpoints to align outbound flow.
- Material request delivery now applies 110% premium in forced-delivery invoice path.
- Application approval now generates a random one-time temporary password instead of hard-coded `password`.
- Gemini key was removed from `.env`; `.env.example` APP_KEY was cleared.
- AI no longer silently pretends Gemini works when it is not configured or fails.

### Database/Seeders
- `database/database.sqlite` is no longer empty; it includes a ready demo flow:
  - super admin/admin users
  - supplier
  - factory
  - driver
  - hub manager
  - sorter
  - hub
  - commodities/prices
  - hub inventory
  - truck
  - supplier/factory contracts
  - pickup with proof photo
  - inbound QA and bale cube
  - material request
  - outbound delivery
  - factory invoice
  - notifications
  - pending application
- Main login demo accounts:
  - `admin@platform.com` / `changeme123`
  - `admin@demo.com` / `password`
  - `supplier@demo.com` / `password`
  - `industry@demo.com` / `password`
  - `driver@demo.com` / `password`
  - `hub@demo.com` / `password`

## Important limitations honestly noted
- This package includes a much stronger implementation and a seeded SQLite DB, but a real 100% enterprise system would still require running the app in the target environment and executing browser-level QA for every button.
- In this sandbox, PHP lacks `pdo_sqlite` and `php-xml`, so Laravel migrations/tests cannot be executed here. Frontend build, ESLint, and PHP syntax checks were executed.

## Verified in this environment
- `npm run build` passes.
- `npm run lint` passes.
- PHP syntax lint passes for `app`, `database`, and `routes` PHP files.
