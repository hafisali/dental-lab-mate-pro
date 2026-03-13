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
import { Plus, Search, Phone, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
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
          <h1 className="text-2xl font-bold">Dentists</h1>
          <p className="text-muted-foreground text-sm">Manage your dentist contacts</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Dentist
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search dentists..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Clinic</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-center">Cases</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dentists.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dentists/${d.id}`} className="text-sky-600 hover:underline">
                        {d.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />{d.clinicName || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />{d.phone || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{d._count?.cases || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={d.balance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                        {formatCurrency(d.balance)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {dentists.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No dentists found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Dentist</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Clinic Name</Label><Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
