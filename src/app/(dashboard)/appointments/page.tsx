"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Calendar as CalendarIcon, List, Clock, Loader2, Search,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, User, UserCheck,
  AlertTriangle, Eye, X,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";

// ── Constants ────────────────────────────────────────────────────────

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00",
];

const TREATMENTS = [
  "General Checkup", "Cleaning", "Filling", "Root Canal", "Crown",
  "Bridge", "Extraction", "Implant", "Whitening", "Orthodontics",
  "Veneer", "Denture", "X-Ray", "Consultation", "Emergency", "Other",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bg: string }> = {
  SCHEDULED: {
    label: "Scheduled",
    color: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-500",
    bg: "from-blue-500/20 to-blue-600/10",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
    dot: "bg-indigo-500",
    bg: "from-indigo-500/20 to-indigo-600/10",
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
    bg: "from-emerald-500/20 to-emerald-600/10",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-700",
    dot: "bg-slate-400",
    bg: "from-slate-400/20 to-slate-500/10",
  },
  NO_SHOW: {
    label: "No Show",
    color: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    dot: "bg-red-500",
    bg: "from-red-500/20 to-red-600/10",
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Helpers ──────────────────────────────────────────────────────────

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime12(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month leading days (fill to 42 cells = 6 rows)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

// ── Skeleton ─────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1 p-4">
      {[...Array(35)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl bg-muted/40" />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [patientSearch, setPatientSearch] = useState("");

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // New appointment form
  const [form, setForm] = useState({
    patientId: "", dentistId: "", date: "", time: "", treatment: "", duration: "30", notes: "",
  });

  // ── Data Fetching ────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    try {
      // Fetch full month range for calendar
      const dateFrom = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
      const dateTo = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [aptsRes, todayRes, dentistsRes, patientsRes] = await Promise.all([
        fetch(`/api/appointments?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500`).then((r) => r.json()),
        fetch("/api/appointments?view=today&limit=100").then((r) => r.json()),
        fetch("/api/dentists").then((r) => r.json()),
        fetch("/api/patients?limit=500").then((r) => r.json()),
      ]);

      setAppointments(aptsRes.appointments || []);
      setTodayAppointments(todayRes.appointments || []);
      setDentists(Array.isArray(dentistsRes) ? dentistsRes : dentistsRes.dentists || []);
      setPatients(Array.isArray(patientsRes) ? patientsRes : patientsRes.patients || []);
      setLoading(false);
    } catch {
      toast.error("Failed to load appointments");
      setLoading(false);
    }
  }, [calMonth, calYear]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Computed Values ──────────────────────────────────────────────

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    appointments.forEach((apt) => {
      const key = toDateKey(new Date(apt.date));
      if (!map[key]) map[key] = [];
      map[key].push(apt);
    });
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const filteredAppointments = useMemo(() => {
    let result = appointments;
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result;
  }, [appointments, statusFilter]);

  const todayCount = todayAppointments.length;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekCount = appointments.filter((a) => {
    const d = new Date(a.date);
    return d >= weekStart && d < weekEnd;
  }).length;
  const upcomingCount = appointments.filter((a) => a.status === "SCHEDULED" || a.status === "CONFIRMED").length;
  const cancelledCount = appointments.filter((a) => a.status === "CANCELLED").length;

  // Filtered patients for search in dialog
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 50);
    const q = patientSearch.toLowerCase();
    return patients.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.phone?.includes(q)
    ).slice(0, 50);
  }, [patients, patientSearch]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.dentistId || !form.date || !form.time || !form.treatment) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          duration: parseInt(form.duration),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appointment created!");
      setDialogOpen(false);
      setForm({ patientId: "", dentistId: "", date: "", time: "", treatment: "", duration: "30", notes: "" });
      setPatientSearch("");
      fetchAppointments();
    } catch {
      toast.error("Failed to create appointment");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (apt: any, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
      fetchAppointments();
      if (selectedAppointment?.id === apt.id) {
        setSelectedAppointment({ ...apt, status: newStatus });
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Appointment deleted");
      setDetailDialogOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch {
      toast.error("Failed to delete appointment");
    }
  };

  const navigateMonth = (dir: number) => {
    let newMonth = calMonth + dir;
    let newYear = calYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  const goToToday = () => {
    setCalMonth(today.getMonth());
    setCalYear(today.getFullYear());
  };

  const openDayPanel = (date: Date) => {
    setSelectedDay(date);
  };

  const openDetail = (apt: any) => {
    setSelectedAppointment(apt);
    setDetailDialogOpen(true);
  };

  // ── Status action buttons helper ─────────────────────────────────

  const getNextStatusActions = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return [
          { label: "Confirm", status: "CONFIRMED", icon: CheckCircle2, cls: "from-indigo-500 to-violet-500 text-white shadow-indigo-500/25" },
          { label: "Cancel", status: "CANCELLED", icon: XCircle, cls: "from-slate-400 to-slate-500 text-white shadow-slate-400/25" },
        ];
      case "CONFIRMED":
        return [
          { label: "Complete", status: "COMPLETED", icon: CheckCircle2, cls: "from-emerald-500 to-teal-500 text-white shadow-emerald-500/25" },
          { label: "No Show", status: "NO_SHOW", icon: AlertTriangle, cls: "from-red-500 to-rose-500 text-white shadow-red-500/25" },
          { label: "Cancel", status: "CANCELLED", icon: XCircle, cls: "from-slate-400 to-slate-500 text-white shadow-slate-400/25" },
        ];
      default:
        return [];
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Appointments" subtitle="Schedule and manage patient appointments">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-muted/50 rounded-xl p-1 border border-border/30">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewMode === "calendar"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today" value={todayCount} icon={CalendarIcon} color="indigo" delay={0.05} />
        <StatCard title="This Week" value={weekCount} icon={Clock} color="blue" delay={0.1} />
        <StatCard title="Upcoming" value={upcomingCount} icon={UserCheck} color="emerald" delay={0.15} />
        <StatCard title="Cancelled" value={cancelledCount} icon={XCircle} color="rose" delay={0.2} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Calendar / List View */}
        <GlassCard hover="none" delay={0.25} padding="p-0">
          {viewMode === "calendar" ? (
            <div>
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-bold text-foreground min-w-[200px] text-center">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h2>
                  <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl text-xs">
                  Today
                </Button>
              </div>

              {loading ? (
                <CalendarSkeleton />
              ) : (
                <div className="p-3">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                      const key = toDateKey(date);
                      const dayApts = appointmentsByDate[key] || [];
                      const isToday = isSameDay(date, today);
                      const isSelected = selectedDay && isSameDay(date, selectedDay);
                      const hasApts = dayApts.length > 0;

                      return (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: Math.min(idx * 0.008, 0.3) }}
                          onClick={() => openDayPanel(date)}
                          className={`
                            relative group min-h-[88px] rounded-xl p-2 text-left transition-all duration-200 border
                            ${isCurrentMonth ? "bg-card/60" : "bg-muted/20 opacity-50"}
                            ${isToday ? "ring-2 ring-indigo-500/50 border-indigo-300 dark:border-indigo-700" : "border-border/20 hover:border-border/50"}
                            ${isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-sm" : ""}
                            ${hasApts && isCurrentMonth ? "hover:shadow-md hover:-translate-y-0.5" : "hover:bg-accent/30"}
                          `}
                        >
                          {/* Date number */}
                          <div className={`text-sm font-semibold mb-1 ${
                            isToday
                              ? "text-white bg-gradient-to-br from-indigo-500 to-violet-500 w-7 h-7 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/30"
                              : isCurrentMonth
                                ? "text-foreground"
                                : "text-muted-foreground/50"
                          }`}>
                            {date.getDate()}
                          </div>

                          {/* Appointment indicators */}
                          {hasApts && isCurrentMonth && (
                            <div className="space-y-0.5">
                              {dayApts.slice(0, 3).map((apt, i) => (
                                <div
                                  key={apt.id}
                                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-gradient-to-r ${STATUS_CONFIG[apt.status]?.bg || "from-slate-200/50 to-slate-300/30"} transition-all duration-150`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[apt.status]?.dot || "bg-slate-400"}`} />
                                  <span className="text-[10px] font-medium text-foreground/80 truncate">{apt.time ? formatTime12(apt.time) : ""}</span>
                                </div>
                              ))}
                              {dayApts.length > 3 && (
                                <span className="text-[10px] font-medium text-muted-foreground pl-1">
                                  +{dayApts.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Appointment count badge */}
                          {hasApts && isCurrentMonth && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm">
                              <span className="text-[9px] font-bold text-white">{dayApts.length}</span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div>
              <div className="px-6 py-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </h2>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: "All", value: "all" },
                      { label: "Scheduled", value: "SCHEDULED" },
                      { label: "Confirmed", value: "CONFIRMED" },
                      { label: "Completed", value: "COMPLETED" },
                      { label: "Cancelled", value: "CANCELLED" },
                      { label: "No Show", value: "NO_SHOW" },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          statusFilter === f.value
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="space-y-1 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48 bg-muted" />
                        <Skeleton className="h-3 w-32 bg-muted" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              ) : filteredAppointments.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title={statusFilter !== "all" ? "No appointments match this filter" : "No appointments this month"}
                  description={statusFilter !== "all" ? "Try a different filter" : "Create your first appointment to get started"}
                  action={{ label: "New Appointment", onClick: () => setDialogOpen(true) }}
                />
              ) : (
                <div className="divide-y divide-border/20">
                  <AnimatePresence mode="popLayout">
                    {filteredAppointments.map((apt, index) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                        onClick={() => openDetail(apt)}
                        className="group flex items-center gap-4 px-6 py-3.5 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                      >
                        {/* Patient avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white/10 shadow-md shadow-indigo-500/20">
                          {getInitials(apt.patient?.name || "P")}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {apt.patient?.name || "Unknown Patient"}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              with Dr. {apt.dentist?.name || "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {formatDate(apt.date)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12(apt.time)}
                            </span>
                            <span className="text-xs text-muted-foreground hidden md:inline">
                              {apt.treatment}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[apt.status]?.dot || "bg-slate-400"}`} />
                          <Badge className={`${STATUS_CONFIG[apt.status]?.color || ""} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                            {STATUS_CONFIG[apt.status]?.label || apt.status}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Today's Panel / Selected Day Panel */}
        <div className="space-y-4">
          {/* Selected Day Panel (when a day is clicked in calendar) */}
          {selectedDay && viewMode === "calendar" && (
            <GlassCard hover="none" delay={0.3} padding="p-0">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(appointmentsByDate[toDateKey(selectedDay)] || []).length} appointment(s)
                  </p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {(appointmentsByDate[toDateKey(selectedDay)] || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No appointments</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(appointmentsByDate[toDateKey(selectedDay)] || []).map((apt: any) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => openDetail(apt)}
                        className={`relative rounded-xl p-3 bg-gradient-to-r ${STATUS_CONFIG[apt.status]?.bg || ""} border border-border/30 cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                            {getInitials(apt.patient?.name || "P")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{apt.patient?.name}</p>
                            <p className="text-[11px] text-muted-foreground">{formatTime12(apt.time)} - {apt.treatment}</p>
                            <p className="text-[11px] text-muted-foreground/70 truncate">Dr. {apt.dentist?.name}</p>
                          </div>
                          <Badge className={`${STATUS_CONFIG[apt.status]?.color || ""} text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0`} variant="secondary">
                            {STATUS_CONFIG[apt.status]?.label}
                          </Badge>
                        </div>

                        {/* Quick action buttons */}
                        {getNextStatusActions(apt.status).length > 0 && (
                          <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/20">
                            {getNextStatusActions(apt.status).map((action) => (
                              <button
                                key={action.status}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(apt, action.status); }}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold bg-gradient-to-r ${action.cls} shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5`}
                              >
                                <action.icon className="h-3 w-3" />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Today's Appointments */}
          <GlassCard hover="none" delay={0.35} padding="p-0">
            <div className="px-5 py-3.5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">Today&apos;s Schedule</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {todayAppointments.length} appointment{todayAppointments.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-3 max-h-[500px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-8 w-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28 bg-muted" />
                        <Skeleton className="h-3 w-20 bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No appointments today</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map((apt: any, i: number) => {
                    const isPast = (() => {
                      const now = new Date();
                      const [h, m] = apt.time.split(":").map(Number);
                      return now.getHours() > h || (now.getHours() === h && now.getMinutes() > m + (apt.duration || 30));
                    })();

                    return (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => openDetail(apt)}
                        className={`relative flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-border/20 ${
                          isPast && apt.status !== "COMPLETED"
                            ? "bg-red-50/30 dark:bg-red-950/10"
                            : apt.status === "COMPLETED"
                              ? "bg-emerald-50/30 dark:bg-emerald-950/10"
                              : "bg-card/60 hover:bg-accent/40"
                        }`}
                      >
                        {/* Time */}
                        <div className="flex flex-col items-center w-14 flex-shrink-0">
                          <span className="text-sm font-bold text-foreground">{formatTime12(apt.time).split(" ")[0]}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{formatTime12(apt.time).split(" ")[1]}</span>
                        </div>

                        {/* Divider line */}
                        <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${STATUS_CONFIG[apt.status]?.dot || "bg-slate-300"}`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{apt.patient?.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{apt.treatment} - Dr. {apt.dentist?.name}</p>
                        </div>

                        <Badge className={`${STATUS_CONFIG[apt.status]?.color || ""} text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0`} variant="secondary">
                          {STATUS_CONFIG[apt.status]?.label}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── New Appointment Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">New Appointment</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Schedule a new patient appointment</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            {/* Patient select with search */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm mb-1.5"
                />
              </div>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[200px]">
                  {filteredPatients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.name}
                        {p.phone && <span className="text-xs text-muted-foreground">({p.phone})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dentist select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist *</Label>
              <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v })}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select dentist" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        Dr. {d.name}
                        {d.clinicName && <span className="text-xs text-muted-foreground">({d.clinicName})</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-xl h-10"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time *</Label>
                <Select value={form.time} onValueChange={(v) => setForm({ ...form, time: v })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[200px]">
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTime12(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treatment and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Treatment *</Label>
                <Select value={form.treatment} onValueChange={(v) => setForm({ ...form, treatment: v })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[200px]">
                    {TREATMENTS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="rounded-xl resize-none"
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[160px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {saving ? "Creating..." : "Create Appointment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Appointment Detail Dialog ──────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          {selectedAppointment && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-indigo-500/20">
                    {getInitials(selectedAppointment.patient?.name || "P")}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedAppointment.patient?.name || "Unknown Patient"}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      with Dr. {selectedAppointment.dentist?.name || "Unknown"}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[selectedAppointment.status]?.dot}`} />
                  <Badge className={`${STATUS_CONFIG[selectedAppointment.status]?.color || ""} text-xs font-medium rounded-full px-3 py-1`} variant="secondary">
                    {STATUS_CONFIG[selectedAppointment.status]?.label}
                  </Badge>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                    <p className="text-sm font-medium text-foreground">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Time</p>
                    <p className="text-sm font-medium text-foreground">{formatTime12(selectedAppointment.time)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Treatment</p>
                    <p className="text-sm font-medium text-foreground">{selectedAppointment.treatment}</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-sm font-medium text-foreground">{selectedAppointment.duration} min</p>
                  </div>
                </div>

                {/* Patient phone */}
                {selectedAppointment.patient?.phone && (
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Patient Phone</p>
                    <p className="text-sm font-medium text-foreground">{selectedAppointment.patient.phone}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedAppointment.notes && (
                  <div className="rounded-xl bg-muted/30 p-3 border border-border/20">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-foreground">{selectedAppointment.notes}</p>
                  </div>
                )}

                {/* Status actions */}
                {getNextStatusActions(selectedAppointment.status).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Update Status</p>
                    <div className="flex gap-2">
                      {getNextStatusActions(selectedAppointment.status).map((action) => (
                        <Button
                          key={action.status}
                          onClick={() => handleStatusChange(selectedAppointment, action.status)}
                          size="sm"
                          className={`flex-1 rounded-xl bg-gradient-to-r ${action.cls} shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 text-xs`}
                        >
                          <action.icon className="h-3.5 w-3.5 mr-1.5" />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedAppointment.id)}
                  className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailDialogOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
