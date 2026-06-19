<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class ListFactoryDeliveriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'factory';
    }

    public function rules(): array
    {
        return [
            /** @queryParam status string Filter by status (scheduled, shipped, delivered, rejected). */
            'status' => 'nullable|in:scheduled,shipped,delivered,rejected',
        ];
    }
}
