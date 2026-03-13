"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, AlertTriangle, Package, ShoppingCart, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage stock and materials</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Items</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{items.length}</p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Package className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Value</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(items.reduce((s, i) => s + i.stock * i.costPerUnit, 0))}</p>
              </div>
              <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><ShoppingCart className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`rounded-xl border-0 shadow-sm overflow-hidden ${lowStockCount > 0 ? "ring-1 ring-red-200" : ""}`}>
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{lowStockCount}</p>
              </div>
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><AlertTriangle className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-slate-200" />
              </div>
              <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
            </form>
            <Button
              variant={showLowStock ? "destructive" : "outline"}
              onClick={() => setShowLowStock(!showLowStock)}
              className={`rounded-xl ${!showLowStock ? 'border-red-200 text-red-600 hover:bg-red-50' : ''}`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />Low Stock
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost/Unit</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-sky-50/30 transition-colors">
                      <TableCell className="font-semibold text-sm text-slate-700">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500">{item.category || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={item.stock <= item.minStock ? "destructive" : "secondary"}
                          className={`rounded-full text-xs font-semibold px-2.5 ${
                            item.stock <= item.minStock
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.stock} {item.stock <= item.minStock && <AlertTriangle className="h-3 w-3 ml-1 inline" />}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500">{item.unit}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600">{formatCurrency(item.costPerUnit)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="rounded-lg text-xs hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600" onClick={() => { setSelectedItem(item); setPurchaseForm({ ...purchaseForm, costPerUnit: String(item.costPerUnit) }); setPurchaseDialogOpen(true); }}>
                          <ShoppingCart className="h-3.5 w-3.5 mr-1" />Buy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Package className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <p className="font-medium text-slate-500">No items found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Add Inventory Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Item Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Zirconia, Wax, Tools" className="rounded-xl" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Min Stock</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Cost per Unit</Label><Input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Purchase: {selectedItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Quantity *</Label><Input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required className="rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Cost/Unit</Label><Input type="number" step="0.01" value={purchaseForm.costPerUnit} onChange={(e) => setPurchaseForm({ ...purchaseForm, costPerUnit: e.target.value })} className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Supplier</Label><Input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
