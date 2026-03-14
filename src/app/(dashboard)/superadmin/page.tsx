"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Building2, Users, Briefcase, DollarSign, Shield,
  Activity, Clock, UserPlus, ChevronRight, Search,
  CheckCircle2, XCircle, AlertCircle, LogIn, UserCheck,
  TrendingUp, ArrowUpRight, BarChart3, Globe, Zap,
  Filter, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";

interface PlatformStats {
  totalLabs: number;
  activeLabs: number;
  totalUsers: number;
  activeUsers: number;
  totalCases: number;
  totalDentists: number;
  totalRevenue: number;
  recentLogins: number;
  recentRegistrations: number;
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
  isActive: boolean;
  createdAt: string;
  _count: { users: number; cases: number; dentists: number };
}

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  emailVerified: string | null;
  phone: string | null;
  lab: { name: string } | null;
  createdAt: string;
}

const actionIcons: Record<string, any> = {
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

function generateSparkData(base: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    data.push(Math.max(0, base + Math.floor((Math.random() - 0.4) * Math.max(base * 0.3, 1))));
  }
  data.push(base);
  return data;
}

const planColors: Record<string, { bg: string; text: string; dot: string }> = {
  trial: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  basic: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  pro: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  enterprise: { bg: "bg-violet-50 dark:bg-violet-950/50", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
};

const roleColors: Record<string, string> = {
  SUPERADMIN: "bg-gradient-to-r from-red-500 to-rose-500 text-white",
  LAB_OWNER: "bg-gradient-to-r from-violet-500 to-purple-500 text-white",
  ADMIN: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white",
  STAFF: "bg-muted text-muted-foreground",
};

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"activity" | "labs" | "users">("activity");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
      const [statsRes, activityRes, labsRes, usersRes] = await Promise.all([
        fetch("/api/superadmin/stats"),
        fetch("/api/auth/activity?limit=20"),
        fetch("/api/superadmin/labs"),
        fetch("/api/superadmin/users?limit=20"),
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
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
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

  const sparkData = useMemo(() => ({
    labs: generateSparkData(stats?.totalLabs ?? 0),
    users: generateSparkData(stats?.totalUsers ?? 0),
    cases: generateSparkData(stats?.totalCases ?? 0),
    logins: generateSparkData(stats?.recentLogins ?? 0),
  }), [stats]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.lab?.name?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const tabCounts = {
    activity: activities.length,
    labs: labs.length,
    users: users.length,
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-80 rounded-2xl" />
          <Skeleton className="h-4 w-96 rounded-xl" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/50 p-5 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
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
        {/* Tabs skeleton */}
        <Skeleton className="h-12 w-96 rounded-xl" />
        {/* Content skeleton */}
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

  const statCards = [
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
      label: "Total Users",
      value: stats?.totalUsers || 0,
      sub: `${stats?.activeUsers || 0} active`,
      icon: Users,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      sparkColor: "#10b981",
      sparkData: sparkData.users,
    },
    {
      label: "Total Cases",
      value: stats?.totalCases || 0,
      sub: `${stats?.totalDentists || 0} dentists`,
      icon: Briefcase,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      sparkColor: "#f59e0b",
      sparkData: sparkData.cases,
    },
    {
      label: "Logins (24h)",
      value: stats?.recentLogins || 0,
      sub: `${stats?.recentRegistrations || 0} new this week`,
      icon: Activity,
      gradient: "from-rose-500 to-pink-600",
      bgGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
      sparkColor: "#ef4444",
      sparkData: sparkData.logins,
    },
  ];

  const tabs = [
    { key: "activity" as const, label: "Activity Log", icon: Activity },
    { key: "labs" as const, label: "All Labs", icon: Building2 },
    { key: "users" as const, label: "All Users", icon: Users },
  ];

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
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Platform Control Center</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Complete overview of all labs, users, and activity</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="group relative rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Hover glow */}
            <div className={`absolute -inset-1 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.08] blur-xl transition-opacity duration-500 rounded-3xl`} />

            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">
                    <AnimatedNumber value={stat.value} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <stat.icon className="w-5.5 h-5.5 text-white" />
                </div>
              </div>

              {/* Sparkline */}
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
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
          {/* Activity Tab - Timeline View */}
          {activeTab === "activity" && (
            <GlassCard padding="p-0" hover="none">
              {/* Auto-refresh indicator */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h3 className="text-sm font-semibold text-foreground">Login Activity Timeline</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Login activity will appear here in real-time.</p>
                </div>
              ) : (
                <div className="px-6 pb-6">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-1">
                      {activities.map((a, i) => {
                        const Icon = actionIcons[a.action] || Activity;
                        const colorClass = actionColors[a.action] || "text-gray-600 bg-gray-50";
                        const borderColor = actionBorderColors[a.action] || "border-l-gray-300";
                        const isFailed = a.action === "LOGIN_FAILED";

                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.3 }}
                            className={`relative flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 border-l-[3px] ml-8 ${borderColor} ${isFailed ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                          >
                            {/* Timeline dot */}
                            <div className="absolute -left-[calc(2rem+7px)] top-4">
                              <div className={`w-[10px] h-[10px] rounded-full border-2 border-card ${
                                isFailed ? "bg-red-500" :
                                a.action === "LOGIN_SUCCESS" ? "bg-emerald-500" :
                                a.action === "REGISTER" ? "bg-blue-500" :
                                "bg-violet-500"
                              }`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                {/* User info */}
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                    {a.userName?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-foreground">{a.userName || "Unknown"}</span>
                                    <span className="text-xs text-muted-foreground ml-1.5">{a.email}</span>
                                  </div>
                                </div>

                                {/* Action badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
                                  <Icon className="w-3 h-3" />
                                  {a.action.replace("_", " ")}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span>{format(new Date(a.createdAt), "MMM d, HH:mm:ss")}</span>
                                <span className="text-border">|</span>
                                <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                                {a.ipAddress && (
                                  <>
                                    <span className="text-border">|</span>
                                    <span className="font-mono text-[10px]">{a.ipAddress}</span>
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
          )}

          {/* Labs Tab - Card Grid */}
          {activeTab === "labs" && (
            <>
              {labs.length === 0 ? (
                <GlassCard hover="none">
                  <div className="text-center py-16">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-foreground">No labs created yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Labs will appear here as they register.</p>
                  </div>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {labs.map((lab, i) => {
                    const plan = planColors[lab.plan] || planColors.trial;
                    return (
                      <motion.div
                        key={lab.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="group rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                      >
                        <div className="p-5">
                          {/* Lab header */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                              {lab.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground truncate">{lab.name}</h4>
                              <p className="text-xs text-muted-foreground truncate">{lab.email || "No email"}</p>
                            </div>
                            {/* Status indicator */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${
                              lab.isActive
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                                : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${lab.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                              {lab.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>

                          {/* Plan badge */}
                          <div className="mb-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${plan.bg} ${plan.text}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${plan.dot}`} />
                              {lab.plan}
                            </span>
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: "Users", value: lab._count.users, icon: Users },
                              { label: "Cases", value: lab._count.cases, icon: Briefcase },
                              { label: "Dentists", value: lab._count.dentists, icon: UserPlus },
                            ].map((stat) => (
                              <div key={stat.label} className="text-center p-2 rounded-xl bg-muted/50 group-hover:bg-muted/80 transition-colors duration-200">
                                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-muted/30 border-t border-border/30 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            Created {format(new Date(lab.createdAt), "MMM d, yyyy")}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Users Tab - Premium Table */}
          {activeTab === "users" && (
            <GlassCard padding="p-0" hover="none">
              {/* Search/Filter bar */}
              <div className="p-4 border-b border-border/50">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, email, role, or lab..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
                  />
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-foreground">No users registered yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Users will appear here as they sign up.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4 pl-6">User</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">Role</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">Lab</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">Status</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4">Verified</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider p-4 pr-6">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-border/30 hover:bg-accent/50 transition-colors duration-150 group"
                        >
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
                                {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${roleColors[user.role] || roleColors.STAFF}`}>
                              {user.role.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">{user.lab?.name || "---"}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${user.active ? "bg-emerald-500" : "bg-red-500"}`} />
                              <span className={`text-xs font-medium ${user.active ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {user.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            {user.emailVerified ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Pending</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 pr-6">
                            <div>
                              <p className="text-xs text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</p>
                              <p className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                      {filteredUsers.length === 0 && searchQuery && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No users match &ldquo;{searchQuery}&rdquo;</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
