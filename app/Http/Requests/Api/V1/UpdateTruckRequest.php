<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTruckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            /** @bodyParam hub_id integer The hub this truck belongs to. */
            'hub_id' => 'nullable|exists:hubs,id',
            /** @bodyParam payload_capacity float Maximum payload capacity in kg. */
            'payload_capacity' => 'nullable|numeric|min:1',
            /** @bodyParam truck_type string Type of the truck (e.g., Flatbed, Box Truck). */
            'truck_type' => 'nullable|string|max:50',
            /** @bodyParam plate_number string Unique plate number of the truck. */
            'plate_number' => 'nullable|string|max:20|unique:trucks,plate_number,'.$id,
        ];
    }
}
