"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import {
  CreditCard,
  TrendingUp,
  Users,
  Database,
  HardDrive,
  Check,
  X,
  Crown,
  Zap,
  Star,
  Building2,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PLANS, type PlanTier, getDaysRemaining } from "@/lib/plans";
import toast from "react-hot-toast";

interface UsageData {
  plan: {
    tier: PlanTier;
    name: string;
    price: number;
    yearlyPrice: number;
    trialEndsAt: string | null;
    subscriptionId: string | null;
  };
  limits: {
    maxUsers: number;
    maxPatients: number;
    maxCasesPerMonth: number;
    maxStorageMB: number;
  };
  usage: {
    users: number;
    patients: number;
    casesThisMonth: number;
    storageMB: number;
  };
  percentages: {
    users: number;
    patients: number;
    casesThisMonth: number;
    storageMB: number;
  };
}

const tierIcons: Record<PlanTier, typeof Star> = {
  TRIAL: Zap,
  STARTER: Star,
  PROFESSIONAL: Crown,
  ENTERPRISE: Building2,
};

const tierGradients: Record<PlanTier, string> = {
  TRIAL: "from-slate-500 to-slate-700",
  STARTER: "from-blue-500 to-blue-700",
  PROFESSIONAL: "from-indigo-500 to-violet-600",
  ENTERPRISE: "from-amber-500 to-orange-600",
};

const tierBadgeColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  past_due: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  canceled: "bg-slate-50 text-slate-700 dark:bg-slate-950/50 dark:text-slate-300",
};

