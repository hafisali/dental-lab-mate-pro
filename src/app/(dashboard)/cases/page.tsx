"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Search, FolderOpen, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, getStatusDot } from "@/lib/utils";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "WORKING", label: "Working" },
  { value: "TRIAL", label: "Trial" },
  { value: "FINISHED", label: "Finished" },
  { value: "DELIVERED", label: "Delivered" },
];

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
      <PageHeader title="Cases" subtitle="Manage work orders and case tracking">
        <Link href="/cases/new">
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </PageHeader>

      <GlassCard hover="none" padding="p-0">
        <div className="p-5 pb-4 space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search cases, dentists, patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 dark:focus:ring-indigo-800 transition-all"
              />
            </div>
            <Button type="submit" variant="secondary" className="rounded-xl px-5">
              Search
            </Button>
          </form>

          {/* Segmented pill-style status filter */}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  statusFilter === s.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24 hidden md:block" />
                  <Skeleton className="h-4 w-20 hidden md:block" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No cases found"
              description="Try adjusting your search or filters, or create your first case."
              action={{ label: "New Case", onClick: () => window.location.href = "/cases/new" }}
            />
          ) : (
            <>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case #</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dentist</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((c, index) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="border-b border-border/50 hover:bg-accent/50 transition-colors duration-150"
                      >
                        <TableCell>
                          <Link href={`/cases/${c.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold text-sm transition-colors">
                            {c.caseNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {formatDate(c.date)}
                        </TableCell>
                        <TableCell>
                          {c.dentist?.id ? (
                            <Link href={`/dentists/${c.dentist.id}`} className="text-foreground/80 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                              {c.dentist.name}
                            </Link>
                          ) : <span className="text-muted-foreground">{c.dentist?.name || "-"}</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.patient?.id ? (
                            <Link href={`/patients/${c.patient.id}`} className="text-foreground/80 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                              {c.patient.name}
                            </Link>
                          ) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-foreground/80">{c.workType}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5`} variant="secondary">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)}`} />
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={`${getPriorityColor(c.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5`} variant="secondary">{c.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm text-foreground">{formatCurrency(c.amount)}</TableCell>
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
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] transition-colors"
                              title="Notify dentist via WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{cases.length}</span> of <span className="font-medium text-foreground">{pagination.total}</span> cases
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                      className="rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                      className="rounded-xl"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
