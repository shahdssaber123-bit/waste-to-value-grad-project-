import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Recycle, TrendingUp, Shield, CheckCircle2, Bot, FileText, Bell, Route } from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_IMG = 'https://media.base44.com/images/public/69e277b2cca8ad6115f9cd35/d9644ffb9_generated_f4d3284c.png';

const stats = [
  { icon: Recycle,    label: '12,000+ Tons',  sub: 'Processed Monthly' },
  { icon: TrendingUp, label: '94% Recovery',  sub: 'Material Diverted from Landfill' },
  { icon: Shield,     label: 'ISO 14001',     sub: 'Certified Operations' },
];

export default function HeroSection() {
  const { currentUser } = useAuth();
  const dashboardPath = { supplier: '/supplier', admin: '/admin', industry: '/industry', driver: '/driver', hub_manager: '/hub-manager' }[currentUser?.role] || '/';
  const trustIndicators = [
    'Chain-of-Custody Tracking',
    'Verified Material Quality',
    'ESG-Ready Reporting',
  ];

  return (
    <section className="relative overflow-hidden">

      {/* ── Image fills the top 60% ─────────────────────────── */}
      <motion.div
        className="relative w-full min-h-[58vh] sm:min-h-[62vh] lg:min-h-[70vh]"
        initial={{ scale: 1.12, opacity: 0.72 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        <motion.img
          src={HERO_IMG}
          alt="Industrial recycling facility"
          className="w-full h-full min-h-[58vh] sm:min-h-[62vh] lg:min-h-[70vh] object-cover object-center"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-black/28" />

        {/* Floating badge — top left, small, unobtrusive */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ scale: 1.06, y: -3 }}
          className="absolute left-4 top-5 sm:left-8 sm:top-8 inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full panel-strong-overlay border border-cyan-200/35 shadow-2xl animate-float-strong"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow" />
          <span className="text-[11px] font-bold tracking-widest uppercase text-contrast-strong">
            B2B Circular Economy Platform
          </span>
        </motion.div>
        {/* Smart control card on the image, kept subtle so the hero image stays beautiful */}
        <motion.div
          initial={{ opacity: 0, x: 24, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="absolute bottom-5 right-4 hidden w-[360px] rounded-3xl border border-white/25 bg-white/88 p-5 shadow-2xl backdrop-blur-xl lg:block"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Live Platform</p>
              <h3 className="font-heading text-xl font-black text-slate-950">Waste Command Center</h3>
            </div>
            <div className="rounded-2xl bg-emerald-600 p-3 text-white"><Bot className="h-5 w-5" /></div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Route, title: 'Pickup → Hub → Factory', value: 'Synced workflow' },
              { icon: Bell, title: 'Role Notifications', value: 'Live validation alerts' },
              { icon: FileText, title: 'Printable Documents', value: 'Invoices & reports' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><item.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-sm font-extrabold text-slate-950">{item.title}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/* ── Clean text panel — pure white, no overlay ────────── */}
      <div className="border-t border-border/70 bg-background py-12 sm:py-14 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="max-w-5xl mx-auto text-center">

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-heading text-[clamp(2rem,7.6vw,4.4rem)] font-extrabold text-main leading-[1.04] mb-5 tracking-tight"
          >
            Verified Waste Logistics for{' '}
            <span className="text-main">Industrial Supply Chains</span>
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.14 }}
            className="font-heading text-xl sm:text-2xl font-bold text-main leading-tight mb-5"
          >
            Where Waste Becomes{' '}
            <span className="text-gradient-gold">Verified Value</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg text-secondary-text leading-relaxed mb-7 sm:mb-8 max-w-3xl mx-auto"
          >
            The enterprise platform connecting waste suppliers, logistics networks, processing hubs, and industrial buyers — with complete chain-of-custody traceability at every stage.
          </motion.p>
          {/* Centered CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-3 mb-10 sm:mb-12"
          >
            <Link to={currentUser ? dashboardPath : "/register"}>
              <motion.div whileHover={{ y: -4, scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-primary hover:brightness-105 text-white h-12 sm:h-14 px-7 sm:px-10 rounded-2xl text-sm sm:text-base font-bold shadow-2xl shadow-primary/35 transition-all duration-300 border border-cyan-300/30"
                >
                  {currentUser ? 'Go to Dashboard' : 'Join the Platform'}
                  <ArrowRight className="w-4 h-4 ml-2.5" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          <div className="mb-8 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {trustIndicators.map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.06 }}
                className="flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface-soft px-3 py-2.5 text-xs sm:text-sm font-semibold text-secondary-text"
              >
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </motion.div>
            ))}
          </div>

          {/* Stats row — clear, high-contrast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {stats.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.1 }}
                className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-main font-bold text-[15px] leading-tight">{item.label}</p>
                  <p className="text-muted-text text-xs mt-0.5">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}