<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListOutboundDeliveriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @queryParam hub_id integer Filter by hub ID. */
            'hub_id' => 'nullable|integer|exists:hubs,id',
            /** @queryParam commodity_id integer Filter by commodity ID. */
            'commodity_id' => 'nullable|integer|exists:commodities,id',
            /** @queryParam status string Filter by status (scheduled, shipped, delivered, rejected). */
            'status' => 'nullable|in:scheduled,shipped,delivered,rejected',
        ];
    }
}
