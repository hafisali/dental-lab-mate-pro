"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatDateTime, formatCurrency, getInitials, getRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
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
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="WhatsApp" subtitle="Send messages to your dentists" />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Quick Send */}
        <div className="lg:col-span-3">
          <GlassCard hover="none" delay={0.1}>
            <div className="flex items-center gap-2 mb-5">
              <Send className="h-4 w-4 text-[#25D366]" />
              <h3 className="text-base font-semibold text-foreground">Quick Send</h3>
            </div>

            <div className="space-y-4">
              {/* Dentist Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Dentist</Label>
                <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose a dentist..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {loadingDentists ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
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

              {/* Template Cards */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Message Template</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTemplate(t.value)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 border ${
                        template === t.value
                          ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                          : "border-border bg-card hover:bg-accent text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Case Selector (shown only when needed) */}
              {template && TEMPLATES_NEEDING_CASE.includes(template) && selectedDentistId && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Select Case</Label>
                  <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Choose a case..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {loadingCases ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
                  <Label className="text-sm font-medium text-foreground">Your Message</Label>
                  <Textarea
                    placeholder="Type your custom message here..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Message Preview - Chat Bubble */}
              {messagePreview && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Message Preview</Label>
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
                    <Textarea
                      value={messagePreview}
                      onChange={(e) => setMessagePreview(e.target.value)}
                      rows={6}
                      className="bg-transparent border-0 p-0 text-sm font-mono text-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
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
            </div>
          </GlassCard>
        </div>

        {/* Right: Recent Messages */}
        <div className="lg:col-span-2">
          <GlassCard hover="none" delay={0.2}>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="h-4 w-4 text-[#25D366]" />
              <h3 className="text-base font-semibold text-foreground">Recent Messages</h3>
            </div>

            {loadingLogs ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-2 w-2 rounded-full mt-2" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-[150px]" />
                      <Skeleton className="h-3 w-[200px]" />
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Messages will appear here after sending</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    {/* Green timeline dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 font-medium">
                        {getRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Bulk Messaging Section */}
      <GlassCard padding="p-0" hover="none" delay={0.3}>
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[#25D366]" />
            <h3 className="text-base font-semibold text-foreground">Bulk Messaging</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Template for Bulk</Label>
              <Select value={bulkTemplate} onValueChange={setBulkTemplate}>
                <SelectTrigger className="rounded-xl">
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
                <Label className="text-sm font-medium text-foreground">Custom Message</Label>
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

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dentists..."
              value={dentistSearch}
              onChange={(e) => setDentistSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          {bulkDentistIds.size > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              <span className="font-semibold text-foreground">{bulkDentistIds.size}</span> dentist{bulkDentistIds.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {/* Dentist list with checkboxes */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
                <TableHead className="hidden md:table-cell text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDentists.map((d, index) => {
                const initials = getInitials(d.name || "D");
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={bulkDentistIds.has(d.id)}
                        onCheckedChange={() => toggleBulkDentist(d.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{d.name}</p>
                          {d.clinicName && (
                            <p className="text-xs text-muted-foreground">{d.clinicName}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {d.whatsapp || d.phone || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      <span className={`text-sm font-semibold ${d.balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatCurrency(d.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleBulkSend(d)}
                        disabled={!bulkTemplate}
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white h-8 rounded-xl text-xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Send
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
              {filteredDentists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={Users}
                      title="No dentists found"
                      description="No dentists found with phone numbers."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
