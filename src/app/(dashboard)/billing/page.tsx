"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, CreditCard, Loader2, FileText, Wallet } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getStatusDot, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
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

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Billing" subtitle="Invoices, payments & ledger">
        <Button onClick={() => setPaymentDialogOpen(true)} className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Record Payment
        </Button>
      </PageHeader>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Invoiced" value={totalInvoiced} format={formatCurrency} icon={Receipt} color="indigo" delay={0.1} />
        <StatCard title="Total Received" value={totalReceived} format={formatCurrency} icon={CreditCard} color="emerald" delay={0.2} />
        <StatCard title="Outstanding Balance" value={totalReceivable} format={formatCurrency} icon={Wallet} color="rose" delay={0.3} />
      </div>

      <GlassCard hover="none" delay={0.4}>
        <Tabs defaultValue="invoices">
          <TabsList className="bg-muted rounded-xl p-1">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <Receipt className="h-4 w-4 mr-1.5" />Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <CreditCard className="h-4 w-4 mr-1.5" />Payments
            </TabsTrigger>
            <TabsTrigger value="ledger" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <FileText className="h-4 w-4 mr-1.5" />Dentist Ledger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            {loading ? (
              <TableSkeleton />
            ) : invoices.length === 0 ? (
              <EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here when cases are billed" />
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv, index) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell className="font-semibold text-primary text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                        <TableCell>
                          {inv.dentist?.id ? (
                            <Link href={`/dentists/${inv.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                              {inv.dentist.name}
                            </Link>
                          ) : <span className="text-muted-foreground/50">{inv.dentist?.name || "-"}</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {inv.case?.id ? (
                            <Link href={`/cases/${inv.case.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                              {inv.case.caseNumber}
                            </Link>
                          ) : <span className="text-muted-foreground/50">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${getStatusDot(inv.status)}`} />
                            <Badge className={`${getStatusColor(inv.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{inv.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm text-foreground">{formatCurrency(inv.total)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {loading ? (
              <TableSkeleton />
            ) : payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments"
                description="Record your first payment to see it here"
                action={{ label: "Record Payment", onClick: () => setPaymentDialogOpen(true) }}
              />
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, index) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.date)}</TableCell>
                        <TableCell>
                          {p.dentist?.id ? (
                            <Link href={`/dentists/${p.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                              {p.dentist.name}
                            </Link>
                          ) : <span className="text-muted-foreground/50">{p.dentist?.name || "-"}</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full text-xs border-border/50">
                            {paymentMethodLabels[p.method] || p.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{p.reference || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-sm text-emerald-600">{formatCurrency(p.amount)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ledger" className="mt-4">
            {loading ? (
              <TableSkeleton />
            ) : dentists.length === 0 ? (
              <EmptyState icon={FileText} title="No dentists" description="Add dentists to see their ledger here" />
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clinic</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</TableHead>
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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(d.name || "D")}
                            </div>
                            <Link href={`/dentists/${d.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                              {d.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{d.clinicName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2.5">{d._count?.cases || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold text-sm ${d.balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {formatCurrency(d.balance)}
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-foreground">Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Dentist *</Label>
              <Select value={payForm.dentistId} onValueChange={(v) => setPayForm({ ...payForm, dentistId: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance)})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Amount *</Label><Input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
            <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Reference</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction ID, cheque no., etc." className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium text-foreground">Notes</Label><Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
