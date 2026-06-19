<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListNotificationsRequest;
use App\Http\Requests\Api\V1\MarkAllNotificationsReadRequest;
use App\Http\Requests\Api\V1\MarkNotificationReadRequest;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;

#[Group('Notifications', weight: 50)]
class NotificationController extends Controller
{
    /**
     * List Notifications.
     *
     * Returns a paginated list of in-app notifications for the authenticated user.
     */
    public function index(ListNotificationsRequest $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json([
            'message' => 'Notifications retrieved.',
            'data' => $notifications,
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark Notification as Read.
     *
     * Updates the 'read_at' timestamp for a specific notification.
     */
    public function markRead(MarkNotificationReadRequest $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark All Notifications as Read.
     *
     * Updates the 'read_at' timestamp for all unread notifications belonging to the authenticated user.
     */
    public function markAllRead(MarkAllNotificationsReadRequest $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
