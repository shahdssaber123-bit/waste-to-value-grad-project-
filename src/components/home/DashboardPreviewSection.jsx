import React from 'react';
import { Activity, ClipboardCheck, Handshake, Recycle, Truck, Waves } from 'lucide-react';
import SectionHeader from '@/components/home/SectionHeader';

const cards = [
  { label: 'Monthly Tons Processed', value: '12,480', icon: Recycle, tone: 'text-primary' },
  { label: 'Pickups Completed', value: '3,200', icon: Truck, tone: 'text-primary' },
  { label: 'Recovery Rate', value: '94.2%', icon: Activity, tone: 'text-emerald-600' },
  { label: 'Active Partners', value: '48', icon: Handshake, tone: 'text-amber-600' },
  { label: 'Pending QA Batches', value: '126', icon: ClipboardCheck, tone: 'text-main' },
  { label: 'Factory Offtake Volume', value: '8,900 kg', icon: Waves, tone: 'text-main' },
];

export default function DashboardPreviewSection() {
  return (
    <section className="bg-gradient-warm py-16 sm:py-20" id="operations-preview">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeader
          eyebrow="Operations Dashboard Preview"
          title="Live Metrics for"
          highlight="Decision-Making"
          description="A clear operational snapshot for logistics teams, hub managers, and commercial stakeholders."
          centered
        />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-text">{card.label}</p>
                  <p className={`mt-2 font-heading text-3xl font-bold ${card.tone}`}>{card.value}</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
