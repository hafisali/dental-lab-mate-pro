"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Info, AlertTriangle, DollarSign, FolderOpen } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

const typeIcons: Record<string, any> = {
  info: Info,
  case: FolderOpen,
  payment: DollarSign,
  alert: AlertTriangle,
};

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  case: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-100" },
  payment: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  alert: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unreadCount > 0 ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </span>
            ) : (
              "All caught up!"
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50">
            <CheckCheck className="h-4 w-4 mr-2" />Mark All Read
          </Button>
        )}
      </div>

      <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">No notifications yet</p>
              <p className="text-sm text-slate-400 mt-1">You are all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Info;
                const colors = typeColors[n.type] || typeColors.info;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4 transition-all duration-200 cursor-pointer hover:bg-slate-50/80 ${
                      !n.read ? "bg-sky-50/30 border-l-[3px] border-l-sky-400" : "border-l-[3px] border-l-transparent"
                    }`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.read ? "font-semibold text-slate-800" : "text-slate-600"}`}>{n.title}</p>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1.5 font-medium">{formatDateTime(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
