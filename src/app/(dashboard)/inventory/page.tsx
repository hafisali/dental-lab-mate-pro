"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertTriangle, Package, ShoppingCart, Loader2 } from "lucide-react";
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
  // Treat 2x minStock as "full"
  const max = minStock * 2;
  return Math.min(100, Math.max(0, (stock / max) * 100));
}

function getStockBarColor(stock: number, minStock: number): string {
  const pct = getStockPercent(stock, minStock);
  if (pct < 20) return "bg-red-500";
  if (pct < 50) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
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

  const lowStockCount = items.filter((i) => i.stock <= i.minStock).length;
  const totalValue = items.reduce((s, i) => s + i.stock * i.costPerUnit, 0);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Inventory" subtitle="Manage stock and materials">
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />Add Item
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Items" value={items.length} icon={Package} color="indigo" delay={0} />
        <StatCard title="Total Value" value={totalValue} format={formatCurrency} icon={ShoppingCart} color="emerald" delay={0.1} />
        <StatCard title="Low Stock" value={lowStockCount} icon={AlertTriangle} color="rose" delay={0.2} />
      </div>

      {/* Table */}
      <GlassCard padding="p-0" hover="none" delay={0.3}>
        {/* Search / Filter Bar */}
        <div className="p-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border bg-background"
                />
              </div>
              <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
            </form>
            <Button
              variant={showLowStock ? "destructive" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className={`rounded-xl ${!showLowStock ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50" : ""}`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />Low Stock
            </Button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items found"
            description="Add your first inventory item to start tracking stock."
            action={{ label: "Add Item", onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock Level</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost/Unit</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const isLow = item.stock <= item.minStock;
                  const pct = getStockPercent(item.stock, item.minStock);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className={`border-b border-border/30 hover:bg-accent/50 transition-colors ${isLow ? "border-l-2 border-l-red-400" : ""}`}
                    >
                      <TableCell className="font-semibold text-sm text-foreground">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.category ? (
                          <Badge variant="secondary" className={`rounded-full text-xs font-medium px-2.5 py-0.5 border-0 ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${isLow ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                {item.stock}
                              </span>
                              {isLow && <AlertTriangle className="h-3 w-3 text-red-500" />}
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getStockBarColor(item.stock, item.minStock)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right text-sm text-foreground">{formatCurrency(item.costPerUnit)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:border-indigo-800 dark:hover:text-indigo-400"
                          onClick={() => {
                            setSelectedItem(item);
                            setPurchaseForm({ ...purchaseForm, costPerUnit: String(item.costPerUnit) });
                            setPurchaseDialogOpen(true);
                          }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" />Buy
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add Inventory Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Item Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Zirconia, Wax, Tools" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Cost per Unit</Label>
              <Input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className="rounded-xl" />
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

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Purchase: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Quantity *</Label>
                <Input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Cost/Unit</Label>
                <Input type="number" step="0.01" value={purchaseForm.costPerUnit} onChange={(e) => setPurchaseForm({ ...purchaseForm, costPerUnit: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Supplier</Label>
              <Input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} className="rounded-xl" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
