<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreTruckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam hub_id integer required The hub this truck belongs to. */
            'hub_id' => 'required|exists:hubs,id',
            /** @bodyParam payload_capacity float required Maximum payload capacity in kg. */
            'payload_capacity' => 'required|numeric|min:1',
            /** @bodyParam truck_type string required Type of the truck (e.g., Flatbed, Box Truck). */
            'truck_type' => 'required|string|max:50',
            /** @bodyParam plate_number string required Unique plate number of the truck. */
            'plate_number' => 'required|string|max:20|unique:trucks',
        ];
    }
}
