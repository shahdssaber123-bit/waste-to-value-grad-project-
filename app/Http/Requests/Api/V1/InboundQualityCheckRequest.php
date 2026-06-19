<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class InboundQualityCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tier1_weight' => ['required', 'numeric', 'min:0.01'],
            'tier2_weight' => ['required', 'numeric', 'min:0.01'],
            'contamination_ratio' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'quality_notes' => ['nullable', 'string', 'max:1000'],
            'sorter_count' => ['nullable', 'integer', 'min:1', 'max:50'],
            'decontamination_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
