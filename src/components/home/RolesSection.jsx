import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Shield, Factory, Truck } from "lucide-react";

const roles = [
    {
        icon: Building2,
        title: "Supplier",
        desc: "Register waste materials, request pickups, track operations, and receive payouts. Full visibility into the lifecycle of your materials.",
        link: "/register",
        color: "from-red-800 to-red-900",
    },
    {
        icon: Shield,
        title: "Admin / HUB",
        desc: "Full operational control. Manage QA, inventory, drivers, and buyer reservations. Real-time dashboards and compliance reporting.",
        link: "/login",
        color: "from-amber-700 to-amber-800",
    },
    {
        icon: Factory,
        title: "Industry Buyer",
        desc: "Browse verified inventory, reserve materials, schedule meetings, and manage procurement contracts with full traceability.",
        link: "/register",
        color: "from-green-700 to-green-800",
    },
    {
        icon: Truck,
        title: "Driver",
        desc: "Receive pickup missions, update delivery status in real-time, and build your reputation with supplier ratings.",
        link: "/register",
        color: "from-stone-700 to-stone-800",
    },
];

export default function RolesSection() {
    return (
        <section className="py-16 sm:py-24 bg-gradient-warm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
                <div className="text-center mb-16">
                    <span className="gold-label mb-3 block">Ecosystem</span>
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 text-slate-950">
                        Built for{" "}
                        <span className="text-gradient-gold">
                            Every Stakeholder
                        </span>
                    </h2>
                    <p className="text-slate-950 max-w-xl mx-auto">
                        Four roles. One connected platform. Every action flows
                        through the system in real time.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
                    {roles.map((role, i) => (
                        <motion.div
                            key={role.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="group rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                        >
                            <div
                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                            >
                                <role.icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-slate-950">
                                {role.title}
                            </h3>
                            <p className="text-sm text-slate-950 leading-relaxed mb-5">
                                {role.desc}
                            </p>
                            <Link to={role.link}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto text-primary font-semibold group-hover:gap-3 transition-all"
                                >
                                    Get Started{" "}
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
