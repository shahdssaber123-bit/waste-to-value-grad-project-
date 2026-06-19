import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border border-border/80 p-5 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-primary/12">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <h3 className="text-2xl font-bold tracking-tight text-main">{value}</h3>
      <p className="text-sm text-secondary-text mt-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}