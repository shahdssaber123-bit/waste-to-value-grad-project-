import React from 'react';
import { Factory, PackageSearch, ShieldCheck, Truck } from 'lucide-react';
import SectionHeader from '@/components/home/SectionHeader';
import FeatureCard from '@/components/home/FeatureCard';

const overviewItems = [
  {
    icon: PackageSearch,
    title: 'Supplier Onboarding & Material Intake',
    description: 'Capture source information, collection schedules, and material declarations with consistent onboarding workflows.',
  },
  {
    icon: Truck,
    title: 'Logistics Coordination',
    description: 'Coordinate driver dispatch, pickup SLAs, and route visibility in one operational control layer.',
  },
  {
    icon: ShieldCheck,
    title: 'Hub QA & Batch Verification',
    description: 'Verify weights, contamination rates, and purity grades while generating auditable quality records.',
  },
  {
    icon: Factory,
    title: 'Factory Offtake & Trading',
    description: 'Match certified inventory to industrial buyers with transparent batch-level data and pricing clarity.',
  },
];

export default function PlatformOverviewSection() {
  return (
    <section className="bg-background py-16 sm:py-20" id="platform-overview">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="border border-border rounded-xl p-8 max-w-2xl mb-10">
          <SectionHeader
            eyebrow="Platform Overview"
            title="A Connected Network for"
            highlight="Circular Material Flow"
            description="Waste-to-Value links suppliers, drivers, hubs, and industrial buyers into a single verified flow from pickup to factory delivery."
            titleClassName="text-foreground"
            descriptionClassName="text-muted-foreground"
            eyebrowClassName="text-emerald-500"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewItems.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
