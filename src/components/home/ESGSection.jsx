import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, BarChart3, FileText, Globe } from 'lucide-react';

const features = [
  { icon: Leaf,      title: 'Carbon Tracking',    desc: 'Estimate avoided emissions from every kilogram diverted from landfill.' },
  { icon: BarChart3, title: 'Impact Dashboards',  desc: 'Monitor recovery rates, processed volumes, and ESG performance in real time.' },
  { icon: FileText,  title: 'Compliance Reports', desc: 'Generate audit-ready documentation for suppliers, hubs, and industrial buyers.' },
  { icon: Globe,     title: 'Circular Scoring',   desc: 'Measure the circular value of materials across the full chain of custody.' },
];

export default function ESGSection() {
  return (
    <section
      id="esg"
      className="relative overflow-hidden py-16 sm:py-24"
      style={{ backgroundColor: '#041B22' }}
    >
      {/* ── خلفية gradient ثابتة ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #041B22 0%, #062B35 55%, #0A4553 100%)',
        }}
      />

      {/* ── Glow blobs ── */}
      <div className="absolute -left-40 top-20 h-80 w-80 rounded-full blur-3xl"
           style={{ backgroundColor: 'rgba(6,182,212,0.10)' }} />
      <div className="absolute -right-40 bottom-10 h-96 w-96 rounded-full blur-3xl"
           style={{ backgroundColor: 'rgba(245,158,11,0.10)' }} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mx-auto max-w-5xl text-center">

          {/* ── Label ── */}
          <span
            className="mb-3 block text-xs font-semibold tracking-[0.16em] uppercase"
            style={{ color: 'rgba(255,255,255,0.90)' }}
          >
            ESG & Reporting
          </span>

          {/* ── Heading ── */}
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: '#ffffff' }}
          >
            Sustainability Built Into{' '}
            <span style={{ color: '#F59E0B' }}>Every Transaction</span>
          </h2>

          {/* ── Subtitle ── */}
          <p
            className="mb-10 sm:mb-12 leading-relaxed"
            style={{ color: 'rgba(226,232,240,0.90)' }}
          >
            Track landfill diversion, carbon impact, recovery performance, and
            compliance documentation through verified operational data.
          </p>

          {/* ── Cards ── */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 110 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="rounded-2xl p-6 text-left"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'rgba(6,182,212,0.18)' }}
                  >
                    <Icon size={22} style={{ color: '#22D3EE' }} />
                  </div>

                  {/* Title */}
                  <h3
                    className="mb-2 text-base font-semibold"
                    style={{ color: '#F59E0B' }}
                  >
                    {feat.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'rgba(226,232,240,0.85)' }}
                  >
                    {feat.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
