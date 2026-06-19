<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommodityPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return true;
        }

        return in_array($user->role, ['admin', 'super_admin'], true);
    }

    public function rules(): array
    {
        return [
            /** @bodyParam price float required The new market price per kg. */
            'price' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
        ];
    }

    public function messages(): array
    {
        return [
            'price.required' => 'Please enter the new material price.',
            'price.numeric' => 'The material price must be a valid number.',
            'price.min' => 'The material price must be greater than zero.',
            'price.max' => 'The material price is too large.',
        ];
    }
}
