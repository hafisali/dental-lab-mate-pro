import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    RECEIVED: "bg-slate-100 text-slate-700 border border-slate-200",
    WORKING: "bg-blue-50 text-blue-700 border border-blue-200",
    TRIAL: "bg-amber-50 text-amber-700 border border-amber-200",
    FINISHED: "bg-green-50 text-green-700 border border-green-200",
    DELIVERED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    DRAFT: "bg-slate-50 text-slate-600 border border-slate-200",
    SENT: "bg-blue-50 text-blue-700 border border-blue-200",
    PARTIAL: "bg-amber-50 text-amber-700 border border-amber-200",
    PAID: "bg-green-50 text-green-700 border border-green-200",
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
