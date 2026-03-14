"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, UserCircle, Users, Filter, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getInitials } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const avatarGradients = [
  "from-indigo-400 to-violet-600",
  "from-blue-400 to-cyan-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-fuchsia-400 to-purple-600",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 bg-muted" />
            <Skeleton className="h-3 w-24 bg-muted" />
          </div>
          <Skeleton className="h-4 w-16 bg-muted hidden sm:block" />
          <Skeleton className="h-6 w-10 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

type GenderFilter = "all" | "Male" | "Female" | "Other";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
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

  const filteredPatients = useMemo(() => {
    if (genderFilter === "all") return patients;
    return patients.filter((p) => p.gender === genderFilter);
  }, [patients, genderFilter]);

  const totalCases = patients.reduce((sum, p) => sum + (p._count?.cases || 0), 0);

  const genderFilters: { label: string; value: GenderFilter }[] = [
    { label: "All", value: "all" },
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
  ];

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Patients" subtitle="Manage patient records and history">
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Patient
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Patients" value={patients.length} icon={Users} color="indigo" delay={0.05} />
        <StatCard title="Total Cases" value={totalCases} icon={UserCircle} color="emerald" delay={0.1} />
        <StatCard title="Dentists" value={dentists.length} icon={Filter} color="violet" delay={0.15} />
      </div>

      {/* Search + filters */}
      <GlassCard hover="none" delay={0.2}>
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or dentist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-border/50 focus:border-primary focus:ring-primary/20 bg-background/50"
              />
            </div>
            <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
          </form>
          <div className="flex gap-1.5">
            {genderFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setGenderFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  genderFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Patient Table */}
      <GlassCard padding="p-0" hover="none" delay={0.3}>
        {loading ? (
          <TableSkeleton />
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No patients found"
            description={genderFilter !== "all" ? "No patients match this filter. Try a different one." : "Add your first patient to get started."}
            action={{ label: "Add Patient", onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl">
            {/* Count indicator */}
            <div className="px-6 py-3 border-b border-border/40 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">
                {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""}
                {genderFilter !== "all" && (
                  <button onClick={() => setGenderFilter("all")} className="ml-2 inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors">
                    <X className="h-3 w-3" />Clear filter
                  </button>
                )}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Patient</TableHead>
                  <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Age / Gender</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredPatients.map((p, index) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                      className="group border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                    >
                      <TableCell className="pl-6">
                        <Link href={`/patients/${p.id}`} className="flex items-center gap-3 py-0.5">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(p.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ring-2 ring-white/10`}>
                            {getInitials(p.name || "P")}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate block">
                              {p.name}
                            </span>
                            {p.phone && (
                              <span className="text-[11px] text-muted-foreground/70">{p.phone}</span>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {p.age && <span className="text-sm text-foreground/80">{p.age} yrs</span>}
                          {p.age && p.gender && <span className="text-muted-foreground/30">|</span>}
                          {p.gender && (
                            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">{p.gender}</span>
                          )}
                          {!p.age && !p.gender && <span className="text-muted-foreground/40">--</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.dentist?.id ? (
                          <Link href={`/dentists/${p.dentist.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            {p.dentist.name}
                          </Link>
                        ) : <span className="text-muted-foreground/40">--</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="rounded-full bg-muted/80 text-muted-foreground text-[11px] font-semibold px-2.5 min-w-[28px] justify-center">
                          {p._count?.cases || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Link href={`/patients/${p.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Add Patient Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">New Patient</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-10" placeholder="Enter patient name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</Label>
                <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="rounded-xl h-10" placeholder="e.g. 35" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-10" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referring Dentist *</Label>
              <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-xl resize-none" placeholder="Any additional notes..." />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[100px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? "Saving..." : "Add Patient"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
