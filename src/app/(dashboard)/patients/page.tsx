"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage patient records</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Patient
        </Button>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
            </div>
            <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => {
                    const initials = p.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "P";
                    return (
                      <TableRow key={p.id} className="hover:bg-sky-50/30 transition-colors duration-150">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <Link href={`/patients/${p.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm transition-colors">
                              {p.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">{p.age || "-"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">{p.gender || "-"}</TableCell>
                        <TableCell>
                          {p.dentist?.id ? (
                            <Link href={`/dentists/${p.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                              {p.dentist.name}
                            </Link>
                          ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2.5">{p._count?.cases || 0}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {patients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <UserCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <p className="font-medium text-slate-500">No patients found</p>
                        <p className="text-sm text-slate-400 mt-1">Add your first patient to get started</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Add Patient</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Gender</Label>
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
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Dentist *</Label>
              <Select value={form.dentistId} onValueChange={(v) => setForm({ ...form, dentistId: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
