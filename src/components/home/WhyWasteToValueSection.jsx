import React from 'react';
import SectionHeader from '@/components/home/SectionHeader';

const columns = [
  {
    title: 'For Suppliers',
    points: ['Reliable pickup scheduling', 'Transparent payout and QA visibility', 'Compliance-ready documentation'],
  },
  {
    title: 'For Hubs',
    points: ['Structured QA workflows', 'Batch and inventory controls', 'Operational performance visibility'],
  },
  {
    title: 'For Factories',
    points: ['Verified materials and purity records', 'Stable offtake supply planning', 'Traceable batch documentation'],
  },
  {
    title: 'For Admins',
    points: ['Cross-network analytics', 'Pricing and allocation controls', 'Dispute and escalation tracking'],
  },
];

export default function WhyWasteToValueSection() {
  return (
    <section className="bg-gradient-warm py-16 sm:py-20" id="why-wtv">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <SectionHeader
          eyebrow="Why Waste-to-Value"
          title="Built for Every Role in the"
          highlight="Circular Supply Chain"
          centered
        />
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <article key={column.title} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="font-heading text-lg font-bold text-main">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.points.map((point) => (
                  <li key={point} className="text-sm text-secondary-text">
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
