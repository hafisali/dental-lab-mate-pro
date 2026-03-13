"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number;
  format?: (n: number) => string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "indigo" | "emerald" | "amber" | "rose" | "blue" | "violet" | "slate";
  delay?: number;
}

const colorMap = {
  indigo: {
    iconBg: "bg-indigo-50 dark:bg-indigo-950/50",
    iconText: "text-indigo-600 dark:text-indigo-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    iconText: "text-emerald-600 dark:text-emerald-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
  amber: {
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconText: "text-amber-600 dark:text-amber-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-950/50",
    iconText: "text-rose-600 dark:text-rose-400",
    trendUp: "text-red-500",
    trendDown: "text-emerald-600",
  },
  blue: {
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    iconText: "text-blue-600 dark:text-blue-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
  violet: {
    iconBg: "bg-violet-50 dark:bg-violet-950/50",
    iconText: "text-violet-600 dark:text-violet-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800/50",
    iconText: "text-slate-600 dark:text-slate-400",
    trendUp: "text-emerald-600",
    trendDown: "text-red-500",
  },
};

export function StatCard({ title, value, format, icon: Icon, trend, color = "indigo", delay = 0 }: StatCardProps) {
  const colors = colorMap[color];
  const trendPositive = trend && trend.value >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative rounded-2xl bg-card border border-border/50 shadow-sm p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-50/0 group-hover:to-indigo-50/50 dark:group-hover:to-indigo-950/20 transition-all duration-500 rounded-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-card-foreground">
            <AnimatedNumber value={value} format={format} />
          </div>
          {trend && (
            <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendPositive ? colors.trendUp : colors.trendDown)}>
              {trendPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : trend.value === 0 ? (
                <Minus className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center", colors.iconBg)}>
          <Icon className={cn("h-5 w-5", colors.iconText)} />
        </div>
      </div>
    </motion.div>
  );
}
