"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  DollarSign,
  Wallet,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    {
      title: "Today's Cases",
      value: data?.todayCases ?? 0,
      icon: FolderOpen,
      gradient: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      lightText: "text-blue-600",
      shadowColor: "shadow-blue-500/10",
    },
    {
      title: "Pending Cases",
      value: data?.pendingCases ?? 0,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      lightBg: "bg-amber-50",
      lightText: "text-amber-600",
      shadowColor: "shadow-amber-500/10",
    },
    {
      title: "Delivered",
      value: data?.deliveredCases ?? 0,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-green-500",
      lightBg: "bg-emerald-50",
      lightText: "text-emerald-600",
      shadowColor: "shadow-emerald-500/10",
    },
    {
      title: "Total Income",
      value: formatCurrency(data?.totalIncome ?? 0),
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-600",
      lightBg: "bg-green-50",
      lightText: "text-green-600",
      shadowColor: "shadow-green-500/10",
    },
    {
      title: "Outstanding",
      value: formatCurrency(data?.totalBalance ?? 0),
      icon: Wallet,
      gradient: "from-red-500 to-rose-500",
      lightBg: "bg-red-50",
      lightText: "text-red-600",
      shadowColor: "shadow-red-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Loading your workspace...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="rounded-xl border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back! Here&apos;s your lab overview.</p>
        </div>
        <Link href="/cases/new">
          <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title} className={`rounded-xl border-0 shadow-sm hover:shadow-md transition-all duration-200 ${stat.shadowColor} overflow-hidden`}>
            <CardContent className="p-5 relative">
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${stat.gradient}`} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1.5 text-slate-800">{stat.value}</p>
                </div>
                <div className={`${stat.lightBg} ${stat.lightText} p-2.5 rounded-xl`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-500" />
              Case Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.statusBreakdown || []).map((item) => {
                const total = (data?.statusBreakdown || []).reduce((s, i) => s + i.count, 0) || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.status} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge className={`${getStatusColor(item.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                        {item.status}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-700">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!data?.statusBreakdown || data.statusBreakdown.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No cases yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.monthlyRevenue || []).slice(0, 6).map((item, index) => (
                <div key={item.month} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">{item.month}</span>
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
              {(!data?.monthlyRevenue || data.monthlyRevenue.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">No revenue data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              <Link href="/cases/new" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-200 hover:bg-sky-50/50 transition-all duration-200 group cursor-pointer">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1">New Case</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
              <Link href="/dentists" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-200 hover:bg-sky-50/50 transition-all duration-200 group cursor-pointer">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1">Manage Dentists</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
              <Link href="/billing" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-sky-200 hover:bg-sky-50/50 transition-all duration-200 group cursor-pointer">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1">View Billing</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases Table */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">Recent Cases</CardTitle>
            <Link href="/cases">
              <Button variant="ghost" size="sm" className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recentCases || []).map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-sky-50/30 transition-colors duration-150">
                    <TableCell>
                      <Link href={`/cases/${c.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">
                        {c.caseNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c.dentist?.id ? (
                        <Link href={`/dentists/${c.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                          {c.dentist.name}
                        </Link>
                      ) : <span className="text-slate-400">{c.dentist?.name || "-"}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600">{c.workType}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge className={`${getPriorityColor(c.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                        {c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-slate-700">{formatCurrency(c.amount)}</TableCell>
                  </TableRow>
                ))}
                {(!data?.recentCases || data.recentCases.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-slate-500">No cases found</p>
                      <p className="text-sm text-slate-400 mt-1">Create your first case to get started!</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
