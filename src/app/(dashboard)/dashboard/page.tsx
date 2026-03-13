"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  FolderOpen, FolderPlus, Clock, CheckCircle2, DollarSign, AlertCircle,
  Plus, ArrowRight, Users, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, getStatusDot, statusChartColors } from "@/lib/utils";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const userName = (session?.user as any)?.name || "User";

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Page Header */}
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${userName}`}>
        <Link href="/cases/new">
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Today's Cases" value={data?.todayCases ?? 0} icon={FolderPlus} color="indigo" delay={0} />
        <StatCard title="Pending Cases" value={data?.pendingCases ?? 0} icon={Clock} color="amber" delay={0.05} />
        <StatCard title="Delivered" value={data?.deliveredCases ?? 0} icon={CheckCircle2} color="emerald" delay={0.1} />
        <StatCard title="Total Income" value={data?.totalIncome ?? 0} icon={DollarSign} color="blue" delay={0.15} format={formatCurrency} />
        <StatCard title="Outstanding" value={data?.totalBalance ?? 0} icon={AlertCircle} color="rose" delay={0.2} format={formatCurrency} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend */}
        <GlassCard className="lg:col-span-2" delay={0.25}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Monthly revenue over time</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
              <TrendingUp className="h-3.5 w-3.5" />
              Last 6 months
            </div>
          </div>
          {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
            <AreaChart
              data={data.monthlyRevenue}
              xKey="month"
              yKey="revenue"
              yLabel="Revenue"
              color="#6366f1"
              height={260}
              formatter={(val) => formatCurrency(val)}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No revenue data yet
            </div>
          )}
        </GlassCard>

        {/* Status Donut */}
        <GlassCard delay={0.3}>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Case Status</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Distribution overview</p>
          </div>
          {statusDonutData.length > 0 ? (
            <>
              <DonutChart
                data={statusDonutData}
                centerValue={totalCases}
                centerLabel="Total Cases"
                height={200}
              />
              <div className="mt-4 space-y-2">
                {statusDonutData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No cases yet
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { href: "/cases/new", label: "New Case", desc: "Create a new lab case", icon: FolderPlus, color: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400" },
          { href: "/dentists", label: "Manage Dentists", desc: "View & manage dentist profiles", icon: Users, color: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400" },
          { href: "/billing", label: "View Billing", desc: "Invoices & payment tracking", icon: DollarSign, color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" },
        ].map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.05 }}
          >
            <Link href={action.href} className="block">
              <div className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5">
                <div className={`p-3 rounded-xl ${action.color} transition-colors`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Cases */}
      <GlassCard delay={0.45} padding="p-0">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Cases</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Latest case activity</p>
          </div>
          <Link href="/cases">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-accent rounded-xl gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-6">Case #</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentCases || []).map((c: any, index: number) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.03 }}
                  className="border-b border-border/30 hover:bg-accent/50 transition-colors duration-150 group"
                >
                  <TableCell className="pl-6">
                    <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                      {c.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {c.dentist?.id ? (
                      <Link href={`/dentists/${c.dentist.id}`} className="text-foreground/80 hover:text-primary text-sm transition-colors">
                        {c.dentist.name}
                      </Link>
                    ) : <span className="text-muted-foreground">{c.dentist?.name || "-"}</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.workType}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)}`} />
                      <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                        {c.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={`${getPriorityColor(c.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm text-foreground pr-6">{formatCurrency(c.amount)}</TableCell>
                </motion.tr>
              ))}
              {(!data?.recentCases || data.recentCases.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon={FolderOpen} title="No cases found" description="Create your first case to get started!" action={{ label: "Create Case", onClick: () => window.location.href = "/cases/new" }} />
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
