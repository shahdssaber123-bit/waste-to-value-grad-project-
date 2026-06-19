<?php

use App\Http\Controllers\Api\V1\SystemHealthController;
use App\Http\Controllers\Api\V1\PickupProblemReportController;
use App\Http\Controllers\Api\V1\MaterialRequestController;
use App\Http\Controllers\Api\V1\MarketplaceController;
use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AiChatController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\GraduationInsightsController;
use App\Http\Controllers\Api\V1\SmartMatchingController;
use App\Http\Controllers\Api\V1\TimelineController;
use App\Http\Controllers\Api\V1\AdminApplicationController;
use App\Http\Controllers\Api\V1\AdminMessageController;
use App\Http\Controllers\Api\V1\AdminCommodityController;
use App\Http\Controllers\Api\V1\AdminCommodityPriceController;
use App\Http\Controllers\Api\V1\AdminContractController;
use App\Http\Controllers\Api\V1\AdminHubCommodityController;
use App\Http\Controllers\Api\V1\AdminHubController;
use App\Http\Controllers\Api\V1\AdminPickupController;
use App\Http\Controllers\Api\V1\AdminTruckController;
use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AdminLiveSnapshotController;
use App\Http\Controllers\Api\V1\AdminLocationController;
use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DevToolController;
use App\Http\Controllers\Api\V1\DispatchController;
use App\Http\Controllers\Api\V1\DriverPickupController;
use App\Http\Controllers\Api\V1\FactoryDeliveryController;
use App\Http\Controllers\Api\V1\InboundRecordController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OutboundDeliveryController;
use App\Http\Controllers\Api\V1\SupplierPortalController;
use App\Http\Controllers\Api\V1\HubWorkflowController;
use Illuminate\Support\Facades\Route;

// Public: Applications
Route::post('/applications', [ApplicationController::class, 'store'])->middleware('throttle:60,1');
Route::get('/applications', [ApplicationController::class, 'index'])->middleware(['auth:sanctum', 'accessible', 'superadmin']);
Route::get('/applications/verify-email/{token}', [ApplicationController::class, 'verifyEmail']);

