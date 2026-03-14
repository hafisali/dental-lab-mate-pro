"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TrialBannerProps {
  planTier: string;
  trialEndsAt: string | null;
}

export default function TrialBanner({ planTier, trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (planTier !== "TRIAL" || !trialEndsAt) return;

    const end = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    setDaysLeft(diffDays);
  }, [planTier, trialEndsAt]);

  // Only show if trial, has an end date, expiring within 3 days, and not dismissed
  if (planTier !== "TRIAL" || daysLeft === null || daysLeft > 3 || dismissed) {
    return null;
  }

  const isExpired = daysLeft <= 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 text-white shadow-lg shadow-amber-500/20 mb-4"
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium truncate">
              {isExpired
                ? "Your trial has expired. Upgrade now to keep using all features."
                : `Your trial expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. Upgrade to keep all features.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/subscription">
              <Button
                size="sm"
                className="bg-white text-amber-700 hover:bg-white/90 shadow-sm font-semibold text-xs"
              >
                Upgrade Now
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      </motion.div>
    </AnimatePresence>
  );
}
