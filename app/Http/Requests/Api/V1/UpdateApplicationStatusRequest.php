<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam status string required in:contacted,rejected,converted */
            'status' => 'required|in:contacted,approved,rejected,converted',
            /** @bodyParam converted_user_id integer required_if:status,converted */
            'converted_user_id' => 'nullable|exists:users,id',
        ];
    }
}
