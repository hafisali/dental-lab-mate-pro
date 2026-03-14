"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { DonutChart } from "@/components/charts/donut-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle, Clock, TrendingUp, Users, CheckCircle2,
  Target, Activity, Trophy, Zap, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, statusChartColors } from "@/lib/utils";

interface AnalyticsData {
  overdueCases: { id: string; caseNumber: string; dentist: { id: string; name: string } | null; patient: { id: string; name: string } | null; workType: string; dueDate: string; status: string; daysOverdue: number; }[];
  dueSoonCases: { id: string; caseNumber: string; dentist: { id: string; name: string } | null; workType: string; dueDate: string; status: string; dueLabel: string; }[];
  statusCounts: { status: string; count: number }[];
  workTypeCounts: { workType: string; count: number }[];
  avgTurnaround: number;
  onTimeRate: number;
  monthlyCaseVolumes: { month: string; year: number; count: number }[];
  topDentists: { id: string; name: string; clinicName: string | null; caseCount: number; revenue: number; }[];
  techWorkload: { id: string; name: string; activeCases: number; completedCases: number; }[];
  casesThisMonth: number;
  revenueThisMonth: number;
}

const medalColors = [
  "from-amber-400 to-yellow-500",
  "from-slate-300 to-slate-400",
  "from-amber-600 to-orange-700",
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totalCases = data?.statusCounts?.reduce((sum, s) => sum + s.count, 0) || 0;
  const statusDonutData = (data?.statusCounts || []).map((item) => ({
    name: item.status, value: item.count, color: statusChartColors[item.status] || "#94a3b8",
  }));
  const volumeData = (data?.monthlyCaseVolumes || []).map((item) => ({
    month: item.month, cases: item.count,
  }));
  const workTypeData = (data?.workTypeCounts || []).slice(0, 6).map((item) => ({
    name: item.workType, count: item.count,
  }));
  const maxTechCases = Math.max(...(data?.techWorkload || []).map(t => t.activeCases + t.completedCases), 1);

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Analytics" subtitle="Performance insights & delayed work tracking" />

      {/* Overdue Alert with pulse */}
      <AnimatePresence>
        {data?.overdueCases && data.overdueCases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative rounded-2xl border border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50/90 via-red-50/70 to-rose-50/90 dark:from-red-950/40 dark:via-red-950/30 dark:to-rose-950/40 p-6 overflow-hidden"
          >
            {/* Pulse ring */}
            <div className="absolute top-4 left-4 w-3 h-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </div>

            <div className="flex items-start gap-4 ml-6">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex-shrink-0 shadow-sm shadow-red-200/50">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 tracking-tight">
                  {data.overdueCases.length} Overdue Case{data.overdueCases.length > 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-red-600/70 dark:text-red-400/60 mt-0.5">Immediate attention required</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.overdueCases.slice(0, 3).map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30"
                    >
                      <div className="flex-1 min-w-0">
                        <Link href={`/cases/${c.id}`} className="text-sm font-semibold text-red-700 dark:text-red-300 hover:underline">
                          {c.caseNumber}
                        </Link>
                        <p className="text-xs text-red-600/60 dark:text-red-400/50 truncate">{c.dentist?.name}</p>
                      </div>
                      <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-0 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {c.daysOverdue}d late
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Due Soon Alert */}
      <AnimatePresence>
        {data?.dueSoonCases && data.dueSoonCases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:from-amber-950/30 dark:to-orange-950/30 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">{data.dueSoonCases.length} Case{data.dueSoonCases.length > 1 ? "s" : ""} Due Soon</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.dueSoonCases.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-sm hover:bg-white/80 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{c.caseNumber}</span>
                      <span className="text-amber-500/60 dark:text-amber-500/40">|</span>
                      <span className="text-xs text-amber-600/70 dark:text-amber-400/60">{c.dueLabel}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Avg Turnaround" value={Math.round(data?.avgTurnaround || 0)} icon={Clock} color="indigo" delay={0.1} format={(v) => `${v} days`} />
        <StatCard title="On-Time Rate" value={Math.round(data?.onTimeRate || 0)} icon={Target} color="emerald" delay={0.15} format={(v) => `${v}%`} />
        <StatCard title="Cases This Month" value={data?.casesThisMonth ?? 0} icon={Activity} color="blue" delay={0.2} />
        <StatCard title="Revenue This Month" value={data?.revenueThisMonth ?? 0} icon={TrendingUp} color="violet" delay={0.25} format={formatCurrency} />
      </div>

      {/* Revenue Trend - Full Width */}
      <GlassCard delay={0.3}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Monthly case volume over time</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Cases</span>
          </div>
        </div>
        {volumeData.length > 0 ? (
          <AreaChart data={volumeData} xKey="month" yKey="cases" yLabel="Cases" color="#6366f1" height={280} />
        ) : (
          <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
        )}
      </GlassCard>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <GlassCard delay={0.35}>
          <h3 className="text-base font-bold text-foreground tracking-tight mb-1">Status Distribution</h3>
          <p className="text-sm text-muted-foreground mb-5">Current breakdown by status</p>
          {statusDonutData.length > 0 ? (
            <>
              <DonutChart data={statusDonutData} centerValue={totalCases} centerLabel="Total" height={220} />
              <div className="mt-5 grid grid-cols-2 gap-3">
                {statusDonutData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2.5 text-sm p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate flex-1">{item.name}</span>
                    <span className="font-bold text-foreground tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
          )}
        </GlassCard>

        {/* Work Type Distribution */}
        <GlassCard delay={0.4}>
          <h3 className="text-base font-bold text-foreground tracking-tight mb-1">Work Type Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-5">Most common work types</p>
          {workTypeData.length > 0 ? (
            <BarChart
              data={workTypeData}
              xKey="name"
              bars={[{ key: "count", color: "#6366f1", name: "Cases" }]}
              height={300}
              layout="vertical"
            />
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
          )}
        </GlassCard>
      </div>

      {/* Leaderboard & Workload */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Dentists Leaderboard */}
        <GlassCard delay={0.45} padding="p-0">
          <div className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Top Dentists</h3>
                <p className="text-sm text-muted-foreground">Leaderboard by revenue</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-2">
              {(data?.topDentists || []).slice(0, 5).map((dentist, index) => (
                <motion.div
                  key={dentist.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.08 }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group"
                >
                  {/* Rank */}
                  <div className="shrink-0">
                    {index < 3 ? (
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${medalColors[index]} flex items-center justify-center text-white text-sm font-black shadow-sm`}>
                        {index + 1}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/dentists/${dentist.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors group-hover:text-primary">
                      {dentist.name}
                    </Link>
                    {dentist.clinicName && <p className="text-xs text-muted-foreground truncate">{dentist.clinicName}</p>}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-0 rounded-full px-2.5 py-0.5 text-xs font-bold">
                      {dentist.caseCount}
                    </Badge>
                    <span className="text-sm font-bold text-foreground tabular-nums min-w-[80px] text-right">
                      {formatCurrency(dentist.revenue)}
                    </span>
                  </div>
                </motion.div>
              ))}
              {(!data?.topDentists || data.topDentists.length === 0) && (
                <div className="text-center text-muted-foreground py-8 text-sm">No dentist data</div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Technician Workload */}
        <GlassCard delay={0.5} padding="p-0">
          <div className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
                <Users className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">Technician Workload</h3>
                <p className="text-sm text-muted-foreground">Active & completed cases</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="space-y-4">
              {(data?.techWorkload || []).map((tech, index) => {
                const total = tech.activeCases + tech.completedCases;
                const pct = total > 0 ? Math.round((tech.completedCases / total) * 100) : 0;
                const loadPct = Math.round((total / maxTechCases) * 100);
                return (
                  <motion.div
                    key={tech.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.08 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                          {tech.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{tech.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {tech.activeCases} active
                        </Badge>
                        <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {tech.completedCases} done
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-10 text-right tabular-nums">{pct}%</span>
                    </div>
                  </motion.div>
                );
              })}
              {(!data?.techWorkload || data.techWorkload.length === 0) && (
                <div className="text-center text-muted-foreground py-8 text-sm">No technician data</div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
