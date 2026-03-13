"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, CheckCircle2, Clock, PlayCircle, FolderOpen, AlertTriangle, LayoutList } from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "WORKING", label: "Working" },
  { value: "TRIAL", label: "Trial" },
  { value: "FINISHED", label: "Finished" },
];

export default function TechnicianPage() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/cases?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCases(data.cases || []);
        setLoading(false);
      });
  }, [statusFilter]);

  const updateStatus = async (caseId: string, status: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status } : c)));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Failed to update status"); }
  };

  const activeCases = cases.filter((c) => ["RECEIVED", "WORKING", "TRIAL"].includes(c.status));
  const completedCases = cases.filter((c) => ["FINISHED", "DELIVERED"].includes(c.status));

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="My Cases" subtitle="Your assigned cases and work progress" />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Active Cases" value={activeCases.length} icon={Clock} color="indigo" delay={0} />
        <StatCard title="Completed" value={completedCases.length} icon={CheckCircle2} color="emerald" delay={0.1} />
        <StatCard title="Total Cases" value={cases.length} icon={Wrench} color="slate" delay={0.2} />
      </div>

      {/* Status Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="flex flex-wrap gap-2"
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              statusFilter === f.value
                ? "bg-primary text-white shadow-md shadow-indigo-500/25"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Cases Table */}
      <GlassCard padding="p-0" hover="none" delay={0.3}>
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[70px]" />
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No cases assigned"
            description="New cases will appear here when they are assigned to you."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case #</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c, index) => {
                  const overdue = isOverdue(c.dueDate) && !["FINISHED", "DELIVERED"].includes(c.status);
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                    >
                      <TableCell>
                        <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                          {c.caseNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{c.dentist?.name}</TableCell>
                      <TableCell className="text-sm text-foreground">{c.workType}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {c.dueDate ? (
                          <span className={`text-sm flex items-center gap-1.5 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                            {formatDate(c.dueDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "RECEIVED" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(c.id, "WORKING")}
                            className="rounded-xl text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-sm shadow-indigo-500/25 h-8"
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1" />Start
                          </Button>
                        )}
                        {c.status === "WORKING" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(c.id, "TRIAL")}
                            className="rounded-xl text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shadow-amber-500/25 h-8"
                          >
                            Trial
                          </Button>
                        )}
                        {c.status === "TRIAL" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus(c.id, "FINISHED")}
                            className="rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-sm shadow-emerald-500/25 h-8"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Finish
                          </Button>
                        )}
                        {c.status === "FINISHED" && (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-semibold px-2.5 py-0.5">
                            Done
                          </Badge>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
