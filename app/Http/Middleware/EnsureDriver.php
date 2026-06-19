<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDriver
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (
            ! $user ||
            $user->role !== 'employee' ||
            $user->employee?->role !== 'driver' ||
            $user->employee?->employment_status !== 'active'
        ) {
            return response()->json(
                ['message' => 'Forbidden. Driver access required.'],
                403
            );
        }

        return $next($request);
    }
}
