<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTruckRequest;
use App\Http\Requests\Api\V1\UpdateTruckRequest;
use App\Http\Requests\Api\V1\UpdateTruckStatusRequest;
use App\Models\Truck;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

#[Group('Trucks', weight: 12)]
class AdminTruckController extends Controller
{
    /**
     * List Trucks.
     *
     * Paginated list of fleet vehicles.
     *
     * @queryParam hub_id integer Filter by hub.
     * @queryParam status string Filter by status (available, in_use, maintenance).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Truck::query()->with('hub');

        if ($request->filled('hub_id')) {
            $query->where('hub_id', $request->hub_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $trucks = $query->paginate(15);

        return response()->json([
            'message' => 'Trucks retrieved successfully.',
            'data' => $trucks,
        ]);
    }

    /**
     * Create Truck.
     *
     * Register a new vehicle to the fleet and assign it to a hub.
     */
    public function store(StoreTruckRequest $request): JsonResponse
    {
        $truck = Truck::create($request->validated() + ['status' => 'available']);
        $truck->load('hub');

        return response()->json([
            'message' => 'Truck created successfully.',
            'data' => $truck,
        ], 201);
    }

    /**
     * View Truck.
     *
     * Detailed information about a specific truck.
     */
    public function show(string $id): JsonResponse
    {
        $truck = Truck::with('hub')->findOrFail($id);

        return response()->json([
            'message' => 'Truck retrieved successfully.',
            'data' => $truck,
        ]);
    }

    /**
     * Update Truck.
     *
     * Update vehicle specifications or hub assignment.
     */
    public function update(UpdateTruckRequest $request, string $id): JsonResponse
    {
        $truck = Truck::findOrFail($id);
        $validated = $request->validated();

        $truck->update(array_filter($validated, fn ($value) => $value !== null));

        return response()->json([
            'message' => 'Truck updated successfully.',
            'data' => $truck->load('hub'),
        ]);
    }

    /**
     * Update Truck Status.
     *
     * Manually change truck status to 'available' or 'maintenance'.
     * The 'in_use' status is managed automatically by the system.
     */
    public function updateStatus(UpdateTruckStatusRequest $request, string $id): JsonResponse
    {
        $truck = Truck::findOrFail($id);
        $validated = $request->validated();

        if ($validated['status'] === 'maintenance' && $truck->status === 'in_use') {
            return response()->json([
                'message' => 'Cannot set a truck to maintenance while it is currently in use.',
            ], 422);
        }

        $truck->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Truck status updated successfully.',
            'data' => $truck,
        ]);
    }
}
