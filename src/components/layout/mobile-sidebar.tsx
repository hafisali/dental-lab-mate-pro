"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    label: "TOOLS",
    items: [
      { href: "/cashflow", label: "Cash Flow", icon: DollarSign, roles: ["ADMIN", "LAB_OWNER"] },
      { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["ADMIN", "LAB_OWNER", "TECHNICIAN"] },
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "LAB_OWNER"] },
    ],
  },
];

export default function MobileSidebar({ open, onClose, userRole }: MobileSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed left-0 top-0 z-50 h-full w-[280px] bg-[#0f0f23] lg:hidden flex flex-col"
            style={{
              backgroundImage: "linear-gradient(to bottom, rgba(99, 102, 241, 0.03), transparent, rgba(139, 92, 246, 0.03))",
            }}
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.06]">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-base text-white tracking-tight">DentalLab</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 py-3">
              <nav className="px-3 space-y-5">
                {filteredSections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500/70">
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
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                              isActive
                                ? "bg-indigo-500/15 text-indigo-300"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="mobileActiveNav"
                                className="absolute inset-0 bg-indigo-500/15 rounded-xl"
                                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                              />
                            )}
                            <Icon className={cn(
                              "h-5 w-5 shrink-0 relative z-10 transition-colors duration-200",
                              isActive ? "text-indigo-400" : "text-slate-500"
                            )} />
                            <span className="relative z-10">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>

            {/* User section */}
            <div className="border-t border-white/[0.06] p-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] backdrop-blur-sm p-3 border border-white/[0.06]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.role || "User"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
