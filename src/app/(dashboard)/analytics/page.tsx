"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  Target, Activity, Trophy, Medal,
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
  const maxDentistRevenue = Math.max(...(data?.topDentists || []).map(d => d.revenue), 1);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Analytics" subtitle="Performance insights & delayed work tracking" />

      {/* Overdue Alert */}
      {data?.overdueCases && data.overdueCases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 p-5 animate-pulse-glow"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800 dark:text-red-300">{data.overdueCases.length} Overdue Case{data.overdueCases.length > 1 ? "s" : ""}</h3>
              <div className="mt-2 space-y-1.5">
                {data.overdueCases.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/cases/${c.id}`} className="text-red-700 dark:text-red-400 hover:underline font-medium">{c.caseNumber}</Link>
                    <span className="text-red-600/70 dark:text-red-400/60">—</span>
                    <span className="text-red-600/70 dark:text-red-400/60">{c.dentist?.name}</span>
                    <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-0 text-[10px] px-2 py-0 rounded-full">{c.daysOverdue}d overdue</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Due Soon Alert */}
      {data?.dueSoonCases && data.dueSoonCases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">{data.dueSoonCases.length} Case{data.dueSoonCases.length > 1 ? "s" : ""} Due Soon</h3>
              <div className="mt-2 space-y-1.5">
                {data.dueSoonCases.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/cases/${c.id}`} className="text-amber-700 dark:text-amber-400 hover:underline font-medium">{c.caseNumber}</Link>
                    <span className="text-amber-600/70">—</span>
                    <span className="text-amber-600/70">{c.dentist?.name}</span>
                    <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-0 text-[10px] px-2 py-0 rounded-full">{c.dueLabel}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Avg Turnaround" value={Math.round(data?.avgTurnaround || 0)} icon={Clock} color="indigo" delay={0.1} format={(v) => `${v} days`} />
        <StatCard title="On-Time Rate" value={Math.round(data?.onTimeRate || 0)} icon={Target} color="emerald" delay={0.15} format={(v) => `${v}%`} />
        <StatCard title="Cases This Month" value={data?.casesThisMonth ?? 0} icon={Activity} color="blue" delay={0.2} />
        <StatCard title="Revenue This Month" value={data?.revenueThisMonth ?? 0} icon={TrendingUp} color="violet" delay={0.25} format={formatCurrency} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <GlassCard delay={0.3}>
          <h3 className="text-base font-semibold text-foreground mb-1">Case Status Distribution</h3>
          <p className="text-sm text-muted-foreground mb-4">Current breakdown by status</p>
          {statusDonutData.length > 0 ? (
            <>
              <DonutChart data={statusDonutData} centerValue={totalCases} centerLabel="Total" height={220} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusDonutData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                    <span className="font-semibold text-foreground ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
          )}
        </GlassCard>

        {/* Monthly Volumes */}
        <GlassCard delay={0.35}>
          <h3 className="text-base font-semibold text-foreground mb-1">Monthly Case Volume</h3>
          <p className="text-sm text-muted-foreground mb-4">Cases received per month</p>
          {volumeData.length > 0 ? (
            <AreaChart data={volumeData} xKey="month" yKey="cases" yLabel="Cases" color="#6366f1" height={300} />
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
          )}
        </GlassCard>
      </div>

      {/* Work Type Distribution */}
      {workTypeData.length > 0 && (
        <GlassCard delay={0.4}>
          <h3 className="text-base font-semibold text-foreground mb-1">Work Type Distribution</h3>
          <p className="text-sm text-muted-foreground mb-4">Most common work types</p>
          <BarChart
            data={workTypeData}
            xKey="name"
            bars={[{ key: "count", color: "#6366f1", name: "Cases" }]}
            height={250}
            layout="vertical"
          />
        </GlassCard>
      )}

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Dentists */}
        <GlassCard delay={0.45} padding="p-0">
          <div className="p-6 pb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Dentists
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">By case count & revenue</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">#</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Cases</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.topDentists || []).slice(0, 5).map((dentist, index) => (
                <motion.tr
                  key={dentist.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                >
                  <TableCell className="pl-6">
                    <span className="text-lg">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : <span className="text-sm text-muted-foreground font-medium">{index + 1}</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dentists/${dentist.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {dentist.name}
                    </Link>
                    {dentist.clinicName && <p className="text-xs text-muted-foreground">{dentist.clinicName}</p>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">{dentist.caseCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6 font-semibold text-sm text-foreground">{formatCurrency(dentist.revenue)}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </GlassCard>

        {/* Technician Workload */}
        <GlassCard delay={0.5} padding="p-0">
          <div className="p-6 pb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Technician Workload
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Active & completed cases per technician</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Name</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Active</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Done</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-6">Load</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.techWorkload || []).map((tech, index) => {
                const total = tech.activeCases + tech.completedCases;
                const pct = total > 0 ? Math.round((tech.completedCases / total) * 100) : 0;
                return (
                  <motion.tr
                    key={tech.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell className="pl-6 text-sm font-medium text-foreground">{tech.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">{tech.activeCases}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-0 rounded-full px-2.5 py-0.5 text-xs font-semibold">{tech.completedCases}</Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {(!data?.techWorkload || data.techWorkload.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No technician data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </GlassCard>
      </div>
    </div>
  );
}
