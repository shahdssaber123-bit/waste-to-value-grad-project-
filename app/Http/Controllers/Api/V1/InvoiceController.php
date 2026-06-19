<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ListInvoicesRequest;
use App\Http\Requests\Api\V1\MarkInvoicePaidRequest;
use App\Models\Invoice;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

#[Group('Invoices', weight: 20)]
class InvoiceController extends Controller
{
    /**
     * List Invoices.
     *
     * Returns a paginated list of invoices with optional filtering.
     */
    public function index(ListInvoicesRequest $request): JsonResponse
    {
        $query = Invoice::with(['contract', 'penalties']);

        if ($request->has('invoice_type')) {
            $query->where('invoice_type', $request->invoice_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('party_id') && $request->has('party_type')) {
            $query->where('party_id', $request->party_id)
                ->where('party_type', $request->party_type);
        }

        $invoices = $query->paginate(15);

        return response()->json([
            'message' => 'Success',
            'data' => $invoices,
        ]);
    }

    /**
     * View Invoice.
     *
     * Detailed invoice data including linked outbound delivery and penalties.
     */
    public function show(string $id): JsonResponse
    {
        $invoice = Invoice::with(['contract', 'outboundDelivery', 'penalties'])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Success',
            'data' => $invoice,
        ]);
    }

    /**
     * Mark Invoice as Paid.
     *
     * Transitions an invoice to 'paid' status. Atomic transaction ensures status integrity.
     *
     * @response 200 {
     *   "message": "Invoice marked as paid.",
     *   "data": { "invoice_id": 1, "status": "paid", "paid_at": "2025-09-01T12:00:00Z" }
     * }
     */
    public function markPaid(MarkInvoicePaidRequest $request, string $id): JsonResponse
    {
        return DB::transaction(function () use ($id) {
            $invoice = Invoice::where('id', $id)->lockForUpdate()->firstOrFail();

            if ($invoice->status === 'paid') {
                return response()->json(['message' => 'This invoice has already been marked as paid.'], 422);
            }

            if ($invoice->status === 'cancelled') {
                return response()->json(['message' => 'A cancelled invoice cannot be marked as paid.'], 422);
            }

            $invoice->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            return response()->json([
                'message' => 'Invoice marked as paid.',
                'data' => [
                    'invoice_id' => $invoice->id,
                    'status' => 'paid',
                    'paid_at' => $invoice->paid_at,
                ],
            ]);
        });
    }
}
