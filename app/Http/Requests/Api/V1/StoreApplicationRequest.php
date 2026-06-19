<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /** @bodyParam idempotency_token string required client-generated UUID */
            'idempotency_token' => 'required|string|max:100',
            /** @bodyParam company_name string required */
            'company_name' => 'required|string|max:255',
            /** @bodyParam contact_name string required */
            'contact_name' => 'required|string|max:255',
            /** @bodyParam email string required */
            'email' => ['required','email:rfc,dns','max:191', Rule::unique('users', 'email'), Rule::unique('applications', 'email')],
            'password' => ['required','string','min:8','max:255','regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
            /** @bodyParam phone string required */
            'phone' => ['required','string','max:20','regex:/^\+?[0-9\s\-()]{8,20}$/'],
            /** @bodyParam role string required in:factory,supplier */
            'role' => 'required|in:factory,supplier',
            /** @bodyParam tax_id string required */
            'tax_id' => ['required','string','max:50','regex:/^[A-Za-z0-9\-\/]{3,50}$/'],
            /** @bodyParam required_commodity string required_if:role,factory */
            'required_commodity' => 'required_if:role,factory|nullable|string|max:100',
            /** @bodyParam message string nullable */
            'message' => 'nullable|string|max:1000',
            'location' => 'required|string|max:255',
        ];
    }
}
