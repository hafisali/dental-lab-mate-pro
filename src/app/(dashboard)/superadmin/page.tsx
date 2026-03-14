"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, DollarSign, Crown,
  TrendingUp, AlertCircle, Zap, RefreshCw,
  ArrowUpRight, ArrowDownRight, BarChart3,
  Percent, UserMinus, UserPlus, Activity,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────

interface PlatformStats {
  totalLabs: number;
  activeLabs: number;
  trialLabs: number;
  paidLabs: number;
  totalMRR: number;
  expiringThisWeek: number;
  expiredLabs: number;
  totalUsers: number;
  activeUsers: number;
  recentLogins: number;
  recentRegistrations: number;
  newLabsThisMonth: number;
  planBreakdown: Record<string, number>;
  recentSignups: RecentSignup[];
}

interface RecentSignup {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

interface RevenueData {
  totalMRR: number;
  totalARR: number;
  avgRevenuePerLab: number;
  totalPayingCustomers: number;
  conversionRate: number;
  churnRate: number;
  churnedLabs: number;
  trialLabsCount: number;
  newLabsThisMonth: number;
  newLabsLastMonth: number;
  revenueByPlan: Record<string, { count: number; revenue: number }>;
}

// ── Constants ──────────────────────────────────────────────────

const PLAN_PRICES: Record<string, number> = {
  trial: 0,
  basic: 999,
  pro: 2499,
  enterprise: 4999,
};

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial", price: 0 },
  { value: "basic", label: "Basic", price: 999 },
  { value: "pro", label: "Pro", price: 2499 },
  { value: "enterprise", label: "Enterprise", price: 4999 },
];

const planColors: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  trial: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", ring: "ring-amber-500/20" },
  basic: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", ring: "ring-blue-500/20" },
  pro: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500", ring: "ring-indigo-500/20" },
  enterprise: { bg: "bg-violet-50 dark:bg-violet-950/50", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500", ring: "ring-violet-500/20" },
};

const planBarColors: Record<string, string> = {
  trial: "bg-amber-500",
  basic: "bg-blue-500",
  pro: "bg-indigo-500",
  enterprise: "bg-violet-500",
};

// ── Helpers ────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

function generateSparkData(base: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    data.push(Math.max(0, base + Math.floor((Math.random() - 0.4) * Math.max(base * 0.3, 1))));
  }
  data.push(base);
  return data;
}

// ── Main Page ──────────────────────────────────────────────────

