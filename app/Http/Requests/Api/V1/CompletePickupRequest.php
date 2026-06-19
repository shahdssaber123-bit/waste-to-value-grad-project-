<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class CompletePickupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proof_note' => ['required', 'string', 'min:5', 'max:1000'],
            'delivered_to_hub_id' => ['nullable', 'integer', 'exists:hubs,id'],
        ];
    }
}
