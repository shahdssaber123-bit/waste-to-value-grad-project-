<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateApplicationStatusRequest;
use App\Models\Application;
use App\Models\Commodity;
use App\Models\Contract;
use App\Models\Factory;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = Application::query()
            ->latest()
            ->paginate((int) $request->input('per_page', 10));

        return response()->json([
            'data' => $applications,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $application = Application::findOrFail($id);

        return response()->json([
            'data' => $application,
        ]);
    }

    public function updateStatus(
        UpdateApplicationStatusRequest $request,
        string $id
    ): JsonResponse {
        $application = Application::findOrFail($id);

        $data = $request->validated();
        $status = $data['status'] ?? null;

        if ($status === 'converted') {
            $result = DB::transaction(function () use ($request, $application) {
                $commodity = Commodity::firstOrCreate([
                    'title' => $application->required_commodity ?: 'Mixed Recyclables',
                ]);

                $user = User::withTrashed()
                    ->where('email', $application->email)
                    ->first();

                if (! $user) {
                    $parts = preg_split('/\s+/', trim(
                        $application->contact_name ?: $application->company_name
                    ));

                    $user = User::create([
                        'fname' => $parts[0] ?? 'New',
                        'lname' => implode(' ', array_slice($parts, 1)) ?: 'Partner',
                        'email' => $application->email,
                        'phone' => $application->phone,
                        'password' => $application->password,
                        'role' => $application->role,
                        'email_verified_at' => now(),
                    ]);
                } else {
                    if (method_exists($user, 'restore') && $user->trashed()) {
                        $user->restore();
                    }

                    $user->update([
                        'fname' => $user->fname ?: ($application->contact_name ?: $application->company_name),
                        'email_verified_at' => $user->email_verified_at ?: now(),
                    ]);
                }

                if ($application->role === 'supplier') {
                    Supplier::firstOrCreate(
                        ['user_id' => $user->id],
                        ['company_name' => $application->company_name]
                    );
                } elseif ($application->role === 'factory') {
                    Factory::firstOrCreate(
                        ['user_id' => $user->id],
                        [
                            'tax_id' => $application->tax_id ?: 'TAX-' . strtoupper(Str::random(8)),
                            'company_name' => $application->company_name,
                            'required_commodity' => $application->required_commodity,
                        ]
                    );
                } else {
                    throw new \UnexpectedValueException(
                        "Unknown application role: {$application->role}"
                    );
                }

                $contract = Contract::firstOrCreate(
                    [
                        'party_id' => $user->id,
                        'party_type' => $application->role,
                        'commodity_id' => $commodity->id,
                    ],
                    [
                        'status' => 'active',
                        'payment_terms' => 'Bank transfer within 14 days',
                        'material_type' => $commodity->title,
                        'shipment_threshold_kg' => 1000,
                        'signed_date' => now()->toDateString(),
                    ]
                );

                $application->update([
                    'status' => 'converted',
                    'converted_user_id' => $user->id,
                ]);

                if (Schema::hasTable('activity_logs')) {
                    DB::table('activity_logs')->insert([
                        'user_id' => $request->user()?->id,
                        'action' => 'converted_application_to_user_contract',
                        'entity_type' => 'Application',
                        'entity_id' => $application->id,
                        'meta' => json_encode([
                            'user_id' => $user->id,
                            'contract_id' => $contract->id,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                if (Schema::hasTable('notifications')) {
                    DB::table('notifications')->insert([
                        'id' => (string) Str::uuid(),
                        'type' => 'application.converted',
                        'notifiable_type' => User::class,
                        'notifiable_id' => $user->id,
                        'data' => json_encode([
                            'title' => 'Account activated',
                            'message' => 'Your Waste to Value account and contract are ready.',
                            'url' => $application->role === 'supplier' ? '/supplier' : '/factory',
                        ]),
                        'read_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                return [
                    'user' => $user->fresh(),
                    'contract' => $contract->fresh(),
                ];
            });

            return response()->json([
                'message' => 'Application approved. User account, profile, contract and notification were created.',
                'data' => $application->fresh('convertedUser'),
                'created' => $result,
            ]);
        }

        $application->update($data);

        return response()->json([
            'message' => 'Application status updated successfully.',
            'data' => $application->fresh(),
        ]);
    }
}
