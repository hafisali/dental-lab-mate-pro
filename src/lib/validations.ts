import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const caseSchema = z.object({
  dentistId: z.string().min(1, "Dentist is required"),
  patientId: z.string().optional(),
  teethNumbers: z.array(z.number()).min(1, "Select at least one tooth"),
  workType: z.string().min(1, "Work type is required"),
  shade: z.string().optional(),
  material: z.string().optional(),
  technicianId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  amount: z.number().min(0).default(0),
  remarks: z.string().optional(),
});

export const dentistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clinicName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(0).max(150).optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  dentistId: z.string().min(1, "Dentist is required"),
  notes: z.string().optional(),
});

export const invoiceSchema = z.object({
  caseId: z.string().optional(),
  dentistId: z.string().min(1, "Dentist is required"),
  amount: z.number().min(0, "Amount must be positive"),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  invoiceId: z.string().optional(),
  dentistId: z.string().min(1, "Dentist is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  method: z.enum(["CASH", "UPI", "BANK", "ONLINE", "CHEQUE"]).default("CASH"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const inventorySchema = z.object({
  name: z.string().min(1, "Item name is required"),
  category: z.string().optional(),
  stock: z.number().min(0).default(0),
  unit: z.string().default("pcs"),
  costPerUnit: z.number().min(0).default(0),
  minStock: z.number().min(0).default(5),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"]),
  phone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CaseInput = z.infer<typeof caseSchema>;
export type DentistInput = z.infer<typeof dentistSchema>;
export type PatientInput = z.infer<typeof patientSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type UserInput = z.infer<typeof userSchema>;
