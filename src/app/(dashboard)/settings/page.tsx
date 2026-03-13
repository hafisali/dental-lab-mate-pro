"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Plus, Loader2, Save, Palette } from "lucide-react";
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

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "RECEPTION", phone: "" });

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

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <PageHeader title="Settings" subtitle="Manage your lab settings and users" />

      <div className="max-w-4xl">
        <Tabs defaultValue="lab">
          <TabsList className="bg-muted/80 backdrop-blur rounded-full p-1 h-auto border border-border/50">
            <TabsTrigger
              value="lab"
              className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2"
            >
              <Building2 className="h-4 w-4 mr-1.5" />Lab Info
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2"
            >
              <Users className="h-4 w-4 mr-1.5" />Users
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground text-sm px-4 py-2"
            >
              <Palette className="h-4 w-4 mr-1.5" />Preferences
            </TabsTrigger>
          </TabsList>

          {/* Lab Info Tab */}
          <TabsContent value="lab" className="mt-6">
            <GlassCard hover="none" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Lab Information</h3>
                  <p className="text-sm text-muted-foreground">Your lab profile and configuration</p>
                </div>
              </div>
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Lab Name</Label>
                    <Input defaultValue={user?.labName || ""} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Email</Label>
                    <Input defaultValue="" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Phone</Label>
                    <Input defaultValue="" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Currency</Label>
                    <Input defaultValue="INR" className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Address</Label>
                  <Input defaultValue="" className="rounded-xl" />
                </div>
                <Button className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                  <Save className="h-4 w-4 mr-2" />Save Changes
                </Button>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <GlassCard padding="p-0" hover="none" delay={0.1}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Team Members</h3>
                    <p className="text-sm text-muted-foreground">Manage users and their roles</p>
                  </div>
                </div>
                <Button
                  onClick={() => setUserDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                >
                  <Plus className="h-4 w-4 mr-2" />Add User
                </Button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="p-6 space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[180px]" />
                      <Skeleton className="h-4 w-[80px]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u, index) => {
                        const initials = getInitials(u.name || "U");
                        return (
                          <motion.tr
                            key={u.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {initials}
                                </div>
                                <span className="font-semibold text-sm text-foreground">{u.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge className={`${roleColors[u.role] || "bg-muted text-muted-foreground"} text-[11px] font-medium rounded-full px-2.5 py-0.5 border-0`}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`rounded-full text-xs border-0 ${
                                u.active
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                              }`}>
                                {u.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="mt-6">
            <GlassCard hover="none" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50">
                  <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Preferences</h3>
                  <p className="text-sm text-muted-foreground">Customize your experience</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Appearance Section */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Appearance</h4>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">Dark Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark themes</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Name *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Password *</Label>
              <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} className="rounded-xl" />
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
                <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="rounded-xl" />
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
