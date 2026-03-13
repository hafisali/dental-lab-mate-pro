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
  { href: "/technician", label: "Technician Panel", icon: Wrench, roles: ["ADMIN", "LAB_OWNER", "TECHNICIAN"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "LAB_OWNER", "RECEPTION", "TECHNICIAN", "DENTIST"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "LAB_OWNER"] },
];

export default function MobileSidebar({ open, onClose, userRole }: MobileSidebarProps) {
  const pathname = usePathname();

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 lg:hidden" onClick={onClose} />
      <div className="fixed left-0 top-0 z-50 h-full w-[280px] bg-card border-r lg:hidden animate-in slide-in-from-left">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <Activity className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg">DentalLab</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
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
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </>
  );
}
