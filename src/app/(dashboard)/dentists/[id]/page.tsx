"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Building2, Phone, MessageCircle, Mail, MapPin,
  DollarSign, CreditCard, AlertCircle, FileText, Users, Loader2,
  FolderOpen, Wallet,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function DentistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dentist, setDentist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDentist = async () => {
      try {
        const res = await fetch(`/api/dentists/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setDentist(data);
      } catch {
        setError("Dentist not found");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchDentist();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  if (error || !dentist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">{error || "Dentist not found"}</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  const agg = dentist._aggregates;
  const initials = dentist.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "D";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-sky-500/20 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{dentist.name}</h1>
              <Badge variant={dentist.active ? "default" : "secondary"} className={`rounded-full text-xs ${dentist.active ? 'bg-green-100 text-green-700 border border-green-200' : ''}`}>
                {dentist.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {dentist.clinicName && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                <Building2 className="h-3.5 w-3.5" />{dentist.clinicName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dentist.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-blue-50"><Phone className="h-4 w-4 text-blue-500" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Phone</p><p className="text-sm font-medium text-slate-700">{dentist.phone}</p></div>
              </div>
            )}
            {(dentist.whatsapp || dentist.phone) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-green-50"><MessageCircle className="h-4 w-4 text-green-500" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">WhatsApp</p>
                  <a
                    href={getWhatsAppUrl(dentist.whatsapp || dentist.phone, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-medium transition-colors"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Open Chat
                  </a>
                </div>
              </div>
            )}
            {dentist.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-amber-50"><Mail className="h-4 w-4 text-amber-500" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Email</p><p className="text-sm font-medium text-slate-700">{dentist.email}</p></div>
              </div>
            )}
            {dentist.address && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="p-2 rounded-lg bg-purple-50"><MapPin className="h-4 w-4 text-purple-500" /></div>
                <div><p className="text-xs text-slate-400 font-medium">Address</p><p className="text-sm font-medium text-slate-700">{dentist.address}</p></div>
              </div>
            )}
          </div>
          {dentist.notes && (
            <>
              <Separator className="my-4 bg-slate-100" />
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">{dentist.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cases Value</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(agg.totalCasesValue)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-sky-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Received</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(agg.totalPayments)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding Balance</p>
                <p className={`text-2xl font-bold mt-1 ${agg.outstandingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(agg.outstandingBalance)}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-red-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardContent className="pt-6">
          <Tabs defaultValue="cases">
            <TabsList className="bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="cases" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
                <FolderOpen className="h-4 w-4 mr-1.5" />Cases ({agg.totalCases})
              </TabsTrigger>
              <TabsTrigger value="patients" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
                <Users className="h-4 w-4 mr-1.5" />Patients ({agg.totalPatients})
              </TabsTrigger>
              <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
                <CreditCard className="h-4 w-4 mr-1.5" />Payments ({dentist.payments?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cases" className="mt-4">
              {dentist.cases?.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dentist.cases.map((c: any) => (
                        <TableRow key={c.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell>
                            <Link href={`/cases/${c.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">
                              {c.caseNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                            {formatDate(c.date || c.createdAt)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {c.patient?.id ? (
                              <Link href={`/patients/${c.patient.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                                {c.patient.name}
                              </Link>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{c.workType || "-"}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm text-slate-700">
                            {formatCurrency(c.amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground font-medium">No cases found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patients" className="mt-4">
              {dentist.patients?.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Age</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Cases</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dentist.patients.map((p: any) => {
                        const pi = p.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "P";
                        return (
                          <TableRow key={p.id} className="hover:bg-sky-50/30 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {pi}
                                </div>
                                <Link href={`/patients/${p.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">
                                  {p.name}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-slate-500">{p.phone || "-"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-500">{p.age || "-"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-slate-500">{p.gender || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-2.5">{p._count?.cases || 0}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground font-medium">No patients found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {dentist.payments?.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dentist.payments.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-sky-50/30 transition-colors">
                          <TableCell className="text-sm text-slate-500">{formatDate(p.date)}</TableCell>
                          <TableCell className="font-semibold text-green-600 text-sm">{formatCurrency(p.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="rounded-full text-xs">{p.method}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-slate-500">{p.invoice?.invoiceNumber || "-"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-slate-500">{p.reference || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-muted-foreground font-medium">No payments recorded</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
