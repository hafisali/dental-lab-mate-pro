"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Pill, Loader2, Search, Trash2, ChevronDown, ChevronUp,
  Calendar, User, Stethoscope, ClipboardList, Clock, TrendingUp, Share2, X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";

// ── Common dental medicines & frequencies ──────────────────────────────

const COMMON_MEDICINES = [
  "Amoxicillin", "Augmentin", "Azithromycin", "Metronidazole",
  "Ibuprofen", "Aceclofenac", "Diclofenac", "Paracetamol",
  "Ketorolac", "Tramadol",
  "Chlorhexidine Mouthwash", "Povidone Iodine",
  "Ornidazole", "Doxycycline",
  "Pantoprazole", "Ranitidine",
  "Multivitamins", "Calcium + Vitamin D3",
  "Clindamycin", "Cephalexin",
];

const FREQUENCIES = [
  { value: "1-0-1", label: "1-0-1 (Morning-Evening)" },
  { value: "1-1-1", label: "1-1-1 (Three times daily)" },
  { value: "0-0-1", label: "0-0-1 (Night only)" },
  { value: "1-0-0", label: "1-0-0 (Morning only)" },
  { value: "0-1-0", label: "0-1-0 (Afternoon only)" },
  { value: "SOS", label: "SOS (As needed)" },
  { value: "1-1-1-1", label: "1-1-1-1 (Four times daily)" },
];

