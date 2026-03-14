"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Search,
  Users,
  Clock,
  ExternalLink,
  Loader2,
  Phone,
  CheckCheck,
  ArrowRight,
  Bot,
  Settings,
  Activity,
  CalendarCheck,
  MessageSquare,
  Wifi,
  WifiOff,
  Copy,
  RefreshCw,
  SendHorizonal,
  ToggleLeft,
  ToggleRight,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";
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

type BotConfig = {
  autoReplyEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  greetingMessage: string;
};

type BotMessage = {
  id: string;
  from: string;
  direction: "incoming" | "outgoing";
  message: string;
  timestamp: string;
};

const TEMPLATE_OPTIONS = [
  { value: "caseReceived", label: "Case Received", icon: "📥" },
  { value: "caseReady", label: "Case Ready", icon: "✅" },
  { value: "statusUpdate", label: "Status Update", icon: "📊" },
  { value: "paymentReminder", label: "Payment Reminder", icon: "💰" },
  { value: "custom", label: "Custom Message", icon: "✏️" },
];

const TEMPLATES_NEEDING_CASE = ["caseReceived", "caseReady", "statusUpdate"];

export default function WhatsAppPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"messaging" | "bot" | "journey">("messaging");

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

  // Bot state
  const [botConnected, setBotConnected] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    autoReplyEnabled: true,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    greetingMessage: "",
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [loadingBotConfig, setLoadingBotConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [botMessages, setBotMessages] = useState<BotMessage[]>([]);
  const [loadingBotMessages, setLoadingBotMessages] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Provider state
  const [activeProvider, setActiveProvider] = useState<"twilio" | "meta" | "none">("none");
  const [twilioInfo, setTwilioInfo] = useState({
    configured: false,
    accountSid: "",
    hasAuthToken: false,
    sandboxNumber: "+14155238886",
    webhookUrl: "",
  });

  // Stats
  const [stats, setStats] = useState({
    messagesToday: 0,
    appointmentsViaWhatsApp: 0,
    activeConversations: 0,
  });

  // Journey tab state
  const [journeyNotificationType, setJourneyNotificationType] = useState("");
  const [journeyAppointmentId, setJourneyAppointmentId] = useState("");
  const [journeyReminderType, setJourneyReminderType] = useState<"24h" | "1h">("24h");
  const [journeyQueuePosition, setJourneyQueuePosition] = useState(1);
  const [journeyWaitMinutes, setJourneyWaitMinutes] = useState(15);
  const [journeyProcedures, setJourneyProcedures] = useState("");
  const [journeyFindings, setJourneyFindings] = useState("");
  const [journeyRecommendations, setJourneyRecommendations] = useState("");
  const [journeyPrescriptionId, setJourneyPrescriptionId] = useState("");
  const [journeyInvoiceId, setJourneyInvoiceId] = useState("");
  const [journeyFollowUpDate, setJourneyFollowUpDate] = useState("");
  const [journeyFollowUpReason, setJourneyFollowUpReason] = useState("");
  const [journeySending, setJourneySending] = useState(false);
  const [journeyAppointments, setJourneyAppointments] = useState<{ id: string; patientName: string; date: string; time: string; treatment: string; status: string }[]>([]);
  const [journeyPrescriptions, setJourneyPrescriptions] = useState<{ id: string; patientName: string; date: string }[]>([]);
  const [journeyInvoices, setJourneyInvoices] = useState<{ id: string; invoiceNumber: string; total: number; patientName: string }[]>([]);
  const [journeyLoadingData, setJourneyLoadingData] = useState(false);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [lastReminderRun, setLastReminderRun] = useState<string | null>(null);

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

  // Fetch bot config
  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setBotConfig(data.config);
        }
        if (data.connection) {
          setBotConnected(data.connection.connected || data.provider === "twilio");
          setWebhookUrl(data.connection.webhookUrl || "");
          setPhoneNumberId(data.connection.phoneNumberId || "");
          setVerifyToken(data.connection.hasVerifyToken ? "configured" : "");
        }
        if (data.provider) {
          setActiveProvider(data.provider);
        }
        if (data.twilio) {
          setTwilioInfo(data.twilio);
        }
        setLoadingBotConfig(false);
      })
      .catch(() => setLoadingBotConfig(false));
  }, []);

  // Fetch bot messages
  const fetchBotMessages = useCallback(() => {
    setLoadingBotMessages(true);
    fetch("/api/whatsapp/webhook")
      .then((r) => {
        // The webhook GET is for verification, so we use a separate approach
        // Bot messages are fetched from in-memory log via a query param
        return r.text();
      })
      .then(() => setLoadingBotMessages(false))
      .catch(() => setLoadingBotMessages(false));
  }, []);

  // Fetch journey data when journey tab is active
  useEffect(() => {
    if (activeTab !== "journey") return;
    setJourneyLoadingData(true);

    Promise.all([
      fetch("/api/appointments?limit=50").then((r) => r.json()).catch(() => ({ appointments: [] })),
      fetch("/api/prescriptions?limit=50").then((r) => r.json()).catch(() => ({ prescriptions: [] })),
      fetch("/api/invoices?limit=50").then((r) => r.json()).catch(() => ({ invoices: [] })),
    ]).then(([aptData, rxData, invData]) => {
      const apts = (aptData.appointments || []).map((a: any) => ({
        id: a.id,
        patientName: a.patient?.name || "N/A",
        date: a.date,
        time: a.time,
        treatment: a.treatment,
        status: a.status,
      }));
      setJourneyAppointments(apts);

      const rxs = (rxData.prescriptions || []).map((p: any) => ({
        id: p.id,
        patientName: p.patient?.name || "N/A",
        date: p.date || p.createdAt,
      }));
      setJourneyPrescriptions(rxs);

      const invs = (invData.invoices || []).map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        total: i.total,
        patientName: i.case?.patient?.name || i.dentist?.name || "N/A",
      }));
      setJourneyInvoices(invs);

      setJourneyLoadingData(false);
    });
  }, [activeTab]);

  // Journey send handler
  const handleJourneySend = async () => {
    if (!journeyNotificationType) {
      toast.error("Select a notification type");
      return;
    }

    setJourneySending(true);
    try {
      let payload: Record<string, unknown> = { action: journeyNotificationType };

      switch (journeyNotificationType) {
        case "reminder":
          if (!journeyAppointmentId) { toast.error("Select an appointment"); setJourneySending(false); return; }
          payload = { ...payload, appointmentId: journeyAppointmentId, type: journeyReminderType };
          break;
        case "confirm":
          if (!journeyAppointmentId) { toast.error("Select an appointment"); setJourneySending(false); return; }
          payload = { ...payload, appointmentId: journeyAppointmentId };
          break;
        case "queue":
          if (!journeyAppointmentId) { toast.error("Select an appointment"); setJourneySending(false); return; }
          payload = { ...payload, appointmentId: journeyAppointmentId, queuePosition: journeyQueuePosition, estimatedWaitMinutes: journeyWaitMinutes };
          break;
        case "treatment":
          if (!journeyAppointmentId) { toast.error("Select an appointment"); setJourneySending(false); return; }
          if (!journeyProcedures || !journeyFindings || !journeyRecommendations) { toast.error("Fill in all treatment fields"); setJourneySending(false); return; }
          payload = { ...payload, appointmentId: journeyAppointmentId, proceduresDone: journeyProcedures.split("\n").filter(Boolean), findings: journeyFindings, recommendations: journeyRecommendations };
          break;
        case "prescription":
          if (!journeyPrescriptionId) { toast.error("Select a prescription"); setJourneySending(false); return; }
          payload = { ...payload, prescriptionId: journeyPrescriptionId };
          break;
        case "bill":
          if (!journeyInvoiceId) { toast.error("Select an invoice"); setJourneySending(false); return; }
          payload = { ...payload, invoiceId: journeyInvoiceId };
          break;
        case "followup":
          if (!journeyAppointmentId || !journeyFollowUpDate || !journeyFollowUpReason) { toast.error("Fill in all follow-up fields"); setJourneySending(false); return; }
          payload = { ...payload, appointmentId: journeyAppointmentId, followUpDate: journeyFollowUpDate, reason: journeyFollowUpReason };
          break;
      }

      const res = await fetch("/api/whatsapp/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Notification sent!");
      } else {
        toast.error(data.error || "Failed to send notification");
      }
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setJourneySending(false);
    }
  };

  // Run reminders manually
  const handleRunReminders = async () => {
    setRunningReminders(true);
    try {
      const res = await fetch("/api/whatsapp/reminders");
      const data = await res.json();
      if (data.success) {
        toast.success(`Reminders sent: ${data.reminded24h} (24h) + ${data.reminded1h} (1h)`);
        setLastReminderRun(data.processedAt);
      } else {
        toast.error(data.error || "Failed to run reminders");
      }
    } catch {
      toast.error("Failed to run reminders");
    } finally {
      setRunningReminders(false);
    }
  };

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

  // Bot config save
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botConfig),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Bot configuration saved");
      } else {
        toast.error("Failed to save configuration");
      }
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // Test bot
  const handleTestBot = async () => {
    if (!testPhone.trim()) {
      toast.error("Enter a phone number to test");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: "whatsapp_business_account",
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: testPhone.replace(/[+\s\-]/g, ""),
                        type: "text",
                        text: { body: "hi" },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      });
      if (res.ok) {
        toast.success("Test message sent to bot. Check WhatsApp for the response.");
      } else {
        toast.error("Test failed");
      }
    } catch {
      toast.error("Test failed");
    } finally {
      setSendingTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="WhatsApp" subtitle="Messaging and bot management">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
          <button
            onClick={() => setActiveTab("messaging")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "messaging"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4 inline mr-1.5" />
            Messaging
          </button>
          <button
            onClick={() => setActiveTab("bot")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "bot"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4 inline mr-1.5" />
            Bot Manager
          </button>
          <button
            onClick={() => setActiveTab("journey")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "journey"
                ? "bg-white dark:bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarCheck className="h-4 w-4 inline mr-1.5" />
            Patient Journey
          </button>
        </div>
      </PageHeader>

      {activeTab === "journey" ? (
        <>
          {/* ── PATIENT JOURNEY TAB ──────────────────────────────────── */}

          {/* Journey Flow Timeline */}
          <div className="bg-white dark:bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Patient Journey Flow</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { icon: "📅", label: "Book" },
                { icon: "⏰", label: "Reminder" },
                { icon: "✅", label: "Confirm" },
                { icon: "🏥", label: "Queue" },
                { icon: "🦷", label: "Treatment" },
                { icon: "💊", label: "Prescription" },
                { icon: "💰", label: "Bill" },
                { icon: "📋", label: "Follow-up" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1976d2]/5 border border-[#1976d2]/20 rounded-lg">
                    <span>{step.icon}</span>
                    <span className="font-medium text-foreground text-xs">{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Send WhatsApp notifications at each stage of the patient journey. Select a notification type below to send a message.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Send Notification Panel */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                    <Send className="h-4 w-4 text-[#1976d2]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Send Notification</h3>
                </div>

                {/* Notification Type */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Notification Type</Label>
                    <Select value={journeyNotificationType} onValueChange={(v) => { setJourneyNotificationType(v); setJourneyAppointmentId(""); setJourneyPrescriptionId(""); setJourneyInvoiceId(""); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select notification type..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="reminder">⏰ Appointment Reminder</SelectItem>
                        <SelectItem value="confirm">✅ Appointment Confirmation</SelectItem>
                        <SelectItem value="queue">🏥 Queue Update</SelectItem>
                        <SelectItem value="treatment">🦷 Treatment Summary</SelectItem>
                        <SelectItem value="prescription">💊 Prescription Details</SelectItem>
                        <SelectItem value="bill">💰 Bill Details</SelectItem>
                        <SelectItem value="followup">📋 Follow-up Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {journeyLoadingData && journeyNotificationType ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-[#1976d2]" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading data...</span>
                    </div>
                  ) : (
                    <>
                      {/* Appointment selector (for reminder, confirm, queue, treatment, followup) */}
                      {["reminder", "confirm", "queue", "treatment", "followup"].includes(journeyNotificationType) && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Select Appointment</Label>
                          <Select value={journeyAppointmentId} onValueChange={setJourneyAppointmentId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Choose an appointment..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-[250px]">
                              {journeyAppointments.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">No appointments found</div>
                              ) : (
                                journeyAppointments.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.patientName} - {a.treatment} ({new Date(a.date).toLocaleDateString("en-IN")} {a.time}) [{a.status}]
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Reminder type */}
                      {journeyNotificationType === "reminder" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Reminder Type</Label>
                          <Select value={journeyReminderType} onValueChange={(v) => setJourneyReminderType(v as "24h" | "1h")}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="24h">24 Hours Before</SelectItem>
                              <SelectItem value="1h">1 Hour Before</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Queue fields */}
                      {journeyNotificationType === "queue" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Queue Position</Label>
                            <Input
                              type="number"
                              min={0}
                              value={journeyQueuePosition}
                              onChange={(e) => setJourneyQueuePosition(parseInt(e.target.value) || 0)}
                              className="rounded-xl"
                              placeholder="0 = your turn"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Est. Wait (mins)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={journeyWaitMinutes}
                              onChange={(e) => setJourneyWaitMinutes(parseInt(e.target.value) || 0)}
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      )}

                      {/* Treatment fields */}
                      {journeyNotificationType === "treatment" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Procedures Done (one per line)</Label>
                            <Textarea
                              value={journeyProcedures}
                              onChange={(e) => setJourneyProcedures(e.target.value)}
                              placeholder="Root canal treatment&#10;Dental cleaning&#10;X-ray"
                              rows={3}
                              className="rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Findings</Label>
                            <Textarea
                              value={journeyFindings}
                              onChange={(e) => setJourneyFindings(e.target.value)}
                              placeholder="Describe clinical findings..."
                              rows={2}
                              className="rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Recommendations</Label>
                            <Textarea
                              value={journeyRecommendations}
                              onChange={(e) => setJourneyRecommendations(e.target.value)}
                              placeholder="Post-treatment recommendations..."
                              rows={2}
                              className="rounded-xl text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Prescription selector */}
                      {journeyNotificationType === "prescription" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Select Prescription</Label>
                          <Select value={journeyPrescriptionId} onValueChange={setJourneyPrescriptionId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Choose a prescription..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-[250px]">
                              {journeyPrescriptions.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">No prescriptions found</div>
                              ) : (
                                journeyPrescriptions.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.patientName} - {new Date(p.date).toLocaleDateString("en-IN")}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Invoice selector */}
                      {journeyNotificationType === "bill" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">Select Invoice</Label>
                          <Select value={journeyInvoiceId} onValueChange={setJourneyInvoiceId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Choose an invoice..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-[250px]">
                              {journeyInvoices.length === 0 ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">No invoices found</div>
                              ) : (
                                journeyInvoices.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>
                                    {inv.invoiceNumber} - {inv.patientName} (₹{inv.total.toLocaleString("en-IN")})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Follow-up fields */}
                      {journeyNotificationType === "followup" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Follow-up Date</Label>
                            <Input
                              type="date"
                              value={journeyFollowUpDate}
                              onChange={(e) => setJourneyFollowUpDate(e.target.value)}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                            <Input
                              value={journeyFollowUpReason}
                              onChange={(e) => setJourneyFollowUpReason(e.target.value)}
                              placeholder="e.g., Post-treatment checkup"
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Send Button */}
                  {journeyNotificationType && (
                    <Button
                      onClick={handleJourneySend}
                      disabled={journeySending || !journeyNotificationType}
                      className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md h-11 font-semibold mt-2"
                    >
                      {journeySending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Notification
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Auto Reminders */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-[#1976d2]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Auto Reminders</h3>
                </div>

                <div className="space-y-4">
                  {/* Auto-reminder toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable Auto-Reminders</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Automatically send reminders for upcoming appointments</p>
                    </div>
                    <button
                      onClick={() => setAutoRemindersEnabled(!autoRemindersEnabled)}
                      className="text-[#1976d2]"
                    >
                      {autoRemindersEnabled ? (
                        <ToggleRight className="h-7 w-7" />
                      ) : (
                        <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Reminder info */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2">
                    <p className="text-xs font-medium text-foreground">When auto-reminders run:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1976d2]" />
                        24-hour reminders for tomorrow&apos;s appointments
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1976d2]" />
                        1-hour reminders for upcoming appointments
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1976d2]" />
                        Skips already-reminded appointments
                      </li>
                    </ul>
                  </div>

                  {/* Run Now button */}
                  <Button
                    onClick={handleRunReminders}
                    disabled={runningReminders}
                    variant="outline"
                    className="w-full rounded-xl h-10 text-sm font-medium border-[#1976d2]/30 text-[#1976d2] hover:bg-[#1976d2]/5"
                  >
                    {runningReminders ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Run Reminders Now
                  </Button>

                  {/* Last run timestamp */}
                  {lastReminderRun && (
                    <p className="text-xs text-muted-foreground text-center">
                      Last run: {new Date(lastReminderRun).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </div>

              {/* Journey info card */}
              <div className="bg-white dark:bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-[#1976d2]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Patient Reply Handling</h3>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    The WhatsApp bot automatically handles these patient replies:
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { keyword: "CONFIRM", desc: "Confirms upcoming appointment" },
                      { keyword: "RESCHEDULE", desc: "Shows rescheduling options" },
                      { keyword: "HELP", desc: "Shows help menu with clinic contact" },
                    ].map((item) => (
                      <div key={item.keyword} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                        <Badge className="bg-[#1976d2]/10 text-[#1976d2] border-[#1976d2]/20 rounded-md text-[10px] font-bold mt-0.5 shrink-0">
                          {item.keyword}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === "messaging" ? (
        <>
          {/* ── MESSAGING TAB ────────────────────────────────────────── */}
          {/* Chat-like Layout */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Contact List / Quick Send */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              {/* Dentist Selector Card */}
              <GlassCard hover="none" delay={0.1} padding="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                    <Send className="h-4 w-4 text-[#1976d2]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Select Contact</h3>
                </div>

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

                {/* Selected dentist info */}
                {selectedDentist && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-xl bg-muted/50 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1976d2] flex items-center justify-center text-white text-sm font-bold">
                        {getInitials(selectedDentist.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{selectedDentist.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{selectedDentist.whatsapp || selectedDentist.phone || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </GlassCard>

              {/* Template Cards */}
              <GlassCard hover="none" delay={0.15} padding="p-5">
                <Label className="text-sm font-bold text-foreground">Message Template</Label>
                <div className="grid grid-cols-1 gap-2 mt-3">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTemplate(t.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 border ${
                        template === t.value
                          ? "border-[#1976d2] bg-[#1976d2]/5 text-foreground ring-1 ring-[#1976d2]/20"
                          : "border-border/50 bg-card hover:bg-accent text-foreground"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span>{t.label}</span>
                      {template === t.value && (
                        <CheckCheck className="h-4 w-4 text-[#1976d2] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </GlassCard>

              {/* Recent Messages Timeline */}
              <GlassCard hover="none" delay={0.25} padding="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <Clock className="h-4 w-4 text-[#1976d2]" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Messages</h3>
                </div>

                {loadingLogs ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-2 w-2 rounded-full mt-2" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-[150px]" />
                          <Skeleton className="h-3 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentLogs.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                      <MessageCircle className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {recentLogs.slice(0, 8).map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="mt-1.5 shrink-0">
                          <div className="w-2 h-2 rounded-full bg-[#1976d2]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{log.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{log.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium">
                            {getRelativeTime(log.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Right: Message Composer */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <GlassCard hover="none" delay={0.2} padding="p-0">
                {/* Chat header */}
                <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1976d2] flex items-center justify-center text-white text-sm font-bold">
                    {selectedDentist ? getInitials(selectedDentist.name) : "?"}
                  </div>
                  <div>
                    {selectedDentist ? (
                      <Link href={`/dentists/${selectedDentist.id}`} className="text-sm font-bold text-foreground hover:text-[#1976d2] transition-colors">
                        {selectedDentist.name}
                      </Link>
                    ) : (
                      <h3 className="text-sm font-bold text-foreground">Select a contact</h3>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {selectedDentist ? (selectedDentist.whatsapp || selectedDentist.phone || "No phone") : "Choose a dentist to start messaging"}
                    </p>
                  </div>
                </div>

                {/* Message area */}
                <div className="p-6 min-h-[400px] flex flex-col">
                  {/* Case Selector (shown only when needed) */}
                  {template && TEMPLATES_NEEDING_CASE.includes(template) && selectedDentistId && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5"
                    >
                      <Label className="text-sm font-medium text-foreground mb-2 block">Select Case</Label>
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
                    </motion.div>
                  )}

                  {/* Custom Message Input */}
                  {template === "custom" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5"
                    >
                      <Label className="text-sm font-medium text-foreground mb-2 block">Your Message</Label>
                      <Textarea
                        placeholder="Type your custom message here..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={3}
                        className="rounded-xl"
                      />
                    </motion.div>
                  )}

                  {/* Message Preview - Chat Bubble Style */}
                  <div className="flex-1 flex flex-col justify-end">
                    {messagePreview ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="space-y-3"
                      >
                        <p className="text-xs text-muted-foreground font-medium">Message Preview</p>
                        {/* Chat bubble */}
                        <div className="max-w-[90%] ml-auto">
                          <div className="rounded-2xl rounded-br-md bg-[#DCF8C6] dark:bg-[#025C4C] p-4 shadow-sm border border-[#B7E9A0]/50 dark:border-[#025C4C]/50">
                            <Textarea
                              value={messagePreview}
                              onChange={(e) => setMessagePreview(e.target.value)}
                              rows={6}
                              className="bg-transparent border-0 p-0 text-sm text-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0 font-mono leading-relaxed"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 justify-end mt-1.5">
                            <span className="text-[10px] text-muted-foreground">Draft</span>
                            <CheckCheck className="h-3 w-3 text-muted-foreground/50" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You can edit the message before sending
                        </p>
                      </motion.div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-[#1976d2]/10 flex items-center justify-center mx-auto mb-3">
                            <MessageCircle className="h-8 w-8 text-[#1976d2]/60" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">Select a contact and template</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Your message preview will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Send bar */}
                <div className="px-6 py-4 border-t border-border/50 bg-muted/20">
                  <Button
                    onClick={handleOpenWhatsApp}
                    disabled={!selectedDentist || !messagePreview || messagePreview.startsWith("Select") || messagePreview.startsWith("Type")}
                    className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md h-11 font-semibold"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open in WhatsApp
                    <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-60" />
                  </Button>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Bulk Messaging Section */}
          <GlassCard padding="p-0" hover="none" delay={0.3}>
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#1976d2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">Bulk Messaging</h3>
                  <p className="text-sm text-muted-foreground">Send messages to multiple dentists at once</p>
                </div>
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
                <div className="mt-3 flex items-center gap-2">
                  <Badge className="bg-[#1976d2]/10 text-[#1976d2] border border-[#1976d2]/20 rounded-full px-3 py-1 text-xs font-bold">
                    {bulkDentistIds.size} selected
                  </Badge>
                </div>
              )}
            </div>

            {/* Dentist list */}
            <div className="divide-y divide-border/30">
              {/* Select all header */}
              <div className="flex items-center gap-4 px-6 py-3 bg-muted/30">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1">Dentist</span>
                <span className="hidden sm:block text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">Phone</span>
                <span className="hidden md:block text-xs font-bold text-muted-foreground uppercase tracking-wider w-24 text-right">Balance</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-20 text-right">Action</span>
              </div>

              {filteredDentists.map((d, index) => {
                const initials = getInitials(d.name || "D");
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    className={`flex items-center gap-4 px-6 py-3.5 hover:bg-accent/30 transition-colors ${
                      bulkDentistIds.has(d.id) ? "bg-[#1976d2]/5" : ""
                    }`}
                  >
                    <Checkbox
                      checked={bulkDentistIds.has(d.id)}
                      onCheckedChange={() => toggleBulkDentist(d.id)}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#1976d2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/dentists/${d.id}`} className="text-sm font-semibold text-foreground hover:text-[#1976d2] transition-colors truncate block" onClick={(e) => e.stopPropagation()}>
                          {d.name}
                        </Link>
                        {d.clinicName && (
                          <p className="text-xs text-muted-foreground truncate">{d.clinicName}</p>
                        )}
                      </div>
                    </div>
                    <span className="hidden sm:block text-sm text-muted-foreground w-32 truncate">
                      {d.whatsapp || d.phone || "-"}
                    </span>
                    <span className={`hidden md:block text-sm font-semibold w-24 text-right ${d.balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatCurrency(d.balance)}
                    </span>
                    <div className="w-20 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleBulkSend(d)}
                        disabled={!bulkTemplate}
                        className="bg-[#1976d2] hover:bg-[#1565c0] text-white h-8 rounded-xl text-xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Send
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              {filteredDentists.length === 0 && (
                <div className="py-12">
                  <EmptyState
                    icon={Users}
                    title="No dentists found"
                    description="No dentists found with phone numbers."
                  />
                </div>
              )}
            </div>
          </GlassCard>
        </>
      ) : (
        <>
          {/* ── BOT MANAGER TAB ──────────────────────────────────────── */}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard hover="none" delay={0.05} padding="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages Today</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.messagesToday}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-[#1976d2]" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hover="none" delay={0.1} padding="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked via WhatsApp</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.appointmentsViaWhatsApp}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </GlassCard>

            <GlassCard hover="none" delay={0.15} padding="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Conversations</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stats.activeConversations}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Provider Indicator */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            activeProvider !== "none"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              activeProvider !== "none" ? "bg-emerald-500 animate-pulse" : "bg-red-400"
            }`} />
            <span className="text-sm font-medium text-foreground">
              {activeProvider === "twilio"
                ? "Connected via Twilio Sandbox"
                : activeProvider === "meta"
                ? "Connected via Meta API"
                : "Disconnected"}
            </span>
            {activeProvider !== "none" && (
              <Badge variant="outline" className="ml-auto text-xs rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                {activeProvider === "twilio" ? "Twilio" : "Meta"}
              </Badge>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left column: Bot Status + Configuration */}
            <div className="lg:col-span-5 space-y-4">
              {/* Bot Status */}
              <GlassCard hover="none" delay={0.1} padding="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${botConnected ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {botConnected ? (
                      <Wifi className="h-4.5 w-4.5 text-emerald-600" />
                    ) : (
                      <WifiOff className="h-4.5 w-4.5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">Bot Status</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${botConnected ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
                      <span className={`text-xs font-medium ${botConnected ? "text-emerald-600" : "text-red-500"}`}>
                        {botConnected
                          ? `Connected (${activeProvider === "twilio" ? "Twilio" : "Meta"})`
                          : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </div>
                {!botConnected && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border/30">
                    Configure your WhatsApp credentials below. You can use either the free Twilio Sandbox or the Meta WhatsApp Business API.
                  </p>
                )}
              </GlassCard>

              {/* Configuration */}
              <GlassCard hover="none" delay={0.15} padding="p-5">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                    <Settings className="h-4 w-4 text-[#1976d2]" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Configuration</h3>
                </div>

                {loadingBotConfig ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Phone Number ID */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Phone Number ID</Label>
                      <Input
                        value={phoneNumberId}
                        readOnly
                        placeholder="Set via WHATSAPP_PHONE_NUMBER_ID env var"
                        className="rounded-xl bg-muted/30 text-sm"
                      />
                    </div>

                    {/* Verify Token */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Verify Token</Label>
                      <Input
                        value={verifyToken}
                        readOnly
                        placeholder="Set via WHATSAPP_VERIFY_TOKEN env var"
                        className="rounded-xl bg-muted/30 text-sm"
                      />
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={webhookUrl}
                          readOnly
                          className="rounded-xl bg-muted/30 text-sm flex-1 font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(webhookUrl)}
                          className="rounded-xl px-3 shrink-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/50 pt-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Bot Settings</p>
                    </div>

                    {/* Auto-reply toggle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">Auto-reply</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Automatically respond to incoming messages</p>
                      </div>
                      <button
                        onClick={() => setBotConfig((c) => ({ ...c, autoReplyEnabled: !c.autoReplyEnabled }))}
                        className="text-[#1976d2]"
                      >
                        {botConfig.autoReplyEnabled ? (
                          <ToggleRight className="h-7 w-7" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Business hours */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Hours Start</Label>
                        <Input
                          type="time"
                          value={botConfig.businessHoursStart}
                          onChange={(e) => setBotConfig((c) => ({ ...c, businessHoursStart: e.target.value }))}
                          className="rounded-xl text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Hours End</Label>
                        <Input
                          type="time"
                          value={botConfig.businessHoursEnd}
                          onChange={(e) => setBotConfig((c) => ({ ...c, businessHoursEnd: e.target.value }))}
                          className="rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    {/* Greeting message */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Greeting Message</Label>
                      <Textarea
                        value={botConfig.greetingMessage}
                        onChange={(e) => setBotConfig((c) => ({ ...c, greetingMessage: e.target.value }))}
                        placeholder="Custom greeting message for patients..."
                        rows={3}
                        className="rounded-xl text-sm"
                      />
                    </div>

                    <Button
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white rounded-xl h-10 font-medium"
                    >
                      {savingConfig ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      Save Configuration
                    </Button>
                  </div>
                )}
              </GlassCard>

              {/* Test Bot */}
              <GlassCard hover="none" delay={0.2} padding="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <SendHorizonal className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Test Bot</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Phone Number</Label>
                    <Input
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="e.g., 919876543210"
                      className="rounded-xl text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleTestBot}
                    disabled={sendingTest || !testPhone.trim()}
                    variant="outline"
                    className="w-full rounded-xl h-9 text-sm font-medium border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                  >
                    {sendingTest ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    Send Test "Hi" Message
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Simulates an incoming &quot;hi&quot; message to test the bot flow. The bot will respond via the active provider ({activeProvider === "twilio" ? "Twilio" : activeProvider === "meta" ? "Meta" : "none configured"}).
                  </p>
                </div>
              </GlassCard>

              {/* Twilio Setup */}
              <GlassCard hover="none" delay={0.25} padding="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">Twilio Sandbox Setup</h3>
                    <p className="text-[11px] text-muted-foreground">Free WhatsApp testing</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Setup Steps */}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="font-bold text-foreground shrink-0 w-4">1.</span>
                      <span>Sign up at <span className="font-medium text-foreground">twilio.com/try-twilio</span> (free)</span>
                    </div>
                    <div className="flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="font-bold text-foreground shrink-0 w-4">2.</span>
                      <span>Go to Console &rarr; Messaging &rarr; Try WhatsApp</span>
                    </div>
                    <div className="flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="font-bold text-foreground shrink-0 w-4">3.</span>
                      <span>Send the join code to <span className="font-mono text-foreground">+1 415 523 8886</span> from your WhatsApp</span>
                    </div>
                    <div className="flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="font-bold text-foreground shrink-0 w-4">4.</span>
                      <span>Copy Account SID and Auth Token to <span className="font-mono text-foreground">.env</span></span>
                    </div>
                    <div className="flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/30">
                      <span className="font-bold text-foreground shrink-0 w-4">5.</span>
                      <span>Set webhook URL to: <span className="font-mono text-foreground break-all">{twilioInfo.webhookUrl || "{your-url}/api/whatsapp/twilio"}</span></span>
                    </div>
                  </div>

                  {/* Twilio Status */}
                  <div className="border-t border-border/50 pt-3 space-y-2.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Account SID</Label>
                      <Input
                        value={twilioInfo.accountSid || "Not configured"}
                        readOnly
                        className="rounded-xl bg-muted/30 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Auth Token</Label>
                      <Input
                        value={twilioInfo.hasAuthToken ? "Configured" : "Not configured"}
                        readOnly
                        className="rounded-xl bg-muted/30 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Sandbox Number</Label>
                      <Input
                        value={twilioInfo.sandboxNumber}
                        readOnly
                        className="rounded-xl bg-muted/30 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Webhook URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={twilioInfo.webhookUrl || ""}
                          readOnly
                          className="rounded-xl bg-muted/30 text-sm flex-1 font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(twilioInfo.webhookUrl)}
                          className="rounded-xl px-3 shrink-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right column: Recent Messages */}
            <div className="lg:col-span-7 space-y-4">
              <GlassCard hover="none" delay={0.15} padding="p-0">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#1976d2]/10 flex items-center justify-center">
                      <Inbox className="h-4 w-4 text-[#1976d2]" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Bot Messages</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchBotMessages}
                    className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingBotMessages ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                <div className="p-6 min-h-[500px]">
                  {botMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Bot className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No bot messages yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
                        When patients message your WhatsApp Business number, conversations will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {botMessages.map((msg, i) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`flex gap-3 ${msg.direction === "outgoing" ? "flex-row-reverse" : ""}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            msg.direction === "incoming"
                              ? "bg-muted"
                              : "bg-[#1976d2]/10"
                          }`}>
                            {msg.direction === "incoming" ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-[#1976d2]" />
                            )}
                          </div>
                          <div className={`max-w-[75%] rounded-xl p-3 border ${
                            msg.direction === "incoming"
                              ? "bg-muted/30 border-border/30"
                              : "bg-[#1976d2]/5 border-[#1976d2]/20"
                          }`}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {msg.direction === "incoming" ? msg.from : "Bot"}
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                              {new Date(msg.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
