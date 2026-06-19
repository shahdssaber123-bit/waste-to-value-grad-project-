# Final linkage re-check patch

This patch removes the role quick-access cards from the sign-in page so every login must pass through the real backend authentication endpoint.

Verified/updated areas:
- SignIn no longer performs shortcut login.
- Auth service now uses `VITE_API_URL` and protects legacy `/login` calls by mapping them to `/api/v1/auth/login`.
- Local material SVGs were redesigned so marketplace/industry cards no longer show cropped oversized text.
- Dark-mode surfaces, cards, borders, and primary actions received a stronger premium visual polish.

Runtime checklist after extracting:
1. `composer install`
2. `php artisan optimize:clear`
3. `php artisan migrate:fresh --seed`
4. `php artisan storage:link`
5. `php artisan serve`
6. restart Vite after changing `.env`: `npm run dev`
