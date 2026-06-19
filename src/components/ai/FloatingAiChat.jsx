import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, Sparkles, X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { platformV1 } from '@/services/platformV1Service';
import { useAuth } from '@/lib/AuthContext';
import WasteToValueLogo from '@/components/brand/WasteToValueLogo';

const starterQuestions = [
  'Explain the full waste-to-value workflow for my graduation defense.',
  'What should the admin do after accepting an application?',
  'How does quality check affect inventory and pricing?',
  'Write a strong explanation of the AI feature in this platform.',
];

export default function FloatingAiChat() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi, I am your Waste to Value AI. Ask me anything: project idea, system flow, invoices, AI, circular economy, or defense answers.' },
  ]);
  const scrollRef = useRef(null);

  const visibleMessages = useMemo(() => messages.slice(-10), [messages]);

  const ask = async (text = input) => {
    const question = text.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((old) => [...old, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const response = await platformV1.ai.chat(question, messages.slice(-8));
      const answer = response?.answer || response?.data?.answer || 'Live AI response received but no answer text was returned.';
      setMessages((old) => [...old, { role: 'assistant', text: answer }]);
    } catch (e) {
      setMessages((old) => [...old, { role: 'assistant', text: `Live AI is unavailable: ${e?.technicalMessage || e?.message || 'check GEMINI_API_KEY and network access.'}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[60] h-14 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 px-5 text-white shadow-2xl shadow-emerald-700/30"
      >
        <Bot className="mr-2 h-5 w-5" /> Ask AI
      </Button>

      {open && (
        <div className={`fixed z-[70] ${expanded ? 'inset-4' : 'bottom-24 right-5 w-[calc(100vw-2.5rem)] max-w-md'} overflow-hidden rounded-3xl border border-emerald-500/20 bg-background shadow-2xl`}> 
          <div className="flex items-center justify-between border-b border-border/70 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/50 dark:to-teal-950/30">
            <WasteToValueLogo />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}><Maximize2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className={`${expanded ? 'h-[calc(100vh-220px)]' : 'h-80'} space-y-3 overflow-y-auto p-4`}>
            {visibleMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'border border-border/70 bg-muted/50 text-main'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground"><Sparkles className="h-3 w-3 animate-pulse" /> AI is thinking...</div>}
            <div ref={scrollRef} />
          </div>
          <div className="border-t border-border/70 p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {starterQuestions.map((q) => <button key={q} onClick={() => ask(q)} className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold text-secondary-text hover:bg-emerald-50">{q}</button>)}
            </div>
            <div className="flex gap-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} rows={2} placeholder="Ask any question..." className="rounded-2xl" />
              <Button onClick={() => ask()} disabled={loading} className="rounded-2xl bg-emerald-600 text-white"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
