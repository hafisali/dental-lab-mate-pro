"use client";

import { useState, useRef, Fragment } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Zap,
  Shield,
  Clock,
  Users,
  HardDrive,
  Briefcase,
} from "lucide-react";
import { PLANS, type PlanTier } from "@/lib/plans";

/* ------------------------------------------------------------------ */
/*  Scroll animation wrapper                                          */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the credit will be applied to your next billing cycle.",
  },
  {
    q: "What happens after my free trial ends?",
    a: "After 14 days, you can choose any paid plan to continue. Your data will be preserved for 30 days after the trial ends, giving you time to decide. No credit card is required to start.",
  },
  {
    q: "Is my data secure and HIPAA compliant?",
    a: "Absolutely. We use 256-bit AES encryption, SOC 2 certified infrastructure, and follow all HIPAA guidelines. Your patient data is stored in isolated, encrypted databases with regular backups.",
  },
  {
    q: "Do you offer custom enterprise solutions?",
    a: "Yes. For large practices or chains with specific needs, we offer custom packages with dedicated infrastructure, custom integrations, SLA guarantees, and a dedicated account manager. Contact us for details.",
  },
  {
    q: "Can I import data from my existing system?",
    a: "Yes. We support importing from most major dental practice management systems. Our onboarding team will help you migrate your data seamlessly at no extra cost.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, Amex), bank transfers, and can also arrange invoicing for Enterprise customers.",
  },
];

