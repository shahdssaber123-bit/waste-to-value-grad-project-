<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListApplicationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @queryParam status string Filter by status (pending, contacted, rejected, converted). */
            'status' => 'nullable|in:pending,contacted,rejected,converted',
            /** @queryParam verified boolean Filter by email verification status. */
            'verified' => 'nullable|boolean',
        ];
    }
}
