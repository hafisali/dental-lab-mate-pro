"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, Info, AlertTriangle, DollarSign, FolderOpen } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import toast from "react-hot-toast";

const typeIcons: Record<string, any> = {
  info: Info,
  case: FolderOpen,
  payment: DollarSign,
  alert: AlertTriangle,
};

const typeColors: Record<string, { bg: string; text: string }> = {
  info: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-500 dark:text-blue-400" },
  case: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-500 dark:text-indigo-400" },
  payment: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-500 dark:text-emerald-400" },
  alert: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-500 dark:text-amber-400" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
      });
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch { toast.error("Failed"); }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up!"
        }
      >
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="rounded-xl">
            <CheckCheck className="h-4 w-4 mr-2" />Mark All Read
          </Button>
        )}
      </PageHeader>

      <div className="max-w-3xl space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[300px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="You are all caught up! Notifications will appear here."
          />
        ) : (
          notifications.map((n, index) => {
            const Icon = typeIcons[n.type] || Info;
            const colors = typeColors[n.type] || typeColors.info;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => !n.read && markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                  !n.read
                    ? "border-primary/20 bg-primary/5 dark:bg-primary/10"
                    : "border-border/50 bg-card hover:bg-accent/50"
                }`}
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 ${colors.bg}`}>
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5 font-medium">
                    {getRelativeTime(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
