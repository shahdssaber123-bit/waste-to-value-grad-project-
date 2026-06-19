<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListUsersRequest;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserStatusRequest;
use App\Mail\AccountActivatedMail;
use App\Models\Application;
use App\Models\Contract;
use App\Models\Commodity;
use App\Models\Employee;
use App\Models\Factory;
use App\Models\FactoryLocation;
use App\Models\Supplier;
use App\Models\SupplierLocation;
use App\Models\User;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

#[Group('User Management', weight: 5)]
class AdminUserController extends Controller
{
    /**
     * List Users.
     *
     * Paginated list of system users.
     */
    public function index(ListUsersRequest $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('employee_role')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('role', $request->employee_role);
            });
        }

        if ($request->has('employment_status')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('employment_status', $request->employment_status);
            });
        }

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        $users = $query->with(['superAdmin', 'supplier.locations', 'factoryProfile.locations', 'employee'])->paginate(15);

        return response()->json([
            'message' => 'Success',
            'data' => $users,
        ]);
    }

    /**
     * Create User Account.
     *
     * Create a new user and their profile. Automatically marks email as verified.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        if ($request->role === 'super_admin') {
            return response()->json(['message' => 'Super Admin accounts cannot be created via API.'], 403);
        }

        try {
            return DB::transaction(function () use ($request) {
                $user = User::create([
                    'fname' => $request->fname,
                    'lname' => $request->lname,
                    'email' => $request->email,
                    'password' => Hash::make($request->password),
                    'phone' => $request->phone,
                    'ssn' => $request->ssn,
                    'role' => $request->role,
                    'email_verified_at' => now(),
                ]);

                $profile = null;

                switch ($request->role) {
                    case 'employee':
                        $profile = Employee::create([
                            'user_id' => $user->id,
                            'role' => $request->employee_role,
                            'driver_license_number' => $request->driver_license_number,
                            'hire_date' => $request->hire_date,
                            'shift' => $request->shift,
                            'employment_status' => 'active',
                        ]);
                        break;
                    case 'factory':
                        $profile = Factory::create([
                            'user_id' => $user->id,
                            'tax_id' => $request->tax_id,
                            'company_name' => $request->company_name,
                            'required_commodity' => $request->required_commodity,
                        ]);
                        break;
                    case 'supplier':
                        $profile = Supplier::create([
                            'user_id' => $user->id,
                            'company_name' => $request->company_name,
                        ]);
                        break;
                }


                if (in_array($request->role, ['factory', 'supplier'], true)) {
                    $locationModel = $request->role === 'supplier' ? SupplierLocation::class : FactoryLocation::class;
                    foreach ($request->input('locations', []) as $location) {
                        $locationModel::create([
                            'user_id' => $user->id,
                            'location_name' => $location['location_name'],
                            'address' => $location['address'],
                        ]);
                    }
                    $profile = $profile?->fresh('locations');
                }

                $contract = null;
                if (in_array($request->role, ['factory', 'supplier'])) {
                    $commodityId = $request->commodity_id ?: Commodity::query()->value('id');
                    if ($commodityId) {
                        $contract = Contract::create([
                            'party_id' => $user->id,
                            'party_type' => $request->role,
                            'commodity_id' => $commodityId,
                            'status' => 'draft',
                        ]);
                    }
                }

                if ($request->application_id) {
                    Application::where('id', $request->application_id)->update([
                        'status' => 'converted',
                        'converted_user_id' => $user->id,
                    ]);
                }

                try {
                    Mail::to($user->email)->queue(new AccountActivatedMail(
                        user: $user,
                        plainPassword: $request->validated('password'),
                    ));
                } catch (\Throwable $mailError) {
                    report($mailError);
                }

                return response()->json([
                    'message' => 'User created successfully.',
                    'data' => [
                        'user' => $user,
                        'profile' => $profile,
                        'contract' => $contract,
                    ],
                ], 201);
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['message' => 'User could not be created. Please check the required information and try again.'], 422);
        }
    }

    /**
     * View User.
     *
     * Comprehensive user data with all profile subtypes loaded.
     */
    public function show(string $id): JsonResponse
    {
        $user = User::with(['superAdmin', 'supplier.locations', 'factoryProfile.locations', 'employee'])->findOrFail($id);

        return response()->json([
            'message' => 'Success',
            'data' => $user,
        ]);
    }


    /**
     * Update User Account.
     *
     * Lightweight admin edit for visible table changes: name, phone, email and profile company/employee role fields.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::with(['supplier', 'factoryProfile', 'employee'])->findOrFail($id);

        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Super Admin accounts cannot be edited here.'], 403);
        }

        $validated = $request->validate([
            'fname' => ['sometimes', 'required', 'string', 'max:100'],
            'lname' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => ['sometimes', 'required', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'employee_role' => ['nullable', 'string', 'in:driver,hub_manager,sorter'],
            'employment_status' => ['nullable', 'string', 'in:active,suspended,terminated'],
        ]);

        DB::transaction(function () use ($user, $validated) {
            $user->fill(array_intersect_key($validated, array_flip(['fname', 'lname', 'email', 'phone'])))->save();

            if ($user->role === 'supplier' && $user->supplier && array_key_exists('company_name', $validated)) {
                $user->supplier->update(['company_name' => $validated['company_name']]);
            }

            if ($user->role === 'factory' && $user->factoryProfile && array_key_exists('company_name', $validated)) {
                $user->factoryProfile->update(['company_name' => $validated['company_name']]);
            }

            if ($user->role === 'employee' && $user->employee) {
                $patch = array_intersect_key($validated, array_flip(['employee_role', 'employment_status']));
                if (isset($patch['employee_role'])) {
                    $patch['role'] = $patch['employee_role'];
                    unset($patch['employee_role']);
                }
                if ($patch) $user->employee->update($patch);
            }
        });

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => $user->fresh(['supplier', 'factoryProfile', 'employee']),
        ]);
    }

    /**
     * Toggle User Status.
     *
     * Update employment status for Employee accounts only.
     */
    public function updateStatus(UpdateUserStatusRequest $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->role !== 'employee') {
            return response()->json(['message' => 'Employment status can only be updated for employees.'], 422);
        }

        $employee = $user->employee;

        if ($request->employment_status === 'terminated') {
            $user->tokens()->delete();
        }

        $employee->update(['employment_status' => $request->employment_status]);

        return response()->json([
            'message' => 'User status updated successfully.',
            'data' => [
                'user' => $user,
                'profile' => $employee,
            ],
        ]);
    }

    /**
     * Soft Delete User.
     *
     * Revokes all tokens and soft-deletes the user account.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->isSuperAdmin()) {
            return response()->json(['message' => 'Super Admin accounts cannot be deleted.'], 403);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }
}
