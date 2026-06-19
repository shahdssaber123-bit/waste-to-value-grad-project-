<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHubRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam location string Physical location or name of the hub. */
            'location' => 'nullable|string|max:255',
            /** @bodyParam size_sq_meters float Hub size in square meters. */
            'size_sq_meters' => 'nullable|numeric|min:0',
            /** @bodyParam capacity float Maximum storage capacity in kg. */
            'capacity' => 'nullable|numeric|min:0',
            /** @bodyParam manager_employee_id integer ID of the employee (with hub_manager role) managing this hub. */
            'manager_employee_id' => 'nullable|exists:employees,user_id',
        ];
    }
}
