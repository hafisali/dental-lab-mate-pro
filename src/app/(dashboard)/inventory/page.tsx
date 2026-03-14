"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, AlertTriangle, Package, ShoppingCart, Loader2,
  BarChart3, TrendingDown, Box, ChevronRight, CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import toast from "react-hot-toast";

const categoryColors: Record<string, string> = {
  Zirconia: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  Wax: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Tools: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  Metal: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Ceramic: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Acrylic: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Consumables: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

function getCategoryColor(category: string): string {
  if (!category) return "bg-muted text-muted-foreground";
  for (const key of Object.keys(categoryColors)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return categoryColors[key];
  }
  return "bg-muted text-muted-foreground";
}

function getStockPercent(stock: number, minStock: number): number {
  if (minStock <= 0) return 100;
  const max = minStock * 2;
  return Math.min(100, Math.max(0, (stock / max) * 100));
}

function getStockBarColor(stock: number, minStock: number): string {
  const pct = getStockPercent(stock, minStock);
  if (pct < 20) return "bg-red-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-emerald-500";
}

function getStockTextColor(stock: number, minStock: number): string {
  if (stock <= minStock * 0.3) return "text-red-600 dark:text-red-400";
  if (stock <= minStock) return "text-amber-600 dark:text-amber-400";
  return "text-foreground";
}

type CategoryFilter = "all" | string;

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", category: "", stock: "0", unit: "pcs", costPerUnit: "0", minStock: "5" });
  const [purchaseForm, setPurchaseForm] = useState({ quantity: "", costPerUnit: "", supplier: "", notes: "" });

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showLowStock) params.set("lowStock", "true");
    const res = await fetch(`/api/inventory?${params}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [showLowStock]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchItems(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stock: Number(form.stock), costPerUnit: Number(form.costPerUnit), minStock: Number(form.minStock) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Item added!");
      setDialogOpen(false);
      setForm({ name: "", category: "", stock: "0", unit: "pcs", costPerUnit: "0", minStock: "5" });
      fetchItems();
    } catch { toast.error("Failed to add item"); } finally { setSaving(false); }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !purchaseForm.quantity) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "purchase",
          itemId: selectedItem.id,
          quantity: Number(purchaseForm.quantity),
          costPerUnit: Number(purchaseForm.costPerUnit),
          supplier: purchaseForm.supplier,
          notes: purchaseForm.notes,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Purchase recorded!");
      setPurchaseDialogOpen(false);
      setPurchaseForm({ quantity: "", costPerUnit: "", supplier: "", notes: "" });
      fetchItems();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const lowStockItems = useMemo(() => items.filter((i) => i.stock <= i.minStock), [items]);
  const lowStockCount = lowStockItems.length;
  const totalValue = items.reduce((s, i) => s + i.stock * i.costPerUnit, 0);
  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Inventory" subtitle="Track stock levels and materials">
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 mr-2" />Add Item
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Items" value={items.length} icon={Package} color="indigo" delay={0.05} />
        <StatCard title="Total Value" value={totalValue} format={formatCurrency} icon={BarChart3} color="emerald" delay={0.1} />
        <StatCard title="Categories" value={categories.length} icon={Box} color="violet" delay={0.15} />
        <StatCard title="Low Stock" value={lowStockCount} icon={AlertTriangle} color="rose" delay={0.2} />
      </div>

      {/* Low stock alerts */}
      {lowStockCount > 0 && !showLowStock && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <GlassCard hover="none" delay={0} padding="p-4" className="border-red-200/50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {lowStockCount} item{lowStockCount !== 1 ? "s" : ""} running low
                </h4>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                  {lowStockItems.slice(0, 3).map((i) => i.name).join(", ")}
                  {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLowStock(true)}
                className="rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50 flex-shrink-0"
              >
                <TrendingDown className="h-3 w-3 mr-1" />View All
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Table */}
      <GlassCard padding="p-0" hover="none" delay={0.3}>
        {/* Search / Filter Bar */}
        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
                />
              </div>
              <Button type="submit" variant="secondary" className="rounded-xl h-9 text-sm">Search</Button>
            </form>
            <Button
              variant={showLowStock ? "destructive" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className={`rounded-xl h-9 text-sm ${!showLowStock ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50" : ""}`}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {showLowStock ? "Show All" : "Low Stock"}
              {lowStockCount > 0 && (
                <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0 ${showLowStock ? "bg-white/20" : "bg-red-100 dark:bg-red-900/50"}`}>
                  {lowStockCount}
                </span>
              )}
            </Button>
          </div>
          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  categoryFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[180px]" />
                <Skeleton className="h-5 w-[70px] rounded-full" />
                <div className="flex-1"><Skeleton className="h-2 w-full rounded-full" /></div>
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-8 w-[60px] rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={categoryFilter !== "all" ? "No items in this category" : showLowStock ? "No low stock items" : "No items found"}
            description={categoryFilter !== "all" ? "Try a different category filter" : "Add your first inventory item to start tracking stock."}
            action={categoryFilter === "all" && !showLowStock ? { label: "Add Item", onClick: () => setDialogOpen(true) } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            {/* Count */}
            <div className="px-6 py-2.5 border-b border-border/30 bg-muted/20">
              <span className="text-xs font-medium text-muted-foreground">
                {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
                {categoryFilter !== "all" && (
                  <button onClick={() => setCategoryFilter("all")} className="ml-2 text-primary hover:text-primary/80 transition-colors">
                    Clear filter
                  </button>
                )}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Item</TableHead>
                  <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stock Level</TableHead>
                  <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unit</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cost/Unit</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => {
                    const isLow = item.stock <= item.minStock;
                    const isCritical = item.stock <= item.minStock * 0.3;
                    const pct = getStockPercent(item.stock, item.minStock);
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                        className={`border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 ${isCritical ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            {isLow && (
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCritical ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                            )}
                            <span className="font-semibold text-sm text-foreground">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {item.category ? (
                            <Badge variant="secondary" className={`rounded-full text-[11px] font-medium px-2.5 py-0.5 border-0 ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground/40">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[140px]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-bold tabular-nums ${getStockTextColor(item.stock, item.minStock)}`}>
                                {item.stock}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50">
                                min: {item.minStock}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: index * 0.03 + 0.2, ease: "easeOut" }}
                                className={`h-full rounded-full ${getStockBarColor(item.stock, item.minStock)}`}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{item.unit}</TableCell>
                        <TableCell className="text-right text-sm text-foreground tabular-nums">{formatCurrency(item.costPerUnit)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs h-8 px-3 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-800 dark:hover:text-indigo-400 transition-all"
                            onClick={() => {
                              setSelectedItem(item);
                              setPurchaseForm({ ...purchaseForm, costPerUnit: String(item.costPerUnit) });
                              setPurchaseDialogOpen(true);
                            }}
                          >
                            <ShoppingCart className="h-3.5 w-3.5 mr-1" />Restock
                          </Button>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Item</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Add a new inventory item</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-10" placeholder="e.g. Zirconia Block A2" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Zirconia, Wax, Tools" className="rounded-xl h-10" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost per Unit</Label>
              <Input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className="rounded-xl h-10" placeholder="0.00" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[100px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {saving ? "Saving..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Restock Item</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedItem?.name}</p>
              </div>
            </div>
          </DialogHeader>
          {selectedItem && (
            <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current stock</span>
              <span className={`text-sm font-bold ${getStockTextColor(selectedItem.stock, selectedItem.minStock)}`}>
                {selectedItem.stock} {selectedItem.unit}
              </span>
            </div>
          )}
          <form onSubmit={handlePurchase} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity *</Label>
                <Input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required className="rounded-xl h-10" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost/Unit</Label>
                <Input type="number" step="0.01" value={purchaseForm.costPerUnit} onChange={(e) => setPurchaseForm({ ...purchaseForm, costPerUnit: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</Label>
              <Input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} className="rounded-xl h-10" placeholder="Supplier name" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPurchaseDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Record Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
