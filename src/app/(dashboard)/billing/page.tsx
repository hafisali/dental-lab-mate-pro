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
import { Plus, Receipt, CreditCard, Loader2 } from "lucide-react";
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
      // Refresh
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
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground text-sm">Invoices, payments & ledger</p>
        </div>
        <Button onClick={() => setPaymentDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Record Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="text-2xl font-bold">{formatCurrency(invoices.reduce((s, i) => s + i.total, 0))}</p></div>
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Receipt className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p></div>
              <div className="bg-green-50 text-green-600 p-3 rounded-xl"><CreditCard className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalReceivable)}</p></div>
              <div className="bg-red-50 text-red-600 p-3 rounded-xl"><Receipt className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="ledger">Dentist Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead>Dentist</TableHead>
                      <TableHead className="hidden md:table-cell">Case</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
                        <TableCell>
                          {inv.dentist?.id ? (
                            <Link href={`/dentists/${inv.dentist.id}`} className="text-sky-600 hover:underline">
                              {inv.dentist.name}
                            </Link>
                          ) : inv.dentist?.name || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{inv.case?.caseNumber || "-"}</TableCell>
                        <TableCell><Badge className={getStatusColor(inv.status)} variant="secondary">{inv.status}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dentist</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="hidden sm:table-cell">Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{formatDate(p.date)}</TableCell>
                      <TableCell>
                        {p.dentist?.id ? (
                          <Link href={`/dentists/${p.dentist.id}`} className="text-sky-600 hover:underline">
                            {p.dentist.name}
                          </Link>
                        ) : p.dentist?.name || "-"}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{p.method}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell">{p.reference || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{formatCurrency(p.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dentist</TableHead>
                    <TableHead className="hidden sm:table-cell">Clinic</TableHead>
                    <TableHead className="text-center">Cases</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dentists.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dentists/${d.id}`} className="text-sky-600 hover:underline">
                          {d.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{d.clinicName || "-"}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">{d._count?.cases || 0}</Badge></TableCell>
                      <TableCell className="text-right">
                        <span className={d.balance > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                          {formatCurrency(d.balance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Dentist *</Label>
              <Select value={payForm.dentistId} onValueChange={(v) => setPayForm({ ...payForm, dentistId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Dentist" /></SelectTrigger>
                <SelectContent>
                  {dentists.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name} ({formatCurrency(d.balance)})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Transaction ID, cheque no., etc." /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
