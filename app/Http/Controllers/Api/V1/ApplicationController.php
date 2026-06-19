<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreApplicationRequest;
use App\Mail\AdminNewApplicationMail;
use App\Mail\ApplicationVerificationMail;
use App\Models\Application;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ApplicationController extends Controller
{
    public function index(): JsonResponse
    {
        $applications = Application::orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $applications,
        ], 200);
    }

    public function store(StoreApplicationRequest $request): JsonResponse
    {
        $existing = Application::where('idempotency_token', $request->idempotency_token)->first();

        if ($existing) {
            return response()->json([
                'message' => 'Your application has already been submitted. Please check your email to verify it.',
            ], 200);
        }

        $validated = $request->validated();

        

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $application = Application::create(array_merge($validated, [
            'status' => 'pending',
            'email_verification_token' => Str::random(64),
            'email_verified_at' => null,
        ]));

        $verificationUrl = config('app.frontend_url')
            . '/verify-email?token='
            . $application->email_verification_token;

        Mail::to($application->email)
            ->queue(new ApplicationVerificationMail(
                contactName: $application->contact_name,
                verificationUrl: $verificationUrl,
            ));

        return response()->json([
            'message' => 'Your application has been submitted. Please check your email to verify your address.',
            'data' => [
                'id' => $application->id,
                'status' => $application->status,
            ],
        ], 201);
    }

    public function verifyEmail(string $token): JsonResponse
    {
        $application = Application::where('email_verification_token', $token)->first();

        if (! $application) {
            return response()->json(['message' => 'Verification link is invalid or has expired.'], 404);
        }

        if ($application->email_verified_at) {
            return response()->json(['message' => 'Email already verified. Your application is under review.'], 200);
        }

        $application->update(['email_verified_at' => now()]);

        $admins = User::where('role', 'super_admin')
            ->whereNotNull('email_verified_at')
            ->whereNull('deleted_at')
            ->get();

        foreach ($admins as $admin) {
            Mail::to($admin->email)
                ->queue(new AdminNewApplicationMail($application));
        }

        return response()->json([
            'message' => 'Email verified successfully. Your application is now under review.',
        ], 200);
    }
}
