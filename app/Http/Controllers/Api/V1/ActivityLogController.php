<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ActivityLogController extends Controller
{
    public function index(): JsonResponse
    {
        $logs = DB::table('activity_logs')
            ->leftJoin('users', 'users.id', '=', 'activity_logs.user_id')
            ->select('activity_logs.*', DB::raw("CONCAT(users.fname, ' ', users.lname) as actor_name"))
            ->latest('activity_logs.created_at')
            ->limit(50)
            ->get();

        return response()->json(['message' => 'Activity logs retrieved.', 'data' => $logs]);
    }
}
