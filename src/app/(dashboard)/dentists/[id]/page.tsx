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
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dentist) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Dentist not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const agg = dentist._aggregates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{dentist.name}</h1>
          {dentist.clinicName && (
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <Building2 className="h-4 w-4" />{dentist.clinicName}
            </p>
          )}
        </div>
        <Badge variant={dentist.active ? "default" : "secondary"}>
          {dentist.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dentist.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{dentist.phone}</span>
              </div>
            )}
            {dentist.whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <span>{dentist.whatsapp}</span>
              </div>
            )}
            {dentist.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{dentist.email}</span>
              </div>
            )}
            {dentist.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{dentist.address}</span>
              </div>
            )}
          </div>
          {dentist.notes && (
            <>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">{dentist.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cases Value</p>
                <p className="text-2xl font-bold">{formatCurrency(agg.totalCasesValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(agg.totalPayments)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className={`text-2xl font-bold ${agg.outstandingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(agg.outstandingBalance)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Cases / Patients / Payments */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="cases">
            <TabsList>
              <TabsTrigger value="cases">Cases ({agg.totalCases})</TabsTrigger>
              <TabsTrigger value="patients">Patients ({agg.totalPatients})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({dentist.payments?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Cases Tab */}
            <TabsContent value="cases" className="mt-4">
              {dentist.cases?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case #</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="hidden md:table-cell">Patient</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.cases.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/cases/${c.id}`} className="text-sky-600 hover:underline font-medium">
                            {c.caseNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {formatDate(c.date || c.createdAt)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.patient?.id ? (
                            <Link href={`/patients/${c.patient.id}`} className="text-sky-600 hover:underline">
                              {c.patient.name}
                            </Link>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{c.workType || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(c.amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No cases found</p>
              )}
            </TabsContent>

            {/* Patients Tab */}
            <TabsContent value="patients" className="mt-4">
              {dentist.patients?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Age</TableHead>
                      <TableHead className="hidden md:table-cell">Gender</TableHead>
                      <TableHead className="text-center">Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.patients.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <Link href={`/patients/${p.id}`} className="text-sky-600 hover:underline">
                            {p.name}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {p.phone || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.age || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.gender || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{p._count?.cases || 0}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No patients found</p>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              {dentist.payments?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead className="hidden md:table-cell">Invoice</TableHead>
                      <TableHead className="hidden md:table-cell">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.date)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{p.method}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.invoice?.invoiceNumber || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.reference || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No payments recorded</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
