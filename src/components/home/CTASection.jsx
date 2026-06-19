import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  const { currentUser } = useAuth();
  const dashboardPath = { supplier: '/supplier', admin: '/admin', industry: '/industry', driver: '/driver', hub_manager: '/hub-manager' }[currentUser?.role] || '/';
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10">
        <div className="rounded-3xl border border-border/80 bg-gradient-hero p-7 text-center shadow-xl sm:p-10">
          <h3 className="font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
            Build a cleaner, verified circular supply chain.
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
            Accelerate onboarding, improve logistics visibility, and trade verified materials with confidence.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={currentUser ? dashboardPath : "/register"}>
              <Button className="h-11 w-full rounded-xl bg-white px-6 font-semibold text-main hover:bg-white/95 sm:w-auto">
                {currentUser ? 'Open Your Dashboard' : 'Start Onboarding'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