export default function SuperAdminOverviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [session, status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, revenueRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/superadmin/revenue"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const sparkData = useMemo(
    () => ({
      labs: generateSparkData(stats?.totalLabs ?? 0),
      paid: generateSparkData(stats?.paidLabs ?? 0),
      mrr: generateSparkData(stats?.totalMRR ?? 0),
      users: generateSparkData(stats?.activeUsers ?? 0),
    }),
    [stats]
  );

  // ── Loading State ──

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-card border border-border/50 p-5 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-16 rounded-xl" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totalPlans = Object.values(stats?.planBreakdown || {}).reduce((a, b) => a + b, 0) || 1;
  const signupGrowth = revenue
    ? revenue.newLabsLastMonth > 0
      ? Math.round(((revenue.newLabsThisMonth - revenue.newLabsLastMonth) / revenue.newLabsLastMonth) * 100)
      : revenue.newLabsThisMonth > 0 ? 100 : 0
    : 0;

  // ── Primary Stat Cards ──

  const primaryCards = [
    {
      label: "Total Labs",
      value: stats?.totalLabs || 0,
      sub: `${stats?.activeLabs || 0} active`,
      icon: Building2,
      gradient: "from-indigo-500 to-violet-600",
      bgGradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
      sparkColor: "#6366f1",
      sparkData: sparkData.labs,
    },
    {
      label: "Paid Labs",
      value: stats?.paidLabs || 0,
      sub: `${stats?.trialLabs || 0} on trial`,
      icon: Crown,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      sparkColor: "#10b981",
      sparkData: sparkData.paid,
    },
    {
      label: "MRR",
      value: stats?.totalMRR || 0,
      sub: `from ${stats?.paidLabs || 0} subscriptions`,
      icon: DollarSign,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      sparkColor: "#f59e0b",
      sparkData: sparkData.mrr,
      formatFn: (n: number) => `₹${formatINR(n)}`,
    },
    {
      label: "Active Users",
      value: stats?.activeUsers || 0,
      sub: `${stats?.recentLogins || 0} logins (24h)`,
      icon: Users,
      gradient: "from-rose-500 to-pink-600",
      bgGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
      sparkColor: "#ef4444",
      sparkData: sparkData.users,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-xl px-4 py-2 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="group relative rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
            />
            <div
              className={`absolute -inset-1 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.08] blur-xl transition-opacity duration-500 rounded-3xl`}
            />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <div className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
                    {stat.formatFn ? (
                      <AnimatedNumber value={stat.value} format={stat.formatFn} />
                    ) : (
                      <AnimatedNumber value={stat.value} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                >
                  <stat.icon className="w-5.5 h-5.5 text-white" />
                </div>
              </div>
              <div className="mt-2 -mx-1 opacity-50 group-hover:opacity-80 transition-opacity duration-300">
                <Sparkline data={stat.sparkData} color={stat.sparkColor} height={36} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SaaS Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={revenue?.totalMRR || 0}
          format={(n) => `₹${formatINR(n)}`}
          icon={DollarSign}
          color="emerald"
          delay={0.1}
        />
        <StatCard
          title="Conversion Rate (Trial to Paid)"
          value={revenue?.conversionRate || 0}
          format={(n) => `${n}%`}
          icon={Percent}
          color="indigo"
          trend={revenue ? { value: revenue.conversionRate > 50 ? 5 : -3, label: "vs target" } : undefined}
          delay={0.15}
        />
        <StatCard
          title="Churn Rate (30d)"
          value={revenue?.churnRate || 0}
          format={(n) => `${n}%`}
          icon={UserMinus}
          color="rose"
          delay={0.2}
        />
        <StatCard
          title="New Signups This Month"
          value={revenue?.newLabsThisMonth || 0}
          icon={UserPlus}
          color="blue"
          trend={signupGrowth !== 0 ? { value: signupGrowth, label: "vs last month" } : undefined}
          delay={0.25}
        />
      </div>

      {/* Secondary metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Trial Labs",
            value: stats?.trialLabs || 0,
            hint: "Potential conversions",
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-50 dark:bg-amber-950/30",
            icon: Zap,
          },
          {
            label: "Expiring Soon",
            value: stats?.expiringThisWeek || 0,
            hint: "Within 7 days",
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-50 dark:bg-orange-950/30",
            icon: AlertCircle,
          },
          {
            label: "New This Month",
            value: stats?.newLabsThisMonth || 0,
            hint: `${stats?.recentRegistrations || 0} new users (7d)`,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-50 dark:bg-blue-950/30",
            icon: TrendingUp,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`rounded-2xl border border-border/50 p-5 ${card.bgColor}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs font-medium text-foreground">{card.label}</p>
                <p className="text-[10px] text-muted-foreground">{card.hint}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Subscription Breakdown + Recent Signups + Revenue Chart Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <GlassCard hover="none">
          <h3 className="text-sm font-semibold text-foreground mb-1">Active Subscriptions by Tier</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution of labs across plan tiers</p>
          <div className="space-y-3">
            {PLAN_OPTIONS.map((opt) => {
              const count = stats?.planBreakdown?.[opt.value] || 0;
              const pct = Math.round((count / totalPlans) * 100);
              const colors = planColors[opt.value] || planColors.trial;
              const rev = revenue?.revenueByPlan?.[opt.value];
              return (
                <div key={opt.value}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      <span className="text-sm font-medium capitalize text-foreground">
                        {opt.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {opt.price === 0 ? "Free" : `₹${formatINR(opt.price)}/mo`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                      {rev && rev.revenue > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{formatINR(rev.revenue)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                      className={`h-full rounded-full ${planBarColors[opt.value]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {stats && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total MRR</span>
              <span className="text-lg font-bold text-foreground">
                ₹{formatINR(stats.totalMRR)}
              </span>
            </div>
          )}
        </GlassCard>

        {/* Recent Signups */}
        <GlassCard hover="none" padding="p-0">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Signups</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest labs joining the platform</p>
          </div>
          {stats?.recentSignups && stats.recentSignups.length > 0 ? (
            <div className="px-6 pb-5 space-y-3">
              {stats.recentSignups.map((signup, i) => {
                const colors = planColors[signup.plan] || planColors.trial;
                return (
                  <motion.div
                    key={signup.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => router.push("/superadmin/tenants")}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                      {signup.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {signup.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {signup.email || "No email"} -- {signup._count.users} user
                        {signup._count.users !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}
                      >
                        <div className={`w-1 h-1 rounded-full ${colors.dot}`} />
                        {signup.plan}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(signup.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No recent signups</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Revenue Growth Chart Placeholder */}
      <GlassCard hover="none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Revenue Growth</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly recurring revenue trend</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="w-4 h-4" />
            Chart coming soon
          </div>
        </div>
        <div className="h-48 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Revenue chart will be displayed here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Current MRR: ₹{formatINR(revenue?.totalMRR || 0)} | ARR: ₹{formatINR(revenue?.totalARR || 0)}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
