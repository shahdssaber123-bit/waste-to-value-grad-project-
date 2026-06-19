<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class InboundBaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quality_score' => ['required', 'in:A,B,C,reject'],
            'quality_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
