<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Please sign in first to continue.'], 401);
        }

        $employeeRole = $user->employee?->role;
        $allowed = collect($roles)->contains(function ($role) use ($user, $employeeRole) {
            return $user->role === $role || $employeeRole === $role;
        });

        if (! $allowed) {
            return response()->json([
                'message' => 'Access denied. Your account cannot perform this action.',
                'required_roles' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
