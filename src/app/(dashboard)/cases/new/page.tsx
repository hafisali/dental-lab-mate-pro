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
  Save,
  Loader2,
  Upload,
  X,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dentists, setDentists] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);

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

      // Upload files if any
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

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-muted"
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

      <form onSubmit={handleSubmit}>
        <GlassCard hover="none" delay={0.05} className="space-y-8">
          {/* Dentist & Patient Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pb-3 mb-5 border-b border-border/50">
              Dentist & Patient
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Dentist *
                </Label>
                <Select
                  value={form.dentistId}
                  onValueChange={(v) =>
                    setForm({ ...form, dentistId: v, patientId: "" })
                  }
                >
                  <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
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
          </div>

          {/* Tooth Chart Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pb-3 mb-5 border-b border-border/50">
              Tooth Selection *
            </h3>
            <div className="rounded-2xl bg-muted/50 p-4">
              <ToothChart
                selectedTeeth={form.teethNumbers}
                onChange={(teeth) => setForm({ ...form, teethNumbers: teeth })}
              />
            </div>
          </div>

          {/* Work Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pb-3 mb-5 border-b border-border/50">
              Work Details
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Work Type *
                </Label>
                <Select
                  value={form.workType}
                  onValueChange={(v) => setForm({ ...form, workType: v })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
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
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Shade
                </Label>
                <Select
                  value={form.shade}
                  onValueChange={(v) => setForm({ ...form, shade: v })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select Shade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {VITA_SHADES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Material
                </Label>
                <Select
                  value={form.material}
                  onValueChange={(v) => setForm({ ...form, material: v })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select Material" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Assign Technician
                </Label>
                <Select
                  value={form.technicianId}
                  onValueChange={(v) =>
                    setForm({ ...form, technicianId: v })
                  }
                >
                  <SelectTrigger className="rounded-xl border-border focus:border-primary focus:ring-primary/20">
                    <SelectValue placeholder="Select Technician" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {technicians.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Priority
                </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
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
                <Label className="text-sm font-medium text-foreground">
                  Amount
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pb-3 mb-5 border-b border-border/50">
              Attachments
            </h3>
            <div
              {...getRootProps()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive
                  ? "Drop files here..."
                  : "Drag & drop files, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                STL, Images, PDF (max 50MB)
              </p>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-card border border-border/50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground truncate max-w-[200px] block">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(i)}
                      className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Remarks Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pb-3 mb-5 border-b border-border/50">
              Remarks
            </h3>
            <Textarea
              placeholder="Additional notes or instructions..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
              className="rounded-xl border-border focus:border-primary focus:ring-primary/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Link href="/cases">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Case
            </Button>
          </div>
        </GlassCard>
      </form>
    </div>
  );
}
