<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommodityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            /** @bodyParam title string required Unique title of the commodity. */
            'title' => 'required|string|max:100|unique:commodities,title,'.$id,
        ];
    }
}
