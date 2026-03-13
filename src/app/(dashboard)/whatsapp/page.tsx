"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Send,
  Search,
  Users,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type Dentist = {
  id: string;
  name: string;
  clinicName: string | null;
  phone: string | null;
  whatsapp: string | null;
  balance: number;
  _count: { cases: number };
};

type CaseItem = {
  id: string;
  caseNumber: string;
  workType: string;
  status: string;
  dueDate: string | null;
  patient: { name: string } | null;
};

type LogEntry = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

const TEMPLATE_OPTIONS = [
  { value: "caseReceived", label: "Case Received" },
  { value: "caseReady", label: "Case Ready" },
  { value: "statusUpdate", label: "Status Update" },
  { value: "paymentReminder", label: "Payment Reminder" },
  { value: "custom", label: "Custom Message" },
];

const TEMPLATES_NEEDING_CASE = ["caseReceived", "caseReady", "statusUpdate"];

export default function WhatsAppPage() {
  // Quick Send state
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState("");
  const [template, setTemplate] = useState("");
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [messagePreview, setMessagePreview] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [dentistSearch, setDentistSearch] = useState("");
  const [loadingDentists, setLoadingDentists] = useState(true);
  const [loadingCases, setLoadingCases] = useState(false);

  // Bulk Messaging state
  const [bulkDentistIds, setBulkDentistIds] = useState<Set<string>>(new Set());
  const [bulkTemplate, setBulkTemplate] = useState("");
  const [bulkCustomMessage, setBulkCustomMessage] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  // Recent Messages Log
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Fetch dentists with phone/whatsapp
  useEffect(() => {
    fetch("/api/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        setDentists(Array.isArray(data) ? data : []);
        setLoadingDentists(false);
      })
      .catch(() => setLoadingDentists(false));
  }, []);

  // Fetch recent WhatsApp logs
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const whatsappLogs = (data.notifications || []).filter(
          (n: any) => n.type === "whatsapp"
        );
        setRecentLogs(whatsappLogs);
        setLoadingLogs(false);
      })
      .catch(() => setLoadingLogs(false));
  }, []);

  // Fetch cases when dentist is selected
  useEffect(() => {
    if (!selectedDentistId || !TEMPLATES_NEEDING_CASE.includes(template)) {
      setCases([]);
      setSelectedCaseId("");
      return;
    }

    setLoadingCases(true);
    fetch(`/api/cases?dentistId=${selectedDentistId}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setCases(data.cases || []);
        setLoadingCases(false);
      })
      .catch(() => setLoadingCases(false));
  }, [selectedDentistId, template]);

  // Generate message preview
  useEffect(() => {
    const dentist = dentists.find((d) => d.id === selectedDentistId);
    if (!dentist || !template) {
      setMessagePreview("");
      return;
    }

    const selectedCase = cases.find((c) => c.id === selectedCaseId);

    switch (template) {
      case "caseReceived":
        if (selectedCase) {
          setMessagePreview(
            messageTemplates.caseReceived(
              dentist.name,
              selectedCase.caseNumber,
              selectedCase.patient?.name || "N/A",
              selectedCase.workType,
              selectedCase.dueDate
                ? new Date(selectedCase.dueDate).toLocaleDateString("en-IN")
                : "TBD"
            )
          );
        } else {
          setMessagePreview("Select a case to generate message...");
        }
        break;
      case "caseReady":
        if (selectedCase) {
          setMessagePreview(
            messageTemplates.caseReady(
              dentist.name,
              selectedCase.caseNumber,
              selectedCase.patient?.name || "N/A"
            )
          );
        } else {
          setMessagePreview("Select a case to generate message...");
        }
        break;
      case "statusUpdate":
        if (selectedCase) {
          setMessagePreview(
            messageTemplates.statusUpdate(
              dentist.name,
              selectedCase.caseNumber,
              selectedCase.status
            )
          );
        } else {
          setMessagePreview("Select a case to generate message...");
        }
        break;
      case "paymentReminder":
        setMessagePreview(
          messageTemplates.paymentReminder(dentist.name, dentist.balance)
        );
        break;
      case "custom":
        setMessagePreview(
          customMessage
            ? messageTemplates.custom(dentist.name, customMessage)
            : "Type your custom message below..."
        );
        break;
      default:
        setMessagePreview("");
    }
  }, [selectedDentistId, template, selectedCaseId, customMessage, dentists, cases]);

  const selectedDentist = dentists.find((d) => d.id === selectedDentistId);

  const handleOpenWhatsApp = async () => {
    if (!selectedDentist || !messagePreview) {
      toast.error("Select a dentist and template first");
      return;
    }

    const phone = selectedDentist.whatsapp || selectedDentist.phone;
    if (!phone) {
      toast.error("No phone number available for this dentist");
      return;
    }

    const url = getWhatsAppUrl(phone, messagePreview);
    window.open(url, "_blank", "noopener,noreferrer");

    // Log the message
    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentistName: selectedDentist.name,
          dentistId: selectedDentist.id,
          template: TEMPLATE_OPTIONS.find((t) => t.value === template)?.label || template,
          message: messagePreview,
        }),
      });
      // Refresh logs
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setRecentLogs(
        (data.notifications || []).filter((n: any) => n.type === "whatsapp")
      );
      toast.success("WhatsApp opened & message logged");
    } catch {
      // Still opened WhatsApp, just log failed
    }
  };

  // Bulk messaging
  const filteredDentists = dentists.filter(
    (d) =>
      d.name.toLowerCase().includes(dentistSearch.toLowerCase()) ||
      (d.clinicName || "").toLowerCase().includes(dentistSearch.toLowerCase())
  );

  const toggleBulkDentist = (id: string) => {
    setBulkDentistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setBulkDentistIds(new Set(filteredDentists.map((d) => d.id)));
    } else {
      setBulkDentistIds(new Set());
    }
  };

  const getBulkMessage = (dentist: Dentist): string => {
    switch (bulkTemplate) {
      case "paymentReminder":
        return messageTemplates.paymentReminder(dentist.name, dentist.balance);
      case "custom":
        return bulkCustomMessage
          ? messageTemplates.custom(dentist.name, bulkCustomMessage)
          : "";
      default:
        return messageTemplates.custom(dentist.name, bulkCustomMessage || "");
    }
  };

  const handleBulkSend = async (dentist: Dentist) => {
    const phone = dentist.whatsapp || dentist.phone;
    if (!phone) {
      toast.error(`No phone number for ${dentist.name}`);
      return;
    }

    const message = getBulkMessage(dentist);
    if (!message) {
      toast.error("Select a template or write a custom message");
      return;
    }

    const url = getWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");

    try {
      await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentistName: dentist.name,
          dentistId: dentist.id,
          template: TEMPLATE_OPTIONS.find((t) => t.value === bulkTemplate)?.label || "Bulk",
          message,
        }),
      });
    } catch {
      // Silent fail for logging
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-md shadow-green-500/20">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">WhatsApp Messaging</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Send messages to dentists via WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* Quick Send Section */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#25D366]" />
            Quick Send
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dentist Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Select Dentist</Label>
              <Select
                value={selectedDentistId}
                onValueChange={setSelectedDentistId}
              >
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Choose a dentist..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {loadingDentists ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                    </div>
                  ) : (
                    dentists.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.clinicName ? ` - ${d.clinicName}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedDentist && (
                <p className="text-xs text-muted-foreground">
                  Phone: {selectedDentist.whatsapp || selectedDentist.phone || "N/A"}
                </p>
              )}
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Message Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Choose template..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Case Selector (shown only when needed) */}
          {template &&
            TEMPLATES_NEEDING_CASE.includes(template) &&
            selectedDentistId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Select Case</Label>
                <Select
                  value={selectedCaseId}
                  onValueChange={setSelectedCaseId}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Choose a case..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {loadingCases ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                      </div>
                    ) : cases.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No cases found
                      </div>
                    ) : (
                      cases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNumber} - {c.workType} ({c.status})
                          {c.patient ? ` - ${c.patient.name}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

          {/* Custom Message Input */}
          {template === "custom" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Your Message</Label>
              <Textarea
                placeholder="Type your custom message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
          )}

          {/* Message Preview */}
          {messagePreview && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Message Preview</Label>
              <Textarea
                value={messagePreview}
                onChange={(e) => setMessagePreview(e.target.value)}
                rows={6}
                className="bg-slate-50/80 font-mono text-sm rounded-xl border-slate-200"
              />
              <p className="text-xs text-muted-foreground">
                You can edit the message before sending
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleOpenWhatsApp}
            disabled={!selectedDentist || !messagePreview || messagePreview.startsWith("Select") || messagePreview.startsWith("Type")}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl shadow-md shadow-green-500/20 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Open in WhatsApp
            <ExternalLink className="h-3.5 w-3.5 ml-2" />
          </Button>
        </CardContent>
      </Card>

      {/* Bulk Messaging Section */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#25D366]" />
            Bulk Messaging
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Template for Bulk</Label>
              <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
                <SelectTrigger className="rounded-xl border-slate-200">
                  <SelectValue placeholder="Choose template..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="paymentReminder">Payment Reminder</SelectItem>
                  <SelectItem value="custom">Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bulkTemplate === "custom" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Custom Message</Label>
                <Textarea
                  placeholder="Message to send to all selected dentists..."
                  value={bulkCustomMessage}
                  onChange={(e) => setBulkCustomMessage(e.target.value)}
                  rows={2}
                  className="rounded-xl"
                />
              </div>
            )}
          </div>

          <Separator className="bg-slate-100" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search dentists..."
              value={dentistSearch}
              onChange={(e) => setDentistSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>

          {/* Dentist list with checkboxes */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={(checked) =>
                        handleSelectAll(checked as boolean)
                      }
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="hidden md:table-cell text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDentists.map((d) => {
                  const initials = d.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "D";
                  return (
                    <TableRow key={d.id} className="hover:bg-sky-50/30 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={bulkDentistIds.has(d.id)}
                          onCheckedChange={() => toggleBulkDentist(d.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-700">{d.name}</p>
                            {d.clinicName && (
                              <p className="text-xs text-slate-400">
                                {d.clinicName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                        {d.whatsapp || d.phone || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        <span
                          className={`text-sm font-semibold ${
                            d.balance > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(d.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleBulkSend(d)}
                          disabled={!bulkTemplate}
                          className="bg-[#25D366] hover:bg-[#128C7E] text-white h-8 rounded-lg text-xs"
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          Send
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredDentists.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12"
                    >
                      <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-slate-500">No dentists found with phone numbers</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {bulkDentistIds.size > 0 && (
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{bulkDentistIds.size}</span> dentist{bulkDentistIds.size !== 1 ? "s" : ""}{" "}
              selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Messages Log */}
      <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#25D366]" />
            Recent WhatsApp Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-green-200 border-t-green-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">No WhatsApp messages logged yet</p>
              <p className="text-sm text-slate-400 mt-1">Messages will appear here after sending</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50/80 transition-all duration-200"
                >
                  <div className="bg-[#25D366]/10 text-[#25D366] p-2.5 rounded-xl shrink-0 border border-[#25D366]/20">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{log.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                      {log.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 font-medium">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
