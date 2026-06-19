import React from 'react';

const flow = [
  'Supplier',
  'Driver Pickup',
  'Hub QA',
  'Baling',
  'Inventory',
  'Factory Buyer',
];

export default function ChainOfCustodySection() {
  return (
    <section className="bg-[#041B22] py-16 sm:py-20" id="chain-of-custody">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            Chain of Custody
          </p>

          <h2 className="font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
            Trace Every Handoff from{' '}
            <span className="text-amber-400">Source to Factory</span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-white/80">
            Every operation is timestamped, documented, and linked to verified batch records for transparent compliance.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-cyan-900/40 bg-[#062B35] p-5 shadow-xl sm:p-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {flow.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-cyan-800/30 bg-[#083844] p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/50 hover:bg-[#0A4553]"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                  Step {index + 1}
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