// Auth
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/mfa/verify', [AuthController::class, 'verifyMfa'])->middleware('throttle:10,1');

    Route::middleware(['auth:sanctum', 'accessible'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Admin
Route::prefix('admin')->middleware(['auth:sanctum', 'accessible', 'superadmin'])->group(function () {
    Route::pattern('type', 'supplier|factory');
    Route::get('/system-health', [SystemHealthController::class, 'show']);
    Route::get('/live-snapshot', AdminLiveSnapshotController::class);

    Route::get('/applications', [AdminApplicationController::class, 'index']);
    Route::get('/applications/{id}', [AdminApplicationController::class, 'show']);
    Route::patch('/applications/{id}/status', [AdminApplicationController::class, 'updateStatus']);
    Route::post('/applications/{id}/status', [AdminApplicationController::class, 'updateStatus']);

    Route::get('/messages', [AdminMessageController::class, 'index']);
    Route::post('/messages/{id}/reply', [AdminMessageController::class, 'reply']);

    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::get('/users/{id}', [AdminUserController::class, 'show']);
    Route::patch('/users/{id}', [AdminUserController::class, 'update']);
    Route::post('/users/{id}', [AdminUserController::class, 'update']);
    Route::patch('/users/{id}/status', [AdminUserController::class, 'updateStatus']);
    Route::post('/users/{id}/status', [AdminUserController::class, 'updateStatus']);
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

    Route::get('/{type}/users/{userId}/locations', [AdminLocationController::class, 'index']);
    Route::post('/{type}/users/{userId}/locations', [AdminLocationController::class, 'store']);
    Route::patch('/{type}/users/{userId}/locations/{id}', [AdminLocationController::class, 'update']);
    Route::delete('/{type}/users/{userId}/locations/{id}', [AdminLocationController::class, 'destroy']);

    Route::post('/hubs', [AdminHubController::class, 'store']);
    Route::get('/hubs', [AdminHubController::class, 'index']);
    Route::get('/hubs/{id}', [AdminHubController::class, 'show']);
    Route::patch('/hubs/{id}', [AdminHubController::class, 'update']);
    Route::post('/hubs/{id}', [AdminHubController::class, 'update']);
    Route::delete('/hubs/{id}', [AdminHubController::class, 'destroy']);

    Route::post('/trucks', [AdminTruckController::class, 'store']);
    Route::get('/trucks', [AdminTruckController::class, 'index']);
    Route::get('/trucks/{id}', [AdminTruckController::class, 'show']);
    Route::patch('/trucks/{id}', [AdminTruckController::class, 'update']);
    Route::post('/trucks/{id}', [AdminTruckController::class, 'update']);
    Route::patch('/trucks/{id}/status', [AdminTruckController::class, 'updateStatus']);
    Route::post('/trucks/{id}/status', [AdminTruckController::class, 'updateStatus']);

    Route::post('/commodities', [AdminCommodityController::class, 'store']);
    Route::get('/commodities', [AdminCommodityController::class, 'index']);
    Route::get('/commodities/{id}', [AdminCommodityController::class, 'show']);
    Route::patch('/commodities/{id}', [AdminCommodityController::class, 'update']);
    Route::post('/commodities/{id}', [AdminCommodityController::class, 'update']);

    Route::post('/commodities/{id}/prices', [AdminCommodityPriceController::class, 'store']);
    Route::get('/commodities/{id}/prices', [AdminCommodityPriceController::class, 'index']);

    Route::post('/hubs/{id}/commodities', [AdminHubCommodityController::class, 'store']);
    Route::get('/hubs/{id}/commodities', [AdminHubCommodityController::class, 'index']);
    Route::delete('/hubs/{hub_id}/commodities/{commodity_id}', [AdminHubCommodityController::class, 'destroy']);

    Route::get('/contracts', [AdminContractController::class, 'index']);
    Route::get('/contracts/{id}', [AdminContractController::class, 'show']);
    Route::patch('/contracts/{id}', [AdminContractController::class, 'update']);
    Route::post('/contracts/{id}', [AdminContractController::class, 'update']);
    Route::patch('/contracts/{id}/status', [AdminContractController::class, 'updateStatus']);
    Route::post('/contracts/{id}/status', [AdminContractController::class, 'updateStatus']);
    Route::delete('/contracts/{id}', [AdminContractController::class, 'destroy']);

    Route::post('/pickups', [AdminPickupController::class, 'store']);
    Route::get('/pickups', [AdminPickupController::class, 'index']);
    Route::get('/pickups/{id}', [AdminPickupController::class, 'show']);
    Route::patch('/pickups/{id}/cancel', [AdminPickupController::class, 'cancel']);
    Route::post('/pickups/{id}/cancel', [AdminPickupController::class, 'cancel']);
    Route::patch('/pickups/{id}/dispatch', [DispatchController::class, 'assign']);
    Route::post('/pickups/{id}/dispatch', [DispatchController::class, 'assign']);

    Route::get('/outbound', [OutboundDeliveryController::class, 'index']);
    Route::get('/outbound/{id}', [OutboundDeliveryController::class, 'show']);
    Route::patch('/outbound/{id}/ship', [OutboundDeliveryController::class, 'ship']);
    Route::post('/outbound/{id}/ship', [OutboundDeliveryController::class, 'ship']);

    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::patch('/invoices/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
    Route::post('/invoices/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
});

// Supplier
Route::prefix('supplier')->middleware(['auth:sanctum', 'accessible', 'supplier'])->group(function () {
    Route::get('/materials', [SupplierPortalController::class, 'materials']);
    Route::get('/pickups', [SupplierPortalController::class, 'pickups']);
    Route::post('/pickup-requests', [SupplierPortalController::class, 'requestPickup']);
    Route::post('/messages', [SupplierPortalController::class, 'messageAdmin']);
});

// Factory
Route::prefix('factory')->middleware(['auth:sanctum', 'accessible', 'factory'])->group(function () {
    Route::get('/deliveries', [FactoryDeliveryController::class, 'index']);
    Route::patch('/deliveries/{id}/confirm', [FactoryDeliveryController::class, 'confirm']);
    Route::post('/deliveries/{id}/confirm', [FactoryDeliveryController::class, 'confirm']);
    Route::post('/deliveries/{id}/reject', [FactoryDeliveryController::class, 'reject']);
});

// Hub Manager
Route::prefix('hub')->middleware(['auth:sanctum', 'accessible', 'hubmanager'])->group(function () {
    Route::get('/receiving-queue', [HubWorkflowController::class, 'receivingQueue']);
    Route::patch('/pickups/{id}/dispatch', [DispatchController::class, 'assign']);
    Route::post('/pickups/{id}/dispatch', [DispatchController::class, 'assign']);
    Route::post('/pickups/{id}/inspect', [HubWorkflowController::class, 'inspectPickup']);
    Route::post('/inbound', [InboundRecordController::class, 'store']);
    Route::get('/inbound', [InboundRecordController::class, 'index']);
    Route::get('/inbound/{id}', [InboundRecordController::class, 'show']);
    Route::patch('/inbound/{id}/quality', [InboundRecordController::class, 'qualityCheck']);
    Route::post('/inbound/{id}/quality', [InboundRecordController::class, 'qualityCheck']);
    Route::patch('/inbound/{id}/status', [HubWorkflowController::class, 'updateInboundStatus']);
    Route::post('/inbound/{id}/status', [HubWorkflowController::class, 'updateInboundStatus']);
    Route::post('/inbound/{id}/bale', [InboundRecordController::class, 'bale']);
    Route::get('/available-hubs', [HubWorkflowController::class, 'availableHubs']);
});

// Driver
Route::prefix('driver')->middleware(['auth:sanctum', 'accessible', 'driver'])->group(function () {
    Route::get('/pickups', [DriverPickupController::class, 'index']);
    Route::patch('/pickups/{id}/start', [DriverPickupController::class, 'start']);
    Route::post('/pickups/{id}/start', [DriverPickupController::class, 'start']);
    Route::post('/pickups/{id}/photos', [DriverPickupController::class, 'uploadPhoto']);
    Route::patch('/pickups/{id}/weight', [DriverPickupController::class, 'recordWeight']);
    Route::post('/pickups/{id}/weight', [DriverPickupController::class, 'recordWeight']);
    Route::patch('/pickups/{id}/depart-to-hub', [DriverPickupController::class, 'departToHub']);
    Route::post('/pickups/{id}/depart-to-hub', [DriverPickupController::class, 'departToHub']);
    Route::patch('/pickups/{id}/complete', [DriverPickupController::class, 'complete']);
    Route::post('/pickups/{id}/complete', [DriverPickupController::class, 'complete']);
    Route::post('/pickups/{id}/problem-reports', [PickupProblemReportController::class, 'store']);
    Route::get('/available-hubs', [HubWorkflowController::class, 'availableHubs']);
});

Route::post('/ai/chat', [AiChatController::class, 'chat'])->middleware('throttle:30,1');

Route::middleware(['auth:sanctum', 'accessible'])->group(function () {
    Route::get('/marketplace/materials', [MarketplaceController::class, 'materials']);
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/impact', [DashboardController::class, 'impact']);
    Route::get('/graduation/overview', [GraduationInsightsController::class, 'overview']);
    Route::get('/graduation/features', [GraduationInsightsController::class, 'features']);
    Route::post('/matching/suggest-hub', [SmartMatchingController::class, 'suggestHub']);
    Route::get('/timelines/pickups/{id}', [TimelineController::class, 'pickup']);
    Route::get('/timelines/deliveries/{id}', [TimelineController::class, 'delivery']);
    Route::get('/activity-logs', [ActivityLogController::class, 'index'])->middleware('superadmin');
    Route::get('/material-requests', [MaterialRequestController::class, 'index']);
    Route::post('/material-requests', [MaterialRequestController::class, 'store']);
    Route::patch('/material-requests/{id}/match', [MaterialRequestController::class, 'match']);
    Route::post('/material-requests/{id}/match', [MaterialRequestController::class, 'match']);
    Route::patch('/material-requests/{id}/schedule', [MaterialRequestController::class, 'schedule']);
    Route::post('/material-requests/{id}/schedule', [MaterialRequestController::class, 'schedule']);
    Route::patch('/material-requests/{id}/ship', [MaterialRequestController::class, 'ship']);
    Route::post('/material-requests/{id}/ship', [MaterialRequestController::class, 'ship']);
    Route::patch('/material-requests/{id}/admin-confirm', [MaterialRequestController::class, 'adminConfirm']);
    Route::post('/material-requests/{id}/admin-confirm', [MaterialRequestController::class, 'adminConfirm']);
    Route::patch('/material-requests/{id}/reject', [MaterialRequestController::class, 'reject']);
    Route::post('/material-requests/{id}/reject', [MaterialRequestController::class, 'reject']);
});

Route::middleware(['auth:sanctum', 'accessible'])->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
});

if (app()->environment('local')) {
    Route::get('/dev/application-token/{email}', [DevToolController::class, 'getApplicationToken']);
    Route::get('/dev/email-preview/verification', [DevToolController::class, 'previewVerificationMail']);
    Route::get('/dev/email-preview/account-activated', [DevToolController::class, 'previewAccountActivatedMail']);
}
