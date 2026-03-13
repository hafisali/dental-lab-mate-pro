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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["ADMIN", "LAB_OWNER", "TECHNICIAN"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "LAB_OWNER"] },
];

export default function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300 hidden lg:block",
        collapsed ? "w-[70px]" : "w-[250px]"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg">DentalLab</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <Activity className="h-7 w-7 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <nav className="space-y-1 p-3">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <>
            <Separator className="mx-3" />
            <div className="p-4">
              <div className="rounded-lg bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">Dental Lab Mate Pro</p>
                <p className="text-xs text-muted-foreground mt-1">v1.0.0</p>
              </div>
            </div>
          </>
        )}
      </ScrollArea>
    </aside>
  );
}
