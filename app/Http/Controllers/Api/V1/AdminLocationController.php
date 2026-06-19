<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\FactoryLocation;
use App\Models\Pickup;
use App\Models\SupplierLocation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminLocationController extends Controller
{
    private function modelFor(string $type): string
    {
        return $type === 'supplier' ? SupplierLocation::class : FactoryLocation::class;
    }

    private function roleFor(string $type): string
    {
        return $type === 'factory' ? 'factory' : 'supplier';
    }

    private function assertParent(string $type, int $userId): User
    {
        return User::query()->where('id', $userId)->where('role', $this->roleFor($type))->firstOrFail();
    }

    public function index(string $type, int $userId): JsonResponse
    {
        $this->assertParent($type, $userId);
        $model = $this->modelFor($type);
        return response()->json([
            'message' => 'Locations retrieved successfully.',
            'data' => $model::query()->where('user_id', $userId)->latest('id')->get(),
        ]);
    }

    public function store(Request $request, string $type, int $userId): JsonResponse
    {
        $this->assertParent($type, $userId);
        $validated = $request->validate([
            'location_name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
        ]);
        $model = $this->modelFor($type);
        $location = $model::create([...$validated, 'user_id' => $userId]);
        return response()->json(['message' => 'Location added successfully.', 'data' => $location], 201);
    }

    public function update(Request $request, string $type, int $userId, int $id): JsonResponse
    {
        $this->assertParent($type, $userId);
        $validated = $request->validate([
            'location_name' => ['sometimes', 'required', 'string', 'max:255'],
            'address' => ['sometimes', 'required', 'string', 'max:255'],
        ]);
        $model = $this->modelFor($type);
        $location = $model::query()->where('user_id', $userId)->findOrFail($id);
        $location->update($validated);
        return response()->json(['message' => 'Location updated successfully.', 'data' => $location->fresh()]);
    }

    public function destroy(string $type, int $userId, int $id): JsonResponse
    {
        $this->assertParent($type, $userId);
        $model = $this->modelFor($type);
        $location = $model::query()->where('user_id', $userId)->findOrFail($id);
        if ($model::query()->where('user_id', $userId)->count() <= 1) {
            return response()->json(['message' => "Cannot delete the last location. A {$type} must have at least one location."], 422);
        }
        if ($type === 'supplier') {
            $hasActivePickup = Pickup::query()
                ->where('supplier_location_id', $location->id)
                ->whereNotIn('status', ['completed', 'cancelled', 'processing'])
                ->exists();
            if ($hasActivePickup) {
                return response()->json(['message' => 'Cannot delete this location. It is referenced by one or more active pickups.'], 422);
            }
        }
        $location->delete();
        return response()->json(['message' => 'Location deleted successfully.']);
    }
}
