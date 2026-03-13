"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, FolderOpen, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";

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
          <h1 className="text-2xl font-bold text-slate-800">Cases</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage work orders and case tracking</p>
        </div>
        <Link href="/cases/new">
          <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/20 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </div>

      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search cases, dentists, patients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 focus:border-sky-300 focus:ring-sky-200"
                />
              </div>
              <Button type="submit" variant="secondary" className="rounded-xl">Search</Button>
            </form>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}>
              <SelectTrigger className="w-[160px] rounded-xl border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
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
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading cases...</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case #</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Work Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((c) => (
                      <TableRow key={c.id} className="hover:bg-sky-50/30 transition-colors duration-150">
                        <TableCell>
                          <Link href={`/cases/${c.id}`} className="text-sky-600 hover:text-sky-700 font-semibold text-sm">
                            {c.caseNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                          {formatDate(c.date)}
                        </TableCell>
                        <TableCell>
                          {c.dentist?.id ? (
                            <Link href={`/dentists/${c.dentist.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                              {c.dentist.name}
                            </Link>
                          ) : <span className="text-slate-400">{c.dentist?.name || "-"}</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.patient?.id ? (
                            <Link href={`/patients/${c.patient.id}`} className="text-slate-600 hover:text-sky-600 text-sm transition-colors">
                              {c.patient.name}
                            </Link>
                          ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600">{c.workType}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={`${getPriorityColor(c.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{c.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm text-slate-700">{formatCurrency(c.amount)}</TableCell>
                        <TableCell>
                          {(c.dentist?.whatsapp || c.dentist?.phone) && (
                            <a
                              href={getWhatsAppUrl(
                                c.dentist.whatsapp || c.dentist.phone,
                                messageTemplates.statusUpdate(
                                  c.dentist.name,
                                  c.caseNumber,
                                  c.status
                                )
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                              title="Notify dentist via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {cases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <FolderOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                          <p className="font-medium text-slate-500">No cases found</p>
                          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-slate-700">{cases.length}</span> of <span className="font-medium text-slate-700">{pagination.total}</span> cases
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="rounded-lg"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
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
