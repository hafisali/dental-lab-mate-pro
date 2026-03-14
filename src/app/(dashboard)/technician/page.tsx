"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, CheckCircle2, Clock, PlayCircle, FolderOpen, AlertTriangle, User, Calendar, ArrowRight } from "lucide-react";
import { formatDate, getStatusColor, getStatusDot } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import toast from "react-hot-toast";
import Link from "next/link";

const STATUS_FILTERS = [
  { value: "all", label: "All Cases", count: 0 },
  { value: "RECEIVED", label: "Received", count: 0 },
  { value: "WORKING", label: "Working", count: 0 },
  { value: "TRIAL", label: "Trial", count: 0 },
  { value: "FINISHED", label: "Finished", count: 0 },
];

const statusGradients: Record<string, string> = {
  RECEIVED: "from-slate-400 to-slate-500",
  WORKING: "from-indigo-400 to-indigo-600",
  TRIAL: "from-amber-400 to-amber-600",
  FINISHED: "from-emerald-400 to-emerald-600",
  DELIVERED: "from-green-400 to-green-600",
};

export default function TechnicianPage() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    setUpdatingId(caseId);
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
    finally { setUpdatingId(null); }
  };

  const activeCases = cases.filter((c) => ["RECEIVED", "WORKING", "TRIAL"].includes(c.status));
  const completedCases = cases.filter((c) => ["FINISHED", "DELIVERED"].includes(c.status));
  const overdueCases = cases.filter((c) => {
    if (!c.dueDate || ["FINISHED", "DELIVERED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  });

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || ["FINISHED", "DELIVERED"].includes(status)) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate: string | null): number | null => {
    if (!dueDate) return null;
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="My Cases" subtitle="Your assigned cases and work progress" />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Active Cases" value={activeCases.length} icon={Clock} color="indigo" delay={0} />
        <StatCard title="Completed" value={completedCases.length} icon={CheckCircle2} color="emerald" delay={0.05} />
        <StatCard title="Overdue" value={overdueCases.length} icon={AlertTriangle} color="rose" delay={0.1} />
        <StatCard title="Total Cases" value={cases.length} icon={Wrench} color="slate" delay={0.15} />
      </div>

      {/* Status Filter Pills */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        {STATUS_FILTERS.map((f) => {
          const count = f.value === "all"
            ? cases.length
            : cases.filter(c => c.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                statusFilter === f.value
                  ? "bg-primary text-white shadow-md shadow-indigo-500/25 border-primary"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border-border/50"
              }`}
            >
              {f.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                statusFilter === f.value
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* Cases - Premium Card Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-2xl" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <GlassCard hover="none">
          <EmptyState
            icon={FolderOpen}
            title="No cases assigned"
            description="New cases will appear here when they are assigned to you."
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {cases.map((c, index) => {
              const overdue = isOverdue(c.dueDate, c.status);
              const daysUntil = getDaysUntilDue(c.dueDate);
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className={`group relative rounded-2xl bg-card border shadow-sm p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                    overdue
                      ? "border-red-200 dark:border-red-900/50"
                      : "border-border/50"
                  }`}
                >
                  {/* Overdue indicator */}
                  {overdue && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
                  )}

                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link href={`/cases/${c.id}`} className="text-base font-bold text-primary hover:text-primary/80 transition-colors">
                        {c.caseNumber}
                      </Link>
                      <p className="text-sm text-foreground font-medium mt-1">{c.workType}</p>
                    </div>
                    <Badge className={`${getStatusColor(c.status)} text-[11px] font-semibold rounded-full px-3 py-1`} variant="secondary">
                      {c.status}
                    </Badge>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2.5 mb-5">
                    {c.dentist?.name && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{c.dentist.name}</span>
                      </div>
                    )}
                    {c.dueDate && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"}>
                          {formatDate(c.dueDate)}
                        </span>
                        {overdue && (
                          <Badge className="bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-0 text-[10px] px-1.5 py-0 rounded-full font-bold">
                            Overdue
                          </Badge>
                        )}
                        {!overdue && daysUntil !== null && daysUntil <= 2 && daysUntil >= 0 && (
                          <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0 rounded-full font-bold">
                            {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="pt-3 border-t border-border/30">
                    {c.status === "RECEIVED" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(c.id, "WORKING")}
                        disabled={updatingId === c.id}
                        className="w-full rounded-xl text-xs bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-sm shadow-indigo-500/25 h-9 font-semibold"
                      >
                        <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                        Start Working
                        <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    )}
                    {c.status === "WORKING" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(c.id, "TRIAL")}
                        disabled={updatingId === c.id}
                        className="w-full rounded-xl text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shadow-amber-500/25 h-9 font-semibold"
                      >
                        Send for Trial
                        <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Button>
                    )}
                    {c.status === "TRIAL" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(c.id, "FINISHED")}
                        disabled={updatingId === c.id}
                        className="w-full rounded-xl text-xs bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-sm shadow-emerald-500/25 h-9 font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Mark as Finished
                      </Button>
                    )}
                    {c.status === "FINISHED" && (
                      <div className="flex items-center justify-center gap-2 h-9 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">Completed</span>
                      </div>
                    )}
                    {c.status === "DELIVERED" && (
                      <div className="flex items-center justify-center gap-2 h-9 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-semibold text-xs">Delivered</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
