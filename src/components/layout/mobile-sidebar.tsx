"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCircle,
  Receipt,
  Package,
  Wrench,
  Bell,
  Settings,
  Activity,
  X,
  DollarSign,
  BarChart3,
  MessageCircle,
  CalendarDays,
  Pill,
  ClipboardList,
  UserCog,
  Stethoscope,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole: string;
}

const menuSections = [
  {
    label: "MAIN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
      { href: "/cases", label: "Cases", icon: FolderOpen, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
      { href: "/appointments", label: "Appointments", icon: CalendarDays, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/dentists", label: "Dentists", icon: Users, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/patients", label: "Patients", icon: UserCircle, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
      { href: "/billing", label: "Billing", icon: Receipt, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/inventory", label: "Inventory", icon: Package, roles: ["ADMIN", "LAB_OWNER"] },
    ],
  },
  {
    label: "CLINICAL",
    items: [
      { href: "/prescriptions", label: "Prescriptions", icon: ClipboardList, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
      { href: "/orthodontics", label: "Orthodontics", icon: Stethoscope, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
      { href: "/pharmacy", label: "Pharmacy", icon: Pill, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/cashflow", label: "Cash Flow", icon: DollarSign, roles: ["ADMIN", "LAB_OWNER"] },
      { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/staff", label: "Staff", icon: UserCog, roles: ["ADMIN", "LAB_OWNER"] },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["ADMIN", "LAB_OWNER", "TECHNICIAN"] },
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
      { href: "/subscription", label: "Subscription", icon: CreditCard, roles: ["ADMIN", "LAB_OWNER"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "LAB_OWNER"] },
    ],
  },
];

export default function MobileSidebar({ open, onClose, userRole }: MobileSidebarProps) {
  const pathname = usePathname();

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((section) => section.items.length > 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 lg:hidden transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed left-0 top-0 z-50 h-full w-[250px] lg:hidden flex flex-col transition-transform duration-200"
        style={{ backgroundColor: "#0e4a7b" }}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-white tracking-tight">DentalLab</span>
          </Link>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-md p-1.5 transition-colors duration-150"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-3">
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.label}>
                {sectionIndex > 0 && (
                  <div className="mx-2 my-2 border-t border-white/10" />
                )}
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                          isActive
                            ? "bg-white/15 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </>
  );
}
