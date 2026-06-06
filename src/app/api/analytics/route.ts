import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Interfaces for type safety and to satisfy ESLint @typescript-eslint/no-explicit-any
interface CaseSummary {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string | null } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
  daysOverdue?: number;
  dueLabel?: string;
}

interface StatusGroup {
  status: string;
  _count: { id: number };
}

interface WorkTypeGroup {
  workType: string;
  _count: { id: number };
}

interface TopDentistGroup {
  dentistId: string;
  _count: { id: number };
  _sum: { amount: number | null };
}

interface TechWorkloadGroup {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    if (!labId) {
      return NextResponse.json({ error: "No lab assigned" }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ⚡ Bolt: Parallelize monthly case volume queries (last 6 months)
    const monthlyVolumePromises = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return prisma.case.count({
        where: { labId, date: { gte: monthStart, lt: monthEnd } },
      }).then(count => ({
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count
      }));
    });

    // ⚡ Bolt: Consolidate all independent top-level database queries into a single Promise.all
    // This reduces the number of sequential await-induced delays.
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredData,
      topDentistGroupsRaw,
      techWorkloadGroupsRaw,
      technicianList,
      casesThisMonth,
      revenueThisMonthData,
      monthlyVolumes
    ] = await Promise.all([
      // Overdue cases fetch
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: todayStart },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // Due soon cases fetch
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { gte: todayStart, lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // Status aggregation
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusGroup[]>,

      // Work type aggregation
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeGroup[]>,

      // ⚡ Bolt: Consolidate separate delivered case fetches into one query
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // ⚡ Bolt: Use groupBy to compute dentist revenue and counts at the database level
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<TopDentistGroup[]>,

      // ⚡ Bolt: Replace N+1 technician counts with a single groupBy query
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechWorkloadGroup[]>,

      // Fetch active technicians for workload correlation
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // Current month count
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),

      // Current month revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),

      // Parallelized monthly volume promises
      Promise.all(monthlyVolumePromises)
    ]);

    // --- Post-processing (In-memory) ---

    const overdueWithDays = overdueCasesRaw.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      return {
        ...c,
        daysOverdue: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      };
    });

    const dueSoonWithLabel = dueSoonCasesRaw.map((c) => {
      const dDate = new Date(c.dueDate!);
      const isToday = dDate.getDate() === now.getDate() &&
                      dDate.getMonth() === now.getMonth() &&
                      dDate.getFullYear() === now.getFullYear();
      return {
        ...c,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    const statusCounts = casesByStatusRaw.map(s => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkTypeRaw.map(w => ({ workType: w.workType, count: w._count.id }));

    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredData.length > 0) {
      const totalDays = deliveredData.reduce((sum, c) =>
        sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0);
      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;

      const deliveredWithDue = deliveredData.filter(c => c.dueDate);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Resolve dentist names for top performers
    const topDentistIds = topDentistGroupsRaw.map(g => g.dentistId);
    const topDentistNames = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });
    const dentistNameMap = new Map(topDentistNames.map(d => [d.id, d]));

    const topDentistData = topDentistGroupsRaw.map(g => {
      const info = dentistNameMap.get(g.dentistId);
      return {
        id: g.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName || null,
        caseCount: g._count.id,
        revenue: g._sum.amount || 0,
      };
    });

    // ⚡ Bolt: Correlate technician workload using an O(1) Map lookup
    const techWorkloadMap = new Map<string, { activeCases: number, completedCases: number }>();
    techWorkloadGroupsRaw.forEach(g => {
      if (!g.technicianId) return;
      const current = techWorkloadMap.get(g.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(g.status)) {
        current.completedCases += g._count.id;
      } else {
        current.activeCases += g._count.id;
      }
      techWorkloadMap.set(g.technicianId, current);
    });

    const techWorkload = technicianList.map(tech => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 })
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes: monthlyVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonthData._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
