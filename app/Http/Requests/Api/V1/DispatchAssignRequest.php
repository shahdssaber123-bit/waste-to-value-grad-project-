<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class DispatchAssignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Middleware handles authorization
    }

    public function rules(): array
    {
        return [
            'truck_id' => ['required', 'exists:trucks,id'],
            'driver_employee_id' => ['required', 'exists:employees,user_id'],
            'supplier_location_id' => ['required', 'exists:supplier_locations,id'],
        ];
    }
}
