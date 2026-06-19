# Waste-to-Value integrated build

## Run
1. `composer install`
2. `npm install`
3. `npm run dev`

The dev script starts:
- Laravel backend on `http://127.0.0.1:8000`
- Vite frontend on `http://localhost:5173`

## Demo accounts
All demo accounts use password: `password`

- `admin@demo.com`
- `supplier@demo.com`
- `industry@demo.com`
- `driver@demo.com`
- `hub@demo.com`

## What is truly backend-connected
- Login
- Register
- Current user (`/api/auth/me`)
- Logout
- Role-based route access

## Notes
- The backend now supports demo auth even if your local PHP is missing SQLite support.
- If database access works, registration can still use the database path.
- If database access is unavailable, backend auth falls back to file-backed demo auth inside Laravel itself.
