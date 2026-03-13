"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Clock,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Activity,
  Target,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

interface OverdueCase {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string } | null;
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: string;
  status: string;
  daysOverdue: number;
}

interface DueSoonCase {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string } | null;
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: string;
  status: string;
  dueLabel: string;
}

interface AnalyticsData {
  overdueCases: OverdueCase[];
  dueSoonCases: DueSoonCase[];
  statusCounts: { status: string; count: number }[];
  workTypeCounts: { workType: string; count: number }[];
  avgTurnaround: number;
  onTimeRate: number;
  monthlyCaseVolumes: { month: string; year: number; count: number }[];
  topDentists: {
    id: string;
    name: string;
    clinicName: string | null;
    caseCount: number;
    revenue: number;
  }[];
  techWorkload: {
    id: string;
    name: string;
    activeCases: number;
    completedCases: number;
  }[];
  casesThisMonth: number;
  revenueThisMonth: number;
}

const statusBarColors: Record<string, string> = {
  RECEIVED: "bg-gradient-to-r from-slate-400 to-slate-500",
  WORKING: "bg-gradient-to-r from-blue-400 to-blue-500",
  TRIAL: "bg-gradient-to-r from-amber-400 to-amber-500",
  FINISHED: "bg-gradient-to-r from-green-400 to-green-500",
  DELIVERED: "bg-gradient-to-r from-emerald-400 to-emerald-500",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Performance insights & delayed work tracking</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalCases =
    data?.statusCounts?.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Performance insights & delayed work tracking
        </p>
      </div>

      {/* Overdue Alert Banner */}
      {data?.overdueCases && data.overdueCases.length > 0 && (
        <Card className="border border-red-200 bg-red-50/50 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Overdue Cases ({data.overdueCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-red-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50/80 hover:bg-red-50/80">
                    <TableHead className="text-xs font-semibold text-red-500 uppercase tracking-wider">Case #</TableHead>
                    <TableHead className="text-xs font-semibold text-red-500 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-red-500 uppercase tracking-wider">Patient</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold text-red-500 uppercase tracking-wider">Work Type</TableHead>
                    <TableHead className="text-xs font-semibold text-red-500 uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-red-500 uppercase tracking-wider">Days Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.overdueCases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-red-50/50 transition-colors">
                      <TableCell>
                        <Link
                          href={`/cases/${c.id}`}
                          className="text-sky-600 hover:text-sky-700 font-semibold text-sm"
                        >
                          {c.caseNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.dentist?.id ? (
                          <Link
                            href={`/dentists/${c.dentist.id}`}
                            className="text-sky-600 hover:text-sky-700 text-sm"
                          >
                            {c.dentist.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                        {c.patient?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600">
                        {c.workType}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(c.dueDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold rounded-full px-2.5 py-0.5">
                          {c.daysOverdue} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Due Soon Section */}
      {data?.dueSoonCases && data.dueSoonCases.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50/50 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-amber-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Due Soon ({data.dueSoonCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-amber-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50/80 hover:bg-amber-50/80">
                    <TableHead className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Case #</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-amber-600 uppercase tracking-wider">Patient</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold text-amber-600 uppercase tracking-wider">Work Type</TableHead>
                    <TableHead className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-amber-600 uppercase tracking-wider">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dueSoonCases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-amber-50/50 transition-colors">
                      <TableCell>
                        <Link
                          href={`/cases/${c.id}`}
                          className="text-sky-600 hover:text-sky-700 font-semibold text-sm"
                        >
                          {c.caseNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.dentist?.id ? (
                          <Link
                            href={`/dentists/${c.dentist.id}`}
                            className="text-sky-600 hover:text-sky-700 text-sm"
                          >
                            {c.dentist.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                        {c.patient?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600">
                        {c.workType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
                          variant="secondary"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={`text-[11px] font-medium rounded-full px-2.5 py-0.5 ${
                            c.dueLabel === "Today"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                          variant="secondary"
                        >
                          {c.dueLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avg Turnaround
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {data?.avgTurnaround || 0} days
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Received to delivered
                </p>
              </div>
              <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">On-time Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {data?.onTimeRate || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Delivered before due date
                </p>
              </div>
              <div className="bg-green-50 text-green-600 p-2.5 rounded-xl">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cases This Month
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {data?.casesThisMonth || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {totalCases} all time
                </p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Revenue This Month
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(data?.revenueThisMonth || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From payments received
                </p>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {(data?.statusCounts || []).map((item) => {
                const percentage =
                  totalCases > 0
                    ? Math.round((item.count / totalCases) * 100)
                    : 0;
                return (
                  <div key={item.status} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`${getStatusColor(item.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
                        variant="secondary"
                      >
                        {item.status}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.count}{" "}
                        <span className="text-slate-400 font-normal">
                          ({percentage}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          statusBarColors[item.status] || "bg-slate-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!data?.statusCounts || data.statusCounts.length === 0) && (
                <div className="text-center py-8">
                  <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-500">No cases yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Work Type Distribution */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Work Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.workTypeCounts || []).map((item) => (
                <div
                  key={item.workType}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-700">{item.workType}</span>
                  <Badge className="bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full px-2.5 py-0.5" variant="secondary">{item.count}</Badge>
                </div>
              ))}
              {(!data?.workTypeCounts || data.workTypeCounts.length === 0) && (
                <div className="text-center py-8">
                  <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-500">No cases yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Case Volumes */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Monthly Case Volumes (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-48 px-2">
            {(data?.monthlyCaseVolumes || []).map((item) => {
              const maxCount = Math.max(
                ...(data?.monthlyCaseVolumes || []).map((m) => m.count),
                1
              );
              const heightPercent = (item.count / maxCount) * 100;
              return (
                <div
                  key={`${item.month}-${item.year}`}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-semibold text-slate-700">{item.count}</span>
                  <div className="w-full bg-slate-100 rounded-t-lg relative flex-1 flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-sky-500 to-blue-400 rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max(heightPercent, 4)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Technician Workload */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Technician Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.techWorkload && data.techWorkload.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Technician</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.techWorkload.map((tech) => {
                      const initials = tech.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "T";
                      return (
                        <TableRow key={tech.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {initials}
                              </div>
                              <span className="font-semibold text-sm text-slate-700">{tech.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium rounded-full px-2.5 py-0.5" variant="secondary">
                              {tech.activeCases}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-50 text-green-700 border border-green-200 text-[11px] font-medium rounded-full px-2.5 py-0.5" variant="secondary">
                              {tech.completedCases}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-sm text-slate-700">
                            {tech.activeCases + tech.completedCases}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-500">No technicians found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Dentists */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Top Dentists
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topDentists && data.topDentists.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topDentists.map((d, idx) => {
                      const initials = d.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "D";
                      return (
                        <TableRow key={d.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell className="text-sm text-slate-400 font-semibold">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <Link
                                  href={`/dentists/${d.id}`}
                                  className="text-sky-600 hover:text-sky-700 font-semibold text-sm"
                                >
                                  {d.name}
                                </Link>
                                {d.clinicName && (
                                  <p className="text-xs text-slate-400">
                                    {d.clinicName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full px-2.5 py-0.5" variant="secondary">{d.caseCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-green-600">
                            {formatCurrency(d.revenue)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-500">No dentists found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
