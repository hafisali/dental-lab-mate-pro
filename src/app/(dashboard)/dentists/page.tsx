"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Phone, Building2, Loader2, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { formatCurrency, getInitials } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import toast from "react-hot-toast";
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
          <Skeleton className="h-4 w-24 bg-muted hidden sm:block" />
          <Skeleton className="h-4 w-20 bg-muted hidden md:block" />
          <Skeleton className="h-6 w-10 rounded-full bg-muted ml-auto" />
          <Skeleton className="h-4 w-16 bg-muted" />
        </div>
      ))}
    </div>
  );
}

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
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Dentists" subtitle="Manage your dentist contacts">
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Dentist
        </Button>
      </PageHeader>

      <GlassCard hover="none" delay={0.1}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search dentists..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-border/50 focus:border-primary focus:ring-primary/20" />
          </div>
          <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
        </form>
      </GlassCard>

      <GlassCard padding="p-0" hover="none" delay={0.2}>
        {loading ? (
          <TableSkeleton />
        ) : dentists.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No dentists found"
            description="Add your first dentist to get started"
            action={{ label: "Add Dentist", onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clinic</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dentists.map((d, index) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                          {getInitials(d.name || "D")}
                        </div>
                        <Link href={`/dentists/${d.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                          {d.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground/70" />{d.clinicName || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />{d.phone || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2.5">{d._count?.cases || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold text-sm ${d.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
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
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add Dentist</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="rounded-xl" />
            </div>
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
