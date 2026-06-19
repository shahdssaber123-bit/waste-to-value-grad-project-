<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminMessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'open');
        $perPage = min(max((int) $request->integer('per_page', 10), 1), 50);

        if (Schema::hasTable('supplier_messages')) {
            $query = DB::table('supplier_messages')
                ->leftJoin('users', 'users.id', '=', 'supplier_messages.user_id')
                ->select(
                    'supplier_messages.*',
                    DB::raw("CONCAT(COALESCE(users.fname, ''), ' ', COALESCE(users.lname, '')) as sender_name"),
                    'users.email as sender_email',
                    'users.role as sender_role'
                )
                ->latest('supplier_messages.id');

            if ($status === 'open') {
                $query->whereNull('supplier_messages.replied_at');
            } elseif ($status === 'replied') {
                $query->whereNotNull('supplier_messages.replied_at');
            }

            return response()->json([
                'message' => 'Admin messages retrieved.',
                'data' => $query->paginate($perPage),
            ]);
        }

        return response()->json([
            'message' => 'Admin messages retrieved.',
            'data' => [
                'data' => [],
                'total' => 0,
            ],
        ]);
    }

    public function reply(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reply' => ['required', 'string', 'max:2000'],
        ]);

        if (!Schema::hasTable('supplier_messages')) {
            return response()->json([
                'message' => 'Supplier messages table is missing.',
            ], 500);
        }

        $message = DB::table('supplier_messages')->where('id', $id)->first();

        if (!$message) {
            return response()->json([
                'message' => 'Supplier message not found.',
            ], 404);
        }

        DB::table('supplier_messages')
            ->where('id', $id)
            ->update([
                'admin_reply' => $validated['reply'],
                'replied_by' => $request->user()->id,
                'replied_at' => now(),
                'status' => 'replied',
                'updated_at' => now(),
            ]);

        if (!empty($message->user_id)) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'admin.message.replied',
                'notifiable_type' => User::class,
                'notifiable_id' => $message->user_id,
                'data' => json_encode([
                    'title' => 'Admin replied to your question',
                    'message' => $validated['reply'],
                    'message_id' => $id,
                    'url' => '/supplier',
                ]),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Reply sent and supplier notified.',
            'data' => DB::table('supplier_messages')->where('id', $id)->first(),
        ]);
    }
}
