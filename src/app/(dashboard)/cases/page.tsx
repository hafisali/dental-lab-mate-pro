"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const fetchCases = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(pagination.page));

    const res = await fetch(`/api/cases?${params}`);
    const data = await res.json();
    setCases(data.cases || []);
    setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, pagination.page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchCases();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-muted-foreground text-sm">Manage work orders and case tracking</p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases, dentists, patients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="WORKING">Working</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="FINISHED">Finished</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading cases...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case #</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Dentist</TableHead>
                    <TableHead className="hidden md:table-cell">Patient</TableHead>
                    <TableHead className="hidden md:table-cell">Work Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Priority</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/cases/${c.id}`} className="text-primary hover:underline font-medium">
                          {c.caseNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(c.date)}
                      </TableCell>
                      <TableCell>
                        {c.dentist?.id ? (
                          <Link href={`/dentists/${c.dentist.id}`} className="text-sky-600 hover:underline">
                            {c.dentist.name}
                          </Link>
                        ) : c.dentist?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {c.patient?.id ? (
                          <Link href={`/patients/${c.patient.id}`} className="text-sky-600 hover:underline">
                            {c.patient.name}
                          </Link>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{c.workType}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(c.status)} variant="secondary">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={getPriorityColor(c.priority)} variant="secondary">{c.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {cases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No cases found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {cases.length} of {pagination.total} cases
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
