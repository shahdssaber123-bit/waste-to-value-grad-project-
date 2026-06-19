<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\VerifyMfaRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @group Authentication
 */
class AuthController extends Controller
{
    /**
     * Authenticate User.
     *
     * Returns Bearer token for Suppliers, Factories, and Employees.
     * Note: MFA for Super Admins is currently deferred (see docs/backlog/mfa_implementation.md).
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user) {
            $pendingApplication = \App\Models\Application::where('email', $request->email)
                ->latest()
                ->first();

            if ($pendingApplication) {
                $status = strtolower($pendingApplication->status);

                if (in_array($status, ['pending', 'submitted', 'under_review'])) {
                    return response()->json([
                        'message' => 'Your registration request is still pending admin approval.',
                    ], 403);
                }

                if ($status === 'rejected') {
                    return response()->json([
                        'message' => 'Your registration request was rejected. Please contact support.',
                    ], 403);
                }

                if ($status === 'converted') {
                    return response()->json([
                        'message' => 'Your account was approved. Please use your approved account credentials.',
                    ], 403);
                }
            }

            return response()->json([
                'message' => 'Account not found.',
            ], 401);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Incorrect password.',
            ], 401);
        }

        if (! $user->email_verified_at) {
            return response()->json(['message' => 'Your email address is not verified.'], 403);
        }

        if ($user->role === 'employee') {
            $employee = $user->employee;
            if ($employee && $employee->employment_status === 'terminated') {
                return response()->json(['message' => 'Your account has been deactivated. Please contact support.'], 403);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | MFA Logic (Deferred)
        |--------------------------------------------------------------------------
        | if ($user->role === 'super_admin') {
        |     $otp = '123456';
        |     $mfaToken = Str::random(40);
        |     Cache::put("mfa:{$mfaToken}", ['user_id' => $user->id, 'otp' => $otp], now()->addMinutes(5));
        |     return response()->json(['mfa_required' => true, 'mfa_token' => $mfaToken, 'message' => '...']);
        | }
        */

        return $this->issueToken($user);
    }

    /**
     * Verify MFA OTP.
     *
     * Second step of authentication for Super Admins.
     * Currently inactive as MFA trigger is commented out in login().
     */
    public function verifyMfa(VerifyMfaRequest $request): JsonResponse
    {
        $payload = Cache::get("mfa:{$request->mfa_token}");

        if (! $payload || $payload['otp'] !== $request->code) {
            return response()->json(['message' => 'Verification code is invalid or has expired.'], 401);
        }

        Cache::forget("mfa:{$request->mfa_token}");

        $user = User::findOrFail($payload['user_id']);

        return $this->issueToken($user);
    }

    /**
     * Revoke Authentication.
     *
     * Logs out the user by deleting the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Get Current User.
     *
     * Retrieves the authenticated user's profile and role-specific data.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['superAdmin', 'supplier', 'factoryProfile', 'employee']);

        return response()->json([
            'message' => 'Success',
            'data' => [
                'id' => $user->id,
                'fname' => $user->fname,
                'lname' => $user->lname,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'profile' => $user->profile,
            ],
        ]);
    }

    protected function issueToken(User $user): JsonResponse
    {
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load(['superAdmin', 'supplier', 'factoryProfile', 'employee']);

        return response()->json([
            'message' => 'Login successful.',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'fname' => $user->fname,
                    'lname' => $user->lname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'phone' => $user->phone,
                    'profile' => $user->profile,
                ],
            ],
        ]);
    }
}
