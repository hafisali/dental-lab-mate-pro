"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Phone, Building2, Loader2, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import toast from "react-hot-toast";

export default function DentistsPage() {
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", clinicName: "", phone: "", whatsapp: "", email: "", address: "", notes: "",
  });

  const fetchDentists = async () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/dentists${params}`);
    const data = await res.json();
    setDentists(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchDentists(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDentists();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/dentists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Dentist added successfully!");
      setDialogOpen(false);
      setForm({ name: "", clinicName: "", phone: "", whatsapp: "", email: "", address: "", notes: "" });
      fetchDentists();
    } catch {
      toast.error("Failed to add dentist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dentists</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your dentist contacts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Dentist
        </Button>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search dentists..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200" />
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
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dentists.map((d) => {
                    const initials = d.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "D";
                    return (
                      <TableRow key={d.id} className="hover:bg-sky-50/30 transition-colors duration-150">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <Link href={`/dentists/${d.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm transition-colors">
                              {d.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />{d.clinicName || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />{d.phone || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2.5">{d._count?.cases || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold text-sm ${d.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(d.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(d.whatsapp || d.phone) && (
                            <a
                              href={getWhatsAppUrl(d.whatsapp || d.phone, "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                              title="Open WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dentists.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <p className="font-medium text-slate-500">No dentists found</p>
                        <p className="text-sm text-slate-400 mt-1">Add your first dentist to get started</p>
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
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Add Dentist</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="rounded-xl" />
            </div>
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
