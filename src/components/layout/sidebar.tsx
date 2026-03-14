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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  MessageCircle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole: string;
}

const menuSections = [
  {
    label: "PLATFORM",
    items: [
      { href: "/superadmin", label: "Platform Control", icon: Shield, roles: ["SUPERADMIN"], highlight: true },
    ],
  },
  {
    label: "MAIN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"], shortcut: "" },
      { href: "/cases", label: "Cases", icon: FolderOpen, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"], shortcut: "" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/dentists", label: "Dentists", icon: Users, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/patients", label: "Patients", icon: UserCircle, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "DENTIST"] },
      { href: "/billing", label: "Billing", icon: Receipt, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/inventory", label: "Inventory", icon: Package, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { href: "/cashflow", label: "Cash Flow", icon: DollarSign, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"] },
      { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION"] },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "TECHNICIAN"] },
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPERADMIN", "ADMIN", "LAB_OWNER"], shortcut: "" },
    ],
  },
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

  // Filter sections to only include items the user has access to
  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 70 : 250 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-[#0f0f23] hidden lg:flex lg:flex-col overflow-hidden",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-indigo-500/[0.03] before:via-transparent before:to-purple-500/[0.03] before:pointer-events-none"
        )}
      >
        {/* Animated shimmer line at top */}
        <div className="sidebar-shimmer-line w-full flex-shrink-0" />

        {/* Logo section */}
        <div className="relative flex h-16 items-center justify-between px-4 border-b border-white/[0.06]">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="relative">
                {/* Glow effect behind icon */}
                <div className="absolute inset-0 rounded-lg bg-indigo-500/30 blur-md" />
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
              <span className="font-bold text-base text-white tracking-tight">DentalLab</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-indigo-500/30 blur-md" />
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Activity className="h-4 w-4 text-white" />
                </div>
              </div>
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-2 border-b border-white/[0.06]">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-7 w-7 text-slate-500 hover:text-white hover:bg-white/[0.06] rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-1">
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.label}>
                {/* Section divider (not on first section) */}
                {sectionIndex > 0 && (
                  <div className={cn("section-divider my-3", collapsed ? "mx-2" : "mx-3")} />
                )}
                {/* Section label */}
                {!collapsed && (
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500/70">
                    {section.label}
                  </p>
                )}
                {collapsed && sectionIndex > 0 && (
                  <div className="mx-auto w-6 mb-2" />
                )}
                <div className="space-y-0.5">
                  {section.items.map((item: any) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    const isHighlight = item.highlight;

                    const linkContent = (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                          isHighlight
                            ? isActive
                              ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-300 border border-orange-500/30"
                              : "bg-gradient-to-r from-red-500/10 to-orange-500/10 text-orange-400 hover:from-red-500/20 hover:to-orange-500/20 border border-orange-500/20"
                            : isActive
                              ? "bg-indigo-500/15 text-indigo-300"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        {/* Active left border accent */}
                        {isActive && !isHighlight && (
                          <motion.div
                            layoutId="activeNavBorder"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute inset-0 bg-indigo-500/15 rounded-xl"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <motion.div
                          whileHover={{ scale: 1.15 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          className="relative z-10"
                        >
                          <Icon className={cn(
                            "h-5 w-5 shrink-0 transition-colors duration-200",
                            isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                          )} />
                        </motion.div>
                        {!collapsed && (
                          <span className="relative z-10 flex-1">{item.label}</span>
                        )}
                        {/* Keyboard shortcut hint */}
                        {!collapsed && item.shortcut && (
                          <span className="relative z-10 text-[10px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {item.shortcut}
                          </span>
                        )}
                      </Link>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-[#1a1a3e] text-white border-white/10 text-xs font-medium shadow-xl shadow-black/20">
                            <div className="flex items-center gap-2">
                              {item.label}
                              {item.shortcut && (
                                <span className="text-[10px] text-slate-400 font-mono">{item.shortcut}</span>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return linkContent;
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User section at bottom */}
        <div className="border-t border-white/[0.06] p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] backdrop-blur-sm p-3 border border-white/[0.06]">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/25">
                  {initials}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0f0f23] shadow-sm shadow-emerald-400/50" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.role || "User"}</p>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/25 cursor-default">
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0f0f23] shadow-sm shadow-emerald-400/50" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1a3e] text-white border-white/10">
                <p className="font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-slate-400">{user?.role || "User"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
