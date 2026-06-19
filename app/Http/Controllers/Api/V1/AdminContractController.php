<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateContractRequest;
use App\Http\Requests\Api\V1\UpdateContractStatusRequest;
use App\Mail\ContractActivatedMail;
use App\Models\Contract;
use App\Models\User;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

#[Group('Contracts', weight: 10)]
class AdminContractController extends Controller
{
    /**
     * List Contracts.
     *
     * Paginated list of commercial contracts.
     *
     * @queryParam party_type string Filter by party type (supplier, factory).
     * @queryParam status string Filter by contract status (draft, active, expired, terminated).
     * @queryParam commodity_id integer Filter by linked commodity.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Contract::with(['commodity', 'party']);

        if ($request->has('party_type')) {
            $query->where('party_type', $request->party_type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('commodity_id')) {
            $query->where('commodity_id', $request->commodity_id);
        }

        $contracts = $query->paginate(15);

        return response()->json([
            'message' => 'Success',
            'data' => $contracts,
        ]);
    }

    /**
     * View Contract.
     *
     * Detailed contract view with linked commodity and party details.
     */
    public function show(string $id): JsonResponse
    {
        $contract = Contract::with(['commodity', 'party'])->findOrFail($id);

        return response()->json([
            'message' => 'Success',
            'data' => $contract,
        ]);
    }

    /**
     * Update Contract Terms.
     *
     * Modify commercial terms for draft or active contracts.
     */
    public function update(UpdateContractRequest $request, string $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        if (in_array($contract->status, ['expired', 'terminated'])) {
            return response()->json(['message' => 'Cannot update a contract that is expired or terminated.'], 422);
        }

        $contract->update($request->validated());

        return response()->json([
            'message' => 'Contract updated successfully.',
            'data' => $contract,
        ]);
    }

    /**
     * Update Contract Status.
     *
     * Transition contract status according to allowed workflow states.
     */
    public function updateStatus(UpdateContractStatusRequest $request, string $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $newStatus = $request->status;
        $currentStatus = $contract->status;

        $allowedTransitions = [
            'draft' => ['active', 'terminated'],
            'active' => ['terminated', 'expired'],
            'expired' => [],
            'terminated' => [],
        ];

        if (! in_array($newStatus, $allowedTransitions[$currentStatus] ?? [])) {
            return response()->json(['message' => 'This status transition is not allowed.'], 422);
        }

        if ($newStatus === 'active') {
            if (! $contract->shipment_threshold_kg) {
                return response()->json(['message' => 'A shipment threshold must be set before activating a contract.'], 422);
            }
            if (! $contract->commodity_id) {
                return response()->json(['message' => 'A commodity must be linked before activating a contract.'], 422);
            }
        }

        $contract->update(['status' => $newStatus]);

        if ($contract->status === 'active') {
            $partyUser = User::find($contract->party_id);

            if ($partyUser) {
                $contract->loadMissing('commodity');

                Mail::to($partyUser->email)
                    ->queue(new ContractActivatedMail($partyUser, $contract));
            }
        }

        return response()->json([
            'message' => 'Contract status updated successfully.',
            'data' => $contract,
        ]);
    }

    /**
     * Delete Contract.
     *
     * Soft-deletes a contract. Only inactive (draft/terminated/expired) contracts can be deleted.
     */
    public function destroy(string $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        if ($contract->status === 'active') {
            return response()->json(['message' => 'Cannot delete an active contract. Terminate it first.'], 422);
        }

        $contract->delete();

        return response()->json(['message' => 'Contract deleted successfully.']);
    }
}
