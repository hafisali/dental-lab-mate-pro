"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Receipt, CreditCard, Loader2, FileText, Wallet, Search,
  ArrowUpRight, ArrowDownRight, Filter, X, Banknote, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getStatusDot, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI Transfer",
  BANK: "Bank Transfer",
  ONLINE: "Online Payment",
  CHEQUE: "Cheque",
};

const paymentMethodIcons: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  UPI: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
  BANK: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  ONLINE: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  CHEQUE: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
};

type InvoiceStatusFilter = "all" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "PARTIAL";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("all");
  const [searchInvoice, setSearchInvoice] = useState("");
  const [payForm, setPayForm] = useState({
    dentistId: "", amount: "", method: "CASH", reference: "", notes: "", invoiceId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/billing").then((r) => r.json()),
      fetch("/api/billing?type=payments").then((r) => r.json()),
      fetch("/api/dentists").then((r) => r.json()),
    ]).then(([inv, pay, den]) => {
      setInvoices(Array.isArray(inv) ? inv : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setDentists(Array.isArray(den) ? den : []);
      setLoading(false);
    });
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payForm.dentistId || !payForm.amount) { toast.error("Dentist and amount required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payForm, type: "payment", amount: Number(payForm.amount) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Payment recorded!");
      setPaymentDialogOpen(false);
      setPayForm({ dentistId: "", amount: "", method: "CASH", reference: "", notes: "", invoiceId: "" });
      const [inv, pay] = await Promise.all([
        fetch("/api/billing").then((r) => r.json()),
        fetch("/api/billing?type=payments").then((r) => r.json()),
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setPayments(Array.isArray(pay) ? pay : []);
    } catch { toast.error("Failed to record payment"); } finally { setSaving(false); }
  };

  const totalReceivable = dentists.reduce((sum, d) => sum + (d.balance || 0), 0);
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const paidCount = invoices.filter((i) => i.status === "PAID").length;

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }
    if (searchInvoice.trim()) {
      const q = searchInvoice.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.dentist?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, statusFilter, searchInvoice]);

  const statusFilters: { label: string; value: InvoiceStatusFilter; count?: number }[] = [
    { label: "All", value: "all", count: invoices.length },
    { label: "Draft", value: "DRAFT", count: invoices.filter((i) => i.status === "DRAFT").length },
    { label: "Sent", value: "SENT", count: invoices.filter((i) => i.status === "SENT").length },
    { label: "Paid", value: "PAID", count: paidCount },
    { label: "Overdue", value: "OVERDUE", count: overdueCount },
    { label: "Partial", value: "PARTIAL", count: invoices.filter((i) => i.status === "PARTIAL").length },
  ];

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Billing" subtitle="Invoices, payments & financial overview">
        <Button onClick={() => setPaymentDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Record Payment
        </Button>
      </PageHeader>

      {/* Financial Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={totalInvoiced} format={formatCurrency} icon={Receipt} color="indigo" delay={0.05} />
        <StatCard title="Received" value={totalReceived} format={formatCurrency} icon={CreditCard} color="emerald" delay={0.1} />
        <StatCard title="Outstanding" value={totalReceivable} format={formatCurrency} icon={Wallet} color="amber" delay={0.15} />
        <StatCard title="Overdue" value={overdueCount} icon={AlertCircle} color="rose" delay={0.2} />
      </div>

      {/* Main Content Tabs */}
      <GlassCard hover="none" delay={0.25} padding="p-0">
        <Tabs defaultValue="invoices" className="w-full">
          <div className="px-6 pt-5 pb-0">
            <TabsList className="bg-muted/50 rounded-xl p-1 h-auto">
              <TabsTrigger value="invoices" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <Receipt className="h-4 w-4 mr-1.5" />Invoices
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <CreditCard className="h-4 w-4 mr-1.5" />Payments
              </TabsTrigger>
              <TabsTrigger value="ledger" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm px-4 py-2">
                <FileText className="h-4 w-4 mr-1.5" />Ledger
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-0 pt-4">
            {/* Filters bar */}
            <div className="px-6 pb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchInvoice}
                    onChange={(e) => setSearchInvoice(e.target.value)}
                    className="pl-9 rounded-xl border-border/50 bg-background/50 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      statusFilter === f.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {f.label}
                    {f.count !== undefined && f.count > 0 && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0 ${
                        statusFilter === f.value ? "bg-white/20" : "bg-muted"
                      }`}>
                        {f.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <TableSkeleton />
            ) : filteredInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={statusFilter !== "all" ? "No invoices match this filter" : "No invoices yet"}
                description={statusFilter !== "all" ? "Try a different filter or search term" : "Invoices will appear here when cases are billed"}
              />
            ) : (
              <div className="overflow-hidden border-t border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Invoice</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden md:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Case</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredInvoices.map((inv, index) => (
                        <motion.tr
                          key={inv.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                          className="group border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                          onClick={() => inv.case?.id && (window.location.href = `/cases/${inv.case.id}`)}
                        >
                          <TableCell className="pl-6">
                            {inv.case?.id ? (
                              <Link href={`/cases/${inv.case.id}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                                {inv.invoiceNumber}
                              </Link>
                            ) : (
                              <span className="font-semibold text-sm text-foreground">{inv.invoiceNumber}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                          <TableCell>
                            {inv.dentist?.id ? (
                              <Link href={`/dentists/${inv.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                                {inv.dentist.name}
                              </Link>
                            ) : <span className="text-muted-foreground/40">{inv.dentist?.name || "--"}</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {inv.case?.id ? (
                              <Link href={`/cases/${inv.case.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                                {inv.case.caseNumber}
                              </Link>
                            ) : <span className="text-muted-foreground/40">--</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(inv.status)} ring-2 ring-offset-1 ring-offset-card ${
                                inv.status === "OVERDUE" ? "ring-red-200 dark:ring-red-900" :
                                inv.status === "PAID" ? "ring-emerald-200 dark:ring-emerald-900" :
                                "ring-transparent"
                              }`} />
                              <Badge className={`${getStatusColor(inv.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{inv.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <span className={`font-semibold text-sm ${
                              inv.status === "PAID" ? "text-emerald-600 dark:text-emerald-400" :
                              inv.status === "OVERDUE" ? "text-red-600 dark:text-red-400" :
                              "text-foreground"
                            }`}>
                              {formatCurrency(inv.total)}
                            </span>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-0 pt-4">
            {loading ? (
              <TableSkeleton />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments recorded"
                description="Record your first payment to see it here"
                action={{ label: "Record Payment", onClick: () => setPaymentDialogOpen(true) }}
              />
            ) : (
              <div className="overflow-hidden border-t border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Date</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reference</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, index) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                        className="border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                      >
                        <TableCell className="pl-6 text-sm text-muted-foreground">{formatDate(p.date)}</TableCell>
                        <TableCell>
                          {p.dentist?.id ? (
                            <Link href={`/dentists/${p.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                              {p.dentist.name}
                            </Link>
                          ) : <span className="text-muted-foreground/40">{p.dentist?.name || "--"}</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1 ${paymentMethodIcons[p.method] || "bg-muted text-muted-foreground"}`}>
                            {paymentMethodLabels[p.method] || p.method}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground font-mono">{p.reference || "--"}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className="inline-flex items-center gap-1 font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                            <ArrowDownRight className="h-3 w-3" />
                            {formatCurrency(p.amount)}
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Ledger Tab */}
          <TabsContent value="ledger" className="mt-0 pt-4">
            {loading ? (
              <TableSkeleton />
            ) : dentists.length === 0 ? (
              <EmptyState icon={FileText} title="No dentists" description="Add dentists to see their ledger here" />
            ) : (
              <div className="overflow-hidden border-t border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Dentist</TableHead>
                      <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clinic</TableHead>
                      <TableHead className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentists.map((d, index) => (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                        className="group border-b border-border/20 hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
                        onClick={() => window.location.href = `/dentists/${d.id}`}
                      >
                        <TableCell className="pl-6">
                          <Link href={`/dentists/${d.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ring-2 ring-white/10">
                              {getInitials(d.name || "D")}
                            </div>
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {d.name}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{d.clinicName || "--"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full bg-muted/80 text-muted-foreground text-[11px] font-semibold px-2.5 min-w-[28px] justify-center">
                            {d._count?.cases || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span className={`inline-flex items-center gap-1 font-semibold text-sm ${d.balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {d.balance > 0 ? <ArrowUpRight className="h-3 w-3" /> : d.balance < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                            {formatCurrency(Math.abs(d.balance))}
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </GlassCard>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">Record Payment</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Log a payment from a dentist</p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist *</Label>
              <Select value={payForm.dentistId} onValueChange={(v) => setPayForm({ ...payForm, dentistId: v })}>
                <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        {d.name}
                        <span className="text-xs text-muted-foreground">{formatCurrency(d.balance)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount *</Label>
                <Input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="rounded-xl h-10" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</Label>
              <Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction ID, cheque no., etc." className="rounded-xl h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</Label>
              <Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className="rounded-xl resize-none" placeholder="Optional notes..." />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {saving ? "Saving..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
