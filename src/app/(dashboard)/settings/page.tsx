"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Users, Plus, Loader2, Save, Palette, Shield, User,
  Mail, Phone, MapPin, Globe, Camera, Bell, Moon, Lock,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import toast from "react-hot-toast";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  LAB_OWNER: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  RECEPTION: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  TECHNICIAN: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  DENTIST: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

const roleGradients: Record<string, string> = {
  ADMIN: "from-purple-400 to-purple-600",
  LAB_OWNER: "from-indigo-400 to-indigo-600",
  RECEPTION: "from-blue-400 to-blue-600",
  TECHNICIAN: "from-amber-400 to-amber-600",
  DENTIST: "from-emerald-400 to-emerald-600",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingLab, setSavingLab] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "RECEPTION", phone: "" });

  // Preference states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password) { toast.error("Fill all required fields"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("User created!");
      setUserDialogOpen(false);
      setUserForm({ name: "", email: "", password: "", role: "RECEPTION", phone: "" });
      const data = await fetch("/api/users").then((r) => r.json());
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) { toast.error(err.message || "Failed to create user"); } finally { setSaving(false); }
  };

  const handleSaveLab = async () => {
    setSavingLab(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 800));
    setSavingLab(false);
    toast.success("Settings saved!");
  };

  return (
    <div className="space-y-8 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Settings" subtitle="Manage your lab settings and users" />

      <div className="max-w-4xl">
        <Tabs defaultValue="profile">
          <TabsList className="bg-muted/80 backdrop-blur rounded-xl p-1 h-auto border border-border/50 flex-wrap">
            <TabsTrigger
              value="profile"
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2.5"
            >
              <User className="h-4 w-4 mr-1.5" />Profile
            </TabsTrigger>
            <TabsTrigger
              value="lab"
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2.5"
            >
              <Building2 className="h-4 w-4 mr-1.5" />Lab Info
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2.5"
            >
              <Users className="h-4 w-4 mr-1.5" />Team
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2.5"
            >
              <Shield className="h-4 w-4 mr-1.5" />Security
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2.5"
            >
              <Palette className="h-4 w-4 mr-1.5" />Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6 space-y-6">
            <GlassCard hover="none" delay={0.1}>
              {/* Avatar section */}
              <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/25">
                    {getInitials(user?.name || "User")}
                  </div>
                  <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera className="h-6 w-6 text-white" />
                  </button>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-2 border-background flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground tracking-tight">{user?.name || "Your Name"}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{user?.email || "your@email.com"}</p>
                  <Badge className={`${roleColors[user?.role || "ADMIN"]} text-[11px] font-semibold rounded-full px-2.5 py-0.5 border-0 mt-2`}>
                    {user?.role || "ADMIN"}
                  </Badge>
                </div>
              </div>

              {/* Profile form */}
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input defaultValue={user?.name || ""} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email
                    </Label>
                    <Input defaultValue={user?.email || ""} type="email" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone
                    </Label>
                    <Input defaultValue="" className="rounded-xl" placeholder="+91 98765 43210" />
                  </div>
                </div>
                <Button
                  onClick={handleSaveLab}
                  disabled={savingLab}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {savingLab ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Lab Info Tab */}
          <TabsContent value="lab" className="mt-6">
            <GlassCard hover="none" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Lab Information</h3>
                  <p className="text-sm text-muted-foreground">Your lab profile and configuration</p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Lab Name
                    </Label>
                    <Input defaultValue={user?.labName || ""} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email
                    </Label>
                    <Input defaultValue="" className="rounded-xl" placeholder="lab@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone
                    </Label>
                    <Input defaultValue="" className="rounded-xl" placeholder="+91 98765 43210" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      Currency
                    </Label>
                    <Input defaultValue="INR" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Address
                  </Label>
                  <Input defaultValue="" className="rounded-xl" placeholder="123 Lab Street, City, State" />
                </div>
                <Button
                  onClick={handleSaveLab}
                  disabled={savingLab}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {savingLab ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Users/Team Tab */}
          <TabsContent value="users" className="mt-6">
            <GlassCard padding="p-0" hover="none" delay={0.1}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">Team Members</h3>
                    <p className="text-sm text-muted-foreground">{users.length} member{users.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setUserDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4 mr-2" />Add User
                </Button>
              </div>

              {/* Team grid */}
              {loading ? (
                <div className="p-6 grid gap-4 sm:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[100px] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="p-6 grid gap-3 sm:grid-cols-2">
                  {users.map((u, index) => {
                    const initials = getInitials(u.name || "U");
                    return (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border/40 hover:bg-accent/30 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${roleGradients[u.role] || "from-indigo-400 to-violet-600"} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">{u.name}</span>
                            <div className={`w-2 h-2 rounded-full shrink-0 ${u.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                          <Badge className={`${roleColors[u.role] || "bg-muted text-muted-foreground"} text-[10px] font-semibold rounded-full px-2 py-0 border-0 mt-1`}>
                            {u.role}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="mt-6 space-y-6">
            <GlassCard hover="none" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                  <Shield className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Security</h3>
                  <p className="text-sm text-muted-foreground">Manage your password and security settings</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Change Password */}
                <div className="p-5 rounded-xl bg-muted/30 border border-border/40 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-bold text-foreground">Change Password</h4>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Current Password</Label>
                      <Input type="password" placeholder="Enter current password" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">New Password</Label>
                      <Input type="password" placeholder="Enter new password" className="rounded-xl" />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => toast.success("Password updated!")}
                  >
                    Update Password
                  </Button>
                </div>

                {/* Session Info */}
                <div className="p-5 rounded-xl bg-muted/30 border border-border/40">
                  <h4 className="text-sm font-bold text-foreground mb-3">Active Sessions</h4>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/30">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Current Session</p>
                      <p className="text-xs text-muted-foreground">This device - Active now</p>
                    </div>
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-0 rounded-full text-[10px] font-bold px-2">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-6 space-y-6">
            <GlassCard hover="none" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/50">
                  <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Preferences</h3>
                  <p className="text-sm text-muted-foreground">Customize your experience</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Appearance */}
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    Appearance
                  </h4>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                    <div>
                      <p className="text-sm font-medium text-foreground">Dark Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark themes</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Notifications
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: "Email Notifications", desc: "Receive notifications via email", state: emailNotifications, setter: setEmailNotifications },
                      { label: "Push Notifications", desc: "Browser push notifications", state: pushNotifications, setter: setPushNotifications },
                      { label: "Overdue Alerts", desc: "Get alerted when cases are overdue", state: overdueAlerts, setter: setOverdueAlerts },
                      { label: "Payment Reminders", desc: "Automatic payment due reminders", state: paymentReminders, setter: setPaymentReminders },
                    ].map((pref) => (
                      <div key={pref.label} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
                        <div>
                          <p className="text-sm font-medium text-foreground">{pref.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pref.desc}</p>
                        </div>
                        <Switch
                          checked={pref.state}
                          onCheckedChange={pref.setter}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSaveLab}
                  disabled={savingLab}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {savingLab ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Preferences
                </Button>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Name *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required className="rounded-xl" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="rounded-xl" placeholder="john@lab.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Password *</Label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} className="rounded-xl" placeholder="Min 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Role</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="LAB_OWNER">Lab Owner</SelectItem>
                    <SelectItem value="RECEPTION">Reception</SelectItem>
                    <SelectItem value="TECHNICIAN">Technician</SelectItem>
                    <SelectItem value="DENTIST">Dentist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Phone</Label>
                <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="rounded-xl" placeholder="+91..." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
