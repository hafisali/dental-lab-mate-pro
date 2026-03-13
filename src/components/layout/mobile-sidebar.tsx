"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  userRole: string;
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/cases", label: "Cases", icon: FolderOpen, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/dentists", label: "Dentists", icon: Users, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/patients", label: "Patients", icon: UserCircle, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
  { href: "/billing", label: "Billing", icon: Receipt, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["ADMIN", "LAB_OWNER"] },
  { href: "/cashflow", label: "Cash Flow", icon: DollarSign, roles: ["ADMIN", "LAB_OWNER"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["ADMIN", "LAB_OWNER", "RECEPTION"] },
  { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["ADMIN", "LAB_OWNER", "TECHNICIAN"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "LAB_OWNER"] },
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

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-[280px] bg-slate-900 lg:hidden animate-in slide-in-from-left flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">DentalLab</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-3">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-sky-600/15 text-sky-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sky-400 rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-sky-400" : "text-slate-500"
                  )} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t border-slate-700/50 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.role || "User"}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
