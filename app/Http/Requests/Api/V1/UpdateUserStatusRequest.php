<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam employment_status string required in:active,terminated,on_leave */
            'employment_status' => 'required|in:active,terminated,on_leave',
        ];
    }
}
