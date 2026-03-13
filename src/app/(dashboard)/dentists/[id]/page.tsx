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
} from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";
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
        <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
        <Skeleton className="h-16 w-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-muted" />
          <Skeleton className="h-4 w-32 bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl bg-muted" />
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

  if (loading) {
    return <DetailSkeleton />;
  }

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

  return (
    <div className="space-y-6 mesh-gradient min-h-screen -m-4 lg:-m-6 p-4 lg:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 rounded-xl hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-500/25 flex-shrink-0">
            {getInitials(dentist.name || "D")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{dentist.name}</h1>
              <Badge variant={dentist.active ? "default" : "secondary"} className={`rounded-full text-xs ${dentist.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800' : ''}`}>
                {dentist.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {dentist.clinicName && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <Building2 className="h-3.5 w-3.5" />{dentist.clinicName}
                </p>
              )}
              {(dentist.whatsapp || dentist.phone) && (
                <a
                  href={getWhatsAppUrl(dentist.whatsapp || dentist.phone, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Contact Info */}
      <GlassCard hover="none" delay={0.1}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dentist.phone && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50"><Phone className="h-4 w-4 text-blue-500 dark:text-blue-400" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Phone</p><p className="text-sm font-medium text-foreground">{dentist.phone}</p></div>
            </div>
          )}
          {(dentist.whatsapp || dentist.phone) && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50"><MessageCircle className="h-4 w-4 text-green-500 dark:text-green-400" /></div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">WhatsApp</p>
                <a
                  href={getWhatsAppUrl(dentist.whatsapp || dentist.phone, "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-medium transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  Open Chat
                </a>
              </div>
            </div>
          )}
          {dentist.email && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50"><Mail className="h-4 w-4 text-amber-500 dark:text-amber-400" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Email</p><p className="text-sm font-medium text-foreground">{dentist.email}</p></div>
            </div>
          )}
          {dentist.address && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted dark:bg-muted border border-border/50">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50"><MapPin className="h-4 w-4 text-purple-500 dark:text-purple-400" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Address</p><p className="text-sm font-medium text-foreground">{dentist.address}</p></div>
            </div>
          )}
        </div>
        {dentist.notes && (
          <>
            <Separator className="my-4 bg-border/50" />
            <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3 border border-border/50">{dentist.notes}</p>
          </>
        )}
      </GlassCard>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Cases Value" value={agg.totalCasesValue} format={formatCurrency} icon={FileText} color="indigo" delay={0.2} />
        <StatCard title="Total Received" value={agg.totalPayments} format={formatCurrency} icon={CreditCard} color="emerald" delay={0.3} />
        <StatCard title="Outstanding Balance" value={agg.outstandingBalance} format={formatCurrency} icon={Wallet} color="rose" delay={0.4} />
      </div>

      {/* Tabs */}
      <GlassCard hover="none" delay={0.5}>
        <Tabs defaultValue="cases">
          <TabsList className="bg-muted rounded-xl p-1">
            <TabsTrigger value="cases" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <FolderOpen className="h-4 w-4 mr-1.5" />Cases ({agg.totalCases})
            </TabsTrigger>
            <TabsTrigger value="patients" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <Users className="h-4 w-4 mr-1.5" />Patients ({agg.totalPatients})
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg text-sm">
              <CreditCard className="h-4 w-4 mr-1.5" />Payments ({dentist.payments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="mt-4">
            {dentist.cases?.length > 0 ? (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Case #</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Type</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.cases.map((c: any, index: number) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell>
                          <Link href={`/cases/${c.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                            {c.caseNumber}
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
                        <TableCell className="text-sm text-foreground">{c.workType || "-"}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(c.status)} text-[11px] font-medium rounded-full px-2.5 py-0.5`}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm text-foreground">
                          {formatCurrency(c.amount || 0)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={FolderOpen} title="No cases found" description="Cases for this dentist will appear here" />
            )}
          </TabsContent>

          <TabsContent value="patients" className="mt-4">
            {dentist.patients?.length > 0 ? (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</TableHead>
                      <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.patients.map((p: any, index: number) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(p.name || "P")}
                            </div>
                            <Link href={`/patients/${p.id}`} className="text-primary hover:text-primary/80 font-semibold text-sm">
                              {p.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{p.phone || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.age || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.gender || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="rounded-full bg-muted text-muted-foreground text-xs font-semibold px-2.5">{p._count?.cases || 0}</Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState icon={Users} title="No patients found" description="Patients for this dentist will appear here" />
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {dentist.payments?.length > 0 ? (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dentist.payments.map((p: any, index: number) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border/30 hover:bg-accent/50 transition-colors"
                      >
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-semibold text-emerald-600 text-sm">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="rounded-full text-xs border-border/50">{p.method}</Badge>
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
