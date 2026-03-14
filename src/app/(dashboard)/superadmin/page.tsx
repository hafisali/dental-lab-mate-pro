"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Building2, Users, Briefcase, DollarSign, Shield,
  Activity, Clock, UserPlus, ChevronRight, Search,
  CheckCircle2, XCircle, AlertCircle, LogIn, UserCheck,
  TrendingUp, ArrowUpRight, BarChart3, Globe, Zap,
  Filter, RefreshCw, Edit3, Power, Calendar, Crown,
  X, Save, ToggleLeft, ToggleRight, ChevronDown,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";

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

interface ActivityLog {
  id: string;
  email: string;
  userName: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface Lab {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan: string;
  planExpiresAt: string | null;
  maxUsers: number;
  isActive: boolean;
  currency: string;
  taxRate: number;
  createdAt: string;
  lastLogin: string | null;
  _count: { users: number; cases: number; dentists: number; invoices: number };
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

const actionIcons: Record<string, React.ElementType> = {
  LOGIN_SUCCESS: LogIn,
  LOGIN_FAILED: XCircle,
  REGISTER: UserPlus,
  OTP_VERIFIED: UserCheck,
};

const actionColors: Record<string, string> = {
  LOGIN_SUCCESS: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
  LOGIN_FAILED: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50",
  REGISTER: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50",
  OTP_VERIFIED: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50",
};

const actionBorderColors: Record<string, string> = {
  LOGIN_SUCCESS: "border-l-emerald-500",
  LOGIN_FAILED: "border-l-red-500",
  REGISTER: "border-l-blue-500",
  OTP_VERIFIED: "border-l-violet-500",
};

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

function getExpiryStatus(expiresAt: string | null): "ok" | "warning" | "expired" | "none" {
  if (!expiresAt) return "none";
  const expiry = new Date(expiresAt);
  const now = new Date();
  if (isBefore(expiry, now)) return "expired";
  if (isBefore(expiry, addDays(now, 7))) return "warning";
  return "ok";
}

// ── Edit Plan Dialog ───────────────────────────────────────────

function EditPlanDialog({
  lab,
  onClose,
  onSave,
}: {
  lab: Lab;
  onClose: () => void;
  onSave: (data: { plan: string; planExpiresAt: string | null; maxUsers: number; isActive: boolean }) => void;
}) {
  const [plan, setPlan] = useState(lab.plan);
  const [expiresAt, setExpiresAt] = useState(
    lab.planExpiresAt ? format(new Date(lab.planExpiresAt), "yyyy-MM-dd") : ""
  );
  const [maxUsers, setMaxUsers] = useState(lab.maxUsers);
  const [isActive, setIsActive] = useState(lab.isActive);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      plan,
      planExpiresAt: expiresAt || null,
      maxUsers,
      isActive,
    });
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Edit Subscription</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{lab.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Plan Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Plan
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((opt) => {
                const colors = planColors[opt.value] || planColors.trial;
                const isSelected = plan === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPlan(opt.value)}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? `${colors.bg} border-current ${colors.text} ring-2 ${colors.ring}`
                        : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">{opt.label}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className="text-xs mt-0.5 block opacity-70">
                      {opt.price === 0 ? "Free" : `₹${formatINR(opt.price)}/mo`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Plan Expires At
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-muted/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>

          {/* Max Users */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Max Users
            </label>
            <input
              type="number"
              min={1}
              value={maxUsers}
              onChange={(e) => setMaxUsers(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-sm bg-muted/50 border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Status
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isActive ? "Lab is active and accessible" : "Lab is deactivated"}
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                isActive ? "bg-emerald-500" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isActive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-muted/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "subscriptions" | "activity">("overview");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);

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
      const [statsRes, activityRes, labsRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/auth/activity?limit=50"),
        fetch("/api/superadmin/labs"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivities(data.activities || []);
      }
      if (labsRes.ok) {
        const data = await labsRes.json();
        setLabs(data.labs || []);
      }
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

  const handleToggleActive = async (lab: Lab) => {
    try {
      const res = await fetch(`/api/superadmin/labs/${lab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !lab.isActive }),
      });
      if (res.ok) {
        setLabs((prev) =>
          prev.map((l) => (l.id === lab.id ? { ...l, isActive: !l.isActive } : l))
        );
      }
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleSavePlan = async (data: {
    plan: string;
    planExpiresAt: string | null;
    maxUsers: number;
    isActive: boolean;
  }) => {
    if (!editingLab) return;
    try {
      const res = await fetch(`/api/superadmin/labs/${editingLab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setLabs((prev) =>
          prev.map((l) =>
            l.id === editingLab.id
              ? { ...l, ...updated.lab }
              : l
          )
        );
        setEditingLab(null);
        // Refresh stats since plan changes affect MRR
        const statsRes = await fetch("/api/superadmin/stats");
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Save plan error:", error);
    }
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

  const filteredLabs = useMemo(() => {
    let result = labs;
    if (planFilter !== "all") {
      result = result.filter((l) => l.plan === planFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((l) =>
        statusFilter === "active" ? l.isActive : !l.isActive
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [labs, planFilter, statusFilter, searchQuery]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities;
    return activities.filter((a) => a.action === activityFilter);
  }, [activities, activityFilter]);

  // ── Loading State ──

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80 rounded-2xl" />
          <Skeleton className="h-4 w-96 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-card border border-border/50 p-5 space-y-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-16 rounded-xl" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-96 rounded-xl" />
        <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-3 border-b border-border/30">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Stat Cards ──

  const overviewCards = [
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
      prefix: "₹",
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

  const secondaryCards = [
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
  ];

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "subscriptions" as const, label: "Subscriptions", icon: Crown },
    { key: "activity" as const, label: "Activity Log", icon: Activity },
  ];

  const totalPlans = Object.values(stats?.planBreakdown || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Platform Control Center
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Subscriptions, revenue, and platform management
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-xl px-4 py-2 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((stat, i) => (
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

      {/* Tab Navigation */}
      <LayoutGroup>
        <div className="relative">
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border/50 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </LayoutGroup>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Secondary metric cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {secondaryCards.map((card, i) => (
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

              {/* Subscription Breakdown + Recent Signups */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Breakdown */}
                <GlassCard hover="none">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Subscription Breakdown</h3>
                  <div className="space-y-3">
                    {PLAN_OPTIONS.map((opt) => {
                      const count = stats?.planBreakdown?.[opt.value] || 0;
                      const pct = Math.round((count / totalPlans) * 100);
                      const colors = planColors[opt.value] || planColors.trial;
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
                            onClick={() => {
                              setActiveTab("subscriptions");
                              setSearchQuery(signup.name);
                            }}
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
            </div>
          )}

          {/* ─── SUBSCRIPTIONS TAB ─── */}
          {activeTab === "subscriptions" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by lab name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  />
                </div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Plans</option>
                  <option value="trial">Trial</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Labs Table */}
              <GlassCard padding="p-0" hover="none">
                {filteredLabs.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">No labs found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || planFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters."
                        : "Labs will appear here as they register."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/20">
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4 pl-6">
                            Lab
                          </th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">
                            Plan
                          </th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">
                            Expires
                          </th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">
                            Users
                          </th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">
                            Cases
                          </th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">
                            Status
                          </th>
                          <th className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4 pr-6">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLabs.map((lab, i) => {
                          const colors = planColors[lab.plan] || planColors.trial;
                          const expStatus = getExpiryStatus(lab.planExpiresAt);
                          const userPct = Math.min(
                            100,
                            Math.round((lab._count.users / lab.maxUsers) * 100)
                          );

                          return (
                            <motion.tr
                              key={lab.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              className="border-b border-border/30 hover:bg-accent/50 transition-colors duration-150 group cursor-pointer"
                              onClick={() => setEditingLab(lab)}
                            >
                              {/* Lab info */}
                              <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    {lab.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">
                                      {lab.name}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                      {lab.email || lab.phone || "No contact"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Plan */}
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                  {lab.plan}
                                </span>
                              </td>

                              {/* Expiry */}
                              <td className="p-4">
                                {lab.planExpiresAt ? (
                                  <div>
                                    <p
                                      className={`text-xs font-medium ${
                                        expStatus === "expired"
                                          ? "text-red-600 dark:text-red-400"
                                          : expStatus === "warning"
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {format(new Date(lab.planExpiresAt), "MMM d, yyyy")}
                                    </p>
                                    <p
                                      className={`text-[10px] ${
                                        expStatus === "expired"
                                          ? "text-red-500"
                                          : expStatus === "warning"
                                          ? "text-amber-500"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {expStatus === "expired"
                                        ? "Expired"
                                        : formatDistanceToNow(new Date(lab.planExpiresAt), {
                                            addSuffix: true,
                                          })}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">---</span>
                                )}
                              </td>

                              {/* Users progress */}
                              <td className="p-4">
                                <div className="w-20">
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="font-medium text-foreground">
                                      {lab._count.users}/{lab.maxUsers}
                                    </span>
                                    <span className="text-muted-foreground">{userPct}%</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        userPct >= 90
                                          ? "bg-red-500"
                                          : userPct >= 70
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                      }`}
                                      style={{ width: `${userPct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Cases */}
                              <td className="p-4">
                                <span className="text-sm font-medium text-foreground">
                                  {lab._count.cases}
                                </span>
                              </td>

                              {/* Status Toggle */}
                              <td className="p-4">
                                <button
                                  onClick={() => handleToggleActive(lab)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                                    lab.isActive
                                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                                      : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      lab.isActive ? "bg-emerald-500" : "bg-red-500"
                                    }`}
                                  />
                                  {lab.isActive ? "Active" : "Inactive"}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-4 pr-6 text-right">
                                <button
                                  onClick={() => setEditingLab(lab)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-muted/50 hover:bg-muted border border-border/50 rounded-lg transition-all hover:shadow-sm"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit Plan
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* ─── ACTIVITY TAB ─── */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              {/* Activity filter */}
              <div className="flex gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "LOGIN_SUCCESS", label: "Logins" },
                  { key: "LOGIN_FAILED", label: "Failed" },
                  { key: "REGISTER", label: "Registers" },
                  { key: "OTP_VERIFIED", label: "OTP" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActivityFilter(f.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      activityFilter === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border/50 hover:text-foreground hover:border-border"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <GlassCard padding="p-0" hover="none">
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-foreground">Login Activity Timeline</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </div>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">No activity found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activityFilter !== "all"
                        ? "Try a different filter."
                        : "Login activity will appear here in real-time."}
                    </p>
                  </div>
                ) : (
                  <div className="px-6 pb-6">
                    <div className="relative">
                      <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-1">
                        {filteredActivities.map((a, i) => {
                          const Icon = actionIcons[a.action] || Activity;
                          const colorClass =
                            actionColors[a.action] || "text-gray-600 bg-gray-50";
                          const borderColor =
                            actionBorderColors[a.action] || "border-l-gray-300";
                          const isFailed = a.action === "LOGIN_FAILED";

                          return (
                            <motion.div
                              key={a.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02, duration: 0.2 }}
                              className={`relative flex gap-4 p-2.5 rounded-xl hover:bg-muted/50 transition-all duration-200 border-l-[3px] ml-8 ${borderColor} ${
                                isFailed ? "bg-red-50/30 dark:bg-red-950/10" : ""
                              }`}
                            >
                              {/* Timeline dot */}
                              <div className="absolute -left-[calc(2rem+7px)] top-3.5">
                                <div
                                  className={`w-[10px] h-[10px] rounded-full border-2 border-card ${
                                    isFailed
                                      ? "bg-red-500"
                                      : a.action === "LOGIN_SUCCESS"
                                      ? "bg-emerald-500"
                                      : a.action === "REGISTER"
                                      ? "bg-blue-500"
                                      : "bg-violet-500"
                                  }`}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                      {a.userName
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2) || "?"}
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                      {a.userName || "Unknown"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {a.email}
                                    </span>
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
                                  >
                                    <Icon className="w-3 h-3" />
                                    {a.action.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                                  <span>
                                    {format(new Date(a.createdAt), "MMM d, HH:mm:ss")}
                                  </span>
                                  <span className="text-border">|</span>
                                  <span>
                                    {formatDistanceToNow(new Date(a.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                  {a.ipAddress && (
                                    <>
                                      <span className="text-border">|</span>
                                      <span className="font-mono text-[10px]">
                                        {a.ipAddress}
                                      </span>
                                    </>
                                  )}
                                  {a.details && (
                                    <>
                                      <span className="text-border">|</span>
                                      <span>{a.details}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Plan Dialog */}
      <AnimatePresence>
        {editingLab && (
          <EditPlanDialog
            lab={editingLab}
            onClose={() => setEditingLab(null)}
            onSave={handleSavePlan}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
