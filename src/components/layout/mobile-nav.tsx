"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-bottom-bar lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-all duration-200 rounded-lg relative",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <motion.div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-indigo-50 dark:bg-indigo-500/10"
                )}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <motion.div
                  animate={isActive ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    isActive && "text-indigo-600 dark:text-indigo-400"
                  )} />
                </motion.div>
              </motion.div>
              <span>{item.label}</span>
              {/* Active gradient indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute -bottom-0.5 w-5 h-[3px] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
