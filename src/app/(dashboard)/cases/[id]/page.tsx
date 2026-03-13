"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, User, Stethoscope, FileText, Download, Clock, CheckCircle2, FolderOpen, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";
import toast from "react-hot-toast";

const STATUS_FLOW = ["RECEIVED", "WORKING", "TRIAL", "FINISHED", "DELIVERED"];

const statusIcons: Record<string, any> = {
  RECEIVED: FolderOpen,
  WORKING: Clock,
  TRIAL: FileText,
  FINISHED: CheckCircle2,
  DELIVERED: CheckCircle2,
};

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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  if (!caseData || caseData.error) {
    return (
      <div className="text-center py-20">
        <FolderOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
        <p className="text-muted-foreground font-medium">Case not found</p>
        <Link href="/cases"><Button variant="outline" className="mt-4 rounded-xl">Back to Cases</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cases">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{caseData.caseNumber}</h1>
              <Badge className={`${getStatusColor(caseData.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                {caseData.status}
              </Badge>
              <Badge className={`${getPriorityColor(caseData.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">
                {caseData.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{caseData.workType}</p>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Status Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((status, idx) => {
              const isActive = STATUS_FLOW.indexOf(caseData.status) >= idx;
              const isCurrent = caseData.status === status;
              const StatusIcon = statusIcons[status] || CheckCircle2;
              return (
                <div key={status} className="flex items-center flex-1">
                  <button
                    onClick={() => updateStatus(status)}
                    className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${isCurrent ? "scale-110" : "hover:scale-105"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isActive
                          ? isCurrent
                            ? "bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/30"
                            : "bg-sky-100 text-sky-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-medium ${
                      isActive
                        ? isCurrent ? "text-sky-600" : "text-sky-500"
                        : "text-slate-400"
                    }`}>
                      {status}
                    </span>
                  </button>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                      STATUS_FLOW.indexOf(caseData.status) > idx ? "bg-sky-300" : "bg-slate-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Case Info */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-500" />
              Case Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Date", value: <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{formatDate(caseData.date)}</span> },
              { label: "Work Type", value: caseData.workType },
              { label: "Shade", value: caseData.shade || "-" },
              { label: "Material", value: caseData.material || "-" },
              { label: "Teeth", value: caseData.teethNumbers?.join(", ") || "-" },
              { label: "Due Date", value: caseData.dueDate ? formatDate(caseData.dueDate) : "-" },
              { label: "Amount", value: <span className="font-bold text-slate-800">{formatCurrency(caseData.amount)}</span> },
            ].map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-slate-700">{item.value}</span>
                </div>
                {i < 6 && <Separator className="bg-slate-100" />}
              </div>
            ))}
            {caseData.remarks && (
              <>
                <Separator className="bg-slate-100" />
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Remarks</span>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-3">{caseData.remarks}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dentist & Patient */}
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              Dentist & Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Link href={`/dentists/${caseData.dentist?.id}`} className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                  {caseData.dentist?.name}
                </Link>
                <p className="text-sm text-slate-500 mt-0.5">{caseData.dentist?.clinicName || ""}</p>
                <p className="text-sm text-slate-500">{caseData.dentist?.phone || ""}</p>
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
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-medium transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Notify via WhatsApp
                  </a>
                )}
              </div>
            </div>
            {caseData.patient && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50/50 border border-green-100">
                <div className="bg-green-100 text-green-600 p-2.5 rounded-xl">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <Link href={`/patients/${caseData.patient.id}`} className="font-semibold text-sky-600 hover:text-sky-700 transition-colors">
                    {caseData.patient.name}
                  </Link>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {caseData.patient.age ? `${caseData.patient.age} yrs` : ""}{" "}
                    {caseData.patient.gender || ""}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      {caseData.files?.length > 0 && (
        <Card className="rounded-xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-500" />
              Attachments ({caseData.files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {caseData.files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50/30 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <FileText className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px] text-slate-700">{f.fileName}</p>
                      <p className="text-xs text-slate-400">{(f.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <a href={f.filePath} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-sky-50 hover:text-sky-600 rounded-lg">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
