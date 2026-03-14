"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/shared/glass-card";
import { PLANS, type PlanConfig } from "@/lib/plans";
import { Lock, ArrowRight, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

// Map feature display names to the minimum plan tier required
const FEATURE_MIN_PLAN: Record<string, keyof typeof PLANS> = {
  "Prescriptions": "PROFESSIONAL",
  "Orthodontics": "PROFESSIONAL",
  "Pharmacy": "PROFESSIONAL",
  "Staff Management": "PROFESSIONAL",
  "WhatsApp Integration": "PROFESSIONAL",
  "Inventory": "STARTER",
  "Analytics": "STARTER",
  "Cash Flow": "STARTER",
};

function getRequiredPlanConfig(feature: string): PlanConfig {
  const tier = FEATURE_MIN_PLAN[feature];
  return tier ? PLANS[tier] : PLANS.PROFESSIONAL;
}

function UpgradeContent() {
  const searchParams = useSearchParams();
  const feature = searchParams.get("feature") || "this feature";
  const plan = getRequiredPlanConfig(feature);

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <GlassCard className="max-w-lg w-full" hover="glow">
        <div className="text-center space-y-6">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25"
          >
            <Lock className="w-8 h-8 text-white" />
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground tracking-tight"
            >
              Upgrade Required
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground"
            >
              <span className="font-semibold text-foreground">{feature}</span> is
              available on the{" "}
              <span className="font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {plan.name}
              </span>{" "}
              plan and above.
            </motion.p>
          </div>

          {/* Plan card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-violet-50/80 p-5 text-left space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-foreground">{plan.name}</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                ${plan.price}/mo
              </span>
            </div>

            <p className="text-sm text-muted-foreground">{plan.description}</p>

            <ul className="space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <Link href="/subscription">
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25">
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full text-muted-foreground">
                Back to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <UpgradeContent />
    </Suspense>
  );
}
