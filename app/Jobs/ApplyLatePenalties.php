<?php

namespace App\Jobs;

use App\Models\Invoice;
use App\Models\Penalty;
use App\Models\User;
use App\Notifications\LatePenaltyAppliedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class ApplyLatePenalties implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        $overdueInvoices = Invoice::where('invoice_type', 'factory')
            ->whereIn('status', ['pending', 'overdue'])
            ->where('due_date', '<', now())
            ->get();

        foreach ($overdueInvoices as $invoice) {
            DB::transaction(function () use ($invoice) {
                // Lock the invoice record
                $invoice = Invoice::where('id', $invoice->id)->lockForUpdate()->first();
                $existingStages = $invoice->penalties()->pluck('penalty_stage')->toArray();

                if (! in_array(1, $existingStages)) {
                    $penaltyAmount = $invoice->total_amount * 0.05;

                    $penalty = Penalty::create([
                        'invoice_id' => $invoice->id,
                        'amount' => $penaltyAmount,
                        'penalty_stage' => 1,
                        'applied_at' => now(),
                    ]);

                    $invoice->increment('total_amount', $penaltyAmount);
                    $invoice->update(['status' => 'overdue']);

                    $admins = User::where('role', 'super_admin')->get();
                    foreach ($admins as $admin) {
                        $admin->notify(new LatePenaltyAppliedNotification($invoice, $penalty));
                    }

                    return;
                }

                if (! in_array(2, $existingStages)) {
                    $stage1 = $invoice->penalties()->where('penalty_stage', 1)->first();

                    if ($stage1 && now()->diffInDays($stage1->applied_at) >= 7) {
                        $penaltyAmount = $invoice->total_amount * 0.10;

                        $penalty = Penalty::create([
                            'invoice_id' => $invoice->id,
                            'amount' => $penaltyAmount,
                            'penalty_stage' => 2,
                            'applied_at' => now(),
                        ]);

                        $invoice->increment('total_amount', $penaltyAmount);

                        $admins = User::where('role', 'super_admin')->get();
                        foreach ($admins as $admin) {
                            $admin->notify(new LatePenaltyAppliedNotification($invoice, $penalty));
                        }
                    }
                }
            });
        }
    }
}
