import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import MaterialCard from '@/components/home/MaterialCard';

const PET_IMG = 'https://media.base44.com/images/public/69e277b2cca8ad6115f9cd35/4a5f9135c_generated_0bb20bc4.png';

const materials = [
  { name: 'PET Plastic', code: 'PET', category: 'Polymer', price: '$0.85/kg', grade: 'A+', qaStatus: 'Verified', availability: 'High', docs: 'Complete' },
  { name: 'HDPE Plastic', code: 'HDPE', category: 'Polymer', price: '$0.72/kg', grade: 'A', qaStatus: 'Verified', availability: 'High', docs: 'Complete' },
  { name: 'Mixed Paper', code: 'PAPER', category: 'Fiber', price: '$0.35/kg', grade: 'B+', qaStatus: 'Pending Batch', availability: 'Medium', docs: 'In Review' },
  { name: 'Cardboard OCC', code: 'OCC', category: 'Fiber', price: '$0.28/kg', grade: 'B', qaStatus: 'Verified', availability: 'High', docs: 'Complete' },
  { name: 'Aluminum', code: 'ALU', category: 'Metal', price: '$1.45/kg', grade: 'A+', qaStatus: 'Verified', availability: 'Medium', docs: 'Complete' },
  { name: 'Steel / Ferrous', code: 'FE', category: 'Metal', price: '$0.38/kg', grade: 'A', qaStatus: 'Verified', availability: 'High', docs: 'Complete' },
  { name: 'Clear Glass', code: 'GLASS', category: 'Glass', price: '$0.12/kg', grade: 'B', qaStatus: 'Pending Batch', availability: 'Medium', docs: 'In Review' },
  { name: 'E-Waste', code: 'EWASTE', category: 'Specialty', price: '$2.10/kg', grade: 'Variable', qaStatus: 'Lab Required', availability: 'Low', docs: 'Partial' },
];

const guarantees = [
  'ISO-compliant QA at every hub',
  'Full chain-of-custody documentation',
  'Real-time pricing benchmarks',
  'Purity certificates per batch',
];

export default function MaterialsSection() {
  return (
    <section id="materials" className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left: copy + material grid ─── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <span className="gold-label mb-3 block">Commodity Trading</span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-5 leading-tight text-foreground">
              Verified Materials.<br />
              <span className="text-gradient-gold">Transparent Pricing.</span>
            </h2>
            <p className="text-base text-secondary-text mb-5 leading-relaxed">
              Every material on our platform is tested, graded, and traceable to its source. Industry buyers receive guaranteed purity levels with full batch documentation — no surprises, no disputes.
            </p>
            <ul className="space-y-3 mb-9">
              {guarantees.map((g, i) => (
                <li key={i} className="flex items-center gap-3 text-[15px] font-medium text-foreground">
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0" />
                  {g}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((mat, i) => (
                <motion.div
                  key={mat.code}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.45 }}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                >
                  <MaterialCard material={mat} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: clean image, no text overlay ─── */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            whileHover={{ y: -6 }}
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/15 ring-1 ring-border relative">
              <motion.img
                src={PET_IMG}
                alt="Sorted and baled PET plastic materials ready for processing"
                className="w-full h-[320px] sm:h-[420px] lg:h-[520px] object-cover"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.8 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/34 via-black/8 to-transparent" />
              <div className="absolute left-6 top-6 panel-strong-overlay rounded-xl px-4 py-2 border border-cyan-200/35">
                <p className="text-xs uppercase tracking-widest font-bold text-contrast-strong">Premium Sorted Stream</p>
              </div>
            </div>

            {/* Floating stat — below image, not on it */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileHover={{ scale: 1.06 }}
              className="absolute -bottom-5 left-4 sm:-bottom-7 sm:-left-4 lg:-left-7 bg-card rounded-2xl border border-border shadow-2xl p-4 sm:p-5 min-w-[170px] sm:min-w-[200px] animate-float-strong"
            >
              <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wide">Live Volume Today</p>
              <p className="text-2xl font-bold text-foreground font-heading">8,450 kg</p>
              <p className="text-sm text-primary font-bold mt-1">↑ 12% vs last week</p>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}