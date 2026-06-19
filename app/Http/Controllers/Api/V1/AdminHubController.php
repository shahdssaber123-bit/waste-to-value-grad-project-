<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreHubRequest;
use App\Http\Requests\Api\V1\UpdateHubRequest;
use App\Models\Employee;
use App\Models\Hub;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group('Hubs', weight: 10)]
class AdminHubController extends Controller
{
    /**
     * List Hubs.
     *
     * Paginated list of physical processing hubs.
     *
     * @queryParam with_deleted boolean Include soft-deleted hubs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Hub::query()->with(['manager.user']);

        if ($request->boolean('with_deleted')) {
            $query->withTrashed();
        }

        $hubs = $query->paginate(15);

        return response()->json([
            'message' => 'Hubs retrieved successfully.',
            'data' => $hubs,
        ]);
    }

    /**
     * Create Hub.
     *
     * Register a new physical processing hub.
     */
    public function store(StoreHubRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! empty($validated['manager_employee_id'])) {
            $employee = Employee::find($validated['manager_employee_id']);
            if (! $employee || ! $employee->isHubManager()) {
                return response()->json([
                    'message' => 'The selected employee is either invalid or not a hub manager.',
                ], 422);
            }
        }

        $hub = Hub::create($validated);
        $hub->load(['manager.user']);

        return response()->json([
            'message' => 'Hub created successfully.',
            'data' => $hub,
        ], 201);
    }

    /**
     * View Hub.
     *
     * Detailed information about a specific hub, including its manager and assigned trucks.
     */
    public function show(string $id): JsonResponse
    {
        $hub = Hub::with(['manager.user', 'trucks', 'hubCommodities.commodity'])->findOrFail($id);

        return response()->json([
            'message' => 'Hub retrieved successfully.',
            'data' => $hub,
        ]);
    }

    /**
     * Update Hub.
     *
     * Update details of an existing hub.
     */
    public function update(UpdateHubRequest $request, string $id): JsonResponse
    {
        $hub = Hub::findOrFail($id);
        $validated = $request->validated();

        if (isset($validated['manager_employee_id']) && $validated['manager_employee_id'] !== $hub->manager_employee_id) {
            $employee = Employee::find($validated['manager_employee_id']);
            if (! $employee || ! $employee->isHubManager()) {
                return response()->json([
                    'message' => 'The selected employee is either invalid or not a hub manager.',
                ], 422);
            }
        }

        $hub->update(array_filter($validated, fn ($value) => $value !== null));

        return response()->json([
            'message' => 'Hub updated successfully.',
            'data' => $hub->load(['manager.user']),
        ]);
    }

    /**
     * Delete Hub.
     *
     * Soft-delete a hub. Cannot delete if it has active trucks assigned.
     */
    public function destroy(string $id): JsonResponse
    {
        $hub = Hub::findOrFail($id);

        $activeTrucksCount = $hub->trucks()->where('status', '!=', 'maintenance')->count();

        if ($activeTrucksCount > 0) {
            return response()->json([
                'message' => 'Cannot delete a hub that has active trucks assigned to it.',
            ], 422);
        }

        $hub->delete();

        return response()->json([
            'message' => 'Hub deleted successfully.',
        ]);
    }
}
