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
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage stock and materials</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{items.length}</p></div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Package className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{formatCurrency(items.reduce((s, i) => s + i.stock * i.costPerUnit, 0))}</p></div>
            <div className="bg-green-50 text-green-600 p-3 rounded-xl"><ShoppingCart className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card className={lowStockCount > 0 ? "border-red-200" : ""}><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Low Stock Alerts</p><p className="text-2xl font-bold text-red-600">{lowStockCount}</p></div>
            <div className="bg-red-50 text-red-600 p-3 rounded-xl"><AlertTriangle className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <Button variant={showLowStock ? "destructive" : "outline"} onClick={() => setShowLowStock(!showLowStock)}>
              <AlertTriangle className="h-4 w-4 mr-2" />Low Stock
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{item.category || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.stock <= item.minStock ? "destructive" : "secondary"}>
                        {item.stock} {item.stock <= item.minStock && <AlertTriangle className="h-3 w-3 ml-1" />}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.costPerUnit)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setPurchaseForm({ ...purchaseForm, costPerUnit: String(item.costPerUnit) }); setPurchaseDialogOpen(true); }}>
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />Buy
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No items found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Item Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Zirconia, Wax, Tools" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Min Stock</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Cost per Unit</Label><Input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Purchase: {selectedItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handlePurchase} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Cost/Unit</Label><Input type="number" step="0.01" value={purchaseForm.costPerUnit} onChange={(e) => setPurchaseForm({ ...purchaseForm, costPerUnit: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Supplier</Label><Input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Purchase</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
