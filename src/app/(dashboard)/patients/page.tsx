"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, UserCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getInitials } from "@/lib/utils";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full bg-muted" />
          <Skeleton className="h-4 w-32 bg-muted" />
          <Skeleton className="h-4 w-12 bg-muted hidden sm:block" />
          <Skeleton className="h-4 w-16 bg-muted hidden sm:block" />
          <Skeleton className="h-4 w-28 bg-muted" />
          <Skeleton className="h-6 w-10 rounded-full bg-muted ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", age: "", gender: "", phone: "", dentistId: "", notes: "" });

  const fetchPatients = async () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/patients${params}`);
    const data = await res.json();
    setPatients(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
    fetch("/api/dentists").then((r) => r.json()).then((d) => setDentists(Array.isArray(d) ? d : []));
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPatients(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dentistId) { toast.error("Name and dentist are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Patient added!");
      setDialogOpen(false);
      setForm({ name: "", age: "", gender: "", phone: "", dentistId: "", notes: "" });
      fetchPatients();
    } catch { toast.error("Failed to add patient"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Patients" subtitle="Manage patient records">
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Patient
        </Button>
      </PageHeader>

      <GlassCard hover="none" delay={0.1}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-border/50 focus:border-primary focus:ring-primary/20" />
          </div>
          <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
        </form>
      </GlassCard>

      <GlassCard padding="p-0" hover="none" delay={0.2}>
        {loading ? (
          <TableSkeleton />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No patients found"
            description="Add your first patient to get started"
            action={{ label: "Add Patient", onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p, index) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {getInitials(p.name || "P")}
                        </div>
                        <Link href={`/patients/${p.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                          {p.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{p.age || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{p.gender || "-"}</TableCell>
                    <TableCell>
                      {p.dentist?.id ? (
                        <Link href={`/dentists/${p.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                          {p.dentist.name}
                        </Link>
                      ) : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2.5">{p._count?.cases || 0}</Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">Add Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Dentist *</Label>
              <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
