"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Phone, User, Stethoscope, FolderOpen, DollarSign, AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function DetailSkeleton() {
  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
        <Skeleton className="h-16 w-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-4 w-32 bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}

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
    return <DetailSkeleton />;
  }

  if (error || !patient) {
    return (
      <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-muted-foreground font-medium">{error || "Patient not found"}</p>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">Go Back</Button>
        </div>
      </div>
    );
  }

  const agg = patient._aggregates;

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 rounded-xl hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/25 flex-shrink-0">
            {getInitials(patient.name || "P")}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {[patient.age && `${patient.age} yrs`, patient.gender].filter(Boolean).join(" -- ") || "Patient"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard hover="none" delay={0.1}>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50"><User className="h-4 w-4 text-blue-500 dark:text-blue-400" /></div>
            Patient Info
          </h3>
          <div className="space-y-3">
            {patient.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{patient.phone}</span>
              </div>
            )}
            {patient.notes && (
              <>
                <Separator className="bg-border/50" />
                <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3 border border-border/50">{patient.notes}</p>
              </>
            )}
            {!patient.phone && !patient.notes && (
              <p className="text-sm text-muted-foreground text-center py-4">No additional info</p>
            )}
          </div>
        </GlassCard>

        <GlassCard hover="none" delay={0.15}>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50"><Stethoscope className="h-4 w-4 text-purple-500 dark:text-purple-400" /></div>
            Referring Dentist
          </h3>
          <div className="p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
            <Link href={`/dentists/${patient.dentist?.id}`} className="font-semibold text-primary hover:text-primary/80 transition-colors">
              {patient.dentist?.name}
            </Link>
            {patient.dentist?.clinicName && (
              <p className="text-sm text-muted-foreground mt-0.5">{patient.dentist.clinicName}</p>
            )}
            {patient.dentist?.phone && (
              <p className="text-sm text-muted-foreground">{patient.dentist.phone}</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Cases" value={agg.totalCases} icon={FolderOpen} color="indigo" delay={0.2} />
        <StatCard title="Total Value" value={agg.totalCasesValue} format={formatCurrency} icon={DollarSign} color="emerald" delay={0.3} />
      </div>

      {/* Cases Table */}
      <GlassCard hover="none" delay={0.4}>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
          <FolderOpen className="h-4 w-4 text-primary" />
          Cases ({agg.totalCases})
        </h3>
        {patient.cases?.length > 0 ? (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case #</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.cases.map((c: any, index: number) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                        {c.caseNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(c.date || c.createdAt)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.dentist?.id ? (
                        <Link href={`/dentists/${c.dentist.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                          {c.dentist.name}
                        </Link>
                      ) : <span className="text-muted-foreground/50">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{c.workType || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-foreground">
                      {formatCurrency(c.amount || 0)}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={FolderOpen} title="No cases found" description="Cases for this patient will appear here" />
        )}
      </GlassCard>
    </div>
  );
}
