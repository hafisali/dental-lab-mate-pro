"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import CommandPalette from "@/components/shared/command-palette";
import TrialBanner from "@/components/shared/trial-banner";
import AppointmentBot from "@/components/shared/appointment-bot";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const user = session.user as any;
      if (user.onboardingComplete === false && pathname !== "/onboarding") {
        router.push("/onboarding");
      }
    }
  }, [status, session, pathname, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) return null;

  const userRole = (session.user as any)?.role || "RECEPTION";
  const userPlanTier = (session.user as any)?.planTier || "TRIAL";
  const trialEndsAt = (session.user as any)?.trialEndsAt || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole={userRole} />
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={userRole}
      />

      <div className="lg:ml-[250px]">
        <Header onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          {userPlanTier === "TRIAL" && (
            <TrialBanner planTier={userPlanTier} trialEndsAt={trialEndsAt} />
          )}
          {children}
        </main>
      </div>

      <MobileNav />
      <CommandPalette />
      <AppointmentBot />
    </div>
  );
}
