"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Users, CreditCard,
  Download, RefreshCw, Building2, Filter,
  ArrowUpRight,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────

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
  subscriptions: SubscriptionDetail[];
}

interface SubscriptionDetail {
  id: string;
  labName: string;
  labSlug: string | null;
  labId: string;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
}

// ── Constants ──────────────────────────────────────────────────

const planBadgeColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  basic: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  pro: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800",
};

const statusBadgeColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  past_due: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  canceled: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  trialing: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
};

const planBarColors: Record<string, string> = {
  trial: "bg-amber-500",
  basic: "bg-blue-500",
  pro: "bg-indigo-500",
  enterprise: "bg-violet-500",
};

function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

// ── Main Page ──────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchRevenue();
  }, [session, authStatus]);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/revenue");
      if (res.ok) {
        setRevenue(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRevenue();
    setRefreshing(false);
  };

  const handleExport = () => {
    if (!revenue?.subscriptions?.length) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Lab Name", "Plan", "Amount", "Status", "Start Date", "Next Billing"];
    const rows = revenue.subscriptions.map((sub) => [
      sub.labName,
      sub.plan,
      sub.amount,
      sub.status,
      format(new Date(sub.currentPeriodStart), "yyyy-MM-dd"),
      format(new Date(sub.currentPeriodEnd), "yyyy-MM-dd"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  const filteredSubscriptions = useMemo(() => {
    if (!revenue?.subscriptions) return [];
    if (statusFilter === "all") return revenue.subscriptions;
    return revenue.subscriptions.filter((s) => s.status === statusFilter);
  }, [revenue, statusFilter]);

  const totalRevenueByPlan = useMemo(() => {
    if (!revenue?.revenueByPlan) return [];
    return Object.entries(revenue.revenueByPlan)
      .filter(([plan]) => plan !== "trial")
      .map(([plan, data]) => ({
        plan,
        ...data,
      }));
  }, [revenue]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total MRR"
          value={revenue?.totalMRR || 0}
          format={(n) => `₹${formatINR(n)}`}
          icon={DollarSign}
          color="emerald"
          delay={0}
        />
        <StatCard
          title="Total ARR"
          value={revenue?.totalARR || 0}
          format={(n) => `₹${formatINR(n)}`}
          icon={TrendingUp}
          color="indigo"
          delay={0.05}
        />
        <StatCard
          title="Avg Revenue Per Lab"
          value={revenue?.avgRevenuePerLab || 0}
          format={(n) => `₹${formatINR(n)}`}
          icon={Building2}
          color="violet"
          delay={0.1}
        />
        <StatCard
          title="Paying Customers"
          value={revenue?.totalPayingCustomers || 0}
          icon={Users}
          color="blue"
          delay={0.15}
        />
      </div>

      {/* Revenue by Plan Tier */}
      <GlassCard hover="none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Revenue by Plan Tier</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue contribution by plan</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5 hover:shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {totalRevenueByPlan.map((item, i) => (
            <motion.div
              key={item.plan}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${planBadgeColors[item.plan] || planBadgeColors.basic}`}>
                  {item.plan}
                </span>
                <span className="text-xs text-muted-foreground">{item.count} labs</span>
              </div>
              <p className="text-xl font-bold text-foreground">₹{formatINR(item.revenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">per month</p>
              <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${planBarColors[item.plan] || "bg-blue-500"}`}
                  style={{
                    width: `${revenue?.totalMRR ? Math.round((item.revenue / revenue.totalMRR) * 100) : 0}%`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Subscriptions Table */}
      <GlassCard padding="p-0" hover="none">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">All Subscriptions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "past_due", label: "Past Due" },
                { key: "canceled", label: "Canceled" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                    statusFilter === f.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="rounded-lg text-xs"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No subscriptions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter !== "all" ? "Try a different filter." : "Subscriptions will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Lab Name</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Plan</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Start Date</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Next Billing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub, i) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {sub.labName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{sub.labName}</p>
                          {sub.labSlug && (
                            <p className="text-[10px] text-muted-foreground font-mono">{sub.labSlug}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${planBadgeColors[sub.plan] || planBadgeColors.basic}`}>
                        {sub.plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-foreground">₹{formatINR(sub.amount)}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusBadgeColors[sub.status] || statusBadgeColors.active}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          sub.status === "active" ? "bg-emerald-500" :
                          sub.status === "past_due" ? "bg-amber-500" :
                          sub.status === "canceled" ? "bg-red-500" : "bg-blue-500"
                        }`} />
                        {sub.status.replace("_", " ")}
                        {sub.cancelAtPeriodEnd && (
                          <span className="text-[8px] ml-1 opacity-70">(canceling)</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground">
                        {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
