import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Database, Route, ShieldCheck, Truck, Factory } from 'lucide-react';

const items = [
  { icon: ShieldCheck, title: 'Protected role portals', text: 'Supplier, Driver, Hub Manager, Factory and Admin routes require a real backend session.' },
  { icon: Route, title: 'End-to-end flow audit', text: 'Each core action is mapped from button → service → API → controller → validation → database → UI refresh.' },
  { icon: Truck, title: 'Driver proof workflow', text: 'Drivers must start, record weight, upload photo proof and save proof notes before completion.' },
  { icon: Database, title: 'Database-driven demo', text: 'Seeders build realistic users, contracts, pickups, hub inventory, requests, invoices and notifications.' },
  { icon: Factory, title: 'Factory 48h window', text: 'Outbound shipments now follow schedule → ship → factory receipt → rejection window → invoice.' },
  { icon: CheckCircle2, title: 'Sequence-system alignment', text: 'Routing, QA, baling, inventory, invoicing, penalties and notifications are documented in the completion notes.' },
];

export default function SystemCompletionSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-10 xl:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.22),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <Badge className="mb-4 bg-emerald-400/15 text-emerald-200">System Complete v2</Badge>
          <h2 className="font-heading text-3xl font-black tracking-tight sm:text-4xl">A visibly rebuilt Waste-to-Value operating system</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">This version is designed to feel different immediately: live control flow, stronger validation, database-first behavior, proof-based logistics, QA processing and factory invoicing aligned to the official sequence diagrams.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
                <CardContent className="p-5">
                  <Icon className="mb-3 h-6 w-6 text-emerald-300" />
                  <h3 className="font-heading text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
