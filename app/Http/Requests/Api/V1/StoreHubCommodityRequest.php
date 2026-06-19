<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreHubCommodityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam commodity_id integer required The ID of the commodity to link to this hub. */
            'commodity_id' => 'required|exists:commodities,id',
        ];
    }
}
