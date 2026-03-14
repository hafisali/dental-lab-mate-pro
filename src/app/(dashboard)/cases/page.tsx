"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Plus, Search, FolderOpen, ChevronLeft, ChevronRight,
  MessageCircle, Flame, ArrowUp, Eye, Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, getStatusDot } from "@/lib/utils";
import { getWhatsAppUrl, messageTemplates } from "@/lib/whatsapp";

const STATUSES = [
  { value: "all", label: "All", icon: null },
  { value: "RECEIVED", label: "Received", dot: "bg-slate-400" },
  { value: "WORKING", label: "Working", dot: "bg-indigo-500" },
  { value: "TRIAL", label: "Trial", dot: "bg-amber-500" },
  { value: "FINISHED", label: "Finished", dot: "bg-emerald-500" },
  { value: "DELIVERED", label: "Delivered", dot: "bg-green-500" },
];

const STATUS_BORDER_COLORS: Record<string, string> = {
  RECEIVED: "border-l-slate-400",
  WORKING: "border-l-indigo-500",
  TRIAL: "border-l-amber-500",
  FINISHED: "border-l-emerald-500",
  DELIVERED: "border-l-green-500",
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  URGENT: <Flame className="h-3.5 w-3.5 text-red-500" />,
  HIGH: <ArrowUp className="h-3.5 w-3.5 text-amber-500" />,
};

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCases = useCallback(async (searchVal?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    const q = searchVal !== undefined ? searchVal : search;
    if (q) params.set("search", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(pagination.page));

    const res = await fetch(`/api/cases?${params}`);
    const data = await res.json();
    setCases(data.cases || []);
    setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    setLoading(false);
  }, [search, statusFilter, pagination.page]);

  useEffect(() => {
    fetchCases();
  }, [statusFilter, pagination.page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchCases(value);
    }, 400);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setPagination((p) => ({ ...p, page: 1 }));
    fetchCases();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cases" subtitle="Manage work orders and case tracking">
        <Link href="/cases/new">
          <Button className="group relative bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden">
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </Link>
      </PageHeader>

      <GlassCard hover="none" padding="p-0">
        <div className="p-5 pb-4 space-y-4">
          {/* Premium Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative group">
              <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search cases, dentists, patients..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:focus:ring-indigo-800 transition-all duration-200"
              />
            </div>
          </form>

          {/* Animated Status Pills */}
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <motion.button
                key={s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                whileTap={{ scale: 0.95 }}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  statusFilter === s.value
                    ? "text-white shadow-md"
                    : "bg-secondary/80 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {statusFilter === s.value && (
                  <motion.div
                    layoutId="activeStatusPill"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {"dot" in s && s.dot && statusFilter !== s.value && (
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  )}
                  {s.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3.5 px-2">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-4 w-20 hidden sm:block rounded-md" />
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-4 w-24 hidden md:block rounded-md" />
                    <Skeleton className="h-4 w-20 hidden md:block rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
                    <Skeleton className="h-4 w-16 ml-auto rounded-md" />
                  </div>
                ))}
              </motion.div>
            ) : cases.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={FolderOpen}
                  title="No cases found"
                  description="Try adjusting your search or filters, or create your first case."
                  action={{ label: "New Case", onClick: () => window.location.href = "/cases/new" }}
                />
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                        <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Case #</TableHead>
                        <TableHead className="hidden sm:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Date</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Dentist</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Patient</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Work Type</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</TableHead>
                        <TableHead className="hidden sm:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Priority</TableHead>
                        <TableHead className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Amount</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cases.map((c, index) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
                          className={`group border-b border-border/30 hover:bg-accent/40 transition-all duration-200 border-l-[3px] ${
                            STATUS_BORDER_COLORS[c.status] || "border-l-transparent"
                          }`}
                        >
                          <TableCell>
                            <Link href={`/cases/${c.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold text-sm transition-colors inline-flex items-center gap-1.5">
                              {c.caseNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDate(c.date)}
                          </TableCell>
                          <TableCell>
                            {c.dentist?.id ? (
                              <Link href={`/dentists/${c.dentist.id}`} className="text-foreground/80 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors font-medium">
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
                          <TableCell className="hidden md:table-cell text-sm text-foreground/70 font-medium">{c.workType}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 shadow-sm`} variant="secondary">
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)} animate-pulse`} />
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge className={`${getPriorityColor(c.priority)} text-[11px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1`} variant="secondary">
                              {PRIORITY_ICONS[c.priority] || null}
                              {c.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-foreground tabular-nums">{formatCurrency(c.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Link href={`/cases/${c.id}`}>
                                <button
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                  title="View case details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Link>
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
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pagination.totalPages > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between mt-5 pt-4 border-t border-border/30"
                  >
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{cases.length}</span> of <span className="font-semibold text-foreground">{pagination.total}</span> cases
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        className="rounded-xl border-border/50 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1 px-3">
                        <span className="text-sm font-semibold text-foreground">{pagination.page}</span>
                        <span className="text-sm text-muted-foreground">/</span>
                        <span className="text-sm text-muted-foreground">{pagination.totalPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        className="rounded-xl border-border/50 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
}
