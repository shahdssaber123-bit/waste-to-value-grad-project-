import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function MaterialCard({ material }) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-text">{material.code}</p>
        <Badge variant="secondary" className="border border-border bg-surface-soft text-[10px] font-semibold text-main">
          {material.grade}
        </Badge>
      </div>
      <h3 className="text-sm font-bold text-main">{material.name}</h3>
      <p className="mt-1 text-xs text-secondary-text">{material.category}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <p className="text-muted-text">Price/kg</p>
        <p className="text-right font-semibold text-main">{material.price}</p>
        <p className="text-muted-text">QA Status</p>
        <p className="text-right font-semibold text-primary">{material.qaStatus}</p>
        <p className="text-muted-text">Availability</p>
        <p className="text-right font-semibold text-main">{material.availability}</p>
        <p className="text-muted-text">Batch Docs</p>
        <p className="text-right font-semibold text-main">{material.docs}</p>
      </div>
    </article>
  );
}
