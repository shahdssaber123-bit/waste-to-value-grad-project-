<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListInvoicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && ($this->user()->isSuperAdmin() || $this->user()->role === 'factory' || $this->user()->role === 'supplier');
    }

    public function rules(): array
    {
        return [
            /** @queryParam invoice_type string Filter by invoice type (inbound, outbound). */
            'invoice_type' => 'nullable|in:inbound,outbound',
            /** @queryParam status string Filter by status (pending, paid, cancelled). */
            'status' => 'nullable|in:pending,paid,cancelled',
            /** @queryParam party_id integer Filter by party ID. */
            'party_id' => 'nullable|integer',
            /** @queryParam party_type string Filter by party type (factory, supplier). */
            'party_type' => 'nullable|in:factory,supplier',
        ];
    }
}
