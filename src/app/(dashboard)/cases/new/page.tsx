"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import ToothChart from "@/components/dental-chart/tooth-chart";
import { WORK_TYPES, MATERIALS, VITA_SHADES } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Upload,
  X,
  FileText,
  Stethoscope,
  Wrench,
  Paperclip,
  MessageSquare,
  Check,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";

const STEPS = [
  { id: 1, label: "Dentist & Patient", icon: Stethoscope },
  { id: 2, label: "Tooth Selection", icon: Sparkles },
  { id: 3, label: "Work Details", icon: Wrench },
  { id: 4, label: "Attachments", icon: Paperclip },
  { id: 5, label: "Review & Submit", icon: MessageSquare },
];

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dentists, setDentists] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    dentistId: "",
    patientId: "",
    teethNumbers: [] as number[],
    workType: "",
    shade: "",
    material: "",
    technicianId: "",
    dueDate: "",
    priority: "NORMAL",
    amount: 0,
    remarks: "",
  });

  useEffect(() => {
    fetch("/api/dentists")
      .then((r) => r.json())
      .then(setDentists);
    fetch("/api/users")
      .then((r) => r.json())
      .then((users) => {
        setTechnicians(
          Array.isArray(users)
            ? users.filter((u: any) => u.role === "TECHNICIAN")
            : []
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.dentistId) {
      fetch(`/api/patients?dentistId=${form.dentistId}`)
        .then((r) => r.json())
        .then(setPatients);
    }
  }, [form.dentistId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "model/stl": [".stl"],
      "application/octet-stream": [".stl"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!form.dentistId) newErrors.dentistId = "Please select a dentist";
    }
    if (step === 2) {
      if (form.teethNumbers.length === 0) newErrors.teethNumbers = "Please select at least one tooth";
    }
    if (step === 3) {
      if (!form.workType) newErrors.workType = "Please select a work type";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dentistId) {
      toast.error("Please select a dentist");
      return;
    }
    if (form.teethNumbers.length === 0) {
      toast.error("Please select at least one tooth");
      return;
    }
    if (!form.workType) {
      toast.error("Please select a work type");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      if (!res.ok) throw new Error("Failed to create case");
      const newCase = await res.json();

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("caseId", newCase.id);
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      toast.success("Case created successfully!");
      router.push(`/cases/${newCase.id}`);
    } catch {
      toast.error("Failed to create case");
    } finally {
      setLoading(false);
    }
  };

  const selectedDentist = dentists.find((d: any) => d.id === form.dentistId);
  const selectedPatient = patients.find((p: any) => p.id === form.patientId);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-muted border border-border/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader
          title="New Case"
          subtitle="Create a new work order"
          className="mb-0"
        />
      </div>

      {/* Step Progress Indicator */}
      <GlassCard hover="none" delay={0.05} padding="p-4 sm:p-6">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute top-5 left-8 right-8 h-[2px] bg-border/60 rounded-full hidden sm:block" />
          {/* Progress line */}
          <motion.div
            className="absolute top-5 left-8 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full hidden sm:block"
            animate={{
              width: `${((currentStep - 1) / (STEPS.length - 1)) * (100 - 10)}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const StepIcon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                className={`flex flex-col items-center gap-2 relative z-10 transition-all ${
                  step.id <= currentStep ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <motion.div
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md"
                      : isCurrent
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white ring-4 ring-indigo-500/20 shadow-lg"
                      : "bg-muted text-muted-foreground border border-border/50"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </motion.div>
                <span
                  className={`text-[10px] sm:text-xs font-medium hidden sm:block ${
                    isCompleted || isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {/* Step 1: Dentist & Patient */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover="none" delay={0.1}>
                <h3 className="text-lg font-bold text-foreground mb-1">Dentist & Patient</h3>
                <p className="text-sm text-muted-foreground mb-6">Select the referring dentist and patient for this case</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Dentist <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.dentistId}
                      onValueChange={(v) => {
                        setForm({ ...form, dentistId: v, patientId: "" });
                        setErrors((e) => ({ ...e, dentistId: "" }));
                      }}
                    >
                      <SelectTrigger className={`rounded-xl border-border focus:border-primary focus:ring-primary/20 ${errors.dentistId ? "border-red-500 ring-2 ring-red-500/20" : ""}`}>
                        <SelectValue placeholder="Select Dentist" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {dentists.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}{" "}
                            {d.clinicName ? `(${d.clinicName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dentistId && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 font-medium"
                      >
                        {errors.dentistId}
                      </motion.p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Patient
                    </Label>
                    <Select
                      value={form.patientId}
                      onValueChange={(v) => setForm({ ...form, patientId: v })}
                    >
                      <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                        <SelectValue placeholder="Select Patient (optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {patients.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 2: Tooth Selection */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover="none" delay={0.1}>
                <h3 className="text-lg font-bold text-foreground mb-1">Tooth Selection</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Click on the teeth that need work
                  {form.teethNumbers.length > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                      {form.teethNumbers.length} selected
                    </span>
                  )}
                </p>
                <div className={`rounded-2xl bg-muted/30 p-4 border transition-colors duration-200 ${errors.teethNumbers ? "border-red-500/50" : "border-border/30"}`}>
                  <ToothChart
                    selectedTeeth={form.teethNumbers}
                    onChange={(teeth) => {
                      setForm({ ...form, teethNumbers: teeth });
                      setErrors((e) => ({ ...e, teethNumbers: "" }));
                    }}
                  />
                </div>
                {errors.teethNumbers && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-500 font-medium mt-2"
                  >
                    {errors.teethNumbers}
                  </motion.p>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Step 3: Work Details */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover="none" delay={0.1}>
                <h3 className="text-lg font-bold text-foreground mb-1">Work Details</h3>
                <p className="text-sm text-muted-foreground mb-6">Specify the type of work, materials, and other details</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Work Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.workType}
                      onValueChange={(v) => {
                        setForm({ ...form, workType: v });
                        setErrors((e) => ({ ...e, workType: "" }));
                      }}
                    >
                      <SelectTrigger className={`rounded-xl border-border focus:border-primary focus:ring-primary/20 ${errors.workType ? "border-red-500 ring-2 ring-red-500/20" : ""}`}>
                        <SelectValue placeholder="Select Work Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {WORK_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.workType && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 font-medium">{errors.workType}</motion.p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Shade</Label>
                    <Select value={form.shade} onValueChange={(v) => setForm({ ...form, shade: v })}>
                      <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                        <SelectValue placeholder="Select Shade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {VITA_SHADES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Material</Label>
                    <Select value={form.material} onValueChange={(v) => setForm({ ...form, material: v })}>
                      <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                        <SelectValue placeholder="Select Material" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {MATERIALS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Assign Technician</Label>
                    <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                      <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                        <SelectValue placeholder="Select Technician" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {technicians.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Due Date</Label>
                    <Input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                      className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: Attachments */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover="none" delay={0.1}>
                <h3 className="text-lg font-bold text-foreground mb-1">Attachments</h3>
                <p className="text-sm text-muted-foreground mb-6">Upload STL files, images, or documents</p>
                <motion.div
                  {...(getRootProps() as any)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]"
                      : "border-border/60 hover:border-indigo-400/50 bg-muted/20"
                  }`}
                >
                  <input {...getInputProps()} />
                  <motion.div
                    animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border border-border/50 flex items-center justify-center mx-auto mb-4"
                  >
                    <Upload className={`h-7 w-7 transition-colors ${isDragActive ? "text-indigo-500" : "text-muted-foreground"}`} />
                  </motion.div>
                  <p className="text-sm font-semibold text-foreground">
                    {isDragActive
                      ? "Drop files here..."
                      : "Drag & drop files, or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    STL, Images, PDF (max 50MB each)
                  </p>
                </motion.div>
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/30 p-3 hover:bg-muted/60 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border border-border/50 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground truncate max-w-[250px] block">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(i)}
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex-shrink-0 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard hover="none" delay={0.1}>
                <h3 className="text-lg font-bold text-foreground mb-1">Review & Submit</h3>
                <p className="text-sm text-muted-foreground mb-6">Review your case details before submitting</p>

                <div className="space-y-5">
                  {/* Summary cards */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Dentist</p>
                      <p className="text-sm font-semibold text-foreground">{selectedDentist?.name || "-"}</p>
                      {selectedDentist?.clinicName && (
                        <p className="text-xs text-muted-foreground">{selectedDentist.clinicName}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Patient</p>
                      <p className="text-sm font-semibold text-foreground">{selectedPatient?.name || "Not selected"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Teeth</p>
                      <p className="text-sm font-semibold text-foreground">{form.teethNumbers.join(", ") || "-"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Work Type</p>
                      <p className="text-sm font-semibold text-foreground">{form.workType || "-"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Material / Shade</p>
                      <p className="text-sm font-semibold text-foreground">{form.material || "-"} / {form.shade || "-"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Priority / Amount</p>
                      <p className="text-sm font-semibold text-foreground">{form.priority} / {form.amount > 0 ? `Rs. ${form.amount}` : "-"}</p>
                    </div>
                  </div>

                  {form.remarks && (
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Remarks</p>
                      <p className="text-sm text-foreground">{form.remarks}</p>
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">Attachments ({files.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {files.map((f, i) => (
                          <span key={i} className="text-xs bg-muted px-2.5 py-1 rounded-lg font-medium text-foreground">{f.name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remarks in Review step */}
                  <div className="pt-4 border-t border-border/30">
                    <Label className="text-sm font-medium text-foreground mb-2 block">Additional Remarks</Label>
                    <Textarea
                      placeholder="Additional notes or instructions..."
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      rows={3}
                      className="rounded-xl border-border/50 focus:border-primary focus:ring-primary/20 bg-muted/20"
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center mt-6"
        >
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="rounded-xl border-border/50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/cases">
              <Button type="button" variant="outline" className="rounded-xl">
                Cancel
              </Button>
            </Link>
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="group relative rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Case
              </Button>
            )}
          </div>
        </motion.div>
      </form>
    </div>
  );
}