function getProgressColor(percentage: number) {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

function formatStorage(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription activated successfully!");
    }
    if (searchParams.get("canceled") === "true") {
      toast("Checkout was canceled.", { icon: "ℹ️" });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/billing/usage");
      if (!res.ok) throw new Error("Failed to fetch usage");
      const data = await res.json();
      setUsageData(data);
    } catch (error) {
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (tier: PlanTier) => {
    const plan = PLANS[tier];
    const priceId = billingInterval === "monthly"
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly;

    if (!priceId) {
      toast.error("Price not configured for this plan");
      return;
    }

    setCheckoutLoading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, interval: billingInterval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Subscription" subtitle="Manage your plan and billing" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  const currentTier = usageData?.plan.tier || "TRIAL";
  const currentPlan = PLANS[currentTier];
  const TierIcon = tierIcons[currentTier];
  const isTrialPlan = currentTier === "TRIAL";
  const trialDaysRemaining = usageData?.plan.trialEndsAt
    ? getDaysRemaining(new Date(usageData.plan.trialEndsAt))
    : 0;
  const status = (isTrialPlan ? "trialing" : "active") as "active" | "trialing" | "past_due";

  const usageMeters = [
    {
      label: "Team Members",
      icon: Users,
      current: usageData?.usage.users || 0,
      max: usageData?.limits.maxUsers || 0,
      percentage: usageData?.percentages.users || 0,
      unlimited: (usageData?.limits.maxUsers || 0) === -1,
    },
    {
      label: "Patients",
      icon: Database,
      current: usageData?.usage.patients || 0,
      max: usageData?.limits.maxPatients || 0,
      percentage: usageData?.percentages.patients || 0,
      unlimited: (usageData?.limits.maxPatients || 0) === -1,
    },
    {
      label: "Cases This Month",
      icon: TrendingUp,
      current: usageData?.usage.casesThisMonth || 0,
      max: usageData?.limits.maxCasesPerMonth || 0,
      percentage: usageData?.percentages.casesThisMonth || 0,
      unlimited: (usageData?.limits.maxCasesPerMonth || 0) === -1,
    },
    {
      label: "Storage",
      icon: HardDrive,
      current: usageData?.usage.storageMB || 0,
      max: usageData?.limits.maxStorageMB || 0,
      percentage: usageData?.percentages.storageMB || 0,
      unlimited: (usageData?.limits.maxStorageMB || 0) === -1,
      formatValue: formatStorage,
    },
  ];

  const allTiers: PlanTier[] = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

  // Gather all unique features across all plans for comparison
  const allFeatures = Array.from(
    new Set(allTiers.flatMap((t) => PLANS[t].features))
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Subscription" subtitle="Manage your plan, usage, and billing">
        {usageData?.plan.subscriptionId && (
          <Button
            onClick={handlePortal}
            disabled={portalLoading}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Manage Billing
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
          </Button>
        )}
      </PageHeader>

      {/* Trial Banner */}
      {isTrialPlan && usageData?.plan.trialEndsAt && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {trialDaysRemaining > 0
                  ? `Your free trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""}`
                  : "Your free trial has expired"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {trialDaysRemaining > 0
                  ? "Upgrade now to keep all your data and unlock more features."
                  : "Upgrade to a paid plan to continue using all features."}
              </p>
            </div>
            <Button
              onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </motion.div>
      )}

      {/* Current Plan Card */}
      <GlassCard hover="glow" delay={0.05}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${tierGradients[currentTier]} flex items-center justify-center shadow-lg`}>
            <TierIcon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{currentPlan.name}</h2>
              <Badge className={tierBadgeColors[status]}>
                {status === "trialing" ? "Trial" : status === "past_due" ? "Past Due" : "Active"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{currentPlan.description}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">${currentPlan.price}</span>
              {currentPlan.price > 0 && (
                <span className="text-muted-foreground">/month</span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Usage Meters */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Usage Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageMeters.map((meter, index) => {
            const Icon = meter.icon;
            return (
              <GlassCard key={meter.label} delay={0.1 + index * 0.05} hover="lift">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{meter.label}</span>
                </div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">
                    {meter.formatValue ? meter.formatValue(meter.current) : meter.current}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {meter.unlimited
                      ? "Unlimited"
                      : `/ ${meter.formatValue ? meter.formatValue(meter.max) : meter.max}`}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: meter.unlimited ? "5%" : `${Math.min(meter.percentage, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                    className={`h-full rounded-full ${meter.unlimited ? "bg-emerald-500" : getProgressColor(meter.percentage)}`}
                  />
                </div>
                {!meter.unlimited && meter.percentage >= 90 && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">Approaching limit</p>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison */}
      <div id="plans-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-foreground">Choose Your Plan</h3>
          <div className="flex items-center bg-muted rounded-xl p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === "yearly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-500 font-semibold">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {allTiers.map((tier, index) => {
            const plan = PLANS[tier];
            const PlanIcon = tierIcons[tier];
            const isCurrent = tier === currentTier;
            const isPopular = plan.popular;
            const price = billingInterval === "monthly" ? plan.price : Math.round(plan.yearlyPrice / 12);

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
                className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                  isPopular
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/5 to-transparent shadow-lg shadow-indigo-500/10"
                    : "border-border/50 bg-card hover:border-border"
                } ${isCurrent ? "ring-2 ring-indigo-500/30" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-500/25">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-emerald-500 text-white border-0">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`mx-auto w-12 h-12 rounded-xl bg-gradient-to-br ${tierGradients[tier]} flex items-center justify-center mb-3`}>
                    <PlanIcon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-3 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">
                      ${price}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm">/mo</span>
                    )}
                  </div>
                  {billingInterval === "yearly" && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${plan.yearlyPrice}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {tier === "TRIAL" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      {isCurrent ? "Current Plan" : "Free Tier"}
                    </Button>
                  ) : isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                      onClick={handlePortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Manage Plan
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${
                        isPopular
                          ? "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white"
                          : ""
                      }`}
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleCheckout(tier)}
                      disabled={checkoutLoading === tier}
                    >
                      {checkoutLoading === tier ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {allTiers.indexOf(tier) > allTiers.indexOf(currentTier)
                        ? "Upgrade"
                        : "Switch Plan"}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <GlassCard delay={0.3} hover="none">
        <h3 className="text-lg font-semibold text-foreground mb-4">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
                {allTiers.map((tier) => (
                  <th key={tier} className="text-center py-3 px-4 font-medium text-muted-foreground">
                    {PLANS[tier].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-foreground font-medium">Team Members</td>
                {allTiers.map((tier) => (
                  <td key={tier} className="text-center py-3 px-4 text-muted-foreground">
                    {PLANS[tier].maxUsers === -1 ? "Unlimited" : PLANS[tier].maxUsers}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-foreground font-medium">Patients</td>
                {allTiers.map((tier) => (
                  <td key={tier} className="text-center py-3 px-4 text-muted-foreground">
                    {PLANS[tier].maxPatients === -1 ? "Unlimited" : PLANS[tier].maxPatients.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-foreground font-medium">Cases/Month</td>
                {allTiers.map((tier) => (
                  <td key={tier} className="text-center py-3 px-4 text-muted-foreground">
                    {PLANS[tier].maxCasesPerMonth === -1 ? "Unlimited" : PLANS[tier].maxCasesPerMonth.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 text-foreground font-medium">Storage</td>
                {allTiers.map((tier) => (
                  <td key={tier} className="text-center py-3 px-4 text-muted-foreground">
                    {formatStorage(PLANS[tier].maxStorageMB)}
                  </td>
                ))}
              </tr>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-b border-border/50">
                  <td className="py-3 px-4 text-foreground">{feature}</td>
                  {allTiers.map((tier) => (
                    <td key={tier} className="text-center py-3 px-4">
                      {PLANS[tier].features.includes(feature) ? (
                        <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
