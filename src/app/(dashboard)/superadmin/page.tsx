"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2, Users, Briefcase, DollarSign, Shield,
  Activity, Clock, UserPlus, ChevronRight, Search,
  CheckCircle2, XCircle, AlertCircle, LogIn, UserCheck
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { format } from "date-fns";

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

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"activity" | "labs" | "users">("activity");
  const [loading, setLoading] = useState(true);

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

  if (status === "loading" || loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-64 bg-muted rounded-xl animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-2xl animate-shimmer" />
      </div>
    );
  }

  const planColors: Record<string, string> = {
    trial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    basic: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
    enterprise: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Platform Control Center"
        subtitle="Complete overview of all labs, users, and activity across the platform"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Labs", value: stats?.totalLabs || 0, sub: `${stats?.activeLabs || 0} active`, icon: Building2, color: "from-indigo-500 to-violet-600" },
          { label: "Total Users", value: stats?.totalUsers || 0, sub: `${stats?.activeUsers || 0} active`, icon: Users, color: "from-emerald-500 to-teal-600" },
          { label: "Total Cases", value: stats?.totalCases || 0, sub: `${stats?.totalDentists || 0} dentists`, icon: Briefcase, color: "from-amber-500 to-orange-600" },
          { label: "Logins (24h)", value: stats?.recentLogins || 0, sub: `${stats?.recentRegistrations || 0} new this week`, icon: Activity, color: "from-rose-500 to-pink-600" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard padding="p-5" hover="lift">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { key: "activity", label: "Login Activity", icon: Activity },
          { key: "labs", label: "All Labs", icon: Building2 },
          { key: "users", label: "All Users", icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
              activeTab === tab.key
                ? "bg-card text-foreground border border-border border-b-transparent -mb-px"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "activity" && (
          <GlassCard padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Time</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Action</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Details</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No activity recorded yet. Login activity will appear here.
                      </td>
                    </tr>
                  ) : (
                    activities.map((a, i) => {
                      const Icon = actionIcons[a.action] || Activity;
                      const colorClass = actionColors[a.action] || "text-gray-600 bg-gray-50";
                      return (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(a.createdAt), "MMM d, HH:mm:ss")}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">{a.userName || "---"}</p>
                              <p className="text-xs text-muted-foreground">{a.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {a.action.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{a.details || "---"}</td>
                          <td className="p-4 text-sm text-muted-foreground font-mono text-xs">{a.ipAddress || "---"}</td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {activeTab === "labs" && (
          <GlassCard padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Lab</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Plan</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Users</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Cases</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Dentists</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {labs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No labs created yet.
                      </td>
                    </tr>
                  ) : (
                    labs.map((lab, i) => (
                      <motion.tr
                        key={lab.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                              {lab.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{lab.name}</p>
                              <p className="text-xs text-muted-foreground">{lab.email || "---"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${planColors[lab.plan] || planColors.trial}`}>
                            {lab.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-foreground font-medium">{lab._count.users}</td>
                        <td className="p-4 text-sm text-foreground font-medium">{lab._count.cases}</td>
                        <td className="p-4 text-sm text-foreground font-medium">{lab._count.dentists}</td>
                        <td className="p-4">
                          {lab.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <XCircle className="w-3.5 h-3.5" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{format(new Date(lab.createdAt), "MMM d, yyyy")}</td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {activeTab === "users" && (
          <GlassCard padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Lab</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Verified</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider p-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No users registered yet.
                      </td>
                    </tr>
                  ) : (
                    users.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                              {user.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            user.role === "SUPERADMIN" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                            user.role === "LAB_OWNER" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" :
                            user.role === "ADMIN" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400" :
                            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{user.lab?.name || "---"}</td>
                        <td className="p-4">
                          {user.emailVerified ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                        </td>
                        <td className="p-4">
                          {user.active ? (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Inactive</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </motion.div>
    </div>
  );
}
