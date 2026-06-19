import React from 'react';

export default function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article
      className="rounded-2xl border border-white/10 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      style={{ backgroundColor: '#062B35' }}
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/20">
        <Icon className="h-5 w-5 text-amber-400" />
      </div>
      <h3 className="font-heading text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
    </article>
  );
}
