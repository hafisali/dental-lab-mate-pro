"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  CalendarDays,
  FolderOpen,
  Users,
  UserCircle,
  Receipt,
  Package,
  ClipboardList,
  Wrench,
  DollarSign,
  BarChart3,
  UserCog,
  Bell,
  Settings,
  CreditCard,
  MessageCircle,
  Stethoscope,
  Pill,
} from "lucide-react";

interface Module {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  bgColor: string;
  iconColor: string;
  roles: string[];
}

const modules: Module[] = [
  // Row 1
  { href: "/appointments", label: "Appointments", icon: CalendarDays, bgColor: "#e3f2fd", iconColor: "#1565c0", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
  { href: "/cases", label: "Cases", icon: FolderOpen, bgColor: "#e3f2fd", iconColor: "#1565c0", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/dentists", label: "Dentists", icon: Users, bgColor: "#e0f2f1", iconColor: "#00796b", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/patients", label: "Patients", icon: UserCircle, bgColor: "#e8f5e9", iconColor: "#2e7d32", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
  { href: "/billing", label: "Billing", icon: Receipt, bgColor: "#fff3e0", iconColor: "#e65100", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/inventory", label: "Inventory", icon: Package, bgColor: "#f3e5f5", iconColor: "#6a1b9a", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
  { href: "/prescriptions", label: "Prescriptions", icon: ClipboardList, bgColor: "#e3f2fd", iconColor: "#1565c0", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },

  // Row 2
  { href: "/technician", label: "Technician Panel", icon: Wrench, bgColor: "#e0f7fa", iconColor: "#00838f", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "TECHNICIAN"] },
  { href: "/cashflow", label: "Cash Flow", icon: DollarSign, bgColor: "#e8f5e9", iconColor: "#2e7d32", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, bgColor: "#e3f2fd", iconColor: "#1565c0", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/staff", label: "Staff", icon: UserCog, bgColor: "#f3e5f5", iconColor: "#6a1b9a", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
  { href: "/notifications", label: "Notifications", icon: Bell, bgColor: "#fffde7", iconColor: "#f9a825", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/settings", label: "Settings", icon: Settings, bgColor: "#f5f5f5", iconColor: "#616161", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
  { href: "/subscription", label: "Subscription", icon: CreditCard, bgColor: "#e8eaf6", iconColor: "#283593", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },

  // Row 3
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, bgColor: "#e8f5e9", iconColor: "#2e7d32", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/orthodontics", label: "Orthodontics", icon: Stethoscope, bgColor: "#e0f2f1", iconColor: "#00796b", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill, bgColor: "#ffebee", iconColor: "#c62828", roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "RECEPTION";

  const visibleModules = modules.filter((m) => m.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-white p-6 lg:p-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
        {visibleModules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: mod.bgColor }}
            >
              <mod.icon
                className="w-8 h-8"
                style={{ color: mod.iconColor }}
              />
            </div>
            <span className="text-xs text-gray-700 text-center font-medium leading-tight">
              {mod.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
