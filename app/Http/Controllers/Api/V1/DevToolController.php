<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\AccountActivatedMail;
use App\Mail\ApplicationVerificationMail;
use App\Models\Application;
use App\Models\User;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Development Tools')]
class DevToolController extends Controller
{
    /**
     * Get Application Token.
     *
     * Retrieve the email verification token for a pending application.
     * Only available in local environment.
     */
    public function getApplicationToken(string $email): JsonResponse
    {
        $application = Application::where('email', $email)
            ->whereNull('email_verified_at')
            ->latest()
            ->firstOrFail();

        return response()->json([
            'email' => $application->email,
            'email_verification_token' => $application->email_verification_token,
            'verify_url' => url("/api/v1/applications/verify-email/{$application->email_verification_token}"),
        ]);
    }

    /**
     * Preview Verification Email.
     *
     * Render the Application Verification email template.
     */
    public function previewVerificationMail(): ApplicationVerificationMail
    {
        return new ApplicationVerificationMail(
            contactName: 'Ahmed Khaled',
            verificationUrl: 'http://localhost:3000/verify-email?token=test-token-here',
        );
    }

    /**
     * Preview Account Activation Email.
     *
     * Render the Account Activated email template.
     */
    public function previewAccountActivatedMail(): AccountActivatedMail
    {
        $user = User::where('role', '!=', 'super_admin')->first();
        if (! $user) {
            $user = User::factory()->make(['role' => 'supplier', 'fname' => 'Test']);
        }

        return new AccountActivatedMail($user, 'TestPassword123');
    }
}
