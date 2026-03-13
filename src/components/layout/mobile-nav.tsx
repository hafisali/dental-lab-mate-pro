"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Receipt,
  Bell,
  Menu,
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/cases", label: "Cases", icon: FolderOpen },
    { href: "/billing", label: "Billing", icon: Receipt },
    { href: "/notifications", label: "Alerts", icon: Bell },
    { href: "/settings", label: "More", icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-md lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-all duration-200 rounded-lg",
                isActive
                  ? "text-sky-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "p-1 rounded-lg transition-all duration-200",
                isActive && "bg-sky-50"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "text-sky-600")} />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
