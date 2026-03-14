"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/glass-card";
import { PLANS, type PlanTier } from "@/lib/plans";
import {
  Building2, Phone, Globe, DollarSign, Upload, Palette, Users,
  Mail, ArrowRight, ArrowLeft, Check, Sparkles, Crown, Star,
  ChevronRight, Plus, Trash2, Loader2, Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland",
];

const CURRENCIES = [
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "CAD", label: "CAD - Canadian Dollar" },
  { code: "AUD", label: "AUD - Australian Dollar" },
  { code: "AED", label: "AED - UAE Dirham" },
  { code: "INR", label: "INR - Indian Rupee" },
  { code: "JPY", label: "JPY - Japanese Yen" },
];

const COLOR_SWATCHES = [
  "#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4",
  "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

const STEPS = [
  { label: "Clinic Details", icon: Building2 },
  { label: "Branding", icon: Palette },
  { label: "Invite Team", icon: Users },
  { label: "Choose Plan", icon: Crown },
];

interface TeamInvite {
  email: string;
  role: string;
}

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Clinic Details
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");

  // Step 2: Branding
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [tagline, setTagline] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Step 3: Invite Team
  const [invites, setInvites] = useState<TeamInvite[]>([{ email: "", role: "RECEPTION" }]);
  const [inviteSending, setInviteSending] = useState(false);

  // Step 4: Plan
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("TRIAL");

  const user = session?.user as any;

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "RECEPTION" }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof TeamInvite, value: string) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const sendInvitations = async () => {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) return;

    setInviteSending(true);
    let sent = 0;

    for (const inv of validInvites) {
      try {
        const res = await fetch("/api/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inv.email, role: inv.role }),
        });
        if (res.ok) sent++;
      } catch {
        // continue sending others
      }
    }

    if (sent > 0) {
      toast.success(`${sent} invitation${sent > 1 ? "s" : ""} sent!`);
    }
    setInviteSending(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          phone,
          timezone,
          currency,
          logo: logoPreview,
          primaryColor: brandColor,
          tagline,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to complete onboarding");
        return;
      }

      toast.success("Onboarding complete! Welcome aboard.");
      await updateSession();
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 3) {
      handleComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    if (step === 3) {
      handleComplete();
    } else {
      setStep(step + 1);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Set up your clinic</h1>
          <p className="text-muted-foreground mt-2">
            {user?.labName ? `Welcome to ${user.labName}!` : "Welcome!"} Let&apos;s get you started.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  i <= step ? "text-indigo-600" : "text-muted-foreground"
                } ${i < step ? "cursor-pointer hover:text-indigo-700" : "cursor-default"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step
                      ? "bg-indigo-600 text-white"
                      : i === step
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <GlassCard hover="none" padding="p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Clinic Details */}
            {step === 0 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Clinic Details</h2>
                  <p className="text-sm text-muted-foreground">Tell us about your clinic location and preferences.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, Suite 100, City, State, ZIP"
                      rows={2}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Timezone</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all appearance-none"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Currency</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all appearance-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Branding */}
            {step === 1 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Branding</h2>
                  <p className="text-sm text-muted-foreground">Customize the look and feel of your clinic workspace.</p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Clinic Logo</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleLogoDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                      dragOver
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                        : "border-border hover:border-indigo-400"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {logoPreview ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-24 h-24 object-contain rounded-xl"
                        />
                        <p className="text-sm text-muted-foreground">Click or drag to replace</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Drop your logo here or click to browse</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brand Color */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">Brand Color</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {COLOR_SWATCHES.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBrandColor(color)}
                        className={`w-10 h-10 rounded-xl transition-all ${
                          brandColor === color
                            ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-border"
                      />
                    </div>
                  </div>
                </div>

                {/* Tagline */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Your smile, our priority"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Invite Team */}
            {step === 2 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Invite Your Team</h2>
                  <p className="text-sm text-muted-foreground">Add team members to your clinic. You can always invite more later.</p>
                </div>

                <div className="space-y-3">
                  {invites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="email"
                          value={inv.email}
                          onChange={(e) => updateInvite(i, "email", e.target.value)}
                          placeholder="colleague@example.com"
                          className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                        />
                      </div>
                      <select
                        value={inv.role}
                        onChange={(e) => updateInvite(i, "role", e.target.value)}
                        className="h-11 px-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                      >
                        <option value="RECEPTION">Reception</option>
                        <option value="DENTIST">Dentist</option>
                        <option value="TECHNICIAN">Technician</option>
                        <option value="LAB_MANAGER">Lab Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      {invites.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInvite(i)}
                          className="w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-300 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addInvite}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add another
                </button>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={sendInvitations}
                    disabled={inviteSending || !invites.some((inv) => inv.email.trim())}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" /> Send Invitations
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Choose Plan */}
            {step === 3 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">Choose Your Plan</h2>
                  <p className="text-sm text-muted-foreground">Start with your free trial and upgrade anytime.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.values(PLANS) as any[]).map((plan) => (
                    <button
                      key={plan.tier}
                      type="button"
                      onClick={() => setSelectedPlan(plan.tier)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                        selectedPlan === plan.tier
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                          : "border-border hover:border-indigo-300"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                            <Star className="w-3 h-3" /> Recommended
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{plan.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === plan.tier
                              ? "border-indigo-500 bg-indigo-500"
                              : "border-border"
                          }`}
                        >
                          {selectedPlan === plan.tier && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                        {plan.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 4).map((f: string, fi: number) => (
                          <li key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-xs text-indigo-500 font-medium">
                            +{plan.features.length - 4} more features
                          </li>
                        )}
                      </ul>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <div>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : step === 3 ? (
                  <>
                    {selectedPlan === "TRIAL" ? "Start Trial" : "Subscribe"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
