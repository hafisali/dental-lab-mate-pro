"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const userRole = (session.user as any)?.role || "RECEPTION";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        userRole={userRole}
      />
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={userRole}
      />

      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-[70px]" : "lg:ml-[250px]"
        )}
      >
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
