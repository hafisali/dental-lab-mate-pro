"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, AlertTriangle, Package, Loader2, Pill, ShoppingCart,
  Receipt, CheckCircle2, Trash2, Edit3, Calendar, TrendingDown,
  CreditCard, Clock, ChevronDown, ChevronUp, Download, X, BarChart3,
  AlertCircle, Box,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import toast from "react-hot-toast";

// --- Types ---

interface PharmacyItem {
  id: string;
  name: string;
  genericName: string | null;
  category: string | null;
  batchNo: string | null;
  expiryDate: string | null;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  minStock: number;
  supplier: string | null;
  rackLocation: string | null;
  _count?: { sales: number };
}

interface CartItem {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  maxStock: number;
}

interface SaleItem {
  id: string;
  itemName: string;
  quantity: number;
  price: number;
  total: number;
}

interface PharmacySale {
  id: string;
  patientName: string | null;
  patientPhone: string | null;
  date: string;
  totalAmount: number;
  paymentMode: string;
  doctorName: string | null;
  items: SaleItem[];
  patient?: { id: string; name: string } | null;
}

// --- Constants ---

const categoryColors: Record<string, string> = {
  Tablets: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Capsules: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Syrups: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Injections: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Ointments: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Drops: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Dental: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  Surgical: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  Antibiotics: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  Painkillers: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
};

function getCategoryColor(category: string): string {
  if (!category) return "bg-muted text-muted-foreground";
  for (const key of Object.keys(categoryColors)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return categoryColors[key];
  }
  return "bg-muted text-muted-foreground";
}

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK: "Bank Transfer",
  ONLINE: "Online",
  CHEQUE: "Cheque",
};

const paymentMethodIcons: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  UPI: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  BANK: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  ONLINE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  CHEQUE: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

// --- Helpers ---

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  return expiry <= thirtyDays && expiry >= new Date();
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted hidden sm:block" />
          <Skeleton className="h-4 w-28 bg-muted" />
          <Skeleton className="h-6 w-16 rounded-full bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted ml-auto" />
        </div>
      ))}
    </div>
  );
}

// --- Main Component ---