interface PrescriptionItem {
  id?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const emptyItem = (): PrescriptionItem => ({
  medicineName: "",
  dosage: "",
  frequency: "1-0-1",
  duration: "",
  instructions: "",
});

// ── Skeleton loaders ───────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 bg-muted" />
            <Skeleton className="h-6 w-16 rounded-full bg-muted" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28 bg-muted" />
            <Skeleton className="h-4 w-24 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Medicine suggestion state
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    patientId: "",
    dentistId: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [items, setItems] = useState<PrescriptionItem[]>([emptyItem()]);

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchPrescriptions = async () => {
    try {
      const res = await fetch("/api/prescriptions");
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
    } catch {
      toast.error("Failed to load prescriptions");
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/prescriptions").then((r) => r.json()),
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/dentists").then((r) => r.json()),
    ]).then(([rxData, patData, denData]) => {
      setPrescriptions(rxData.prescriptions || []);
      setPatients(Array.isArray(patData) ? patData : patData.patients || []);
      setDentists(Array.isArray(denData) ? denData : denData.dentists || []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
      toast.error("Failed to load data");
    });
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayCount = prescriptions.filter((p) => new Date(p.date) >= today).length;
  const weekCount = prescriptions.filter((p) => new Date(p.date) >= weekAgo).length;

  const topMedicine = useMemo(() => {
    const counts: Record<string, number> = {};
    prescriptions.forEach((p) =>
      p.items?.forEach((item: any) => {
        counts[item.medicineName] = (counts[item.medicineName] || 0) + 1;
      })
    );
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "--";
  }, [prescriptions]);

  // ── Search / Filter ────────────────────────────────────────────────

  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return prescriptions;
    const q = searchQuery.toLowerCase();
    return prescriptions.filter(
      (p) =>
        p.patient?.name?.toLowerCase().includes(q) ||
        p.dentist?.name?.toLowerCase().includes(q) ||
        p.items?.some((item: any) => item.medicineName.toLowerCase().includes(q)) ||
        p.notes?.toLowerCase().includes(q)
    );
  }, [prescriptions, searchQuery]);

  // ── Medicine item helpers ──────────────────────────────────────────

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Suggestions ────────────────────────────────────────────────────

  const getSuggestions = (value: string) => {
    if (!value.trim()) return [];
    return COMMON_MEDICINES.filter((m) =>
      m.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 6);
  };

  // ── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error("Please select a patient"); return; }
    const hasEmpty = items.some((i) => !i.medicineName || !i.dosage || !i.frequency || !i.duration);
    if (hasEmpty) { toast.error("Fill all medicine fields (name, dosage, frequency, duration)"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          dentistId: form.dentistId || undefined,
          date: form.date,
          notes: form.notes || undefined,
          items: items.map(({ medicineName, dosage, frequency, duration, instructions }) => ({
            medicineName, dosage, frequency, duration, instructions: instructions || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create prescription");
      }
      toast.success("Prescription created!");
      setDialogOpen(false);
      resetForm();
      await fetchPrescriptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to create prescription");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ patientId: "", dentistId: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setItems([emptyItem()]);
    setShowPreview(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prescription?")) return;
    try {
      const res = await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Prescription deleted");
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to delete prescription");
    }
  };

  // ── WhatsApp share ─────────────────────────────────────────────────

  const buildWhatsAppText = (rx: any) => {
    let text = `*PRESCRIPTION*\n`;
    text += `Patient: ${rx.patient?.name || "--"}\n`;
    text += `Date: ${formatDate(rx.date)}\n`;
    if (rx.dentist?.name) text += `Doctor: Dr. ${rx.dentist.name}\n`;
    text += `\n*Rx*\n`;
    rx.items?.forEach((item: any, i: number) => {
      text += `${i + 1}. ${item.medicineName} - ${item.dosage}\n`;
      text += `   ${getFrequencyLabel(item.frequency)} x ${item.duration}\n`;
      if (item.instructions) text += `   Note: ${item.instructions}\n`;
    });
    if (rx.notes) text += `\nNotes: ${rx.notes}`;
    return encodeURIComponent(text);
  };

  const getFrequencyLabel = (freq: string) => {
    const found = FREQUENCIES.find((f) => f.value === freq);
    return found ? found.label : freq;
  };

  // ── Preview builder for dialog ─────────────────────────────────────

  const selectedPatient = patients.find((p: any) => p.id === form.patientId);
  const selectedDentist = dentists.find((d: any) => d.id === form.dentistId);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Prescriptions" subtitle="Create and manage dental prescriptions">
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 mr-2" />New Prescription
        </Button>
      </PageHeader>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Prescriptions" value={prescriptions.length} icon={ClipboardList} color="indigo" delay={0.05} />
        <StatCard title="Today" value={todayCount} icon={Calendar} color="emerald" delay={0.1} />
        <StatCard title="This Week" value={weekCount} icon={TrendingUp} color="violet" delay={0.15} />
        <StatCard
          title="Top Medicine"
          value={0}
          format={() => topMedicine}
          icon={Pill}
          color="amber"
          delay={0.2}
        />
      </div>

      {/* Search */}
      <GlassCard hover="none" delay={0.25} padding="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, doctor, medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl border-border/50 bg-background/50 h-10 text-sm"
          />
        </div>
      </GlassCard>

      {/* Prescription List */}
      {loading ? (
        <CardSkeleton />
      ) : filteredPrescriptions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={searchQuery ? "No prescriptions match your search" : "No prescriptions yet"}
          description={searchQuery ? "Try a different search term" : "Create your first prescription to get started"}
          action={!searchQuery ? { label: "New Prescription", onClick: () => { resetForm(); setDialogOpen(true); } } : undefined}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredPrescriptions.map((rx, index) => {
              const isExpanded = expandedId === rx.id;
              return (
                <motion.div
                  key={rx.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
                >
                  <GlassCard
                    hover="lift"
                    delay={0}
                    padding="p-0"
                    className="overflow-hidden"
                  >
                    {/* Card header */}
                    <div
                      className="p-5 cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : rx.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-indigo-500/20">
                            Rx
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-sm truncate">
                              {rx.patient?.name || "Unknown Patient"}
                            </h3>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(rx.date)}
                              </span>
                              {rx.dentist?.name && (
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" />
                                  Dr. {rx.dentist.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 text-[11px] font-semibold px-2.5"
                          >
                            <Pill className="h-3 w-3 mr-1" />
                            {rx.items?.length || 0} {(rx.items?.length || 0) === 1 ? "med" : "meds"}
                          </Badge>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded view */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/30 bg-muted/20">
                            {/* Prescription header */}
                            <div className="px-5 pt-4 pb-2">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                                    Rx
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">Prescription</p>
                                    <p className="text-[10px] text-muted-foreground">{formatDate(rx.date)}</p>
                                  </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p className="font-medium text-foreground">{rx.patient?.name}</p>
                                  {rx.dentist?.name && <p>Dr. {rx.dentist.name}</p>}
                                  {rx.dentist?.clinicName && (
                                    <p className="text-[10px]">{rx.dentist.clinicName}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Medicine list */}
                            <div className="px-5 pb-3 space-y-2">
                              {rx.items?.map((item: any, i: number) => (
                                <div
                                  key={item.id || i}
                                  className="flex gap-3 items-start rounded-xl bg-card/80 border border-border/30 p-3"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-foreground">{item.medicineName}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                      <span className="text-xs text-muted-foreground">
                                        {item.dosage}
                                      </span>
                                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                        {item.frequency}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {item.duration}
                                      </span>
                                    </div>
                                    {item.instructions && (
                                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 italic">
                                        {item.instructions}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {rx.notes && (
                              <div className="px-5 pb-3">
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-semibold">Notes:</span> {rx.notes}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="px-5 pb-4 flex items-center gap-2">
                              <a
                                href={`https://wa.me/?text=${buildWhatsAppText(rx)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
                              >
                                <Share2 className="h-3 w-3" />
                                WhatsApp
                              </a>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(rx.id); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── New Prescription Dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">New Prescription</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Create a new dental prescription</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Patient / Dentist / Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient *</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {patients.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor</Label>
                <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {dentists.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>
            </div>

            {/* Medicine Items Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medicines *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addItem}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Medicine
                </Button>
              </div>

              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="relative rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3"
                  >
                    {/* Row number & remove */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">Medicine {index + 1}</span>
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Medicine Name with suggestions */}
                      <div className="relative sm:col-span-2">
                        <Input
                          placeholder="Medicine name (e.g., Amoxicillin)"
                          value={item.medicineName}
                          onChange={(e) => {
                            updateItem(index, "medicineName", e.target.value);
                            setActiveSuggestionIdx(index);
                          }}
                          onFocus={() => setActiveSuggestionIdx(index)}
                          onBlur={() => setTimeout(() => setActiveSuggestionIdx(null), 200)}
                          className="rounded-xl h-9 text-sm"
                        />
                        {/* Suggestion dropdown */}
                        {activeSuggestionIdx === index && item.medicineName && getSuggestions(item.medicineName).length > 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                            {getSuggestions(item.medicineName).map((med) => (
                              <button
                                key={med}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateItem(index, "medicineName", med);
                                  setActiveSuggestionIdx(null);
                                }}
                              >
                                {med}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dosage */}
                      <Input
                        placeholder="Dosage (e.g., 500mg)"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, "dosage", e.target.value)}
                        className="rounded-xl h-9 text-sm"
                      />

                      {/* Frequency */}
                      <Select value={item.frequency} onValueChange={(v) => updateItem(index, "frequency", v)}>
                        <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {FREQUENCIES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Duration */}
                      <Input
                        placeholder="Duration (e.g., 5 days)"
                        value={item.duration}
                        onChange={(e) => updateItem(index, "duration", e.target.value)}
                        className="rounded-xl h-9 text-sm"
                      />

                      {/* Special Instructions */}
                      <Input
                        placeholder="Special instructions (optional)"
                        value={item.instructions}
                        onChange={(e) => updateItem(index, "instructions", e.target.value)}
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="rounded-xl resize-none text-sm"
                placeholder="Additional notes..."
              />
            </div>

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {showPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>

            {/* Preview */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
                    <div className="text-center border-b border-indigo-200/50 dark:border-indigo-800/30 pb-2">
                      {selectedDentist?.clinicName && (
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{selectedDentist.clinicName}</p>
                      )}
                      {selectedDentist && (
                        <p className="text-[11px] text-muted-foreground">Dr. {selectedDentist.name}</p>
                      )}
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Patient: <span className="font-medium text-foreground">{selectedPatient?.name || "--"}</span></span>
                      <span>Date: <span className="font-medium text-foreground">{form.date}</span></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Rx</span>
                      <div className="flex-1 border-t border-indigo-200/50 dark:border-indigo-800/30" />
                    </div>

                    <div className="space-y-2">
                      {items.filter((i) => i.medicineName).map((item, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-indigo-500 font-semibold text-xs mt-0.5">{i + 1}.</span>
                          <div>
                            <span className="font-medium text-foreground">{item.medicineName}</span>
                            {item.dosage && <span className="text-muted-foreground"> - {item.dosage}</span>}
                            <div className="text-xs text-muted-foreground">
                              {item.frequency && <span className="text-indigo-600 dark:text-indigo-400 font-medium">{item.frequency}</span>}
                              {item.duration && <span> x {item.duration}</span>}
                            </div>
                            {item.instructions && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">{item.instructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {form.notes && (
                      <p className="text-xs text-muted-foreground pt-2 border-t border-indigo-200/50 dark:border-indigo-800/30">
                        Notes: {form.notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[160px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                {saving ? "Creating..." : "Create Prescription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
