<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @queryParam role string Filter by top-level role (employee, factory, supplier). */
            'role' => 'nullable|in:employee,factory,supplier',
            /** @queryParam employee_role string Filter employees by sub-role (driver, hub_manager, sorter). */
            'employee_role' => 'nullable|in:driver,hub_manager,sorter',
            /** @queryParam employment_status string Filter employees by status (active, terminated, on_leave). */
            'employment_status' => 'nullable|in:active,terminated,on_leave',
            /** @queryParam with_deleted boolean Include soft-deleted users. */
            'with_deleted' => 'nullable|boolean',
        ];
    }
}
