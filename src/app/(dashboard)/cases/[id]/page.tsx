"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  FileText,
  Download,
  Clock,
  CheckCircle2,
  FolderOpen,
  MessageCircle,
  Check,
  Phone,
  Building2,
  Palette,
  Wrench,
  Layers,
  Hash,
  IndianRupee,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getPriorityColor,
  getStatusDot,
  getInitials,
} from "@/lib/utils";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";
import toast from "react-hot-toast";

const STATUS_FLOW = ["RECEIVED", "WORKING", "TRIAL", "FINISHED", "DELIVERED"];

const statusLabels: Record<string, string> = {
  RECEIVED: "Received",
  WORKING: "Working",
  TRIAL: "Trial",
  FINISHED: "Finished",
  DELIVERED: "Delivered",
};

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-2xl bg-card border border-border/50 p-6">
        <Skeleton className="h-5 w-32 rounded-lg mb-5" />
        <div className="flex items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              {i < 4 && <Skeleton className="flex-1 h-0.5 mx-3 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card border border-border/50 p-6">
          <Skeleton className="h-5 w-28 rounded-lg mb-5" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-card border border-border/50 p-6">
            <Skeleton className="h-5 w-20 rounded-lg mb-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border/50 p-6">
            <Skeleton className="h-5 w-20 rounded-lg mb-4" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cases/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setCaseData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/cases/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCaseData((prev: any) => ({ ...prev, ...updated }));
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return <CaseDetailSkeleton />;
  }

  if (!caseData || caseData.error) {
    return (
      <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        <EmptyState
          icon={FolderOpen}
          title="Case not found"
          description="The case you are looking for does not exist or has been removed."
          action={{ label: "Back to Cases", onClick: () => router.push("/cases") }}
        />
      </div>
    );
  }

  const currentStatusIndex = STATUS_FLOW.indexOf(caseData.status);

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <Link href="/cases">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {caseData.caseNumber}
          </h1>
          <Badge
            className={`${getStatusColor(caseData.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
            variant="secondary"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${getStatusDot(caseData.status)} mr-1.5 inline-block`}
            />
            {caseData.status}
          </Badge>
          <Badge
            className={`${getPriorityColor(caseData.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}
            variant="secondary"
          >
            {caseData.priority}
          </Badge>
        </div>
      </motion.div>

      {/* Status Timeline */}
      <GlassCard hover="none" delay={0.05}>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-5">
          Status Progress
        </h3>
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((status, idx) => {
            const isCompleted = currentStatusIndex > idx;
            const isCurrent = currentStatusIndex === idx;
            const isFuture = currentStatusIndex < idx;

            return (
              <div key={status} className="flex items-center flex-1">
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 + idx * 0.07 }}
                  onClick={() => updateStatus(status)}
                  className="flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105 group"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCompleted
                        ? "bg-indigo-500 text-white"
                        : isCurrent
                        ? "bg-indigo-500 text-white ring-4 ring-indigo-500/20"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-[11px] font-semibold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium transition-colors ${
                      isCompleted || isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {statusLabels[status]}
                  </span>
                </motion.button>
                {idx < STATUS_FLOW.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                      currentStatusIndex > idx ? "bg-indigo-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Case Details */}
        <GlassCard hover="none" delay={0.1}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Case Details
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Work Type
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.workType}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Material
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.material || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Shade
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.shade || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Teeth
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.teethNumbers?.join(", ") || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Due Date
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.dueDate ? formatDate(caseData.dueDate) : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Technician
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                {caseData.technician?.name || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Amount
              </p>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                {formatCurrency(caseData.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Date
              </p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(caseData.date)}
              </p>
            </div>
          </div>

          {caseData.remarks && (
            <div className="mt-5 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Remarks
              </p>
              <p className="text-sm text-foreground bg-muted/50 rounded-xl p-3">
                {caseData.remarks}
              </p>
            </div>
          )}
        </GlassCard>

        {/* Right column */}
        <div className="space-y-6">
          {/* Dentist card */}
          <GlassCard hover="none" delay={0.15}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Dentist
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {getInitials(caseData.dentist?.name || "")}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dentists/${caseData.dentist?.id}`}
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {caseData.dentist?.name}
                </Link>
                {caseData.dentist?.clinicName && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {caseData.dentist.clinicName}
                  </p>
                )}
                {caseData.dentist?.phone && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {caseData.dentist.phone}
                  </p>
                )}
                {(caseData.dentist?.whatsapp || caseData.dentist?.phone) && (
                  <a
                    href={getWhatsAppUrl(
                      caseData.dentist.whatsapp || caseData.dentist.phone,
                      messageTemplates.statusUpdate(
                        caseData.dentist.name,
                        caseData.caseNumber,
                        caseData.status
                      )
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Notify via WhatsApp
                  </a>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Patient card */}
          {caseData.patient && (
            <GlassCard hover="none" delay={0.2}>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Patient
              </h3>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {getInitials(caseData.patient.name || "")}
                </div>
                <div>
                  <Link
                    href={`/patients/${caseData.patient.id}`}
                    className="font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {caseData.patient.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {caseData.patient.age ? `${caseData.patient.age} yrs` : ""}
                    {caseData.patient.age && caseData.patient.gender ? " / " : ""}
                    {caseData.patient.gender || ""}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Attachments */}
      {caseData.files?.length > 0 && (
        <GlassCard hover="none" delay={0.25}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Attachments ({caseData.files.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {caseData.files.map((f: any) => (
              <div
                key={f.id}
                className="group flex items-center justify-between rounded-xl bg-muted/50 p-3 hover:bg-muted transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-card border border-border/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[200px] text-foreground">
                      {f.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(f.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <a href={f.filePath} target="_blank" rel="noreferrer">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