export default function PharmacyPage() {
  // State
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [sales, setSales] = useState<PharmacySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search / Filters
  const [searchItems, setSearchItems] = useState("");
  const [searchSales, setSearchSales] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showExpiring, setShowExpiring] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dialogs
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PharmacyItem | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // Cart / Quick Sale
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salePatientName, setSalePatientName] = useState("");
  const [salePatientPhone, setSalePatientPhone] = useState("");
  const [saleDoctorName, setSaleDoctorName] = useState("");
  const [salePaymentMode, setSalePaymentMode] = useState("CASH");
  const [medicineSearch, setMedicineSearch] = useState("");

  // Add/Edit Form
  const [form, setForm] = useState({
    name: "", genericName: "", category: "", batchNo: "", expiryDate: "",
    quantity: "0", mrp: "0", purchasePrice: "0", minStock: "5", supplier: "", rackLocation: "",
  });

  // Stock form
  const [stockForm, setStockForm] = useState({
    quantity: "", purchasePrice: "", supplier: "", batchNo: "", expiryDate: "",
  });

  // Debounced search for items
  const [debouncedSearchItems, setDebouncedSearchItems] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchItems(searchItems), 300);
    return () => clearTimeout(timer);
  }, [searchItems]);

  // --- Fetch ---

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearchItems) params.set("search", debouncedSearchItems);
    if (showLowStock) params.set("lowStock", "true");
    if (showExpiring) params.set("expiring", "true");
    const res = await fetch(`/api/pharmacy?${params}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }, [debouncedSearchItems, showLowStock, showExpiring]);

  const fetchSales = useCallback(async () => {
    const params = new URLSearchParams({ type: "sales" });
    if (searchSales) params.set("search", searchSales);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/pharmacy?${params}`);
    const data = await res.json();
    setSales(Array.isArray(data) ? data : []);
  }, [searchSales, dateFrom, dateTo]);

  useEffect(() => {
    Promise.all([fetchItems(), fetchSales()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchItems();
  }, [debouncedSearchItems, showLowStock, showExpiring]);

  // --- Computed ---

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(cats).sort() as string[];
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter);
    }
    return result;
  }, [items, categoryFilter]);

  const lowStockItems = useMemo(() => items.filter((i) => i.quantity <= i.minStock), [items]);
  const expiringItems = useMemo(() => items.filter((i) => isExpiringSoon(i.expiryDate)), [items]);
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((s) => new Date(s.date).toDateString() === today);
  }, [sales]);
  const todaysRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);

  // Medicine search for cart
  const searchedMedicines = useMemo(() => {
    if (!medicineSearch.trim()) return [];
    const q = medicineSearch.toLowerCase();
    return items
      .filter((i) => i.quantity > 0 && (i.name.toLowerCase().includes(q) || i.genericName?.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [medicineSearch, items]);

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.price, 0);

  // --- Handlers ---

  const resetForm = () => {
    setForm({ name: "", genericName: "", category: "", batchNo: "", expiryDate: "", quantity: "0", mrp: "0", purchasePrice: "0", minStock: "5", supplier: "", rackLocation: "" });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Medicine name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: "item", quantity: Number(form.quantity), mrp: Number(form.mrp), purchasePrice: Number(form.purchasePrice), minStock: Number(form.minStock) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Medicine added!");
      setAddItemDialogOpen(false);
      resetForm();
      fetchItems();
    } catch { toast.error("Failed to add medicine"); } finally { setSaving(false); }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pharmacy/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), mrp: Number(form.mrp), purchasePrice: Number(form.purchasePrice), minStock: Number(form.minStock) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Medicine updated!");
      setEditItemDialogOpen(false);
      resetForm();
      setSelectedItem(null);
      fetchItems();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this medicine? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/pharmacy/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Medicine deleted");
      fetchItems();
    } catch { toast.error("Failed to delete"); }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !stockForm.quantity) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stock",
          itemId: selectedItem.id,
          quantity: Number(stockForm.quantity),
          purchasePrice: stockForm.purchasePrice ? Number(stockForm.purchasePrice) : undefined,
          supplier: stockForm.supplier || undefined,
          batchNo: stockForm.batchNo || undefined,
          expiryDate: stockForm.expiryDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Stock added!");
      setAddStockDialogOpen(false);
      setStockForm({ quantity: "", purchasePrice: "", supplier: "", batchNo: "", expiryDate: "" });
      setSelectedItem(null);
      fetchItems();
    } catch { toast.error("Failed to add stock"); } finally { setSaving(false); }
  };

  const addToCart = (item: PharmacyItem) => {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) { toast.error("Not enough stock"); return; }
      setCart(cart.map((c) => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { itemId: item.id, itemName: item.name, quantity: 1, price: item.mrp, maxStock: item.quantity }]);
    }
    setMedicineSearch("");
  };

  const updateCartQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.itemId !== itemId));
    } else {
      const item = cart.find((c) => c.itemId === itemId);
      if (item && qty > item.maxStock) { toast.error("Not enough stock"); return; }
      setCart(cart.map((c) => c.itemId === itemId ? { ...c, quantity: qty } : c));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.itemId !== itemId));
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) { toast.error("Add medicines to cart first"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sale",
          patientName: salePatientName || null,
          patientPhone: salePatientPhone || null,
          doctorName: saleDoctorName || null,
          paymentMode: salePaymentMode,
          items: cart.map((c) => ({ itemId: c.itemId, itemName: c.itemName, quantity: c.quantity, price: c.price })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sale completed!");
      setCart([]);
      setSalePatientName("");
      setSalePatientPhone("");
      setSaleDoctorName("");
      setSalePaymentMode("CASH");
      fetchItems();
      fetchSales();
    } catch { toast.error("Failed to complete sale"); } finally { setSaving(false); }
  };

  const handleSearchSales = () => {
    fetchSales();
  };

  const exportSalesCSV = () => {
    const headers = ["Date", "Patient", "Doctor", "Items", "Total", "Payment Mode"];
    const rows = sales.map((s) => [
      formatDate(s.date),
      s.patientName || "--",
      s.doctorName || "--",
      s.items.length.toString(),
      s.totalAmount.toFixed(2),
      paymentMethodLabels[s.paymentMode] || s.paymentMode,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmacy-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (item: PharmacyItem) => {
    setSelectedItem(item);
    setForm({
      name: item.name,
      genericName: item.genericName || "",
      category: item.category || "",
      batchNo: item.batchNo || "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "",
      quantity: String(item.quantity),
      mrp: String(item.mrp),
      purchasePrice: String(item.purchasePrice),
      minStock: String(item.minStock),
      supplier: item.supplier || "",
      rackLocation: item.rackLocation || "",
    });
    setEditItemDialogOpen(true);
  };

  // --- Render ---

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Pharmacy" subtitle="Manage medicines, sales & inventory">
        <Button
          onClick={() => { resetForm(); setAddItemDialogOpen(true); }}
          className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 mr-2" />Add Medicine
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Medicines" value={items.length} icon={Pill} color="indigo" delay={0.05} />
        <StatCard title="Low Stock" value={lowStockItems.length} icon={AlertTriangle} color="rose" delay={0.1} />
        <StatCard title="Expiring Soon" value={expiringItems.length} icon={Clock} color="amber" delay={0.15} />
        <StatCard title="Today's Revenue" value={todaysRevenue} format={formatCurrency} icon={BarChart3} color="emerald" delay={0.2} />
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
          <GlassCard hover="none" delay={0} padding="p-4" className="border-red-200/50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {lowStockItems.length} medicine{lowStockItems.length !== 1 ? "s" : ""} running low
                </h4>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                  {lowStockItems.slice(0, 3).map((i) => i.name).join(", ")}
                  {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Main Content Tabs */}
      <GlassCard hover="none" delay={0.3} padding="p-0">
        <Tabs defaultValue="billing" className="w-full">
          <div className="px-6 pt-5 pb-0">
            <TabsList className="bg-muted/50 rounded-xl p-1 h-auto">
              <TabsTrigger value="billing" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <ShoppingCart className="h-4 w-4 mr-1.5" />Dashboard & Billing
              </TabsTrigger>
              <TabsTrigger value="inventory" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Package className="h-4 w-4 mr-1.5" />Inventory
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Receipt className="h-4 w-4 mr-1.5" />Sales History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB 1: Dashboard & Billing ==================== */}
          <TabsContent value="billing" className="mt-0 pt-4">
            <div className="px-6 pb-6 space-y-6">
              {/* Quick Sale Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Sale Form */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <ShoppingCart className="h-3.5 w-3.5 text-white" />
                    </div>
                    Quick Sale
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Name</Label>
                      <Input
                        value={salePatientName}
                        onChange={(e) => setSalePatientName(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                      <Input
                        value={salePatientPhone}
                        onChange={(e) => setSalePatientPhone(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doctor</Label>
                      <Input
                        value={saleDoctorName}
                        onChange={(e) => setSaleDoctorName(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Mode</Label>
                      <Select value={salePaymentMode} onValueChange={setSalePaymentMode}>
                        <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="BANK">Bank Transfer</SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Medicine Search */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Medicine</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={medicineSearch}
                        onChange={(e) => setMedicineSearch(e.target.value)}
                        placeholder="Type to search medicines..."
                        className="pl-9 rounded-xl h-9 text-sm"
                      />
                    </div>
                    {/* Search results dropdown */}
                    {searchedMedicines.length > 0 && (
                      <div className="rounded-xl border border-border/50 bg-card shadow-lg overflow-hidden mt-1">
                        {searchedMedicines.map((med) => (
                          <button
                            key={med.id}
                            onClick={() => addToCart(med)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/40 transition-colors text-left border-b border-border/20 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{med.name}</p>
                              {med.genericName && <p className="text-xs text-muted-foreground truncate">{med.genericName}</p>}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                              <span className="text-xs text-muted-foreground">Qty: {med.quantity}</span>
                              <span className="text-sm font-semibold text-foreground">{formatCurrency(med.mrp)}</span>
                              <Plus className="h-4 w-4 text-indigo-500" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Cart */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Receipt className="h-3.5 w-3.5 text-white" />
                    </div>
                    Cart
                    {cart.length > 0 && (
                      <Badge variant="secondary" className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 text-[11px] ml-1">
                        {cart.length}
                      </Badge>
                    )}
                  </h3>

                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/50">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Cart is empty</p>
                      <p className="text-xs text-muted-foreground/60">Search and add medicines</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((c) => (
                        <div key={c.itemId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.itemName}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(c.price)} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateCartQuantity(c.itemId, c.quantity - 1)}>
                              <span className="text-sm font-bold">-</span>
                            </Button>
                            <span className="text-sm font-bold w-8 text-center tabular-nums">{c.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateCartQuantity(c.itemId, c.quantity + 1)}>
                              <span className="text-sm font-bold">+</span>
                            </Button>
                          </div>
                          <span className="text-sm font-semibold text-foreground tabular-nums w-20 text-right">{formatCurrency(c.quantity * c.price)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => removeFromCart(c.itemId)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      {/* Total & Complete */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 border border-indigo-200/30 dark:border-indigo-800/30 mt-3">
                        <span className="text-sm font-semibold text-foreground">Total</span>
                        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(cartTotal)}</span>
                      </div>

                      <Button
                        onClick={handleCompleteSale}
                        disabled={saving}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 h-11"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        {saving ? "Processing..." : "Complete Sale"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Sales */}
              <div className="pt-4 border-t border-border/30">
                <h3 className="text-sm font-semibold text-foreground mb-3">Recent Sales</h3>
                {todaySales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No sales today</p>
                ) : (
                  <div className="space-y-2">
                    {todaySales.slice(0, 5).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {sale.patientName?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{sale.patientName || "Walk-in"}</p>
                            <p className="text-xs text-muted-foreground">{sale.items.length} item{sale.items.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1 ${paymentMethodIcons[sale.paymentMode] || "bg-muted text-muted-foreground"}`}>
                            {paymentMethodLabels[sale.paymentMode] || sale.paymentMode}
                          </span>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(sale.totalAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== TAB 2: Inventory ==================== */}
          <TabsContent value="inventory" className="mt-0 pt-4">
            {/* Search / Filter Bar */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medicines..."
                    value={searchItems}
                    onChange={(e) => setSearchItems(e.target.value)}
                    className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showLowStock ? "destructive" : "outline"}
                    onClick={() => { setShowLowStock(!showLowStock); setShowExpiring(false); }}
                    className={`rounded-xl h-9 text-sm ${!showLowStock ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50" : ""}`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Low Stock
                    {lowStockItems.length > 0 && (
                      <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0 ${showLowStock ? "bg-white/20" : "bg-red-100 dark:bg-red-900/50"}`}>
                        {lowStockItems.length}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant={showExpiring ? "destructive" : "outline"}
                    onClick={() => { setShowExpiring(!showExpiring); setShowLowStock(false); }}
                    className={`rounded-xl h-9 text-sm ${!showExpiring ? "border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/50" : ""}`}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />Expiring
                    {expiringItems.length > 0 && (
                      <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0 ${showExpiring ? "bg-white/20" : "bg-amber-100 dark:bg-amber-900/50"}`}>
                        {expiringItems.length}
                      </span>
                    )}
                  </Button>
                </div>
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

            {/* Table */}
            {loading ? (
              <TableSkeleton />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={Pill}
                title={showLowStock ? "No low stock items" : showExpiring ? "No expiring items" : categoryFilter !== "all" ? "No items in this category" : "No medicines yet"}
                description={showLowStock || showExpiring ? "All items look good!" : "Add your first medicine to start managing pharmacy inventory."}
                action={!showLowStock && !showExpiring && categoryFilter === "all" ? { label: "Add Medicine", onClick: () => { resetForm(); setAddItemDialogOpen(true); } } : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <div className="px-6 py-2.5 border-b border-t border-border/30 bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground">
                    {filteredItems.length} medicine{filteredItems.length !== 1 ? "s" : ""}
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
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Medicine</TableHead>
                      <TableHead className="hidden md:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Generic Name</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category</TableHead>
                      <TableHead className="hidden lg:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Batch</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Expiry</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stock</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">MRP</TableHead>
                      <TableHead className="hidden lg:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Supplier</TableHead>
                      <TableHead className="hidden xl:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rack</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map((item, index) => {
                        const isLow = item.quantity <= item.minStock;
                        const expSoon = isExpiringSoon(item.expiryDate);
                        const exp = isExpired(item.expiryDate);

                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                            className={`border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 ${
                              isLow ? "bg-red-50/30 dark:bg-red-950/10" : expSoon ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                            }`}
                          >
                            <TableCell className="pl-6">
                              <div className="flex items-center gap-2">
                                {isLow && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500 animate-pulse" />}
                                {!isLow && expSoon && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500" />}
                                <span className="font-semibold text-sm text-foreground">{item.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.genericName || "--"}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {item.category ? (
                                <Badge variant="secondary" className={`rounded-full text-[11px] font-medium px-2.5 py-0.5 border-0 ${getCategoryColor(item.category)}`}>
                                  {item.category}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground/40">--</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">{item.batchNo || "--"}</TableCell>
                            <TableCell>
                              {item.expiryDate ? (
                                <span className={`text-sm font-medium ${exp ? "text-red-600 dark:text-red-400" : expSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                  {new Date(item.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                                  {exp && <span className="ml-1 text-[10px]">(Expired)</span>}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground/40">--</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-sm font-bold tabular-nums ${isLow ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                                  {item.quantity}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50">/ {item.minStock}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-foreground tabular-nums">{formatCurrency(item.mrp)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.supplier || "--"}</TableCell>
                            <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{item.rackLocation || "--"}</TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs h-7 px-2 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-800 dark:hover:text-emerald-400 transition-all"
                                  onClick={() => { setSelectedItem(item); setStockForm({ ...stockForm, purchasePrice: String(item.purchasePrice) }); setAddStockDialogOpen(true); }}
                                >
                                  <Plus className="h-3 w-3 mr-0.5" />Stock
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ==================== TAB 3: Sales History ==================== */}
          <TabsContent value="history" className="mt-0 pt-4">
            {/* Filters */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient or doctor..."
                    value={searchSales}
                    onChange={(e) => setSearchSales(e.target.value)}
                    className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl h-9 text-sm w-36"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl h-9 text-sm w-36"
                    placeholder="To"
                  />
                  <Button onClick={handleSearchSales} variant="secondary" className="rounded-xl h-9 text-sm">
                    <Search className="h-3.5 w-3.5 mr-1.5" />Filter
                  </Button>
                  <Button onClick={exportSalesCSV} variant="outline" className="rounded-xl h-9 text-sm">
                    <Download className="h-3.5 w-3.5 mr-1.5" />Export
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : sales.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No sales recorded"
                description="Complete your first pharmacy sale to see it here."
              />
            ) : (
              <div className="overflow-hidden border-t border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6 w-8"></TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Doctor</TableHead>
                      <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Items</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Payment</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale, index) => (
                      <AnimatePresence key={sale.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                          className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                          onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                        >
                          <TableCell className="pl-6 w-8">
                            {expandedSaleId === sale.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(sale.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {sale.patientName?.[0]?.toUpperCase() || "W"}
                              </div>
                              <span className="text-sm font-medium text-foreground">{sale.patientName || "Walk-in"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{sale.doctorName || "--"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="rounded-full bg-muted/80 text-muted-foreground text-[11px] font-semibold px-2.5 min-w-[28px] justify-center">
                              {sale.items.length}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1 ${paymentMethodIcons[sale.paymentMode] || "bg-muted text-muted-foreground"}`}>
                              {paymentMethodLabels[sale.paymentMode] || sale.paymentMode}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(sale.totalAmount)}</span>
                          </TableCell>
                        </motion.tr>

                        {/* Expanded sale items */}
                        {expandedSaleId === sale.id && (
                          <motion.tr
                            key={`${sale.id}-details`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-muted/10"
                          >
                            <TableCell colSpan={7} className="px-6 py-3">
                              <div className="rounded-xl bg-muted/30 border border-border/30 overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-border/30">
                                      <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Medicine</th>
                                      <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Qty</th>
                                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Price</th>
                                      <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sale.items.map((si) => (
                                      <tr key={si.id} className="border-b border-border/20 last:border-0">
                                        <td className="text-sm text-foreground px-4 py-2">{si.itemName}</td>
                                        <td className="text-sm text-muted-foreground text-center px-4 py-2 tabular-nums">{si.quantity}</td>
                                        <td className="text-sm text-muted-foreground text-right px-4 py-2 tabular-nums">{formatCurrency(si.price)}</td>
                                        <td className="text-sm font-medium text-foreground text-right px-4 py-2 tabular-nums">{formatCurrency(si.total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </TableCell>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* ==================== Add Medicine Dialog ==================== */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Medicine</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Add a new medicine to pharmacy inventory</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medicine Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-10" placeholder="e.g. Amoxicillin 500mg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generic Name</Label>
                <Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="rounded-xl h-10" placeholder="e.g. Amoxicillin" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl h-10" placeholder="e.g. Antibiotics" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch No</Label>
                <Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="rounded-xl h-10" placeholder="e.g. BTN-2024-001" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</Label>
                <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Stock</Label>
                <Input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRP</Label>
                <Input type="number" step="0.01" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="rounded-xl h-10" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Price</Label>
                <Input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="rounded-xl h-10" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="rounded-xl h-10" placeholder="Supplier name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rack Location</Label>
                <Input value={form.rackLocation} onChange={(e) => setForm({ ...form, rackLocation: e.target.value })} className="rounded-xl h-10" placeholder="e.g. A-3" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddItemDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[120px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Add Medicine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Edit Medicine Dialog ==================== */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Edit3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Edit Medicine</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Update medicine details</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medicine Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generic Name</Label>
                <Input value={form.genericName} onChange={(e) => setForm({ ...form, genericName: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch No</Label>
                <Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</Label>
                <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Stock</Label>
                <Input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MRP</Label>
                <Input type="number" step="0.01" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Price</Label>
                <Input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rack Location</Label>
                <Input value={form.rackLocation} onChange={(e) => setForm({ ...form, rackLocation: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditItemDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 min-w-[120px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Update Medicine"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Add Stock Dialog ==================== */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Add Stock</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedItem?.name}</p>
              </div>
            </div>
          </DialogHeader>
          {selectedItem && (
            <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Current stock</span>
              <span className={`text-sm font-bold ${selectedItem.quantity <= selectedItem.minStock ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                {selectedItem.quantity} units
              </span>
            </div>
          )}
          <form onSubmit={handleAddStock} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity *</Label>
                <Input type="number" min="1" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required className="rounded-xl h-10" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purchase Price</Label>
                <Input type="number" step="0.01" value={stockForm.purchasePrice} onChange={(e) => setStockForm({ ...stockForm, purchasePrice: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch No</Label>
                <Input value={stockForm.batchNo} onChange={(e) => setStockForm({ ...stockForm, batchNo: e.target.value })} className="rounded-xl h-10" placeholder="Batch number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</Label>
                <Input type="date" value={stockForm.expiryDate} onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })} className="rounded-xl h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</Label>
              <Input value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} className="rounded-xl h-10" placeholder="Supplier name" />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddStockDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Add Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
