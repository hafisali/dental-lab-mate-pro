"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Plus, Users, Loader2, Search, UserCheck, UserX, Clock,
  Banknote, CheckCircle2, Calendar, XCircle, AlertCircle,
  Edit3, UserMinus, Phone, Mail, CreditCard, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-10 w-10 rounded-full bg-muted" />
          <Skeleton className="h-4 w-28 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted hidden sm:block" />
          <Skeleton className="h-6 w-16 rounded-full bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted ml-auto" />
        </div>
      ))}
    </div>
  );
}

const STAFF_ROLES = ["Doctor", "Technician", "Receptionist", "Lab Assistant", "Cleaner", "Other"];

const roleGradients: Record<string, string> = {
  Doctor: "from-blue-400 to-cyan-500",
  Technician: "from-indigo-400 to-violet-600",
  Receptionist: "from-pink-400 to-rose-500",
  "Lab Assistant": "from-emerald-400 to-teal-500",
  Cleaner: "from-amber-400 to-orange-500",
  Other: "from-slate-400 to-slate-600",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
  INACTIVE: "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800",
  ON_LEAVE: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On Leave",
};

const attendanceColors: Record<string, string> = {
  PRESENT: "bg-emerald-500 hover:bg-emerald-600 text-white",
  ABSENT: "bg-red-500 hover:bg-red-600 text-white",
  HALF_DAY: "bg-amber-500 hover:bg-amber-600 text-white",
  LEAVE: "bg-blue-500 hover:bg-blue-600 text-white",
};

const attendanceLabels: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  LEAVE: "Leave",
};

const attendanceDotColors: Record<string, string> = {
  PRESENT: "bg-emerald-400",
  ABSENT: "bg-red-400",
  HALF_DAY: "bg-amber-400",
  LEAVE: "bg-blue-400",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank Transfer",
  ONLINE: "Online",
  CHEQUE: "Cheque",
};

