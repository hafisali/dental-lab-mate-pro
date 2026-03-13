import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateCaseNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `LAB-${y}${m}${d}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${y}${m}-${rand}`;
}

export function getInitials(name: string): string {
  return (
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function getRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    RECEIVED: "bg-slate-100 text-slate-700 border border-slate-200",
    WORKING: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    TRIAL: "bg-amber-50 text-amber-700 border border-amber-200",
    FINISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    DELIVERED: "bg-green-50 text-green-700 border border-green-200",
    DRAFT: "bg-slate-50 text-slate-600 border border-slate-200",
    SENT: "bg-blue-50 text-blue-700 border border-blue-200",
    PARTIAL: "bg-amber-50 text-amber-700 border border-amber-200",
    PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    OVERDUE: "bg-red-50 text-red-700 border border-red-200",
    CANCELLED: "bg-slate-50 text-slate-500 border border-slate-200",
  };
  return colors[status] || "bg-slate-50 text-slate-600 border border-slate-200";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "bg-slate-50 text-slate-600 border border-slate-200",
    NORMAL: "bg-blue-50 text-blue-700 border border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border border-amber-200",
    URGENT: "bg-red-50 text-red-700 border border-red-200",
  };
  return colors[priority] || "bg-slate-50 text-slate-600 border border-slate-200";
}

export function getStatusDot(status: string): string {
  const colors: Record<string, string> = {
    RECEIVED: "bg-slate-400",
    WORKING: "bg-indigo-500",
    TRIAL: "bg-amber-500",
    FINISHED: "bg-emerald-500",
    DELIVERED: "bg-green-500",
    OVERDUE: "bg-red-500",
    PAID: "bg-emerald-500",
    PARTIAL: "bg-amber-500",
  };
  return colors[status] || "bg-slate-400";
}

// Chart color palette
export const chartColors = {
  primary: "#6366f1",
  primaryLight: "#a5b4fc",
  success: "#10b981",
  successLight: "#6ee7b7",
  warning: "#f59e0b",
  warningLight: "#fcd34d",
  danger: "#ef4444",
  dangerLight: "#fca5a5",
  info: "#3b82f6",
  infoLight: "#93c5fd",
  violet: "#8b5cf6",
  violetLight: "#c4b5fd",
  slate: "#64748b",
  slateLight: "#cbd5e1",
};

export const statusChartColors: Record<string, string> = {
  RECEIVED: "#94a3b8",
  WORKING: "#6366f1",
  TRIAL: "#f59e0b",
  FINISHED: "#10b981",
  DELIVERED: "#22c55e",
};
