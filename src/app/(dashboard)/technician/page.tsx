"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, CheckCircle2, Clock, Loader2 } from "lucide-react";
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
        <h1 className="text-2xl font-bold">Technician Panel</h1>
        <p className="text-muted-foreground text-sm">Your assigned cases and work progress</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Active Cases</p><p className="text-2xl font-bold">{activeCases.length}</p></div>
            <div className="bg-orange-50 text-orange-600 p-3 rounded-xl"><Clock className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-600">{completedCases.length}</p></div>
            <div className="bg-green-50 text-green-600 p-3 rounded-xl"><CheckCircle2 className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Total Cases</p><p className="text-2xl font-bold">{cases.length}</p></div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Wrench className="h-5 w-5" /></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assigned Cases</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
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
          {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead className="hidden sm:table-cell">Dentist</TableHead>
                  <TableHead>Work Type</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/cases/${c.id}`} className="text-primary hover:underline font-medium">{c.caseNumber}</Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{c.dentist?.name}</TableCell>
                    <TableCell>{c.workType}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{c.dueDate ? formatDate(c.dueDate) : "-"}</TableCell>
                    <TableCell><Badge className={getStatusColor(c.status)} variant="secondary">{c.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {c.status === "RECEIVED" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "WORKING")}>Start</Button>
                      )}
                      {c.status === "WORKING" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "TRIAL")}>Trial</Button>
                      )}
                      {c.status === "TRIAL" && (
                        <Button size="sm" onClick={() => updateStatus(c.id, "FINISHED")}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Finish
                        </Button>
                      )}
                      {c.status === "FINISHED" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Done</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {cases.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No cases assigned</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
