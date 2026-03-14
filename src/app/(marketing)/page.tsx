"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Activity,
  Briefcase,
  Users,
  FileText,
  Calendar,
  Pill,
  ShoppingCart,
  BarChart3,
  Package,
  MessageCircle,
  UserCog,
  Stethoscope,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  Star,
  Check,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Reusable scroll-animated wrapper                                  */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const dirs = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...dirs[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const features = [
  { icon: Briefcase, title: "Case Management", desc: "Track dental cases from intake to delivery with full lifecycle management and status tracking." },
  { icon: Users, title: "Patient Records", desc: "Comprehensive patient profiles with medical history, dental charts, and document storage." },
  { icon: FileText, title: "Smart Billing", desc: "Automated invoicing, payment tracking, insurance claims, and financial reporting." },
  { icon: Calendar, title: "Appointments", desc: "Drag-and-drop calendar with reminders, online booking, and schedule optimization." },
  { icon: Stethoscope, title: "Prescriptions", desc: "Digital prescriptions with drug interaction checks and pharmacy integration." },
  { icon: Pill, title: "Pharmacy Management", desc: "In-clinic pharmacy inventory, dispensing, and medication tracking." },
  { icon: Activity, title: "Orthodontics", desc: "Specialized orthodontic treatment plans, progress tracking, and appliance management." },
  { icon: UserCog, title: "Staff Management", desc: "Team scheduling, payroll, performance tracking, and role-based access control." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Real-time dashboards, revenue analytics, patient trends, and custom reports." },
  { icon: Package, title: "Inventory Control", desc: "Automated stock alerts, supplier management, and consumption tracking." },
  { icon: MessageCircle, title: "WhatsApp Integration", desc: "Send appointment reminders, treatment updates, and lab notifications via WhatsApp." },
  { icon: Shield, title: "Multi-User & Roles", desc: "Granular permissions, multi-branch support, and audit logging for compliance." },
];

const steps = [
  { num: "01", title: "Sign Up", desc: "Create your account in under 2 minutes. No credit card required for the free trial.", icon: Zap },
  { num: "02", title: "Set Up Your Clinic", desc: "Import your data, configure your workflows, and customize your workspace.", icon: Globe },
  { num: "03", title: "Start Managing", desc: "Run your entire practice from one powerful platform. See results from day one.", icon: TrendingUp },
];

const testimonials = [
  {
    name: "Dr. Sarah Chen",
    role: "Orthodontist, SmileCraft Dental",
    text: "DentalLab Pro transformed how we manage our orthodontic cases. The treatment tracking alone saved us 10+ hours per week. Our patient satisfaction scores jumped 40%.",
    avatar: "SC",
  },
  {
    name: "Dr. Michael Rivera",
    role: "Owner, Rivera Family Dentistry",
    text: "We switched from three different systems to DentalLab Pro. Everything is in one place now - billing, appointments, patient records. Our revenue increased 25% in the first quarter.",
    avatar: "MR",
  },
  {
    name: "Dr. Amina Okafor",
    role: "Lab Director, PrecisionDent Labs",
    text: "The case management and WhatsApp integration are game changers. Our dentist partners love the real-time updates. We've doubled our throughput without adding staff.",
    avatar: "AO",
  },
];

const stats = [
  { value: "1,000+", label: "Clinics Worldwide", icon: Globe },
  { value: "50,000+", label: "Cases Managed", icon: Briefcase },
  { value: "99.9%", label: "Platform Uptime", icon: Zap },
  { value: "4.9/5", label: "User Rating", icon: Star },
];

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function MarketingPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-6"
              >
                <Sparkles className="w-4 h-4" />
                Trusted by 1,000+ dental professionals
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight"
              >
                The Complete{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Dental Clinic
                </span>{" "}
                Platform
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg sm:text-xl text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Manage patients, cases, billing, appointments, and more - all in
                one beautifully designed platform built for modern dental practices.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <Link
                  href="/register"
                  className="group px-8 py-3.5 text-base font-semibold rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="px-8 py-3.5 text-base font-semibold rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur transition-all hover:scale-105 active:scale-95 text-center"
                >
                  Book a Demo
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex items-center gap-4 justify-center lg:justify-start text-sm text-gray-500"
              >
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> 14-day free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> HIPAA ready
                </span>
              </motion.div>
            </div>

            {/* Right: Animated mockup */}
            <motion.div
              initial={{ opacity: 0, x: 60, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="relative hidden lg:block"
            >
              <div className="relative">
                {/* Glow behind */}
                <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-2xl blur-2xl" />
                {/* Main card */}
                <div className="relative bg-[#12122a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                  {/* Top bar */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                    <span className="ml-3 text-xs text-gray-500">DentalLab Pro - Dashboard</span>
                  </div>
                  {/* Fake dashboard content */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Patients", val: "2,847", color: "from-indigo-500 to-indigo-600" },
                      { label: "Cases", val: "1,234", color: "from-violet-500 to-violet-600" },
                      { label: "Revenue", val: "$48.2K", color: "from-emerald-500 to-emerald-600" },
                    ].map((c) => (
                      <div
                        key={c.label}
                        className="bg-white/5 rounded-xl p-3 border border-white/5"
                      >
                        <p className="text-[10px] text-gray-500 mb-1">{c.label}</p>
                        <p className={`text-lg font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>
                          {c.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 mb-4">
                    <p className="text-xs text-gray-500 mb-3">Revenue Trend</p>
                    <div className="flex items-end gap-1.5 h-24">
                      {[40, 55, 45, 65, 50, 75, 60, 80, 70, 90, 85, 95].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                          className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500 to-violet-500 opacity-80"
                        />
                      ))}
                    </div>
                  </div>
                  {/* Fake list */}
                  <div className="space-y-2">
                    {["New patient: John D.", "Case #1234 completed", "Payment received: $850"].map(
                      (item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 border border-white/5"
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-400" />
                          <span className="text-xs text-gray-400">{item}</span>
                          <Clock className="w-3 h-3 text-gray-600 ml-auto" />
                          <span className="text-[10px] text-gray-600">{i + 1}m ago</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                {/* Floating badges */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="absolute -top-4 -right-4 bg-emerald-500/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +24% Growth
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className="absolute -bottom-3 -left-3 bg-indigo-500/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  HIPAA Compliant
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY ===== */}
      <section className="relative py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">
              Trusted by leading dental practices
            </p>
          </FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-40">
            {["SmileCraft", "DentaCore", "OrthoPlus", "BrightDent", "MolarTech", "PrecisionDent"].map(
              (name, i) => (
                <FadeIn key={name} delay={i * 0.1}>
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-400">
                    <Activity className="w-5 h-5" />
                    {name}
                  </div>
                </FadeIn>
              )
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Everything your clinic needs,{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                in one place
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              From patient management to analytics, DentalLab Pro covers every
              aspect of your dental practice.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="group relative h-full bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-sm border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Up and running in{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                minutes
              </span>
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.15}>
                <div className="relative text-center">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-indigo-500/40 to-violet-500/40" />
                  )}
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 mb-6">
                    <s.icon className="w-8 h-8 text-indigo-400" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="text-center bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-6 sm:p-8">
                  <s.icon className="w-6 h-6 text-indigo-400 mx-auto mb-3" />
                  <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Loved by{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                dental professionals
              </span>
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.15}>
                <div className="h-full bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-bold">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeIn direction="left">
              <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">
                About DentalLab Pro
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
                Built by dentists,{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  for dentists
                </span>
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                We started DentalLab Pro because we experienced firsthand the
                frustration of juggling multiple disconnected tools to run a
                dental practice. Our founding team includes practicing dentists,
                lab technicians, and software engineers who came together with one
                mission: to build the platform we always wished existed.
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Today, over 1,000 clinics in 30+ countries trust DentalLab Pro to
                manage their daily operations, serve their patients better, and
                grow their businesses.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  "HIPAA Compliant",
                  "SOC 2 Certified",
                  "GDPR Ready",
                  "256-bit Encryption",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </FadeIn>

            <FadeIn direction="right">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { val: "30+", label: "Countries" },
                  { val: "50K+", label: "Cases/month" },
                  { val: "24/7", label: "Support" },
                  { val: "< 200ms", label: "Response Time" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-center"
                  >
                    <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                      {item.val}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDBoNjAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjxwYXRoIGQ9Ik0wIDB2NjAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative text-center px-6 sm:px-12 py-16 sm:py-20">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                  Ready to transform your clinic?
                </h2>
                <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">
                  Join 1,000+ dental professionals who have streamlined their
                  practice with DentalLab Pro. Start your free trial today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="group px-8 py-3.5 text-base font-semibold rounded-full bg-white text-indigo-600 hover:bg-gray-100 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="px-8 py-3.5 text-base font-semibold rounded-full border-2 border-white/30 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
