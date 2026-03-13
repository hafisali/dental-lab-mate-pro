"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, CreditCard, Loader2, FileText, Wallet, DollarSign } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Invoices, payments & ledger</p>
        </div>
        <Button onClick={() => setPaymentDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="h-4 w-4 mr-2" />Record Payment
        </Button>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoiced</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}</p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Receipt className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Received</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalReceived)}</p>
              </div>
              <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CreditCard className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalReceivable)}</p>
              </div>
              <div className="bg-red-50 text-red-600 p-2.5 rounded-xl"><Wallet className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="bg-slate-100 rounded-xl p-1">
          <TabsTrigger value="invoices" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <Receipt className="h-4 w-4 mr-1.5" />Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <CreditCard className="h-4 w-4 mr-1.5" />Payments
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <FileText className="h-4 w-4 mr-1.5" />Dentist Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-6">
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
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Case</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell className="font-semibold text-sky-600 text-sm">{inv.invoiceNumber}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-slate-500">{formatDate(inv.createdAt)}</TableCell>
                          <TableCell>
                            {inv.dentist?.id ? (
                              <Link href={`/dentists/${inv.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                                {inv.dentist.name}
                              </Link>
                            ) : <span className="text-slate-400">{inv.dentist?.name || "-"}</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {inv.case?.id ? (
                              <Link href={`/cases/${inv.case.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                                {inv.case.caseNumber}
                              </Link>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(inv.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{inv.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm text-slate-700">{formatCurrency(inv.total)}</TableCell>
                        </TableRow>
                      ))}
                      {invoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Receipt className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                            <p className="font-medium text-slate-500">No invoices</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-sky-50/30 transition-colors">
                        <TableCell className="text-sm text-slate-500">{formatDate(p.date)}</TableCell>
                        <TableCell>
                          {p.dentist?.id ? (
                            <Link href={`/dentists/${p.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                              {p.dentist.name}
                            </Link>
                          ) : <span className="text-slate-400">{p.dentist?.name || "-"}</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="rounded-full text-xs">{p.method}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">{p.reference || "-"}</TableCell>
                        <TableCell className="text-right font-semibold text-sm text-green-600">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <CreditCard className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                          <p className="font-medium text-slate-500">No payments</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentists.map((d) => {
                      const initials = d.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "D";
                      return (
                        <TableRow key={d.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {initials}
                              </div>
                              <Link href={`/dentists/${d.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">
                                {d.name}
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-slate-500">{d.clinicName || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2.5">{d._count?.cases || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold text-sm ${d.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                              {formatCurrency(d.balance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Dentist *</Label>
              <Select value={payForm.dentistId} onValueChange={(v) => setPayForm({ ...payForm, dentistId: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance)})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Amount *</Label><Input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required className="rounded-xl" /></div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Method</Label>
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
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Reference</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction ID, cheque no., etc." className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Notes</Label><Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className="rounded-xl" /></div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
