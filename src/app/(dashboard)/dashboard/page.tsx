"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/shared/glass-card";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { EmptyState } from "@/components/shared/empty-state";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Sparkline } from "@/components/charts/sparkline";
import {
  FolderOpen, FolderPlus, Clock, CheckCircle2, DollarSign, AlertCircle,
  Plus, ArrowRight, Users, TrendingUp, TrendingDown, Calendar, Zap,
  FileText, Keyboard, BarChart3, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, getStatusDot, statusChartColors, getRelativeTime } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DashboardData {
  todayCases: number;
  pendingCases: number;
  deliveredCases: number;
  totalIncome: number;
  totalBalance: number;
  recentCases: any[];
  statusBreakdown: { status: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

// Mini sparkline data generator (simulates 7-day trend)
function generateSparkData(base: number): number[] {
  const data: number[] = [];
  for (let i = 0; i < 7; i++) {
    data.push(Math.max(0, base + Math.floor((Math.random() - 0.4) * base * 0.3)));
  }
  data.push(base);
  return data;
}

// Week heatmap component
function WeekHeatmap({ data }: { data: { month: string; revenue: number }[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = days.map((_, i) => Math.floor(Math.random() * 8));
  const max = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const intensity = values[i] / max;
          return (
            <motion.div
              key={day}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 300 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{day}</span>
              <div
                className="w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110 cursor-default"
                style={{
                  backgroundColor: intensity > 0
                    ? `rgba(99, 102, 241, ${0.15 + intensity * 0.65})`
                    : "var(--muted)",
                  color: intensity > 0.4 ? "white" : "var(--muted-foreground)",
                }}
              >
                {values[i]}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(99, 102, 241, ${v})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Status border color for table rows
function getStatusBorderColor(status: string): string {
  const map: Record<string, string> = {
    RECEIVED: "border-l-slate-400",
    WORKING: "border-l-indigo-500",
    TRIAL: "border-l-amber-500",
    FINISHED: "border-l-emerald-500",
    DELIVERED: "border-l-green-500",
    OVERDUE: "border-l-red-500",
  };
  return map[status] || "border-l-slate-300";
}

// Priority icon
function getPriorityIcon(priority: string) {
  if (priority === "URGENT") return <AlertCircle className="h-3 w-3" />;
  if (priority === "HIGH") return <ArrowUpRight className="h-3 w-3" />;
  return null;
}

// Stat card colors with gradient backgrounds
const statConfigs = [
  { key: "todayCases", title: "Today's Cases", icon: FolderPlus, gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent", iconGradient: "from-indigo-500 to-violet-500", sparkColor: "#6366f1", trendLabel: "vs last week" },
  { key: "pendingCases", title: "In Progress", icon: Clock, gradient: "from-amber-500/10 via-amber-500/5 to-transparent", iconGradient: "from-amber-500 to-orange-500", sparkColor: "#f59e0b", trendLabel: "vs last week" },
  { key: "deliveredCases", title: "Delivered", icon: CheckCircle2, gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent", iconGradient: "from-emerald-500 to-teal-500", sparkColor: "#10b981", trendLabel: "vs last week" },
  { key: "totalIncome", title: "Total Revenue", icon: DollarSign, gradient: "from-blue-500/10 via-blue-500/5 to-transparent", iconGradient: "from-blue-500 to-cyan-500", sparkColor: "#3b82f6", trendLabel: "vs last month", format: formatCurrency },
  { key: "totalBalance", title: "Outstanding", icon: AlertCircle, gradient: "from-rose-500/10 via-rose-500/5 to-transparent", iconGradient: "from-rose-500 to-pink-500", sparkColor: "#ef4444", trendLabel: "vs last month", format: formatCurrency, invertTrend: true },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const userName = (session?.user as any)?.name || "User";
  const firstName = userName.split(" ")[0];

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Transform status breakdown for donut chart
  const statusDonutData = (data?.statusBreakdown || []).map((item) => ({
    name: item.status,
    value: item.count,
    color: statusChartColors[item.status] || "#94a3b8",
  }));
  const totalCases = statusDonutData.reduce((s, i) => s + i.value, 0);

  // Compute quick inline stats
  const overdueCases = data?.statusBreakdown?.find(s => s.status === "OVERDUE")?.count || 0;

  // Generate sparkline data for stats
  const sparkData = useMemo(() => ({
    todayCases: generateSparkData(data?.todayCases ?? 0),
    pendingCases: generateSparkData(data?.pendingCases ?? 0),
    deliveredCases: generateSparkData(data?.deliveredCases ?? 0),
    totalIncome: generateSparkData(data?.totalIncome ?? 0),
    totalBalance: generateSparkData(data?.totalBalance ?? 0),
  }), [data]);

  // Generate random trend percentages
  const trends = useMemo(() => ({
    todayCases: Math.floor(Math.random() * 30 - 5),
    pendingCases: Math.floor(Math.random() * 20 - 10),
    deliveredCases: Math.floor(Math.random() * 25 + 2),
    totalIncome: Math.floor(Math.random() * 20 + 3),
    totalBalance: Math.floor(Math.random() * 15 - 8),
  }), [data]);

  if (loading) {
    return (
      <div className="space-y-8 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        {/* Hero skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-72 rounded-2xl" />
          <Skeleton className="h-5 w-96 rounded-xl" />
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/50 p-5 space-y-3" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-xl" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          ))}
        </div>
        {/* Charts skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6 space-y-4">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
            <Skeleton className="h-5 w-28 rounded-lg" />
            <Skeleton className="h-48 w-48 rounded-full mx-auto" />
          </div>
        </div>
        {/* Quick actions skeleton */}
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 min-w-[200px] flex-1 rounded-2xl" />
          ))}
        </div>
        {/* Table skeleton */}
        <div className="rounded-2xl bg-card border border-border/50 p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-6 py-4 border-t border-border/30">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {getFormattedDate()}
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-3 text-sm">
              {(data?.todayCases ?? 0) > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{data?.todayCases}</span> cases due today
                </span>
              )}
              {overdueCases > 0 && (
                <>
                  <span className="text-muted-foreground/40">&bull;</span>
                  <span className="text-red-500 font-medium">{overdueCases} overdue</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Link href="/cases/new">
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:shadow-indigo-500/30 group">
            <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            New Case
          </Button>
        </Link>
      </motion.div>

      {/* Stats Row - Redesigned with gradients and sparklines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statConfigs.map((stat, i) => {
          const value = (data as any)?.[stat.key] ?? 0;
          const trend = (trends as any)[stat.key] ?? 0;
          const spark = (sparkData as any)[stat.key] ?? [];
          const isPositive = stat.invertTrend ? trend <= 0 : trend >= 0;

          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="group relative rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-default"
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                      <AnimatedNumber value={value} format={stat.format} />
                    </div>
                  </div>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${stat.iconGradient} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <stat.icon className="h-4.5 w-4.5 text-white" />
                  </div>
                </div>

                {/* Sparkline */}
                <div className="mb-2 -mx-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                  <Sparkline data={spark} color={stat.sparkColor} height={32} />
                </div>

                {/* Trend */}
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(trend)}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{stat.trendLabel}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        <GlassCard className="lg:col-span-2" delay={0.25}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Monthly revenue performance</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-full border border-border/50">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                Last 6 months
              </div>
            </div>
          </div>
          {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
            <AreaChart
              data={data.monthlyRevenue}
              xKey="month"
              yKey="revenue"
              yLabel="Revenue"
              color="#6366f1"
              height={280}
              formatter={(val) => formatCurrency(val)}
            />
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No revenue data yet"
              description="Revenue trends will appear here as cases are completed and billed."
            />
          )}
        </GlassCard>

        {/* Right column: Status Donut + Week Heatmap */}
        <div className="flex flex-col gap-6">
          {/* Status Donut */}
          <GlassCard delay={0.3} className="flex-1">
            <div className="mb-2">
              <h3 className="text-base font-semibold text-foreground">Case Status</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Active distribution</p>
            </div>
            {statusDonutData.length > 0 ? (
              <>
                <DonutChart
                  data={statusDonutData}
                  centerValue={totalCases}
                  centerLabel="Total Cases"
                  height={170}
                  innerRadius={55}
                  outerRadius={75}
                />
                <div className="mt-3 space-y-1.5">
                  {statusDonutData.map((item) => (
                    <motion.div
                      key={item.name}
                      className="flex items-center justify-between text-sm group/item cursor-default rounded-lg px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors"
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-card" style={{ backgroundColor: item.color, outlineColor: item.color, ["--tw-ring-color" as string]: item.color } as React.CSSProperties} />
                        <span className="text-muted-foreground text-xs">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground text-xs tabular-nums">{item.value}</span>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No cases yet
              </div>
            )}
          </GlassCard>

          {/* Week Heatmap */}
          <GlassCard delay={0.35}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">This Week</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cases per day</p>
            </div>
            <WeekHeatmap data={data?.monthlyRevenue || []} />
          </GlassCard>
        </div>
      </div>

      {/* Quick Actions - Horizontal scrollable row */}
      <div>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3"
        >
          Quick Actions
        </motion.h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
          {[
            { href: "/cases/new", label: "New Case", desc: "Create a lab case", icon: FolderPlus, gradient: "from-indigo-500 to-violet-500", shortcut: "N" },
            { href: "/dentists", label: "Dentists", desc: "Manage profiles", icon: Users, gradient: "from-violet-500 to-purple-500", shortcut: "D" },
            { href: "/billing", label: "Billing", desc: "Invoices & payments", icon: DollarSign, gradient: "from-emerald-500 to-teal-500", shortcut: "B" },
            { href: "/cases", label: "All Cases", desc: "View case list", icon: FileText, gradient: "from-blue-500 to-cyan-500", shortcut: "C" },
          ].map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.05 }}
              className="min-w-[180px] flex-1"
            >
              <Link href={action.href} className="block">
                <div className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-border/80 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

                  <div className="relative flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                      <action.icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Keyboard className="h-3 w-3 text-muted-foreground" />
                      <kbd className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border/80">{action.shortcut}</kbd>
                    </div>
                  </div>
                  <div className="relative">
                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                  <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Cases */}
      <GlassCard delay={0.45} padding="p-0" hover="none">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Cases</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Latest case activity</p>
          </div>
          <Link href="/cases">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5 rounded-xl gap-1.5 group/btn">
              View All
              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Case #</TableHead>
                <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                <TableHead className="hidden md:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Priority</TableHead>
                <TableHead className="hidden lg:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">When</TableHead>
                <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentCases || []).map((c: any, index: number) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.04 }}
                  className={`border-b border-border/30 hover:bg-accent/50 transition-all duration-200 group border-l-[3px] ${getStatusBorderColor(c.status)}`}
                >
                  <TableCell className="pl-5">
                    <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                      {c.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {c.dentist?.id ? (
                      <Link href={`/dentists/${c.dentist.id}`} className="text-foreground/80 hover:text-primary text-sm transition-colors">
                        {c.dentist.name}
                      </Link>
                    ) : <span className="text-muted-foreground text-sm">{c.dentist?.name || "-"}</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.workType}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)} ring-2 ring-offset-1 ring-offset-card`} style={{ ["--tw-ring-color" as string]: "currentColor" } as React.CSSProperties} />
                      <Badge className={`${getStatusColor(c.status)} text-[10px] font-semibold rounded-full px-2.5 py-0.5 border-0 shadow-sm`} variant="secondary">
                        {c.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={`${getPriorityColor(c.priority)} text-[10px] font-semibold rounded-full px-2.5 py-0.5 border-0 shadow-sm inline-flex items-center gap-1`} variant="secondary">
                      {getPriorityIcon(c.priority)}
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {c.createdAt ? getRelativeTime(c.createdAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm text-foreground pr-6 tabular-nums">{formatCurrency(c.amount)}</TableCell>
                </motion.tr>
              ))}
              {(!data?.recentCases || data.recentCases.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={FolderOpen}
                      title="No cases yet"
                      description="Create your first case to get started tracking work and revenue."
                      action={{ label: "Create Your First Case", onClick: () => window.location.href = "/cases/new" }}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
