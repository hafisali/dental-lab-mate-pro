"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Phone, User, Stethoscope, FileText, AlertCircle, FolderOpen, DollarSign,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/patients/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setPatient(data);
      } catch {
        setError("Patient not found");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchPatient();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-muted-foreground font-medium">{error || "Patient not found"}</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  const agg = patient._aggregates;
  const initials = patient.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "P";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 rounded-xl hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-emerald-500/20 flex-shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {[patient.age && `${patient.age} yrs`, patient.gender].filter(Boolean).join(" -- ") || "Patient"}
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50"><User className="h-4 w-4 text-blue-500" /></div>
              Patient Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{patient.phone}</span>
              </div>
            )}
            {patient.notes && (
              <>
                <Separator className="bg-slate-100" />
                <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">{patient.notes}</p>
              </>
            )}
            {!patient.phone && !patient.notes && (
              <p className="text-sm text-muted-foreground text-center py-4">No additional info</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50"><Stethoscope className="h-4 w-4 text-purple-500" /></div>
              Referring Dentist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Link href={`/dentists/${patient.dentist?.id}`} className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                {patient.dentist?.name}
              </Link>
              {patient.dentist?.clinicName && (
                <p className="text-sm text-slate-500 mt-0.5">{patient.dentist.clinicName}</p>
              )}
              {patient.dentist?.phone && (
                <p className="text-sm text-slate-500">{patient.dentist.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cases</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{agg.totalCases}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-sky-50 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Value</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(agg.totalCasesValue)}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-sky-500" />
            Cases ({agg.totalCases})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient.cases?.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patient.cases.map((c: any) => (
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
                        {c.dentist?.id ? (
                          <Link href={`/dentists/${c.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                            {c.dentist.name}
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
        </CardContent>
      </Card>
    </div>
  );
}
