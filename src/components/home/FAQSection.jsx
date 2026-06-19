import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const faqs = [
    {
        q: "How does the pricing model work?",
        a: "Our platform uses market-reference pricing updated weekly. Suppliers are paid based on actual weight, purity grade, and current market rates after QA verification at our hubs.",
    },
    {
        q: "What materials do you accept?",
        a: "We handle PET, HDPE, mixed paper, cardboard (OCC), aluminum, steel/ferrous metals, clear and mixed glass, e-waste, and organic waste. Each material has specific QA criteria and grading standards.",
    },
    {
        q: "How is quality assurance conducted?",
        a: "Every inbound shipment undergoes contamination testing, weight verification, and purity grading at our processing hubs. Results are documented with photographic evidence and ISO-compliant certificates.",
    },
    {
        q: "Can I integrate my ERP system?",
        a: "Yes. We offer REST APIs and webhook integrations for SAP, Oracle, and custom ERP systems. Our enterprise tier includes dedicated integration support.",
    },
    {
        q: "What regions do you operate in?",
        a: "Currently operational across Saudi Arabia with expansion into UAE, Egypt, and Jordan. Our logistics network covers major industrial zones and port cities.",
    },
    {
        q: "How does the ESG reporting work?",
        a: "Every transaction generates CO₂ offset data, landfill diversion metrics, and circularity scores. Reports are auto-generated and meet EU taxonomy and Saudi Vision 2030 standards.",
    },
];

export default function FAQSection() {
    return (
        <section className="bg-[#041B22] py-16 sm:py-24">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10">
                <div className="mb-12 text-center">
                    <span className="mb-3 block text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                        FAQ
                    </span>
                    <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
                        Common <span className="text-amber-400">Questions</span>
                    </h2>
                </div>
                <Accordion type="single" collapsible className="space-y-3">
                    {faqs.map((faq, i) => (
                        <AccordionItem
                            key={i}
                            value={`item-${i}`}
                            className="rounded-xl border border-cyan-900/40 bg-[#062B35] px-5 text-white sm:px-6"
                        >
                            <AccordionTrigger className="py-5 text-left text-sm font-semibold text-white hover:no-underline">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="pb-5 text-sm leading-relaxed text-white/75">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                <div className="mt-12 rounded-3xl border border-cyan-900/40 bg-[#062B35] p-7 text-center text-white shadow-xl sm:mt-16 sm:p-12">
                    <h3 className="font-heading mb-3 text-2xl font-bold">
                        Ready to{" "}
                        <span className="text-amber-400">Transform</span> Your
                        Supply Chain?
                    </h3>
                    <p className="mb-6 text-sm text-white/80">
                        Join the leading B2B waste commodity platform today.
                    </p>
                    <Link to="/register">
                        <Button
                            size="lg"
                            className="h-12 rounded-xl bg-black px-8 font-semibold text-white hover:bg-slate-900"
                        >
                            Get Started Free{" "}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
