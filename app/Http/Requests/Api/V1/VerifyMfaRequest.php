<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class VerifyMfaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /** @bodyParam mfa_token string required */
            'mfa_token' => 'required|string',
            /** @bodyParam code string required size:6 */
            'code' => 'required|string|size:6',
        ];
    }
}
