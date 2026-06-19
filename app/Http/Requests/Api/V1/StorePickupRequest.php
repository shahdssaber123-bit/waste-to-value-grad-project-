<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StorePickupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam contract_id integer required exists:contracts,id */
            'contract_id' => 'required|exists:contracts,id',
            /** @bodyParam hub_id integer required exists:hubs,id */
            'hub_id' => 'required|exists:hubs,id',
            /** @bodyParam schedule_date string required date after:now */
            'schedule_date' => 'required|date|after:now',
            /** @bodyParam estimated_weight number nullable min:1 */
            'estimated_weight' => 'nullable|numeric|min:1',
            'supplier_location_id' => 'nullable|exists:supplier_locations,id',
        ];
    }
}
