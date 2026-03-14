"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Info, AlertTriangle, DollarSign, FolderOpen, MessageCircle, Inbox } from "lucide-react";
import { getRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GlassCard } from "@/components/shared/glass-card";
import toast from "react-hot-toast";

const typeIcons: Record<string, any> = {
  info: Info,
  case: FolderOpen,
  payment: DollarSign,
  alert: AlertTriangle,
  whatsapp: MessageCircle,
};

const typeColors: Record<string, { bg: string; text: string; ring: string }> = {
  info: { bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-500 dark:text-blue-400", ring: "ring-blue-200 dark:ring-blue-800" },
  case: { bg: "bg-indigo-50 dark:bg-indigo-950/50", text: "text-indigo-500 dark:text-indigo-400", ring: "ring-indigo-200 dark:ring-indigo-800" },
  payment: { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-500 dark:text-emerald-400", ring: "ring-emerald-200 dark:ring-emerald-800" },
  alert: { bg: "bg-amber-50 dark:bg-amber-950/50", text: "text-amber-500 dark:text-amber-400", ring: "ring-amber-200 dark:ring-amber-800" },
  whatsapp: { bg: "bg-green-50 dark:bg-green-950/50", text: "text-green-500 dark:text-green-400", ring: "ring-green-200 dark:ring-green-800" },
};

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Earlier";
}

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

  // Group notifications by date
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const order = ["Today", "Yesterday", "This Week", "Earlier"];

    for (const n of notifications) {
      const group = getDateGroup(n.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    }

    return order
      .filter((g) => groups[g]?.length)
      .map((label) => ({ label, items: groups[label] }));
  }, [notifications]);

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up!"
        }
      >
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllRead}
            className="rounded-xl border-border/60 hover:bg-accent transition-all duration-200"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </PageHeader>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Bell className="h-5 w-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
            </span>
          </div>
          <span className="text-sm font-semibold text-foreground">{unreadCount} new</span>
        </motion.div>
      )}

      <div className="max-w-3xl space-y-6">
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
          <GlassCard hover="none" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 -m-4 rounded-full border border-border/20 animate-pulse" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 flex items-center justify-center">
                  <Inbox className="h-10 w-10 text-indigo-400/60" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground tracking-tight mb-1">All caught up!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                No notifications to show. New alerts and updates will appear here.
              </p>
            </div>
          </GlassCard>
        ) : (
          grouped.map((group, groupIndex) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
            >
              {/* Group label */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group.label}</h2>
                <div className="flex-1 h-px bg-border/40" />
                <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-2 py-0 border-0">
                  {group.items.length}
                </Badge>
              </div>

              <div className="space-y-2">
                {group.items.map((n: any, index: number) => {
                  const Icon = typeIcons[n.type] || Info;
                  const colors = typeColors[n.type] || typeColors.info;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: groupIndex * 0.1 + index * 0.04 }}
                      onClick={() => !n.read && markRead(n.id)}
                      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        !n.read
                          ? "border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] hover:bg-primary/[0.06] dark:hover:bg-primary/[0.1] shadow-sm"
                          : "border-border/40 bg-card/50 hover:bg-accent/50"
                      }`}
                    >
                      {/* Icon */}
                      <div className={`relative p-2.5 rounded-xl shrink-0 ${colors.bg}`}>
                        <Icon className={`h-4 w-4 ${colors.text}`} />
                        {!n.read && (
                          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background">
                            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-tight ${!n.read ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground/60 font-medium whitespace-nowrap shrink-0 mt-0.5">
                            {getRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
