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
  ArrowLeft, Phone, User, Stethoscope, FileText, AlertCircle, Loader2,
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Patient not found"}</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const agg = patient._aggregates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{patient.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {[patient.age && `${patient.age} yrs`, patient.gender].filter(Boolean).join(" · ") || "Patient"}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Patient Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Patient Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.notes && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{patient.notes}</p>
              </>
            )}
            {!patient.phone && !patient.notes && (
              <p className="text-sm text-muted-foreground">No additional info</p>
            )}
          </CardContent>
        </Card>

        {/* Dentist Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Referring Dentist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/dentists/${patient.dentist?.id}`} className="font-medium text-sky-600 hover:underline">
              {patient.dentist?.name}
            </Link>
            {patient.dentist?.clinicName && (
              <p className="text-sm text-muted-foreground">{patient.dentist.clinicName}</p>
            )}
            {patient.dentist?.phone && (
              <p className="text-sm text-muted-foreground">{patient.dentist.phone}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold">{agg.totalCases}</p>
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
                <p className="text-sm text-muted-foreground">Total Cases Value</p>
                <p className="text-2xl font-bold">{formatCurrency(agg.totalCasesValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cases ({agg.totalCases})</CardTitle>
        </CardHeader>
        <CardContent>
          {patient.cases?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Dentist</TableHead>
                  <TableHead>Work Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.cases.map((c: any) => (
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
                      {c.dentist?.id ? (
                        <Link href={`/dentists/${c.dentist.id}`} className="text-sky-600 hover:underline">
                          {c.dentist.name}
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
        </CardContent>
      </Card>
    </div>
  );
}
