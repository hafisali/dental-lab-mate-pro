"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Shield, Plus, Loader2, Save, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

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

  const roleColors: Record<string, string> = {
    ADMIN: "bg-purple-50 text-purple-700 border border-purple-200",
    LAB_OWNER: "bg-blue-50 text-blue-700 border border-blue-200",
    RECEPTION: "bg-sky-50 text-sky-700 border border-sky-200",
    TECHNICIAN: "bg-amber-50 text-amber-700 border border-amber-200",
    DENTIST: "bg-green-50 text-green-700 border border-green-200",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your lab settings and users</p>
      </div>

      <Tabs defaultValue="lab">
        <TabsList className="bg-slate-100 rounded-xl p-1">
          <TabsTrigger value="lab" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <Building2 className="h-4 w-4 mr-1.5" />Lab Info
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <Users className="h-4 w-4 mr-1.5" />Users
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">
            <Shield className="h-4 w-4 mr-1.5" />Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Lab Information</CardTitle>
                  <CardDescription>Your lab profile and configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Lab Name</Label><Input defaultValue={user?.labName || ""} className="rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Email</Label><Input defaultValue="" className="rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Phone</Label><Input defaultValue="" className="rounded-xl" /></div>
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Currency</Label><Input defaultValue="INR" className="rounded-xl" /></div>
              </div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Address</Label><Input defaultValue="" className="rounded-xl" /></div>
              <Button className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20">
                <Save className="h-4 w-4 mr-2" />Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-800">Team Members</CardTitle>
                    <CardDescription>Manage users and their roles</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setUserDialogOpen(true)} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20">
                  <Plus className="h-4 w-4 mr-2" />Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const initials = u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                        return (
                          <TableRow key={u.id} className="hover:bg-sky-50/30 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  {initials}
                                </div>
                                <span className="font-semibold text-sm text-slate-700">{u.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">{u.email}</TableCell>
                            <TableCell>
                              <Badge className={`${roleColors[u.role] || 'bg-slate-100 text-slate-600'} text-[11px] font-medium rounded-full px-2.5 py-0.5`}>{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`rounded-full text-xs ${
                                u.active
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}>{u.active ? "Active" : "Inactive"}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Security Settings</CardTitle>
                  <CardDescription>Password and authentication settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Current Password</Label><Input type="password" className="rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">New Password</Label><Input type="password" className="rounded-xl" /></div>
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Confirm Password</Label><Input type="password" className="rounded-xl" /></div>
              <Button className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20">
                <Shield className="h-4 w-4 mr-2" />Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-slate-800">Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Name *</Label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Email *</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Password *</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={6} className="rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Role</Label>
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
              <div className="space-y-2"><Label className="text-sm font-medium text-slate-700">Phone</Label><Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="rounded-xl" /></div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setUserDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
