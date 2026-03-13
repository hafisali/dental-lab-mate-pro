"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToothChart from "@/components/dental-chart/tooth-chart";
import { WORK_TYPES, MATERIALS, VITA_SHADES } from "@/types";
import { ArrowLeft, Save, Loader2, Upload, X, FileText } from "lucide-react";
import Link from "next/link";
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
    fetch("/api/dentists").then((r) => r.json()).then(setDentists);
    fetch("/api/users").then((r) => r.json()).then((users) => {
      setTechnicians(Array.isArray(users) ? users.filter((u: any) => u.role === "TECHNICIAN") : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.dentistId) {
      fetch(`/api/patients?dentistId=${form.dentistId}`).then((r) => r.json()).then(setPatients);
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Case</h1>
          <p className="text-muted-foreground text-sm">Create a new work order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dentist & Patient */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dentist & Patient</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dentist *</Label>
              <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v, patientId: "" })}>
                <SelectTrigger><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent>
                  {dentists.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Patient (optional)" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tooth Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tooth Selection *</CardTitle>
          </CardHeader>
          <CardContent>
            <ToothChart
              selectedTeeth={form.teethNumbers}
              onChange={(teeth) => setForm({ ...form, teethNumbers: teeth })}
            />
          </CardContent>
        </Card>

        {/* Work Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Work Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Work Type *</Label>
              <Select value={form.workType} onValueChange={(v) => setForm({ ...form, workType: v })}>
                <SelectTrigger><SelectValue placeholder="Select Work Type" /></SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shade</Label>
              <Select value={form.shade} onValueChange={(v) => setForm({ ...form, shade: v })}>
                <SelectTrigger><SelectValue placeholder="Select Shade" /></SelectTrigger>
                <SelectContent>
                  {VITA_SHADES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={form.material} onValueChange={(v) => setForm({ ...form, material: v })}>
                <SelectTrigger><SelectValue placeholder="Select Material" /></SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Technician</Label>
              <Select value={form.technicianId} onValueChange={(v) => setForm({ ...form, technicianId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Technician" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? "Drop files here..." : "Drag & drop files, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">STL, Images, PDF (max 50MB)</p>
            </div>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-2 px-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(i)} className="h-7 w-7">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional notes or instructions..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/cases">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Create Case
          </Button>
        </div>
      </form>
    </div>
  );
}
