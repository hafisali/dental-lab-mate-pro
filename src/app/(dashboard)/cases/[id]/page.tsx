"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, User, Stethoscope, FileText, Download } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_FLOW = ["RECEIVED", "WORKING", "TRIAL", "FINISHED", "DELIVERED"];

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
    return <div className="text-center py-12 text-muted-foreground">Loading case details...</div>;
  }

  if (!caseData || caseData.error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
        <Link href="/cases"><Button variant="outline" className="mt-4">Back to Cases</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cases">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{caseData.caseNumber}</h1>
            <p className="text-muted-foreground text-sm">{caseData.workType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(caseData.status)} variant="secondary">
            {caseData.status}
          </Badge>
          <Badge className={getPriorityColor(caseData.priority)} variant="secondary">
            {caseData.priority}
          </Badge>
        </div>
      </div>

      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((status, idx) => {
              const isActive = STATUS_FLOW.indexOf(caseData.status) >= idx;
              const isCurrent = caseData.status === status;
              return (
                <div key={status} className="flex items-center flex-1">
                  <button
                    onClick={() => updateStatus(status)}
                    className={`flex flex-col items-center gap-1 ${isCurrent ? "scale-110" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-[10px] sm:text-xs ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {status}
                    </span>
                  </button>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${isActive ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Case Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(caseData.date)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Work Type</span>
              <span>{caseData.workType}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shade</span>
              <span>{caseData.shade || "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Material</span>
              <span>{caseData.material || "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Teeth</span>
              <span>{caseData.teethNumbers?.join(", ") || "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span>{caseData.dueDate ? formatDate(caseData.dueDate) : "-"}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(caseData.amount)}</span>
            </div>
            {caseData.remarks && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground block mb-1">Remarks</span>
                  <p>{caseData.remarks}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dentist & Patient */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dentist & Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <Link href={`/dentists/${caseData.dentist?.id}`} className="font-medium text-sky-600 hover:underline">
                  {caseData.dentist?.name}
                </Link>
                <p className="text-sm text-muted-foreground">{caseData.dentist?.clinicName || ""}</p>
                <p className="text-sm text-muted-foreground">{caseData.dentist?.phone || ""}</p>
              </div>
            </div>
            {caseData.patient && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <Link href={`/patients/${caseData.patient.id}`} className="font-medium text-sky-600 hover:underline">
                      {caseData.patient.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {caseData.patient.age ? `${caseData.patient.age} yrs` : ""}{" "}
                      {caseData.patient.gender || ""}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      {caseData.files?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Attachments ({caseData.files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {caseData.files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">{f.fileName}</p>
                      <p className="text-xs text-muted-foreground">{(f.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <a href={f.filePath} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
