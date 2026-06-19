import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Recycle, Truck, TrendingUp, Users } from 'lucide-react';

const metrics = [
  { icon: Recycle,    end: 12480, suffix: '+',  label: 'Tons Processed',    sub: 'Monthly average across all hubs' },
  { icon: Truck,      end: 3200,  suffix: '+',  label: 'Pickups Completed', sub: 'Active logistics routes nationwide' },
  { icon: TrendingUp, end: 94.2,  suffix: '%', decimals: 1, label: 'Recovery Rate', sub: 'Material diverted from landfill' },
  { icon: Users,      end: 48,    suffix: '+',  label: 'Active Partners',   sub: 'Suppliers, buyers & certified hubs' },
];

function AnimatedCounter({ end, suffix, decimals = 0, duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!inView) return;
    let val = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      val += step;
      if (val >= end) { setCount(end); clearInterval(timer); }
      else setCount(val);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}{suffix}
    </span>
  );
}

export default function MetricsStrip() {
  return (
    <section id="platform" className="py-16 sm:py-20 bg-gradient-warm border-y border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              className="flex flex-col items-center text-center group rounded-2xl border border-border/70 bg-card p-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/18 transition-colors duration-300">
                <m.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                <AnimatedCounter end={m.end} suffix={m.suffix} decimals={m.decimals} />
              </p>
              <p className="text-sm font-bold text-foreground mt-1.5">{m.label}</p>
              <p className="text-xs text-muted-text mt-1 leading-snug max-w-[170px]">{m.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}