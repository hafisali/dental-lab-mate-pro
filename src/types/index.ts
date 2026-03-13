export type UserRole = "ADMIN" | "LAB_OWNER" | "RECEPTION" | "TECHNICIAN" | "DENTIST";

export type CaseStatusType = "RECEIVED" | "WORKING" | "TRIAL" | "FINISHED" | "DELIVERED";

export type CasePriorityType = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type PaymentMethodType = "CASH" | "UPI" | "BANK" | "ONLINE" | "CHEQUE";

export type InvoiceStatusType = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export interface DashboardStats {
  todayCases: number;
  pendingCases: number;
  deliveredCases: number;
  totalIncome: number;
  totalBalance: number;
  technicianWork: { name: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  recentCases: CaseWithRelations[];
}

export interface CaseWithRelations {
  id: string;
  caseNumber: string;
  date: string;
  workType: string;
  shade: string | null;
  material: string | null;
  teethNumbers: number[];
  technicianId: string | null;
  dueDate: string | null;
  priority: CasePriorityType;
  status: CaseStatusType;
  amount: number;
  remarks: string | null;
  dentist: {
    id: string;
    name: string;
    clinicName: string | null;
  };
  patient: {
    id: string;
    name: string;
  } | null;
  files: {
    id: string;
    fileName: string;
    fileType: string;
    filePath: string;
    fileSize: number;
  }[];
}

export const WORK_TYPES = [
  "Crown",
  "Bridge",
  "Denture - Full",
  "Denture - Partial",
  "Implant Crown",
  "Implant Bridge",
  "Veneer",
  "Inlay/Onlay",
  "Night Guard",
  "Retainer",
  "Orthodontic Appliance",
  "Surgical Guide",
  "Temporary Crown",
  "Post & Core",
  "Maryland Bridge",
  "Flipper",
  "Other",
] as const;

export const MATERIALS = [
  "Zirconia",
  "E-Max",
  "PFM (Porcelain Fused to Metal)",
  "Full Metal",
  "Acrylic",
  "Composite",
  "PEEK",
  "Titanium",
  "Cobalt Chrome",
  "Gold",
  "Ceramic",
  "Flexible Denture",
  "Wax",
  "Other",
] as const;

export const VITA_SHADES = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
  "BL1", "BL2", "BL3", "BL4",
  "OM1", "OM2", "OM3",
] as const;