/* ------------------------------------------------------------------ */
/*  Feature comparison table data                                     */
/* ------------------------------------------------------------------ */
const comparisonCategories = [
  {
    name: "Core Features",
    features: [
      { name: "Dashboard & Analytics", trial: true, starter: true, pro: true, enterprise: true },
      { name: "Case Management", trial: true, starter: true, pro: true, enterprise: true },
      { name: "Patient Records", trial: true, starter: true, pro: true, enterprise: true },
      { name: "Dentist Management", trial: true, starter: true, pro: true, enterprise: true },
      { name: "Basic Billing", trial: true, starter: true, pro: true, enterprise: true },
    ],
  },
  {
    name: "Advanced Features",
    features: [
      { name: "Appointments Calendar", trial: false, starter: true, pro: true, enterprise: true },
      { name: "Inventory Management", trial: false, starter: true, pro: true, enterprise: true },
      { name: "Advanced Analytics", trial: false, starter: true, pro: true, enterprise: true },
      { name: "Cash Flow Reports", trial: false, starter: true, pro: true, enterprise: true },
    ],
  },
  {
    name: "Premium Features",
    features: [
      { name: "Prescriptions", trial: false, starter: false, pro: true, enterprise: true },
      { name: "Orthodontics Module", trial: false, starter: false, pro: true, enterprise: true },
      { name: "Pharmacy Management", trial: false, starter: false, pro: true, enterprise: true },
      { name: "Staff & Payroll", trial: false, starter: false, pro: true, enterprise: true },
      { name: "WhatsApp Integration", trial: false, starter: false, pro: true, enterprise: true },
      { name: "Medical Certificates", trial: false, starter: false, pro: true, enterprise: true },
    ],
  },
  {
    name: "Enterprise Features",
    features: [
      { name: "Multi-Branch Support", trial: false, starter: false, pro: false, enterprise: true },
      { name: "Custom Branding", trial: false, starter: false, pro: false, enterprise: true },
      { name: "API Access", trial: false, starter: false, pro: false, enterprise: true },
      { name: "Custom Integrations", trial: false, starter: false, pro: false, enterprise: true },
      { name: "SLA Guarantee", trial: false, starter: false, pro: false, enterprise: true },
    ],
  },
  {
    name: "Limits",
    features: [
      { name: "Team Members", trial: "2", starter: "5", pro: "20", enterprise: "Unlimited" },
      { name: "Patients", trial: "50", starter: "500", pro: "5,000", enterprise: "Unlimited" },
      { name: "Cases / Month", trial: "20", starter: "200", pro: "2,000", enterprise: "Unlimited" },
      { name: "Storage", trial: "500 MB", starter: "5 GB", pro: "50 GB", enterprise: "500 GB" },
    ],
  },
  {
    name: "Support",
    features: [
      { name: "Email Support", trial: true, starter: true, pro: true, enterprise: true },
      { name: "Priority Support", trial: false, starter: true, pro: true, enterprise: true },
      { name: "Phone & Chat Support", trial: false, starter: false, pro: true, enterprise: true },
      { name: "Dedicated Account Manager", trial: false, starter: false, pro: false, enterprise: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tiers: PlanTier[] = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

  const getPrice = (tier: PlanTier) => {
    const plan = PLANS[tier];
    if (plan.price === 0) return { main: "Free", sub: "14 days" };
    const price = yearly
      ? Math.round(plan.yearlyPrice / 12)
      : plan.price;
    return {
      main: `$${price}`,
      sub: yearly ? "/mo billed yearly" : "/month",
    };
  };

  const getSavings = (tier: PlanTier) => {
    const plan = PLANS[tier];
    if (plan.price === 0) return null;
    const monthlyCost = plan.price * 12;
    const yearlyCost = plan.yearlyPrice;
    return monthlyCost - yearlyCost;
  };

  return (
    <>
      {/* Header */}
      <section className="relative pt-32 sm:pt-40 pb-20">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Choose the plan that{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                fits your practice
              </span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
              Start free, scale as you grow. All plans include a 14-day free trial.
              No credit card required.
            </p>
          </FadeIn>

          {/* Toggle */}
          <FadeIn delay={0.15} className="mt-10">
            <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full p-1.5">
              <button
                onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  !yearly
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  yearly
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Yearly
                <span className="ml-1.5 text-xs text-emerald-400 font-semibold">
                  Save 2 months
                </span>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {tiers.map((tier, i) => {
              const plan = PLANS[tier];
              const price = getPrice(tier);
              const savings = getSavings(tier);
              const isPopular = plan.popular;

              return (
                <FadeIn key={tier} delay={i * 0.1}>
                  <div
                    className={`relative h-full flex flex-col rounded-2xl border p-6 sm:p-7 transition-all ${
                      isPopular
                        ? "bg-gradient-to-b from-indigo-500/10 to-violet-500/5 border-indigo-500/30 shadow-xl shadow-indigo-500/10"
                        : "bg-white/[0.03] border-white/5 hover:border-white/10"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-bold uppercase tracking-wider shadow-lg">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-5">
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-extrabold">{price.main}</span>
                      <span className="text-gray-500 ml-1 text-sm">{price.sub}</span>
                      {yearly && savings && (
                        <p className="text-sm text-emerald-400 mt-1 font-medium">
                          Save ${savings}/year
                        </p>
                      )}
                    </div>

                    <Link
                      href="/register"
                      className={`block text-center py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95 mb-6 ${
                        isPopular
                          ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-white/10 hover:bg-white/15 text-white"
                      }`}
                    >
                      {tier === "TRIAL" ? "Start Free Trial" : tier === "ENTERPRISE" ? "Contact Sales" : "Get Started"}
                    </Link>

                    <ul className="space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-gray-400">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Detailed{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                feature comparison
              </span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto">
              See exactly what you get with each plan.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 pr-4 text-sm font-medium text-gray-500 w-1/3">Feature</th>
                    {tiers.map((tier) => (
                      <th key={tier} className="text-center py-4 px-3 text-sm font-semibold">
                        <span className={PLANS[tier].popular ? "text-indigo-400" : "text-gray-300"}>
                          {PLANS[tier].name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonCategories.map((cat) => (
                    <Fragment key={cat.name}>
                      <tr>
                        <td
                          colSpan={5}
                          className="pt-8 pb-3 text-xs font-bold text-indigo-400 uppercase tracking-widest"
                        >
                          {cat.name}
                        </td>
                      </tr>
                      {cat.features.map((f) => (
                        <tr
                          key={f.name}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3 pr-4 text-sm text-gray-400">{f.name}</td>
                          {(["trial", "starter", "pro", "enterprise"] as const).map((key) => {
                            const val = f[key];
                            return (
                              <td key={key} className="text-center py-3 px-3">
                                {typeof val === "boolean" ? (
                                  val ? (
                                    <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                                  ) : (
                                    <X className="w-4 h-4 text-gray-600 mx-auto" />
                                  )
                                ) : (
                                  <span className="text-sm text-gray-300 font-medium">{val}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently asked{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
          </FadeIn>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-sm font-semibold pr-4">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-24 sm:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative text-center px-6 sm:px-12 py-16 sm:py-20">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                  Still have questions?
                </h2>
                <p className="text-lg text-indigo-100 max-w-xl mx-auto mb-8">
                  Our team is here to help you find the perfect plan for your
                  practice. Let&apos;s chat.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="group px-8 py-3.5 text-base font-semibold rounded-full bg-white text-indigo-600 hover:bg-gray-100 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a
                    href="mailto:hello@dentallabpro.com"
                    className="px-8 py-3.5 text-base font-semibold rounded-full border-2 border-white/30 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    Contact Sales
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
