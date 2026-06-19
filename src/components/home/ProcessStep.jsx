import React from 'react';
import { motion } from 'framer-motion';

export default function ProcessStep({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -28 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.62, delay: index * 0.12, ease: 'easeOut' }}
      className="group flex items-start gap-4 sm:gap-6"
    >
      <div className="relative z-10 flex shrink-0 flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.12 + 0.2 }}
          whileHover={{ rotate: 8, scale: 1.1 }}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${step.iconBg} shadow-lg ring-4 ring-white dark:ring-card`}
        >
          <step.icon className="h-6 w-6 text-white" />
        </motion.div>
      </div>

      <motion.div
        whileHover={{ y: -10, scale: 1.02, transition: { duration: 0.24 } }}
        className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 sm:p-7"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-text">
            Stage {index + 1}
          </span>
        </div>
        <h3 className="mb-1 font-heading text-xl font-bold text-main">{step.title}</h3>
        <p className="mb-3 text-sm font-semibold text-primary">{step.sub}</p>
        <p className="mb-4 text-[15px] leading-relaxed text-secondary-text">{step.desc}</p>
        <div className={`inline-flex items-center rounded-xl border px-4 py-2 ${step.tagColor}`}>
          <p className="text-xs font-semibold">{step.detail}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
