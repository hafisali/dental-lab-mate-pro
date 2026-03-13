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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
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

export default function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-900 transition-all duration-300 hidden lg:flex lg:flex-col",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      {/* Logo section */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700/50">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">DentalLab</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
          </Link>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-slate-700/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-0.5 px-3">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-sky-600/15 text-sky-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-sky-400 rounded-r-full" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-colors duration-200",
                  isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                )} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section at bottom */}
      <div className="border-t border-slate-700/50 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.role || "User"}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md" title={user?.name || "User"}>
              {initials}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
