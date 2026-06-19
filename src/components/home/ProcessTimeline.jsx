import React from 'react';
import { motion } from 'framer-motion';
import { Truck, ClipboardCheck, Package, Factory } from 'lucide-react';
import ProcessStep from '@/components/home/ProcessStep';

const STEPS = [
  {
    icon: Truck,
    title: 'Source Collection',
    sub: 'Supplier Registration & Pickup',
    desc: 'Waste suppliers register materials, set pickup schedules, and request collection through a dedicated portal. The system matches them with certified drivers and optimized routes in real time.',
    detail: 'Digital pickup manifests · Route optimization · Real-time ETA tracking',
    iconBg: 'bg-blue-600',
    tagColor: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    icon: ClipboardCheck,
    title: 'Hub QA & Sorting',
    sub: 'Quality Assurance at Processing Hubs',
    desc: 'Every inbound shipment undergoes rigorous contamination testing, weight verification, and purity grading by hub managers. ISO-compliant certificates are issued for each accepted batch.',
    detail: 'Contamination scoring · Photographic evidence · ISO 14001 documentation',
    iconBg: 'bg-amber-500',
    tagColor: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    icon: Package,
    title: 'Baling & Inventory',
    sub: 'Processing, Baling & Inventory Entry',
    desc: 'Accepted materials are sorted, cleaned, baled, and assigned a unique batch ID with a verified purity grade. Each batch enters the live inventory system, instantly available for buyer discovery.',
    detail: 'Unique batch IDs · Purity grading · Smart inventory aging alerts',
    iconBg: 'bg-emerald-600',
    tagColor: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    icon: Factory,
    title: 'Factory Offtake',
    sub: 'Industry Buyer Procurement & Delivery',
    desc: 'Industry buyers browse verified live inventory, reserve materials with transparent pricing, and schedule contract deliveries. Full traceability from source to factory gate is guaranteed.',
    detail: 'Verified pricing · Contract management · Delivery scheduling',
    iconBg: 'bg-slate-700',
    tagColor: 'bg-slate-50 border-slate-200 text-slate-700',
  },
];

export default function ProcessTimeline() {
  return (
    <section id="process" className="bg-[#EEF7F8] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <motion.div
          className="mb-12 text-center sm:mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
        >
          <span className="mb-3 block text-xs font-bold uppercase tracking-[0.25em] text-amber-600">
            How It Works
          </span>

          <h2 className="mx-auto max-w-5xl text-5xl font-extrabold leading-[1.08] text-slate-950 md:text-6xl">
            Four Stages.{' '}
            <span className="text-amber-600">
              Complete Traceability.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-4xl text-lg font-semibold leading-relaxed text-slate-950 md:text-xl">
            Every kilogram is tracked from source extraction to factory delivery
            with a full chain-of-custody digital record. Nothing slips through —
            nothing goes undocumented.
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute left-[28px] top-6 bottom-6 w-0.5 bg-slate-300" />

          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <ProcessStep key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:mt-16 sm:p-10"
        >
          <p className="mx-auto max-w-3xl text-lg font-semibold leading-relaxed text-slate-800">
            Every stage generates timestamped records, digital certificates,
            and ESG impact data —{' '}
            <span className="text-amber-600">a complete audit trail</span>{' '}
            that meets EU taxonomy and regional regulatory requirements.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
