"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, Search, Filter,
  Plus, ChevronDown, ChevronUp, Edit3,
  Power, Eye, X, Save, CheckCircle2,
  XCircle, ExternalLink, RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  planTier: string;
  planExpiresAt: string | null;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    patients: number;
    cases: number;
    invoices: number;
    dentists: number;
  };
  subscription: {
    status: string;
    currentPeriodEnd: string;
    stripePriceId: string;
  } | null;
}

// ── Constants ──────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const planBadgeColors: Record<string, string> = {
  trial: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  basic: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800",
  pro: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-800",
};

// ── Create Tenant Dialog ──────────────────────────────────────

function CreateTenantDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    slug: "",
    plan: "trial",
    maxUsers: 5,
    ownerName: "",
    ownerEmail: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Lab name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Tenant created successfully");
        setOpen(false);
        setForm({ name: "", email: "", phone: "", slug: "", plan: "trial", maxUsers: 5, ownerName: "", ownerEmail: "" });
        onCreated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create tenant");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Create Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>Set up a new lab/clinic on the platform.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Lab Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dental Lab Pro"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="dental-lab-pro"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Lab Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="lab@example.com"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91..."
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUsers">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Owner (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="John Doe"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600"
          >
            {saving ? "Creating..." : "Create Tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Plan Inline Dialog ───────────────────────────────────

function EditPlanDialog({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState(tenant.plan);
  const [maxUsers, setMaxUsers] = useState(tenant.maxUsers);
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, maxUsers, isActive }),
      });
      if (res.ok) {
        toast.success("Tenant updated");
        onSaved();
        onClose();
      } else {
        toast.error("Failed to update tenant");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <h3 className="text-base font-semibold text-foreground">Edit Plan</h3>
            <p className="text-sm text-muted-foreground">{tenant.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Plan</Label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlan(opt.value)}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all text-sm ${
                    plan === opt.value
                      ? `${planBadgeColors[opt.value]} border-current font-semibold`
                      : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Max Users</Label>
            <Input type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} className="rounded-xl" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Status</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{isActive ? "Active" : "Deactivated"}</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${isActive ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border/50 bg-muted/20">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600"
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Expanded Row Detail ──────────────────────────────────────

function TenantDetailRow({ tenant }: { tenant: Tenant }) {
  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <TableCell colSpan={8} className="bg-muted/20 p-0">
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm text-foreground">{tenant.email || "No email"}</p>
            <p className="text-xs text-muted-foreground">{tenant.phone || "No phone"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Usage</p>
            <p className="text-sm text-foreground">{tenant._count.users}/{tenant.maxUsers} users</p>
            <p className="text-xs text-muted-foreground">{tenant._count.dentists} dentists, {tenant._count.invoices} invoices</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subscription</p>
            {tenant.subscription ? (
              <>
                <p className="text-sm text-foreground capitalize">{tenant.subscription.status}</p>
                <p className="text-xs text-muted-foreground">
                  Renews {format(new Date(tenant.subscription.currentPeriodEnd), "MMM d, yyyy")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Slug</p>
            <p className="text-sm text-foreground font-mono">{tenant.slug || "---"}</p>
            <p className="text-xs text-muted-foreground">
              Expires: {tenant.planExpiresAt ? format(new Date(tenant.planExpiresAt), "MMM d, yyyy") : "---"}
            </p>
          </div>
        </div>
      </TableCell>
    </motion.tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function TenantsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchTenants();
  }, [session, authStatus]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.labs || []);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTenants();
    setRefreshing(false);
  };

  const handleToggleActive = async (tenant: Tenant, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      if (res.ok) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, isActive: !t.isActive } : t))
        );
        toast.success(tenant.isActive ? "Tenant deactivated" : "Tenant activated");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filteredTenants = useMemo(() => {
    let result = [...tenants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          t.slug?.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q)
      );
    }

    if (planFilter !== "all") {
      result = result.filter((t) => t.plan === planFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((t) =>
        statusFilter === "active" ? t.isActive : !t.isActive
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = (a as any)[sortBy];
      let bVal: any = (b as any)[sortBy];
      if (sortBy === "users") { aVal = a._count.users; bVal = b._count.users; }
      if (sortBy === "patients") { aVal = a._count.patients; bVal = b._count.patients; }
      if (sortBy === "cases") { aVal = a._count.cases; bVal = b._count.cases; }
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [tenants, searchQuery, planFilter, statusFilter, sortBy, sortOrder]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 max-w-md rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Plans</option>
            {PLAN_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border/50 rounded-xl px-3 py-2.5 hover:shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <CreateTenantDialog onCreated={fetchTenants} />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filteredTenants.length} tenant{filteredTenants.length !== 1 ? "s" : ""}</span>
        <span className="text-border">|</span>
        <span>{filteredTenants.filter((t) => t.isActive).length} active</span>
        <span className="text-border">|</span>
        <span>{filteredTenants.filter((t) => t.plan !== "trial").length} paid</span>
      </div>

      {/* Table */}
      <GlassCard padding="p-0" hover="none">
        {filteredTenants.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">No tenants found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery || planFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Tenants will appear here as they register."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("name")}
                  >
                    Name <SortIcon field="name" />
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">
                    Slug
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("plan")}
                  >
                    Plan <SortIcon field="plan" />
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("users")}
                  >
                    Users <SortIcon field="users" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("patients")}
                  >
                    Patients <SortIcon field="patients" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("cases")}
                  >
                    Cases <SortIcon field="cases" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wider"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created <SortIcon field="createdAt" />
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredTenants.map((tenant) => (
                    <>
                      <TableRow
                        key={tenant.id}
                        className="cursor-pointer group"
                        onClick={() => setExpandedId(expandedId === tenant.id ? null : tenant.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                              {tenant.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate max-w-[160px] group-hover:text-primary transition-colors">
                                {tenant.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                {tenant.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {tenant.slug || "---"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${planBadgeColors[tenant.plan] || planBadgeColors.trial}`}>
                            {tenant.plan}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tenant.isActive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${tenant.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                            {tenant.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {tenant._count.users}
                          </span>
                          <span className="text-xs text-muted-foreground">/{tenant.maxUsers}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{tenant._count.patients}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{tenant._count.cases}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleToggleActive(tenant, e)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                tenant.isActive
                                  ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              }`}
                              title={tenant.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingTenant(tenant); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Change Plan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/dashboard?labId=${tenant.id}`, "_blank"); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="View as Tenant"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === tenant.id && (
                        <TenantDetailRow key={`detail-${tenant.id}`} tenant={tenant} />
                      )}
                    </>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Edit Plan Dialog */}
      <AnimatePresence>
        {editingTenant && (
          <EditPlanDialog
            tenant={editingTenant}
            onClose={() => setEditingTenant(null)}
            onSaved={fetchTenants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
