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
import { Bell, Menu, LogOut, User, Search, ChevronRight } from "lucide-react";
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
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {breadcrumb.parent}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-semibold text-foreground">{breadcrumb.current}</span>
            </>
          ) : (
            <span className="font-semibold text-foreground">{breadcrumb.current}</span>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Cmd+K Search trigger */}
        <Button
          variant="outline"
          className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent text-sm"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-[10px]">&#8984;</span>K
          </kbd>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative hover:bg-accent rounded-xl">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background"
            >
              3
            </motion.span>
          </Button>
        </Link>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2.5 px-2 hover:bg-accent rounded-xl">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">{user?.name}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{user?.role}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-border/50">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600 focus:text-red-600 cursor-pointer"
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
