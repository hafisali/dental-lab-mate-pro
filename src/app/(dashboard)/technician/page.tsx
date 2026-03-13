"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, CheckCircle2, Clock, PlayCircle, Filter, FolderOpen } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function TechnicianPage() {
  const { data: session } = useSession();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/cases?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCases(data.cases || []);
        setLoading(false);
      });
  }, [statusFilter]);

  const updateStatus = async (caseId: string, status: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status } : c)));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Failed to update status"); }
  };

  const activeCases = cases.filter((c) => ["RECEIVED", "WORKING", "TRIAL"].includes(c.status));
  const completedCases = cases.filter((c) => ["FINISHED", "DELIVERED"].includes(c.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Technician Panel</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Your assigned cases and work progress</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Cases</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{activeCases.length}</p>
              </div>
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><Clock className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-green-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{completedCases.length}</p>
              </div>
              <div className="bg-green-50 text-green-600 p-2.5 rounded-xl"><CheckCircle2 className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cases</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{cases.length}</p>
              </div>
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Wrench className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-sky-500" />
              Assigned Cases
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] rounded-xl border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="WORKING">Working</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="FINISHED">Finished</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id} className="hover:bg-sky-50/30 transition-colors">
                      <TableCell>
                        <Link href={`/cases/${c.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">{c.caseNumber}</Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-slate-600">{c.dentist?.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{c.workType}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">{c.dueDate ? formatDate(c.dueDate) : "-"}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "RECEIVED" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "WORKING")} className="rounded-lg text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600">
                            <PlayCircle className="h-3.5 w-3.5 mr-1" />Start
                          </Button>
                        )}
                        {c.status === "WORKING" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "TRIAL")} className="rounded-lg text-xs hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600">
                            Trial
                          </Button>
                        )}
                        {c.status === "TRIAL" && (
                          <Button size="sm" onClick={() => updateStatus(c.id, "FINISHED")} className="rounded-lg text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Finish
                          </Button>
                        )}
                        {c.status === "FINISHED" && (
                          <Badge className="bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold px-2.5 py-0.5">Done</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {cases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                        <p className="font-medium text-slate-500">No cases assigned</p>
                        <p className="text-sm text-slate-400 mt-1">New cases will appear here</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
