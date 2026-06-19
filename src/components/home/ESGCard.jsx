import React from 'react';

export default function ESGCard({ icon: Icon, title, description }) {
  return (
    <article className="rounded-2xl border border-white/30 bg-white/92 p-5 shadow-lg shadow-black/15 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-heading text-base font-bold text-main">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-secondary-text">{description}</p>
    </article>
  );
}
