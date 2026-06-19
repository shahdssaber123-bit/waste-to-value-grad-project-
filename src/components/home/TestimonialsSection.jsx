import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  { name: 'Nasser Al-Rashid', role: 'CEO, Al-Rashid Recycling', text: 'Waste-to-Value transformed how we handle our supply chain. The transparency and speed of operations is unmatched in the region.', rating: 5 },
  { name: 'Dr. Fatima Al-Zahrani', role: 'Procurement Director, GreenPack Industries', text: 'We now source 80% of our raw materials through the platform. The purity grades are consistently reliable and the documentation is flawless.', rating: 5 },
  { name: 'Khalid Al-Otaibi', role: 'Fleet Manager, WTV Logistics', text: 'The driver app makes route management effortless. Real-time updates keep everyone in the loop and our completion rates have never been higher.', rating: 5 },
];

const partners = ['Saudi Aramco', 'NEOM', 'KAEC', 'SABIC', 'Ma\'aden', 'SEC'];

export default function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">Trusted By Industry Leaders</span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">What Our Partners Say</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl border border-border/80 p-6 hover:shadow-lg transition-all"
            >
              <div className="flex gap-1 mb-4">
                {Array(t.rating).fill(0).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-secondary-text mb-6">"{t.text}"</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partners */}
        <div className="border-t border-border/60 pt-12">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-muted-text mb-8">Trusted Partners & Integrations</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {partners.map(p => (
              <span key={p} className="text-lg font-heading font-bold text-muted-text hover:text-secondary-text transition-colors">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}