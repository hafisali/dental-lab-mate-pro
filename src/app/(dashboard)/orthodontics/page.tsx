"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Loader2, Search, CreditCard, FileText, CheckCircle2, XCircle,
  Eye, Calendar, Banknote, ClipboardList, Activity, Users, DollarSign,
  Stethoscope, ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type OrthoStatusFilter = "all" | "ACTIVE" | "COMPLETED" | "CANCELLED";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI Transfer",
  BANK: "Bank Transfer",
  ONLINE: "Online Payment",
  CHEQUE: "Cheque",
};

const paymentMethodIcons: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  UPI: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  BANK: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  ONLINE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  CHEQUE: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

function CardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/50 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32 bg-muted" />
              <Skeleton className="h-3 w-24 bg-muted" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full bg-muted" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20 bg-muted" />
            <Skeleton className="h-4 w-16 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrthodonticsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrthoStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New Plan Dialog
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState({
    patientId: "", dentistId: "", diagnosis: "", totalCost: "", startDate: "", notes: "",
  });

  // Detail View Dialog
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("payments");

  // Payment Dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", notes: "" });

  // Record Dialog
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordPlanId, setRecordPlanId] = useState("");
  const [recordForm, setRecordForm] = useState({ notes: "", doctorName: "" });

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/orthodontics");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      toast.error("Failed to load plans");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/orthodontics").then((r) => r.json()),
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/dentists").then((r) => r.json()),
    ]).then(([ortho, pat, den]) => {
      setPlans(ortho.plans || []);
      setPatients(Array.isArray(pat) ? pat : pat.patients || []);
      setDentists(Array.isArray(den) ? den : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.error("Failed to load data");
    });
  }, []);

  // Computed stats
  const activePlans = plans.filter((p) => p.status === "ACTIVE").length;
  const totalRevenue = plans.reduce((s, p) => {
    const paid = (p.payments || []).reduce((a: number, pay: any) => a + pay.amount, 0);
    return s + paid;
  }, 0);
  const totalOutstanding = plans.reduce((s, p) => {
    const paid = (p.payments || []).reduce((a: number, pay: any) => a + pay.amount, 0);
    return s + Math.max(0, p.totalCost - paid);
  }, 0);

  const filteredPlans = useMemo(() => {
    let result = plans;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.patient?.name?.toLowerCase().includes(q) ||
          p.diagnosis?.toLowerCase().includes(q) ||
          p.dentist?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [plans, statusFilter, searchQuery]);

  const statusFilters: { label: string; value: OrthoStatusFilter; count?: number }[] = [
    { label: "All", value: "all", count: plans.length },
    { label: "Active", value: "ACTIVE", count: plans.filter((p) => p.status === "ACTIVE").length },
    { label: "Completed", value: "COMPLETED", count: plans.filter((p) => p.status === "COMPLETED").length },
    { label: "Cancelled", value: "CANCELLED", count: plans.filter((p) => p.status === "CANCELLED").length },
  ];

  const getPaidAmount = (plan: any) =>
    (plan.payments || []).reduce((s: number, p: any) => s + p.amount, 0);

  const getProgress = (plan: any) => {
    const paid = getPaidAmount(plan);
    return plan.totalCost > 0 ? Math.min(100, Math.round((paid / plan.totalCost) * 100)) : 0;
  };

  // Handlers
  const handleNewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.patientId || !planForm.diagnosis || !planForm.totalCost || !planForm.startDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/orthodontics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...planForm, type: "plan", totalCost: Number(planForm.totalCost) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ortho plan created!");
      setNewPlanOpen(false);
      setPlanForm({ patientId: "", dentistId: "", diagnosis: "", totalCost: "", startDate: "", notes: "" });
      await fetchPlans();
    } catch {
      toast.error("Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount) { toast.error("Amount is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/orthodontics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...paymentForm, type: "payment", planId: paymentPlanId, amount: Number(paymentForm.amount) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded!");
      setPaymentOpen(false);
      setPaymentForm({ amount: "", method: "CASH", notes: "" });
      await fetchPlans();
      // Refresh detail if open
      if (selectedPlan && selectedPlan.id === paymentPlanId) {
        const detailRes = await fetch(`/api/orthodontics/${paymentPlanId}`);
        setSelectedPlan(await detailRes.json());
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.notes) { toast.error("Notes are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/orthodontics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...recordForm, type: "record", planId: recordPlanId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Record added!");
      setRecordOpen(false);
      setRecordForm({ notes: "", doctorName: "" });
      await fetchPlans();
      if (selectedPlan && selectedPlan.id === recordPlanId) {
        const detailRes = await fetch(`/api/orthodontics/${recordPlanId}`);
        setSelectedPlan(await detailRes.json());
      }
    } catch {
      toast.error("Failed to add record");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orthodontics/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Plan marked as ${newStatus.toLowerCase()}`);
      await fetchPlans();
      if (selectedPlan && selectedPlan.id === planId) {
        const detailRes = await fetch(`/api/orthodontics/${planId}`);
        setSelectedPlan(await detailRes.json());
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openDetail = async (plan: any) => {
    try {
      const res = await fetch(`/api/orthodontics/${plan.id}`);
      const data = await res.json();
      setSelectedPlan(data);
      setDetailTab("payments");
      setDetailOpen(true);
    } catch {
      toast.error("Failed to load plan details");
    }
  };

  const openPaymentDialog = (planId: string) => {
    setPaymentPlanId(planId);
    setPaymentForm({ amount: "", method: "CASH", notes: "" });
    setPaymentOpen(true);
  };

  const openRecordDialog = (planId: string) => {
    setRecordPlanId(planId);
    setRecordForm({ notes: "", doctorName: "" });
    setRecordOpen(true);
  };

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Orthodontics" subtitle="Treatment plans, payments & patient records">
        <Button
          onClick={() => setNewPlanOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 mr-2" />New Ortho Plan
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Plans" value={plans.length} icon={ClipboardList} color="indigo" delay={0.05} />
        <StatCard title="Active Plans" value={activePlans} icon={Activity} color="emerald" delay={0.1} />
        <StatCard title="Total Collected" value={totalRevenue} format={formatCurrency} icon={DollarSign} color="violet" delay={0.15} />
        <StatCard title="Outstanding" value={totalOutstanding} format={formatCurrency} icon={Banknote} color="amber" delay={0.2} />
      </div>

      {/* Filters */}
      <GlassCard hover="none" delay={0.25} padding="p-5">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients, diagnosis, doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0 ${
                    statusFilter === f.value ? "bg-white/20" : "bg-muted"
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Plans Grid */}
      {loading ? (
        <CardSkeleton />
      ) : filteredPlans.length === 0 ? (
        <GlassCard hover="none" delay={0.3}>
          <EmptyState
            icon={Stethoscope}
            title={statusFilter !== "all" ? "No plans match this filter" : "No orthodontic plans yet"}
            description={statusFilter !== "all" ? "Try a different filter or search term" : "Create your first ortho plan to get started"}
            action={{ label: "New Ortho Plan", onClick: () => setNewPlanOpen(true) }}
          />
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredPlans.map((plan, index) => {
              const paid = getPaidAmount(plan);
              const progress = getProgress(plan);
              const balance = Math.max(0, plan.totalCost - paid);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
                  className="group rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10">
                          {getInitials(plan.patient?.name || "P")}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {plan.patient?.name || "Unknown Patient"}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {plan.diagnosis?.length > 50 ? plan.diagnosis.substring(0, 50) + "..." : plan.diagnosis}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[plan.status] || ""} text-[10px] font-semibold rounded-full px-2.5 py-0.5 border flex-shrink-0`} variant="secondary">
                        {plan.status}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatCurrency(paid)} / {formatCurrency(plan.totalCost)}
                        </span>
                        <span className="font-semibold text-foreground">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            progress >= 100
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                              : progress >= 50
                              ? "bg-gradient-to-r from-indigo-400 to-violet-500"
                              : "bg-gradient-to-r from-amber-400 to-orange-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(plan.startDate)}
                      </div>
                      <div className="font-medium">
                        Balance: <span className={balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPaymentDialog(plan.id)}
                        className="h-8 rounded-lg text-xs flex-1 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      >
                        <Banknote className="h-3.5 w-3.5 mr-1" />Pay
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetail(plan)}
                        className="h-8 rounded-lg text-xs flex-1 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRecordDialog(plan.id)}
                        className="h-8 rounded-lg text-xs flex-1 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-400"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />Record
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ======================== NEW PLAN DIALOG ======================== */}
      <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">New Ortho Plan</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new orthodontic treatment plan</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleNewPlan} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient *</Label>
              <Select value={planForm.patientId} onValueChange={(v) => setPlanForm({ ...planForm, patientId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor / Dentist</Label>
              <Select value={planForm.dentistId} onValueChange={(v) => setPlanForm({ ...planForm, dentistId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-60">
                  {dentists.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}{d.clinicName ? ` - ${d.clinicName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagnosis *</Label>
              <Textarea
                value={planForm.diagnosis}
                onChange={(e) => setPlanForm({ ...planForm, diagnosis: e.target.value })}
                rows={3}
                className="rounded-xl resize-none"
                placeholder="Treatment diagnosis..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.totalCost}
                  onChange={(e) => setPlanForm({ ...planForm, totalCost: e.target.value })}
                  required
                  className="rounded-xl h-10"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date *</Label>
                <Input
                  type="date"
                  value={planForm.startDate}
                  onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                  required
                  className="rounded-xl h-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea
                value={planForm.notes}
                onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                rows={2}
                className="rounded-xl resize-none"
                placeholder="Optional notes..."
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewPlanOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[140px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {saving ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================== DETAIL VIEW DIALOG ======================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-border/50 shadow-2xl max-h-[85vh] overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ring-2 ring-white/10">
                    {getInitials(selectedPlan.patient?.name || "P")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedPlan.patient?.name || "Unknown Patient"}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedPlan.dentist?.name ? `Dr. ${selectedPlan.dentist.name}` : "No doctor assigned"}
                      {selectedPlan.dentist?.clinicName ? ` - ${selectedPlan.dentist.clinicName}` : ""}
                    </p>
                  </div>
                  <Badge className={`${statusColors[selectedPlan.status] || ""} text-[11px] font-semibold rounded-full px-3 py-1 border`} variant="secondary">
                    {selectedPlan.status}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Diagnosis */}
              <div className="rounded-xl bg-muted/30 border border-border/30 p-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Diagnosis</p>
                <p className="text-sm text-foreground">{selectedPlan.diagnosis}</p>
                {selectedPlan.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{selectedPlan.notes}</p>
                )}
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/30 p-3 text-center">
                  <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Cost</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(selectedPlan.totalCost)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-3 text-center">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(getPaidAmount(selectedPlan))}</p>
                </div>
                <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 p-3 text-center">
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Balance</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(Math.max(0, selectedPlan.totalCost - getPaidAmount(selectedPlan)))}</p>
                </div>
              </div>

              {/* Animated Progress */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment Progress</span>
                  <span className="font-semibold text-foreground">{getProgress(selectedPlan)}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgress(selectedPlan)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      getProgress(selectedPlan) >= 100
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                        : "bg-gradient-to-r from-indigo-400 to-violet-500"
                    }`}
                  />
                </div>
              </div>

              {/* Tabs: Payments / Records */}
              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-5">
                <TabsList className="bg-muted/50 rounded-xl p-1 h-auto w-full">
                  <TabsTrigger value="payments" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2 flex-1">
                    <CreditCard className="h-4 w-4 mr-1.5" />Payments ({selectedPlan.payments?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="records" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2 flex-1">
                    <FileText className="h-4 w-4 mr-1.5" />Records ({selectedPlan.records?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="payments" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment History</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPaymentDialog(selectedPlan.id)}
                      className="h-7 rounded-lg text-xs hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                    >
                      <Plus className="h-3 w-3 mr-1" />Add Payment
                    </Button>
                  </div>
                  {(!selectedPlan.payments || selectedPlan.payments.length === 0) ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No payments recorded yet</div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border/30">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-4">Date</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                            <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-4">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPlan.payments.map((pay: any) => (
                            <TableRow key={pay.id} className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150">
                              <TableCell className="pl-4 text-sm text-muted-foreground">{formatDate(pay.date)}</TableCell>
                              <TableCell className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(pay.amount)}</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center rounded-lg text-xs font-medium px-2.5 py-1 ${paymentMethodIcons[pay.method] || "bg-muted text-muted-foreground"}`}>
                                  {paymentMethodLabels[pay.method] || pay.method}
                                </span>
                              </TableCell>
                              <TableCell className="pr-4 text-sm text-muted-foreground truncate max-w-[150px]">{pay.notes || "--"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="records" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Treatment Records</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRecordDialog(selectedPlan.id)}
                      className="h-7 rounded-lg text-xs hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-400"
                    >
                      <Plus className="h-3 w-3 mr-1" />Add Record
                    </Button>
                  </div>
                  {(!selectedPlan.records || selectedPlan.records.length === 0) ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No treatment records yet</div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPlan.records.map((rec: any, idx: number) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                          className="relative pl-6 pb-3 border-l-2 border-indigo-200 dark:border-indigo-800 last:border-transparent"
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500" />
                          <div className="rounded-xl bg-muted/30 border border-border/30 p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-foreground">{formatDate(rec.date)}</span>
                              {rec.doctorName && (
                                <span className="text-xs text-muted-foreground">Dr. {rec.doctorName}</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.notes || "No notes"}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Actions */}
              {selectedPlan.status === "ACTIVE" && (
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange(selectedPlan.id, "COMPLETED")}
                    className="flex-1 h-9 rounded-xl text-xs hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark as Completed
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange(selectedPlan.id, "CANCELLED")}
                    className="flex-1 h-9 rounded-xl text-xs hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400 border border-red-200/50 dark:border-red-800/30"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />Cancel Plan
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================== ADD PAYMENT DIALOG ======================== */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Payment</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Record a payment for this ortho plan</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  className="rounded-xl h-10"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</Label>
                <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={2}
                className="rounded-xl resize-none"
                placeholder="Optional notes..."
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPaymentOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 min-w-[140px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================== ADD RECORD DIALOG ======================== */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Record</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Add a treatment record to this plan</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleAddRecord} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor Name</Label>
              <Input
                value={recordForm.doctorName}
                onChange={(e) => setRecordForm({ ...recordForm, doctorName: e.target.value })}
                className="rounded-xl h-10"
                placeholder="Doctor name..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes *</Label>
              <Textarea
                value={recordForm.notes}
                onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                rows={4}
                className="rounded-xl resize-none"
                placeholder="Treatment notes, observations, next steps..."
                required
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRecordOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25 min-w-[140px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Add Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
