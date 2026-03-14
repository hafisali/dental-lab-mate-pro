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
  Image as ImageIcon,
  FileType,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

const statusGradients: Record<string, string> = {
  RECEIVED: "from-slate-400 to-slate-500",
  WORKING: "from-indigo-500 to-blue-500",
  TRIAL: "from-amber-400 to-orange-500",
  FINISHED: "from-emerald-400 to-green-500",
  DELIVERED: "from-green-400 to-emerald-600",
};

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
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

      <div className="rounded-2xl bg-card border border-border/50 p-6">
        <Skeleton className="h-5 w-32 rounded-lg mb-5" />
        <div className="flex items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              {i < 4 && <Skeleton className="flex-1 h-0.5 mx-3 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6">
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
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/50 p-6">
              <Skeleton className="h-5 w-20 rounded-lg mb-4" />
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
          ))}
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
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

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
      setConfirmStatus(null);
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <CaseDetailSkeleton />;

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

  const isImageFile = (name: string) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);

  const detailItems = [
    { label: "Work Type", value: caseData.workType, icon: Wrench },
    { label: "Material", value: caseData.material || "-", icon: Layers },
    { label: "Shade", value: caseData.shade || "-", icon: Palette },
    { label: "Teeth", value: caseData.teethNumbers?.join(", ") || "-", icon: Hash },
    { label: "Due Date", value: caseData.dueDate ? formatDate(caseData.dueDate) : "-", icon: Calendar },
    { label: "Technician", value: caseData.technician?.name || "-", icon: UserCog },
    { label: "Amount", value: formatCurrency(caseData.amount), icon: IndianRupee, bold: true },
    { label: "Date", value: formatDate(caseData.date), icon: Calendar },
  ];

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <Link href="/cases">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-muted border border-border/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              {caseData.caseNumber}
            </h1>
            <Badge
              className={`${getStatusColor(caseData.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5 shadow-sm`}
              variant="secondary"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${getStatusDot(caseData.status)} mr-1.5 inline-block animate-pulse`}
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
        </div>
      </motion.div>

      {/* Status Timeline - Horizontal with animated progress */}
      <GlassCard hover="none" delay={0.05}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Status Progress
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            Step {currentStatusIndex + 1} of {STATUS_FLOW.length}
          </span>
        </div>
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute top-6 left-6 right-6 h-[2px] bg-border/60 rounded-full" />
          {/* Animated progress line */}
          <motion.div
            className="absolute top-6 left-6 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{
              width: `${currentStatusIndex === 0 ? 0 : (currentStatusIndex / (STATUS_FLOW.length - 1)) * (100 - (12 / 1))}%`,
            }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          />

          {STATUS_FLOW.map((status, idx) => {
            const isCompleted = currentStatusIndex > idx;
            const isCurrent = currentStatusIndex === idx;

            return (
              <motion.button
                key={status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + idx * 0.08 }}
                onClick={() => setConfirmStatus(status)}
                className="flex flex-col items-center gap-2.5 transition-all duration-200 hover:scale-105 group relative z-10"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm ${
                    isCompleted
                      ? `bg-gradient-to-br ${statusGradients[status]} text-white shadow-md`
                      : isCurrent
                      ? `bg-gradient-to-br ${statusGradients[status]} text-white ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/25`
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80 border border-border/50"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-semibold">{idx + 1}</span>
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
            );
          })}
        </div>
      </GlassCard>

      {/* Status Confirmation Dialog */}
      <AnimatePresence>
        {confirmStatus && confirmStatus !== caseData.status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-sm p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Change status to <strong>{statusLabels[confirmStatus]}</strong>?
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmStatus(null)} className="rounded-lg text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => updateStatus(confirmStatus)}
                className="rounded-lg text-xs bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Grid - 3 columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Case Details - spans 2 cols */}
        <GlassCard hover="none" delay={0.1} className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Case Details
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
            {detailItems.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.04 }}
                className="group"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-medium">
                  {item.label}
                </p>
                <p className={`text-sm ${item.bold ? "font-bold" : "font-medium"} text-foreground flex items-center gap-1.5`}>
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>

          {caseData.remarks && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 pt-5 border-t border-border/40"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-medium">
                Remarks
              </p>
              <p className="text-sm text-foreground bg-muted/40 rounded-xl p-4 border border-border/30 leading-relaxed">
                {caseData.remarks}
              </p>
            </motion.div>
          )}
        </GlassCard>

        {/* Right column - Dentist & Patient */}
        <div className="space-y-6">
          {/* Dentist card */}
          <GlassCard hover="glow" delay={0.15}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Dentist
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-indigo-500/20">
                {getInitials(caseData.dentist?.name || "")}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dentists/${caseData.dentist?.id}`}
                  className="font-bold text-foreground hover:text-primary transition-colors text-base"
                >
                  {caseData.dentist?.name}
                </Link>
                {caseData.dentist?.clinicName && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                    {caseData.dentist.clinicName}
                  </p>
                )}
                {caseData.dentist?.phone && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
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
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
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
            <GlassCard hover="glow" delay={0.2}>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Patient
              </h3>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-emerald-500/20">
                  {getInitials(caseData.patient.name || "")}
                </div>
                <div>
                  <Link
                    href={`/patients/${caseData.patient.id}`}
                    className="font-bold text-foreground hover:text-primary transition-colors text-base"
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

      {/* File Gallery */}
      {caseData.files?.length > 0 && (
        <GlassCard hover="none" delay={0.25}>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Attachments
            <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0 ml-1">
              {caseData.files.length}
            </Badge>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {caseData.files.map((f: any, idx: number) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="group relative rounded-xl border border-border/40 bg-muted/30 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-300"
              >
                {/* Thumbnail preview for images */}
                {isImageFile(f.fileName) && (
                  <div className="h-32 bg-muted/50 flex items-center justify-center overflow-hidden">
                    <img
                      src={f.filePath}
                      alt={f.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-card border border-border/50 flex-shrink-0">
                      {isImageFile(f.fileName) ? (
                        <ImageIcon className="h-4 w-4 text-indigo-500" />
                      ) : (
                        <FileType className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[180px] text-foreground">
                        {f.fileName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
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
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
