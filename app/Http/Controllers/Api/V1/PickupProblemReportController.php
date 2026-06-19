<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Pickup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PickupProblemReportController extends Controller
{
    public function store(Request $request, string $id): JsonResponse
    {
        $pickup = Pickup::findOrFail($id);
        $driverId = $request->user()->id;

        if ((int) $pickup->driver_employee_id !== (int) $driverId) {
            return response()->json(['message' => 'You can only report problems for pickups assigned to you.'], 403);
        }

        $validated = $request->validate([
            'problem_type' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $reportId = DB::table('pickup_problem_reports')->insertGetId([
            'pickup_id' => $pickup->id,
            'driver_employee_id' => $driverId,
            'problem_type' => $validated['problem_type'],
            'description' => $validated['description'] ?? null,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Pickup problem report submitted.', 'data' => ['id' => $reportId]], 201);
    }
}
