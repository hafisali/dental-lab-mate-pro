"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Phone, User, Stethoscope, FolderOpen, DollarSign, AlertCircle,
  Calendar, Hash, ChevronRight, FileText,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const avatarGradients = [
  "from-indigo-400 to-violet-600",
  "from-blue-400 to-cyan-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-fuchsia-400 to-purple-600",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
        <Skeleton className="h-20 w-20 rounded-2xl bg-muted" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-48 bg-muted" />
          <Skeleton className="h-4 w-32 bg-muted" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-6 w-20 rounded-full bg-muted" />
            <Skeleton className="h-6 w-24 rounded-full bg-muted" />
          </div>
        </div>
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
  const infoItems = [
    patient.phone && { icon: Phone, label: "Phone", value: patient.phone },
    patient.age && { icon: Calendar, label: "Age", value: `${patient.age} years` },
    patient.gender && { icon: User, label: "Gender", value: patient.gender },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlassCard hover="none" delay={0}>
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 rounded-xl hover:bg-accent flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(patient.name)} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg shadow-indigo-500/20 flex-shrink-0 ring-4 ring-white/10`}>
                {getInitials(patient.name || "P")}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{patient.name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Patient Record</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {patient.age && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-lg">
                      <Calendar className="h-3 w-3" />{patient.age} yrs
                    </span>
                  )}
                  {patient.gender && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-lg">
                      <User className="h-3 w-3" />{patient.gender}
                    </span>
                  )}
                  {patient.phone && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-lg">
                      <Phone className="h-3 w-3" />{patient.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Cases" value={agg.totalCases} icon={FolderOpen} color="indigo" delay={0.1} />
        <StatCard title="Total Value" value={agg.totalCasesValue} format={formatCurrency} icon={DollarSign} color="emerald" delay={0.15} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Patient Info */}
        <GlassCard hover="none" delay={0.2}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <User className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
            </div>
            Patient Details
          </h3>
          {infoItems.length > 0 ? (
            <div className="space-y-2">
              {infoItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30 group hover:bg-muted/60 transition-colors">
                  <item.icon className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">{item.label}</span>
                    <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/60 text-center py-6">No additional information</p>
          )}
          {patient.notes && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3 w-3 text-amber-600/60 dark:text-amber-400/60" />
                <span className="text-[11px] text-amber-700/60 dark:text-amber-300/60 uppercase tracking-wider font-medium">Notes</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{patient.notes}</p>
            </div>
          )}
        </GlassCard>

        {/* Dentist */}
        <GlassCard hover="none" delay={0.25}>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50">
              <Stethoscope className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
            </div>
            Referring Dentist
          </h3>
          {patient.dentist ? (
            <Link
              href={`/dentists/${patient.dentist?.id}`}
              className="group block p-4 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {patient.dentist.name}
                  </p>
                  {patient.dentist.clinicName && (
                    <p className="text-sm text-muted-foreground mt-0.5">{patient.dentist.clinicName}</p>
                  )}
                  {patient.dentist.phone && (
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />{patient.dentist.phone}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground/60 text-center py-6">No dentist assigned</p>
          )}
        </GlassCard>
      </div>

      {/* Cases Table */}
      <GlassCard hover="none" delay={0.3} padding="p-0">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <FolderOpen className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            </div>
            Case History
            <Badge variant="secondary" className="rounded-full text-[11px] ml-1 bg-muted/80">{agg.totalCases}</Badge>
          </h3>
        </div>
        {patient.cases?.length > 0 ? (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pl-6">Case #</TableHead>
                  <TableHead className="hidden sm:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                  <TableHead className="hidden md:table-cell text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                  <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patient.cases.map((c: any, index: number) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                    className="group border-b border-border/20 hover:bg-accent/40 transition-colors duration-150"
                  >
                    <TableCell className="pl-6">
                      <Link href={`/cases/${c.id}`} className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                        <Hash className="h-3 w-3 text-primary/50" />
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
                      ) : <span className="text-muted-foreground/40">--</span>}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">{c.workType || "--"}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm text-foreground pr-6">
                      {formatCurrency(c.amount || 0)}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState icon={FolderOpen} title="No cases yet" description="Cases for this patient will appear here when created" />
        )}
      </GlassCard>
    </div>
  );
}
