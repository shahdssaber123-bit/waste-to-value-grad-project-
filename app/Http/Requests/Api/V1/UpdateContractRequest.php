<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isSuperAdmin();
    }

    public function rules(): array
    {
        return [
            /** @bodyParam commodity_id integer nullable exists:commodities,id */
            'commodity_id' => 'nullable|exists:commodities,id',
            /** @bodyParam payment_terms string nullable max:100 */
            'payment_terms' => 'nullable|string|max:100',
            /** @bodyParam material_type string nullable max:100 */
            'material_type' => 'nullable|string|max:100',
            /** @bodyParam shipment_threshold_kg number nullable min:1 */
            'shipment_threshold_kg' => 'nullable|numeric|min:1',
            /** @bodyParam signed_date string nullable date */
            'signed_date' => 'nullable|date',
        ];
    }
}
