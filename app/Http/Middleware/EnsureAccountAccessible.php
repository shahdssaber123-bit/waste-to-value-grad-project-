<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountAccessible
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // 1. Check verified
        if (! $user->email_verified_at) {
            return response()->json(['message' => 'Your email address is not verified.'], 403);
        }

        // 2. Check soft deleted (handled by Laravel, but explicit check for clarity)
        if ($user->trashed()) {
            return response()->json(['message' => 'This account no longer exists.'], 403);
        }

        // 3. Check employment status
        if ($user->role === 'employee') {
            $employee = $user->employee;
            if ($employee && $employee->employment_status === 'terminated') {
                return response()->json(['message' => 'Your account has been deactivated. Please contact support.'], 403);
            }
        }

        return $next($request);
    }
}
