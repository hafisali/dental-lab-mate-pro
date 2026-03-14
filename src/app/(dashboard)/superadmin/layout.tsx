"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, LayoutGroup } from "framer-motion";
import {
  BarChart3,
  Building2,
  CreditCard,
  Activity,
  Shield,
} from "lucide-react";

const tabs = [
  { key: "overview", label: "Overview", icon: BarChart3, href: "/superadmin" },
  { key: "tenants", label: "Tenants", icon: Building2, href: "/superadmin/tenants" },
  { key: "subscriptions", label: "Subscriptions", icon: CreditCard, href: "/superadmin/subscriptions" },
];

function getActiveTab(pathname: string): string {
  if (pathname.includes("/tenants")) return "tenants";
  if (pathname.includes("/subscriptions")) return "subscriptions";
  return "overview";
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const activeTab = getActiveTab(pathname);

  if (status === "loading") return null;
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
    return null;
  }

  return (
    <div className="space-y-8 min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Platform Control Center
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tenants, subscriptions, revenue, and platform management
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sub-Navigation Tabs */}
      <LayoutGroup>
        <div className="relative">
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border/50 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => router.push(tab.href)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="superadminActiveTab"
                    className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/50"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </LayoutGroup>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
