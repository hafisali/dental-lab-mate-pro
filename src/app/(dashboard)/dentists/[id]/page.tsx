"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Building2, Phone, MessageCircle, Mail, MapPin,
  FileText, Users, CreditCard, FolderOpen, Wallet, AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getStatusDot, getInitials } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { motion } from "framer-motion";
import { StatCard } from "@/components/shared/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function DetailSkeleton() {
  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function DentistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [dentist, setDentist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDentist = async () => {
      try {
        const res = await fetch(`/api/dentists/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setDentist(data);
      } catch {
        setError("Dentist not found");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchDentist();
  }, [params.id]);

  if (loading) return <DetailSkeleton />;

  if (error || !dentist) {
    return (
      <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <p className="text-muted-foreground font-medium">{error || "Dentist not found"}</p>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">Go Back</Button>
        </div>
      </div>
    );
  }

  const agg = dentist._aggregates;

  const contactItems = [
    { icon: Phone, label: "Phone", value: dentist.phone, color: "blue", show: !!dentist.phone },
    { icon: Mail, label: "Email", value: dentist.email, color: "amber", show: !!dentist.email },
    { icon: MapPin, label: "Address", value: dentist.address, color: "purple", show: !!dentist.address },
  ];

  const colorMap: Record<string, { bg: string; iconColor: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-950/50", iconColor: "text-blue-500 dark:text-blue-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/50", iconColor: "text-amber-500 dark:text-amber-400" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/50", iconColor: "text-purple-500 dark:text-purple-400" },
  };

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {/* Decorative background gradient */}
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent" />

        <div className="flex items-start gap-4 p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mt-1 rounded-xl hover:bg-accent border border-border/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-start gap-5 flex-1">
            {/* Large Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-indigo-500/25 flex-shrink-0"
            >
              {getInitials(dentist.name || "D")}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{dentist.name}</h1>
                <Badge
                  variant={dentist.active ? "default" : "secondary"}
                  className={`rounded-full text-xs font-medium px-3 py-0.5 ${
                    dentist.active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 shadow-sm"
                      : ""
                  }`}
                >
                  {dentist.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {dentist.clinicName && (
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground/70" />
                    {dentist.clinicName}
                  </p>
                )}
                {dentist.phone && (
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground/70" />
                    {dentist.phone}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                {(dentist.whatsapp || dentist.phone) && (
                  <a
                    href={getWhatsAppUrl(dentist.whatsapp || dentist.phone, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                {dentist.email && (
                  <a
                    href={`mailto:${dentist.email}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted hover:bg-accent text-foreground text-xs font-semibold transition-all duration-200 border border-border/50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contact Info Cards */}
      {contactItems.some((c) => c.show) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {contactItems
            .filter((c) => c.show)
            .map((item, idx) => {
              const colors = colorMap[item.color];
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                    <item.icon className={`h-4 w-4 ${colors.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{item.label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}

      {dentist.notes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-card border border-border/50 p-4 shadow-sm"
        >
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mb-2">Notes</p>
          <p className="text-sm text-foreground leading-relaxed">{dentist.notes}</p>
        </motion.div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Cases Value" value={agg.totalCasesValue} format={formatCurrency} icon={FileText} color="indigo" delay={0.2} />
        <StatCard title="Total Received" value={agg.totalPayments} format={formatCurrency} icon={CreditCard} color="emerald" delay={0.3} />
        <StatCard title="Outstanding Balance" value={agg.outstandingBalance} format={formatCurrency} icon={Wallet} color="rose" delay={0.4} />
      </div>

      {/* Tabs */}
      <GlassCard hover="none" delay={0.5}>
        <Tabs defaultValue="cases">
          <TabsList className="bg-muted/50 rounded-xl p-1 border border-border/30">
            <TabsTrigger value="cases" className="data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 rounded-lg text-sm font-medium transition-all">
              <FolderOpen className="h-4 w-4 mr-1.5" />Cases ({agg.totalCases})
            </TabsTrigger>
            <TabsTrigger value="patients" className="data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 rounded-lg text-sm font-medium transition-all">
              <Users className="h-4 w-4 mr-1.5" />Patients ({agg.totalPatients})
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 rounded-lg text-sm font-medium transition-all">
              <CreditCard className="h-4 w-4 mr-1.5" />Payments ({dentist.payments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-5">
            {dentist.cases?.length > 0 ? (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Case #</TableHead>
                      <TableHead className="hidden sm:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Date</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Patient</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Work Type</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.cases.map((c: any, index: number) => {
                      const borderColor: Record<string, string> = {
                        RECEIVED: "border-l-slate-400",
                        WORKING: "border-l-indigo-500",
                        TRIAL: "border-l-amber-500",
                        FINISHED: "border-l-emerald-500",
                        DELIVERED: "border-l-green-500",
                      };
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.04 }}
                          className={`group border-b border-border/30 hover:bg-accent/40 transition-all duration-200 border-l-[3px] ${borderColor[c.status] || "border-l-transparent"}`}
                        >
                          <TableCell>
                            <Link href={`/cases/${c.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold text-sm transition-colors inline-flex items-center gap-1">
                              {c.caseNumber}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDate(c.date || c.createdAt)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {c.patient?.id ? (
                              <Link href={`/patients/${c.patient.id}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                                {c.patient.name}
                              </Link>
                            ) : <span className="text-muted-foreground/50">-</span>}
                          </TableCell>
                          <TableCell className="text-sm text-foreground/80 font-medium">{c.workType || "-"}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 shadow-sm`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(c.status)}`} />
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-foreground tabular-nums">
                            {formatCurrency(c.amount || 0)}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={FolderOpen} title="No cases found" description="Cases for this dentist will appear here" />
            )}
          </TabsContent>

          <TabsContent value="patients" className="mt-5">
            {dentist.patients?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dentist.patients.map((p: any, index: number) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group rounded-xl border border-border/40 bg-muted/20 p-4 hover:bg-accent/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {getInitials(p.name || "P")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/patients/${p.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate">
                          {p.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.phone && (
                            <span className="text-xs text-muted-foreground">{p.phone}</span>
                          )}
                          {p.age && (
                            <span className="text-xs text-muted-foreground">{p.age} yrs</span>
                          )}
                          {p.gender && (
                            <span className="text-xs text-muted-foreground">{p.gender}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold px-2 py-0 border-0 flex-shrink-0">
                        {p._count?.cases || 0}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="No patients found" description="Patients for this dentist will appear here" />
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-5">
            {dentist.payments?.length > 0 ? (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                      <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Date</TableHead>
                      <TableHead className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Method</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Invoice</TableHead>
                      <TableHead className="hidden md:table-cell text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.payments.map((p: any, index: number) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04 }}
                        className="border-b border-border/30 hover:bg-accent/40 transition-all duration-200"
                      >
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-bold text-emerald-600 text-sm tabular-nums">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="rounded-full text-xs border-border/50 font-medium">{p.method}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.invoice?.invoiceNumber || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.reference || "-"}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={CreditCard} title="No payments recorded" description="Payment history will appear here" />
            )}
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
}
