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
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pending Cases",
      value: data?.pendingCases ?? 0,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Delivered",
      value: data?.deliveredCases ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Income",
      value: formatCurrency(data?.totalIncome ?? 0),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Outstanding Balance",
      value: formatCurrency(data?.totalBalance ?? 0),
      icon: Wallet,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back! Here&apos;s your lab overview.</p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Case Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.statusBreakdown || []).map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(item.status)} variant="secondary">
                      {item.status}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              ))}
              {(!data?.statusBreakdown || data.statusBreakdown.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No cases yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.monthlyRevenue || []).slice(0, 6).map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.month}</span>
                  <span className="text-sm font-medium">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
              {(!data?.monthlyRevenue || data.monthlyRevenue.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No revenue data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/cases/new" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    New Case
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dentists" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manage Dentists
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/billing" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    View Billing
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Cases</CardTitle>
            <Link href="/cases">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead className="hidden sm:table-cell">Dentist</TableHead>
                <TableHead className="hidden md:table-cell">Work Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentCases || []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/cases/${c.id}`} className="text-primary hover:underline font-medium">
                      {c.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {c.dentist?.id ? (
                      <Link href={`/dentists/${c.dentist.id}`} className="text-sky-600 hover:underline">
                        {c.dentist.name}
                      </Link>
                    ) : c.dentist?.name || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.workType}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(c.status)} variant="secondary">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className={getPriorityColor(c.priority)} variant="secondary">
                      {c.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                </TableRow>
              ))}
              {(!data?.recentCases || data.recentCases.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No cases found. Create your first case!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
