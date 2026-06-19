import React from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import HeroSection from '@/components/home/HeroSection';
import MetricsStrip from '@/components/home/MetricsStrip';
import PlatformOverviewSection from '@/components/home/PlatformOverviewSection';
import MaterialsSection from '@/components/home/MaterialsSection';
import ProcessTimeline from '@/components/home/ProcessTimeline';
import ESGSection from '@/components/home/ESGSection';
import RolesSection from '@/components/home/RolesSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import FAQSection from '@/components/home/FAQSection';
import DashboardPreviewSection from '@/components/home/DashboardPreviewSection';
import ChainOfCustodySection from '@/components/home/ChainOfCustodySection';
import SystemCompletionSection from '@/components/home/SystemCompletionSection';
import CTASection from '@/components/home/CTASection';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <HeroSection />

      <MetricsStrip />

      <SystemCompletionSection />

      <PlatformOverviewSection />

      <section className="bg-background px-4 py-14 sm:px-6 sm:py-20 lg:px-10 xl:px-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">

          <Card className="border-border/80 bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="space-y-3 p-6">
              <Badge className="bg-primary/10 text-primary">
                Control Tower
              </Badge>

              <h3 className="font-heading text-xl font-bold">
                Live Logistics & Dispatch
              </h3>

              <p className="text-sm text-secondary-text">
                Track assigned drivers, trucks, hubs, ETA, and QA state
                in one operations board.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="space-y-3 p-6">
              <Badge className="bg-emerald-500/15 text-emerald-600">
                Environmental Impact
              </Badge>

              <h3 className="font-heading text-xl font-bold">
                Measured Impact, Not Claims
              </h3>

              <p className="text-sm text-secondary-text">
                Carbon offset, landfill diversion, and circularity metrics
                are calculated per operation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card transition-all hover:-translate-y-1 hover:shadow-xl">
            <CardContent className="space-y-3 p-6">
              <Badge className="bg-amber-500/15 text-amber-600">
                Flow
              </Badge>

              <h3 className="font-heading text-xl font-bold">
                From Pickup to Invoice
              </h3>

              <p className="text-sm text-secondary-text">
                Full workflow covering dispatch, driver handoff, hub QA,
                inventory, outbound, and billing.
              </p>
            </CardContent>
          </Card>

        </div>
      </section>

      <RolesSection />

      <MaterialsSection />

      <DashboardPreviewSection />

      <ProcessTimeline />

      {/* ESG SECTION */}
      <ESGSection />

      <ChainOfCustodySection />

      <TestimonialsSection />

      <FAQSection />

      <CTASection />

      <Footer />
    </div>
  );
}
