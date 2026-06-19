import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Recycle, ArrowRight, Building2, Factory } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { submitApplication } from "@/services/authService";

const QA_IMG =
    "https://media.base44.com/images/public/69e277b2cca8ad6115f9cd35/e622644fb_generated_5990b155.png";

const roleOptions = [
    {
        value: "supplier",
        label: "Supplier Registration Request",
        icon: Building2,
        desc: "Submit company request for contract-based onboarding",
        color: "from-blue-600 to-blue-700",
    },
    {
        value: "industry",
        label: "Factory Registration Request",
        icon: Factory,
        desc: "Submit factory request for outbound material contracts",
        color: "from-amber-600 to-amber-700",
    },
];

export default function Register() {
    const [step, setStep] = useState("role");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        company: "",
        role: "",
        location: "",
        phone: "",
        sector: "",
        tax_id: "",
        required_commodity: "",
        message: "",
        vehicle: "",
        plate_number: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const { currentUser, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && currentUser?.role) {
            navigate(
                {
                    supplier: "/supplier",
                    industry: "/industry",
                    driver: "/driver",
                    hub_manager: "/hub-manager",
                    admin: "/admin",
                }[currentUser.role] || "/",
                { replace: true },
            );
        }
    }, [isAuthenticated, currentUser, navigate]);

    const handleRoleSelect = (role) => {
        setForm({ ...form, role });
        setStep("details");
    };

    const validators = {
        name: (v) =>
            !v.trim()
                ? "Full name is required."
                : /^[A-Za-zأ-ي\s.'-]+$/.test(v.trim())
                  ? ""
                  : "Name must contain letters only.",
        email: (v) =>
            !v.trim()
                ? "Work email is required."
                : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
                  ? ""
                  : "Enter a valid email address.",
        company: (v) => (!v.trim() ? "Company name is required." : ""),

        phone: (v) =>
            !v.trim()
                ? "Phone number is required."
                : /^\+?[0-9\s\-(). ]{7,20}$/.test(v.trim())
                  ? ""
                  : "Enter a valid phone number.",

        tax_id: (v) =>
            !v.trim()
                ? "Tax ID is required."
                : /^[A-Za-z0-9\-/]{2,50}$/.test(v.trim())
                  ? ""
                  : "Tax ID can contain letters, numbers, - or / only.",

        location: (v) => (!v.trim() ? "Location is required." : ""),
        password: (v) =>
            !v
                ? "Password is required."
                : v.length < 8
                  ? "Password must be at least 8 characters."
                  : /^(?=.*[A-Za-z])(?=.*\d).+$/.test(v)
                    ? ""
                    : "Password must contain letters and numbers.",
        confirmPassword: (v) =>
            v !== form.password ? "Passwords do not match." : "",
        sector: (v) =>
            form.role === "industry" && !v.trim()
                ? "Factory sector is required."
                : "",
        required_commodity: (v) =>
            form.role === "industry" && !v.trim()
                ? "Required commodity is required."
                : "",
    };

    const validate = () => {
        const next = {};
        Object.entries(validators).forEach(([key, fn]) => {
            const message = fn(form[key] || "");
            if (message) next[key] = message;
        });
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const fieldError = (name) =>
        errors[name] ? (
            <p className="mt-1.5 text-xs font-semibold text-red-500">
                {errors[name]}
            </p>
        ) : null;

    const updateField = (name, value) => {
        setForm({ ...form, [name]: value });
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error("Please fix the highlighted fields.");
            return;
        }

        try {
            setSubmitting(true);
            await submitApplication({
                idempotency_token:
                    crypto?.randomUUID?.() || "app-" + Date.now(),
                company_name: form.company || form.name,
                contact_name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password,
                role: form.role === "industry" ? "factory" : "supplier",
                tax_id: form.tax_id,
                location: form.location.replace(/\//g, " - "),
                required_commodity:
                    form.role === "industry"
                        ? form.required_commodity ||
                          form.sector ||
                          "PET Plastic"
                        : null,
                message:
                    form.message ||
                    (form.sector
                        ? "Sector: " + form.sector
                        : "Submitted from React frontend"),
            });

            toast.success(
                "Application submitted to platform. Super Admin will review it after email verification.",
            );
            navigate("/login");
        } catch (error) {
            // ====== FIX: استخدم fieldErrors من الـ backend مباشرة ======
            // لو الـ backend رجع per-field errors (e.g. { email: ['...'], phone: ['...'] })
            if (error?.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
                const mapped = {};
                Object.entries(error.fieldErrors).forEach(([key, msgs]) => {
                    mapped[key] = Array.isArray(msgs) ? msgs[0] : msgs;
                });
                setErrors((prev) => ({ ...prev, ...mapped }));
                toast.error("Please fix the highlighted fields.", {
                    description: Object.values(mapped)[0],
                });
                return;
            }

            // ====== fallback: keyword matching بس على الـ field المتأثر فعلاً ======
            const message =
                error?.technicalMessage ||
                error?.message ||
                "Unable to submit application.";

            const fieldErrors = {};

            // كل كلمة keyword بتعمل error على field واحد بس مش على الكل
            if (message.toLowerCase().includes("email")) {
                fieldErrors.email = "This email is already used or invalid.";
            } else if (message.toLowerCase().includes("phone")) {
                fieldErrors.phone = "Please enter a valid phone number.";
            } else if (
                message.toLowerCase().includes("tax") ||
                message.toLowerCase().includes("tax_id")
            ) {
                fieldErrors.tax_id = "Please enter a valid Tax ID.";
            } else if (message.toLowerCase().includes("location")) {
                fieldErrors.location = "Please enter your company location.";
            }

            if (Object.keys(fieldErrors).length > 0) {
                setErrors((prev) => ({ ...prev, ...fieldErrors }));
            }

            toast.error("Check your information", {
                description:
                    Object.values(fieldErrors)[0] ||
                    message ||
                    "Please review the highlighted fields.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedRole = roleOptions.find((r) => r.value === form.role);

    return (
        <div className="min-h-screen flex">
            <div className="hidden lg:flex lg:w-[46%] relative items-center justify-center">
                <img
                    src={QA_IMG}
                    alt="Quality inspection at hub"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,30%,8%)]/80 to-[hsl(168,45%,18%)]/70" />
                <div className="relative z-10 p-12 max-w-md">
                    <Link to="/" className="flex items-center gap-2.5 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                            <Recycle className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-xl text-white">
                            Waste-to-Value
                        </span>
                    </Link>
                    <h2 className="font-heading text-3xl font-bold text-white mb-4 leading-tight">
                        Join the Circular Economy
                    </h2>
                    <p className="text-white/85 leading-relaxed text-[15px]">
                        Connect with a growing network of suppliers, hubs,
                        buyers, and drivers — all on one transparent,
                        enterprise-grade platform.
                    </p>
                    <div className="mt-10 space-y-3">
                        {[
                            "Full chain-of-custody tracking",
                            "ISO-compliant documentation",
                            "Real-time operational visibility",
                        ].map((t, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <p className="text-sm text-white/85">{t}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
                <div className="w-full max-w-md">
                    <Link
                        to="/"
                        className="flex items-center gap-2 mb-10 lg:hidden"
                    >
                        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
                            <Recycle className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-lg">
                            Waste-to-Value
                        </span>
                    </Link>

                    <AnimatePresence mode="wait">
                        {step === "role" && (
                            <motion.div
                                key="role"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35 }}
                            >
                                <h1 className="font-heading text-2xl font-bold mb-1.5">
                                    How will you use the platform?
                                </h1>
                                <p className="text-sm text-muted-foreground mb-8">
                                    Public onboarding supports Supplier/Factory
                                    requests only. Employees are created by
                                    Super Admin.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {roleOptions.map((opt, i) => (
                                        <motion.button
                                            key={opt.value}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            onClick={() =>
                                                handleRoleSelect(opt.value)
                                            }
                                            className="group text-left p-5 rounded-2xl border border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/6 transition-all duration-300 bg-card hover:bg-primary/[0.02]"
                                        >
                                            <div
                                                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300`}
                                            >
                                                <opt.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <p className="font-semibold text-sm mb-1">
                                                {opt.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {opt.desc}
                                            </p>
                                        </motion.button>
                                    ))}
                                </div>
                                <p className="text-center text-sm text-muted-foreground mt-8">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Sign In
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {step === "details" && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.35 }}
                            >
                                <button
                                    onClick={() => setStep("role")}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 mb-6 transition-colors"
                                >
                                    ← Back to role selection
                                </button>
                                {selectedRole && (
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/12 mb-7">
                                        <div
                                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedRole.color} flex items-center justify-center shrink-0`}
                                        >
                                            <selectedRole.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Joining as
                                            </p>
                                            <p className="font-semibold text-sm">
                                                {selectedRole.label}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <h1 className="font-heading text-2xl font-bold mb-1.5">
                                    Complete your profile
                                </h1>
                                <p className="text-sm text-muted-foreground mb-7">
                                    Submit request details. Account approval
                                    happens after review, meeting, and contract
                                    signing.
                                </p>
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-4"
                                >
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Full Name *
                                        </Label>
                                        <Input
                                            value={form.name}
                                            onChange={(e) =>
                                                updateField(
                                                    "name",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="Your full name"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("name")}
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Work Email *
                                        </Label>
                                        <Input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                updateField(
                                                    "email",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="your@company.com"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("email")}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                                Company
                                            </Label>
                                            <Input
                                                value={form.company}
                                                onChange={(e) =>
                                                    updateField(
                                                        "company",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={validate}
                                                placeholder="Company name"
                                                className="h-11 rounded-xl"
                                            />
                                            {fieldError("company")}
                                        </div>
                                        <div>
                                            <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                                Phone
                                            </Label>
                                            <Input
                                                value={form.phone}
                                                onChange={(e) =>
                                                    updateField(
                                                        "phone",
                                                        e.target.value,
                                                    )
                                                }
                                                onBlur={validate}
                                                placeholder="+20 1XX XXX XXXX"
                                                className="h-11 rounded-xl"
                                            />
                                            {fieldError("phone")}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Tax ID *
                                        </Label>
                                        <Input
                                            value={form.tax_id}
                                            onChange={(e) =>
                                                updateField(
                                                    "tax_id",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="Commercial / tax registration ID"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("tax_id")}
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Location
                                        </Label>
                                        <Input
                                            value={form.location}
                                            onChange={(e) =>
                                                updateField(
                                                    "location",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="City / Area"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("location")}
                                    </div>
                                    {form.role === "industry" && (
                                        <>
                                            <div>
                                                <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                                    Sector
                                                </Label>
                                                <Input
                                                    value={form.sector}
                                                    onChange={(e) =>
                                                        updateField(
                                                            "sector",
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={validate}
                                                    placeholder="Manufacturing"
                                                    className="h-11 rounded-xl"
                                                />
                                                {fieldError("sector")}
                                            </div>
                                            <div>
                                                <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                                    Required Commodity
                                                </Label>
                                                <Input
                                                    value={
                                                        form.required_commodity
                                                    }
                                                    onChange={(e) =>
                                                        updateField(
                                                            "required_commodity",
                                                            e.target.value,
                                                        )
                                                    }
                                                    onBlur={validate}
                                                    placeholder="PET, HDPE, OCC..."
                                                    className="h-11 rounded-xl"
                                                />
                                                {fieldError(
                                                    "required_commodity",
                                                )}
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Password *
                                        </Label>
                                        <Input
                                            type="password"
                                            value={form.password}
                                            onChange={(e) =>
                                                updateField(
                                                    "password",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="Create password"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("password")}
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground uppercase tracking-wide">
                                            Confirm Password *
                                        </Label>
                                        <Input
                                            type="password"
                                            value={form.confirmPassword}
                                            onChange={(e) =>
                                                updateField(
                                                    "confirmPassword",
                                                    e.target.value,
                                                )
                                            }
                                            onBlur={validate}
                                            placeholder="Confirm password"
                                            className="h-11 rounded-xl"
                                        />
                                        {fieldError("confirmPassword")}
                                    </div>
                                    <Button
                                        disabled={submitting}
                                        type="submit"
                                        className="w-full h-11 rounded-xl bg-gradient-primary hover:opacity-90 text-white font-semibold mt-2"
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit Registration Request"}{" "}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </form>
                                <p className="text-center text-sm text-muted-foreground mt-6">
                                    Already have an account?{" "}
                                    <Link
                                        to="/login"
                                        className="text-primary font-semibold hover:underline"
                                    >
                                        Sign In
                                    </Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