const paymentMethodIcons: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  UPI: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  BANK: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  ONLINE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  CHEQUE: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add Staff dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "", role: "Technician", phone: "", email: "", salary: "", joinedDate: formatDateInput(new Date()),
  });
  const [editingStaff, setEditingStaff] = useState<any>(null);

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(formatDateInput(new Date()));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  // Payroll
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    staffId: "", amount: "", method: "CASH", deductions: "", bonuses: "", remarks: "",
  });
  const [allPayments, setAllPayments] = useState<any[]>([]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendanceForDate = useCallback(async (date: string) => {
    // Attendance is included in staff data, we build from that
    const map: Record<string, string> = {};
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    staffList.forEach((s) => {
      const att = s.attendance?.find((a: any) => {
        const aDate = new Date(a.date);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === dateOnly.getTime();
      });
      if (att) map[s.id] = att.status;
    });
    setAttendanceMap(map);
  }, [staffList]);

  const fetchMonthAttendance = useCallback(async () => {
    // Collect all attendance from staff data for current month view
    const all: any[] = [];
    staffList.forEach((s) => {
      s.attendance?.forEach((a: any) => {
        all.push({ ...a, staffName: s.name, staffId: s.id });
      });
    });
    setAllAttendance(all);

    // Collect all payments
    const pays: any[] = [];
    staffList.forEach((s) => {
      s.payments?.forEach((p: any) => {
        pays.push({ ...p, staffName: s.name, staffId: s.id, staffSalary: s.salary });
      });
    });
    setAllPayments(pays);
  }, [staffList]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (staffList.length > 0) {
      fetchAttendanceForDate(attendanceDate);
      fetchMonthAttendance();
    }
  }, [staffList, attendanceDate, fetchAttendanceForDate, fetchMonthAttendance]);

  // Staff stats
  const activeStaff = staffList.filter((s) => s.status === "ACTIVE");
  const onLeaveStaff = staffList.filter((s) => s.status === "ON_LEAVE");
  const monthlyPayroll = activeStaff.reduce((sum, s) => sum + (s.salary || 0), 0);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [staffList, search]);

  // --- Add Staff ---
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...staffForm,
          salary: Number(staffForm.salary) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Staff member added!");
      setAddDialogOpen(false);
      setStaffForm({ name: "", role: "Technician", phone: "", email: "", salary: "", joinedDate: formatDateInput(new Date()) });
      setLoading(true);
      fetchStaff();
    } catch { toast.error("Failed to add staff"); } finally { setSaving(false); }
  };

  // --- Edit Staff ---
  const openEditDialog = (staff: any) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name,
      role: staff.role,
      phone: staff.phone || "",
      email: staff.email || "",
      salary: String(staff.salary || ""),
      joinedDate: formatDateInput(new Date(staff.joinedDate)),
    });
    setEditDialogOpen(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...staffForm,
          salary: Number(staffForm.salary) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Staff updated!");
      setEditDialogOpen(false);
      setEditingStaff(null);
      setLoading(true);
      fetchStaff();
    } catch { toast.error("Failed to update staff"); } finally { setSaving(false); }
  };

  // --- Deactivate Staff ---
  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Staff deactivated");
      setLoading(true);
      fetchStaff();
    } catch { toast.error("Failed to deactivate"); }
  };

  // --- Mark Attendance ---
  const handleMarkAttendance = async (staffId: string, status: string) => {
    setSavingAttendance(staffId);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "attendance", staffId, date: attendanceDate, status }),
      });
      if (!res.ok) throw new Error();
      setAttendanceMap((prev) => ({ ...prev, [staffId]: status }));
      toast.success(`Marked ${attendanceLabels[status]}`);
      // Refresh full data to update summaries
      fetchStaff();
    } catch { toast.error("Failed to mark attendance"); } finally { setSavingAttendance(null); }
  };

  // --- Record Payment ---
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.staffId || !payForm.amount) { toast.error("Staff and amount required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          staffId: payForm.staffId,
          amount: Number(payForm.amount),
          method: payForm.method,
          deductions: Number(payForm.deductions) || 0,
          bonuses: Number(payForm.bonuses) || 0,
          remarks: payForm.remarks,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded!");
      setPayDialogOpen(false);
      setPayForm({ staffId: "", amount: "", method: "CASH", deductions: "", bonuses: "", remarks: "" });
      setLoading(true);
      fetchStaff();
    } catch { toast.error("Failed to record payment"); } finally { setSaving(false); }
  };

  // Calendar helpers
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
    else setCalendarMonth(calendarMonth - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
    else setCalendarMonth(calendarMonth + 1);
  };

  // Build heatmap data
  const getAttendanceForStaffDay = (staffId: string, day: number) => {
    const target = new Date(calendarYear, calendarMonth, day);
    target.setHours(0, 0, 0, 0);
    return allAttendance.find((a) => {
      const aDate = new Date(a.date);
      aDate.setHours(0, 0, 0, 0);
      return a.staffId === staffId && aDate.getTime() === target.getTime();
    });
  };

  // Payroll summary
  const totalPaidThisMonth = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDeductions = allPayments.reduce((sum, p) => sum + (p.deductions || 0), 0);
  const totalBonuses = allPayments.reduce((sum, p) => sum + (p.bonuses || 0), 0);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Staff Management" subtitle="Team, attendance & payroll tracking">
        <Button onClick={() => setAddDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Staff
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Staff" value={staffList.length} icon={Users} color="indigo" delay={0.05} />
        <StatCard title="Active" value={activeStaff.length} icon={UserCheck} color="emerald" delay={0.1} />
        <StatCard title="On Leave" value={onLeaveStaff.length} icon={Clock} color="amber" delay={0.15} />
        <StatCard title="Monthly Payroll" value={monthlyPayroll} format={formatCurrency} icon={Banknote} color="violet" delay={0.2} />
      </div>

      {/* Main Tabs */}
      <GlassCard hover="none" delay={0.25} padding="p-0">
        <Tabs defaultValue="register" className="w-full">
          <div className="px-6 pt-5 pb-0">
            <TabsList className="bg-muted/50 rounded-xl p-1 h-auto">
              <TabsTrigger value="register" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Users className="h-4 w-4 mr-1.5" />Staff Register
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Calendar className="h-4 w-4 mr-1.5" />Attendance
              </TabsTrigger>
              <TabsTrigger value="payroll" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Banknote className="h-4 w-4 mr-1.5" />Payroll
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ===================== TAB 1: STAFF REGISTER ===================== */}
          <TabsContent value="register" className="mt-0 pt-4">
            <div className="px-6 pb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
                />
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : filteredStaff.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No staff members"
                description="Add your first staff member to get started"
                action={{ label: "Add Staff", onClick: () => setAddDialogOpen(true) }}
              />
            ) : (
              <div className="overflow-hidden border-t border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Staff</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                      <TableHead className="hidden md:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Salary</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredStaff.map((staff, index) => (
                        <motion.tr
                          key={staff.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                          className="group border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleGradients[staff.role] || roleGradients.Other} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-white/10 shadow-md`}>
                                {getInitials(staff.name || "S")}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{staff.name}</p>
                                {staff.email && (
                                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                    <Mail className="h-3 w-3" />{staff.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="secondary" className="rounded-full bg-muted/80 text-muted-foreground text-[11px] font-semibold px-2.5">
                              {staff.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {staff.phone ? (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />{staff.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">--</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[staff.status]} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                              {statusLabels[staff.status] || staff.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-sm text-foreground">{formatCurrency(staff.salary)}</span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30" onClick={() => openEditDialog(staff)}>
                                <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                              </Button>
                              {staff.status === "ACTIVE" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDeactivate(staff.id)}>
                                  <UserMinus className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ===================== TAB 2: ATTENDANCE ===================== */}
          <TabsContent value="attendance" className="mt-0 pt-4">
            {/* Date Picker */}
            <div className="px-6 pb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</Label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-xl h-9 w-44 text-sm border-border/50 bg-background/50"
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Present</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Absent</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Half Day</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Leave</span>
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : activeStaff.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No active staff"
                description="Add staff members to start tracking attendance"
              />
            ) : (
              <>
                {/* Attendance marking */}
                <div className="overflow-hidden border-t border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                        <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Staff</TableHead>
                        <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                        <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">This Month</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Mark Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStaff.map((staff, index) => {
                        const currentStatus = attendanceMap[staff.id];
                        const summary = staff.attendanceSummary || {};
                        return (
                          <motion.tr
                            key={staff.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                            className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                          >
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradients[staff.role] || roleGradients.Other} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white/10`}>
                                  {getInitials(staff.name)}
                                </div>
                                <span className="text-sm font-semibold text-foreground">{staff.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{staff.role}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{summary.presentDays || 0}P</span>
                                <span className="text-red-500 font-medium">{summary.absentDays || 0}A</span>
                                <span className="text-amber-500 font-medium">{summary.halfDays || 0}H</span>
                                <span className="text-blue-500 font-medium">{summary.leaveDays || 0}L</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                {savingAttendance === staff.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  (["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"] as const).map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleMarkAttendance(staff.id, status)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                                        currentStatus === status
                                          ? attendanceColors[status] + " shadow-sm ring-2 ring-offset-1 ring-offset-card ring-current/20"
                                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {status === "PRESENT" ? "P" : status === "ABSENT" ? "A" : status === "HALF_DAY" ? "H" : "L"}
                                    </button>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Monthly Calendar Heatmap */}
                <div className="px-6 py-6 border-t border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Monthly Attendance Heatmap</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthName}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                      {/* Day headers */}
                      <div className="flex gap-0.5 mb-1">
                        <div className="w-28 flex-shrink-0" />
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground font-medium">
                            {i + 1}
                          </div>
                        ))}
                      </div>
                      {/* Staff rows */}
                      {activeStaff.map((staff) => (
                        <div key={staff.id} className="flex gap-0.5 mb-0.5">
                          <div className="w-28 flex-shrink-0 text-xs text-foreground font-medium truncate py-1 pr-2">{staff.name}</div>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const att = getAttendanceForStaffDay(staff.id, i + 1);
                            const today = new Date();
                            const isToday = calendarYear === today.getFullYear() && calendarMonth === today.getMonth() && i + 1 === today.getDate();
                            return (
                              <div
                                key={i}
                                className={`flex-1 h-6 rounded-sm transition-colors ${
                                  att ? attendanceDotColors[att.status] : "bg-muted/30"
                                } ${isToday ? "ring-1 ring-indigo-400" : ""}`}
                                title={`${staff.name} - Day ${i + 1}: ${att ? attendanceLabels[att.status] : "Not marked"}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===================== TAB 3: PAYROLL ===================== */}
          <TabsContent value="payroll" className="mt-0 pt-4">
            {/* Payroll Summary */}
            <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-muted/30 border border-border/30 p-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Expected Payroll</p>
                <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(monthlyPayroll)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 p-3">
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid This Month</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(totalPaidThisMonth)}</p>
              </div>
              <div className="rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 p-3">
                <p className="text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Deductions</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-1">{formatCurrency(totalDeductions)}</p>
              </div>
              <div className="rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 p-3">
                <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">Bonuses</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-300 mt-1">{formatCurrency(totalBonuses)}</p>
              </div>
            </div>

            {/* Action bar */}
            <div className="px-6 pb-4">
              <Button onClick={() => setPayDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
                <Banknote className="h-4 w-4 mr-2" />Record Payment
              </Button>
            </div>

            {/* Staff salary overview */}
            {loading ? (
              <TableSkeleton />
            ) : activeStaff.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="No staff for payroll"
                description="Add staff members to manage payroll"
              />
            ) : (
              <>
                <div className="overflow-hidden border-t border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                        <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Staff</TableHead>
                        <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Salary</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paid</TableHead>
                        <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStaff.map((staff, index) => {
                        const paid = staff.monthlyPaid || 0;
                        const balance = staff.salary - paid;
                        return (
                          <motion.tr
                            key={staff.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                            className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                          >
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradients[staff.role] || roleGradients.Other} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white/10`}>
                                  {getInitials(staff.name)}
                                </div>
                                <span className="text-sm font-semibold text-foreground">{staff.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{staff.role}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-medium text-foreground">{formatCurrency(staff.salary)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(paid)}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className={`text-sm font-semibold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {formatCurrency(Math.abs(balance))}
                                {balance <= 0 && paid > 0 && (
                                  <CheckCircle2 className="inline h-3.5 w-3.5 ml-1 text-emerald-500" />
                                )}
                              </span>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Payment History */}
                {allPayments.length > 0 && (
                  <div className="border-t border-border/30">
                    <div className="px-6 py-4">
                      <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                          <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Date</TableHead>
                          <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Staff</TableHead>
                          <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                          <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Remarks</TableHead>
                          <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPayments.map((p, index) => (
                          <motion.tr
                            key={p.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                            className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                          >
                            <TableCell className="pl-6 text-sm text-muted-foreground">{formatDate(p.date)}</TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-foreground">{p.staffName}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1 ${paymentMethodIcons[p.method] || "bg-muted text-muted-foreground"}`}>
                                {paymentMethodLabels[p.method] || p.method}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-sm text-muted-foreground">{p.remarks || "--"}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="text-right">
                                <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</span>
                                {(p.deductions > 0 || p.bonuses > 0) && (
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {p.deductions > 0 && <span className="text-red-500">-{formatCurrency(p.deductions)}</span>}
                                    {p.bonuses > 0 && <span className="text-violet-500 ml-1">+{formatCurrency(p.bonuses)}</span>}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* ===================== ADD STAFF DIALOG ===================== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Staff Member</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Add a new team member</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name *</Label>
              <Input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required className="rounded-xl h-10" placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</Label>
                <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                <Input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="rounded-xl h-10" placeholder="Phone number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="rounded-xl h-10" placeholder="Email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary</Label>
                <Input type="number" min="0" value={staffForm.salary} onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })} className="rounded-xl h-10" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Join Date</Label>
              <Input type="date" value={staffForm.joinedDate} onChange={(e) => setStaffForm({ ...staffForm, joinedDate: e.target.value })} className="rounded-xl h-10" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== EDIT STAFF DIALOG ===================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Edit Staff Member</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Update staff details</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleEditStaff} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name *</Label>
              <Input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required className="rounded-xl h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</Label>
                <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                <Input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary</Label>
                <Input type="number" min="0" value={staffForm.salary} onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Join Date</Label>
              <Input type="date" value={staffForm.joinedDate} onChange={(e) => setStaffForm({ ...staffForm, joinedDate: e.target.value })} className="rounded-xl h-10" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Update Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== PAYMENT DIALOG ===================== */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Record Salary Payment</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Pay salary to a staff member</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff Member *</Label>
              <Select value={payForm.staffId} onValueChange={(v) => {
                const selected = activeStaff.find((s) => s.id === v);
                setPayForm({ ...payForm, staffId: v, amount: selected ? String(selected.salary) : payForm.amount });
              }}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {activeStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        {s.name}
                        <span className="text-xs text-muted-foreground">{formatCurrency(s.salary)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount *</Label>
                <Input type="number" min="0" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="rounded-xl h-10" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</Label>
                <Input type="number" min="0" value={payForm.deductions} onChange={(e) => setPayForm({ ...payForm, deductions: e.target.value })} className="rounded-xl h-10" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bonuses</Label>
                <Input type="number" min="0" value={payForm.bonuses} onChange={(e) => setPayForm({ ...payForm, bonuses: e.target.value })} className="rounded-xl h-10" placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</Label>
              <Textarea value={payForm.remarks} onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })} rows={2} className="rounded-xl resize-none" placeholder="Optional remarks..." />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPayDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
