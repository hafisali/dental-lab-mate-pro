"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, LogOut, User, Search, ChevronRight, Settings, Command } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { motion } from "framer-motion";

interface HeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/cases": "Cases",
  "/dentists": "Dentists",
  "/patients": "Patients",
  "/billing": "Billing",
  "/inventory": "Inventory",
  "/cashflow": "Cash Flow",
  "/analytics": "Analytics",
  "/whatsapp": "WhatsApp",
  "/technician": "Technician Panel",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

function getBreadcrumb(pathname: string): { parent?: string; parentHref?: string; current: string } {
  // Handle nested routes like /cases/new or /cases/[id]
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length >= 2) {
    const parentPath = `/${segments[0]}`;
    const parentName = pageTitles[parentPath] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);

    let currentName = segments[1];
    if (currentName === "new") {
      currentName = "New";
    } else {
      currentName = "Details";
    }

    return {
      parent: parentName,
      parentHref: parentPath,
      current: currentName,
    };
  }

  const current = pageTitles[pathname] || "Page";
  return { current };
}

function getRoleBadgeColor(role?: string) {
  switch (role) {
    case "SUPERADMIN": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "ADMIN": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    case "LAB_OWNER": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "TECHNICIAN": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "DENTIST": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "RECEPTION": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user as any;

  const initials = user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden hover:bg-accent rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm">
          {breadcrumb.parent && breadcrumb.parentHref ? (
            <>
              <Link
                href={breadcrumb.parentHref}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
              >
                {breadcrumb.parent}
              </Link>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="font-semibold text-foreground"
              >
                {breadcrumb.current}
              </motion.span>
            </>
          ) : (
            <motion.span
              key={breadcrumb.current}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="font-semibold text-foreground"
            >
              {breadcrumb.current}
            </motion.span>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Cmd+K Search trigger - more prominent */}
        <Button
          variant="outline"
          className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border-border/50 text-muted-foreground hover:text-foreground hover:border-indigo-300/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 text-sm transition-all duration-200"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-[10px]">&#8984;</span>K
          </kbd>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell with pulse */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative hover:bg-accent rounded-xl">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background animate-notification-pulse"
            >
              3
            </motion.span>
          </Button>
        </Link>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2.5 px-2 hover:bg-accent rounded-xl">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">{user?.name}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{user?.role}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-lg border-border/50 p-1">
            <DropdownMenuLabel className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <span className={`inline-flex self-start items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center justify-between cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">&#8984;P</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center justify-between cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">&#8984;,</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 cursor-pointer rounded-lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
