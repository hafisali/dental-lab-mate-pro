"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Phone, Building2, Loader2, MessageCircle, Users, Mail, FolderOpen, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { formatCurrency, getInitials } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const GRADIENT_COMBOS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-fuchsia-500",
];

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
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
        <Button
          onClick={() => setDialogOpen(true)}
          className="group relative bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Plus className="h-4 w-4 mr-2" />Add Dentist
        </Button>
      </PageHeader>

      {/* Search Bar */}
      <GlassCard hover="none" delay={0.1}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors duration-200" />
            <Input
              placeholder="Search dentists by name, clinic, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 rounded-xl border-border/50 bg-background/80 focus:border-indigo-400 focus:ring-indigo-500/20 h-11"
            />
          </div>
          <Button type="submit" variant="secondary" className="rounded-xl px-5 h-11">
            Search
          </Button>
        </form>
      </GlassCard>

      {/* Card Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CardSkeleton />
          </motion.div>
        ) : dentists.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassCard hover="none">
              <EmptyState
                icon={Users}
                title="No dentists found"
                description="Add your first dentist to get started"
                action={{ label: "Add Dentist", onClick: () => setDialogOpen(true) }}
              />
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {dentists.map((d, index) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 overflow-hidden"
              >
                {/* Top gradient accent */}
                <div className={`h-1 bg-gradient-to-r ${GRADIENT_COMBOS[index % GRADIENT_COMBOS.length]}`} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Link href={`/dentists/${d.id}`}>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${GRADIENT_COMBOS[index % GRADIENT_COMBOS.length]} flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg shadow-indigo-500/10 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300`}>
                        {getInitials(d.name || "D")}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/dentists/${d.id}`}
                        className="text-base font-bold text-foreground hover:text-primary transition-colors block truncate"
                      >
                        {d.name}
                      </Link>
                      {d.clinicName && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                          <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                          {d.clinicName}
                        </p>
                      )}
                      {d.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                          {d.phone}
                        </p>
                      )}
                      {d.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
                          {d.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <Badge variant="secondary" className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold px-2 py-0 border-0">
                          {d._count?.cases || 0} cases
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tabular-nums ${(d.balance || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatCurrency(d.balance || 0)}
                      </span>
                      {(d.whatsapp || d.phone) && (
                        <a
                          href={getWhatsAppUrl(d.whatsapp || d.phone, "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-all opacity-0 group-hover:opacity-100"
                          title="Open WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Dentist Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">Add New Dentist</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the details to add a new dentist contact</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-10" placeholder="Dr. John Smith" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Clinic Name</Label>
              <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} className="rounded-xl h-10" placeholder="Smile Dental Clinic" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-10" placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="rounded-xl h-10" placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl h-10" placeholder="doctor@clinic.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="rounded-xl" placeholder="Clinic address..." />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button
                type="submit"
                disabled={saving}
                className="group relative rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Dentist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
