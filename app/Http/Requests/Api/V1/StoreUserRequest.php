<?php

namespace App\Http\Requests\Api\V1;

use App\Models\Factory;
use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            // Common
            /** @bodyParam fname string required */
            'fname' => 'required|string|max:100',
            /** @bodyParam lname string required */
            'lname' => 'required|string|max:100',
            /** @bodyParam email string required unique:users */
            'email' => 'required|email|max:191|unique:users',
            /** @bodyParam password string required min:8 */
            'password' => 'required|string|min:8',
            /** @bodyParam phone string nullable */
            'phone' => 'nullable|string|max:20',
            /** @bodyParam role string required in:employee,factory,supplier */
            'role' => 'required|in:employee,factory,supplier',

            // Employee
            /** @bodyParam employee_role string required_if:role,employee in:driver,hub_manager,sorter */
            'employee_role' => 'required_if:role,employee|string|in:driver,hub_manager',
            /** @bodyParam ssn string required_if:role,employee unique:users */
            'ssn' => 'required_if:role,employee|nullable|string|max:20|unique:users,ssn',
            /** @bodyParam driver_license_number string required_if:employee_role,driver unique:employees */
            'driver_license_number' => 'required_if:employee_role,driver|nullable|string|max:50|unique:employees,driver_license_number',
            /** @bodyParam hire_date string nullable date */
            'hire_date' => 'nullable|date',
            /** @bodyParam shift string nullable in:morning,evening,night */
            'shift' => 'nullable|string|in:morning,evening,night',

            // Factory
            /** @bodyParam company_name string required_if:role,factory,supplier */
            'company_name' => 'required_if:role,factory,supplier|nullable|string|max:255',
            /** @bodyParam commodity_id integer required_if:role,factory,supplier */
            'commodity_id' => 'nullable|exists:commodities,id',
            /** @bodyParam tax_id string required_if:role,factory */
            'tax_id' => 'required_if:role,factory|nullable|string|max:50',
            /** @bodyParam required_commodity string nullable */
            'required_commodity' => 'nullable|string|max:100',

            // Optional
            /** @bodyParam application_id integer nullable */
            'application_id' => 'nullable|exists:applications,id',
            'locations' => 'required_if:role,factory,supplier|array|min:1',
            'locations.*.location_name' => 'required_with:locations|string|max:255',
            'locations.*.address' => 'required_with:locations|string|max:255',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->has('tax_id')) {
                    return;
                }

                $taxId = $this->input('tax_id');
                $role = $this->input('role');

                if ($role === 'factory' && Factory::where('tax_id', $taxId)->exists()) {
                    $validator->errors()->add('tax_id', 'The tax id has already been taken.');
                }
            },
        ];
    }
}
