import React from 'react';
import { Recycle, Sparkles } from 'lucide-react';

export default function WasteToValueLogo({ compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-slate-900 shadow-xl shadow-emerald-600/25 ring-1 ring-white/30">
        <Recycle className="h-6 w-6 text-white" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-md ring-2 ring-background">
          <Sparkles className="h-3 w-3 text-slate-900" />
        </span>
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-heading text-lg font-black tracking-tight text-main">Waste to Value</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Circular Economy Platform</p>
        </div>
      )}
    </div>
  );
}
