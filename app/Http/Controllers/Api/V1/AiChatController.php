<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatController extends Controller
{
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'history' => ['nullable', 'array'],
            'history.*.role' => ['nullable', 'string'],
            'history.*.text' => ['nullable', 'string', 'max:4000'],
        ]);

        $user = $request->user();
        $role = $user?->role === 'employee' ? ($user?->employee?->role ?: 'employee') : ($user?->role ?: 'guest');
        $question = trim($validated['message']);
        $apiKey = trim((string) (env('GEMINI_API_KEY') ?: config('services.gemini.key')));

        if ($apiKey === '') {
            return response()->json(['message' => 'Live AI is not configured. Add GEMINI_API_KEY to enable Gemini responses.', 'data' => ['answer' => null, 'source' => 'not_configured']], 503);
        }

        $contents = [];
        foreach (array_slice($validated['history'] ?? [], -10) as $historyMessage) {
            $text = trim((string) ($historyMessage['text'] ?? ''));
            if ($text === '') continue;
            $contents[] = ['role' => (($historyMessage['role'] ?? '') === 'assistant') ? 'model' : 'user', 'parts' => [['text' => $text]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $question]]];

        try {
            $response = Http::timeout(35)->withHeaders(['Content-Type' => 'application/json', 'X-goog-api-key' => $apiKey])->post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', [
                'systemInstruction' => ['parts' => [['text' => $this->systemPrompt($role)]]],
                'contents' => $contents,
                'generationConfig' => ['temperature' => 0.9, 'topP' => 0.95, 'maxOutputTokens' => 1800],
            ]);
            if (! $response->successful()) {
                Log::error('Gemini API failed', ['status' => $response->status(), 'body' => $response->body()]);
                return response()->json(['message' => 'The AI assistant could not reach the live Gemini model.', 'data' => ['answer' => null, 'source' => 'gemini_error']], 502);
            }
            $answer = data_get($response->json(), 'candidates.0.content.parts.0.text');
            if (! $answer) {
                return response()->json(['message' => 'Gemini returned an empty answer.', 'data' => ['answer' => null, 'source' => 'gemini_empty']], 502);
            }
            return response()->json(['message' => 'AI answer generated successfully.', 'data' => ['answer' => $answer, 'source' => 'gemini']]);
        } catch (\Throwable $e) {
            Log::error('AI chat exception', ['message' => $e->getMessage()]);
            return response()->json(['message' => 'The AI assistant is temporarily unavailable.', 'data' => ['answer' => null, 'source' => 'exception']], 503);
        }
    }

    private function systemPrompt(string $role): string
    {
        return <<<PROMPT
You are a powerful AI assistant embedded inside a graduation project website called "Waste to Value".
Answer ANY normal question naturally. If the user writes Arabic, answer in clear Arabic Egyptian-friendly wording. If English, answer in English. Do not repeat generic fallback phrases. For greetings like "hi", reply naturally and ask how you can help.

Platform context: Waste to Value is a circular economy platform that connects waste suppliers, recycling hubs, drivers, factories, and admins. Admin manages users, applications, contracts, materials, hubs, trucks, pickups, deliveries, invoices, printable reports and notifications. Suppliers provide waste, drivers collect it, hubs do quality checks and inventory/bale cubes, factories request graded materials, and invoices/reports are generated.

Core workflow: Application → Admin Approval → User Creation → Contract → Pickup → Driver Assignment → Proof + Weight → Hub Inbound → Quality Check → Bale Cubes → Inventory → Factory Material Request → Smart Hub Matching → Delivery → Invoice → Payment Status → Reports.

Current user role: {$role}. For defense questions, give strong speaking points and simple technical explanations.
PROMPT;
    }

    private function smartLocalAnswer(string $question, string $role): string
    {
        $q = mb_strtolower($question);
        if (in_array(trim($q), ['hi', 'hello', 'hey', 'هاي', 'اهلا', 'أهلا'])) return 'Hi! 👋 I am ready to help. You can ask me about the project idea, technical flow, website pages, users, invoices, reports, AI, or even general questions.';
        if (str_contains($q, 'ما هو') || str_contains($q, 'ايه') || str_contains($q, 'what is') || str_contains($q, 'website') || str_contains($q, 'الموقع')) return 'الموقع ده منصة Waste to Value: نظام كامل بيحوّل المخلفات لقيمة. المورد يوفّر المخلفات، السائق يستلمها، الـ Hub يفحص الجودة ويحوّل المقبول لمخزون وBale Cubes، المصنع يطلب المواد، والنظام يعمل Delivery وInvoice وتقارير وتأثير بيئي.';
        if (str_contains($q, 'مناقشة') || str_contains($q, 'defense') || str_contains($q, 'اشرح')) return 'في المناقشة قول إن المشروع مش مجرد CRUD، لكنه lifecycle كامل للمخلفات: من application، لموافقة الأدمن، لعقد، لاستلام، لفحص جودة، لمخزون، لطلب مصنع، لتوصيل، لفاتورة وتقارير. القيمة الأساسية هي ربط الـ circular economy بعمليات تشغيل حقيقية.';
        if (str_contains($q, 'workflow') || str_contains($q, 'flow') || str_contains($q, 'فلو')) return 'الفلو: Application → Approval → User + Contract → Pickup → Driver → Hub Quality Check → Inventory/Bales → Factory Request → Smart Matching → Delivery → Invoice → Reports.';
        if (str_contains($q, 'admin') || str_contains($q, 'ادمن')) return 'الأدمن يدير كل شيء: users، applications، materials، hubs، trucks، contracts، pickups، requests، invoices، profile popups، وprintable reports.';
        return 'أقدر أساعدك في أي سؤال. اسألني عن فكرة الموقع، إضافة الطلبات، إدارة المستخدمين، المواد والموردين، الفواتير، الطباعة، الذكاء الاصطناعي، أو شرح المشروع في المناقشة. الدور الحالي: '.$role.'.';
    }
}
