import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Interfaces for strict typing of aggregated results
interface CaseStat {
  status: string;
  _count: { id: number };
}

interface WorkTypeStat {
  workType: string;
  _count: { id: number };
}

interface DentistStat {
  dentistId: string;
  _count: { id: number };
  _sum: { amount: number | null };
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface CaseDetails {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string };
  workType: string;
  dueDate: Date | null;
  status: string;
}

interface DeliveredCase {
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
}

export async function GET() {
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
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume promises to be parallelized
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return prisma.case.count({
        where: { labId, date: { gte: monthStart, lt: monthEnd } },
      });
    });

    // Fire all primary independent database queries in a single Promise.all block
    // This reduces sequential database round-trips from ~15+ to 1 sequential block.
    const results = await Promise.all([
      // [0] Overdue cases
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      // [1] Due soon cases
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      // [2] Cases by status (optimized via groupBy)
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<CaseStat[]>,
      // [3] Cases by work type (optimized via groupBy)
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeStat[]>,
      // [4] Delivered cases for turnaround and on-time rate calculation
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // [5] Top dentists base data (optimized via groupBy to avoid fetching all case records)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,
      // [6] Active technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // [7] Technician workload raw data (Resolves N+1 query pattern via single groupBy)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      // [8] Cases this month count
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      // [9] Revenue this month (aggregated)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      // [10-15] Monthly volume counts
      ...monthlyPromises,
    ]);

    // Destructure results
    const overdueCases = results[0] as unknown as CaseDetails[];
    const dueSoonCases = results[1] as unknown as CaseDetails[];
    const casesByStatus = results[2] as CaseStat[];
    const casesByWorkType = results[3] as WorkTypeStat[];
    const deliveredCases = results[4] as unknown as DeliveredCase[];
    const topDentistStats = results[5] as DentistStat[];
    const allTechnicians = results[6] as { id: string; name: string }[];
    const techStats = results[7] as TechStat[];
    const casesThisMonth = results[8] as number;
    const revenueThisMonthData = results[9] as { _sum: { amount: number | null } };
    const monthlyCounts = results.slice(10) as number[];

    // Process overdue cases with days overdue
    const overdueWithDays = overdueCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Process due soon with labels
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dDate = new Date(c.dueDate!);
      const isToday = dDate.getDate() === now.getDate() && dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    // Map status and work type counts
    const statusCounts = casesByStatus.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id }));

    // Turnaround time and On-time rate calculations from consolidated deliveredCases query
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCases.length > 0) {
      const totalTurnaroundTime = deliveredCases.reduce((sum, c) => {
        return sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalTurnaroundTime / deliveredCases.length) * 10) / 10;

      const deliveredWithDue = deliveredCases.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter((c) => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Process monthly volumes
    const monthlyCaseVolumes = monthlyCounts.map((count, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthDate.toLocaleString("en-IN", { month: "short" }),
        year: monthDate.getFullYear(),
        count,
      };
    });

    // Enrich top dentists with names (requires secondary query for names if IDs are found)
    const topDentistData = await (async () => {
      if (topDentistStats.length === 0) return [];
      const dentistIds = topDentistStats.map((s) => s.dentistId);
      const dentists = await prisma.dentist.findMany({
        where: { id: { in: dentistIds } },
        select: { id: true, name: true, clinicName: true },
      });
      const dentistMap = new Map(dentists.map((d) => [d.id, d]));
      return topDentistStats.map((s) => ({
        id: s.dentistId,
        name: dentistMap.get(s.dentistId)?.name || "Unknown",
        clinicName: dentistMap.get(s.dentistId)?.clinicName || null,
        caseCount: s._count.id,
        revenue: s._sum.amount || 0,
      }));
    })();

    // Process technician workload from techStats
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStats.forEach((stat) => {
      if (!stat.technicianId) return;
      const current = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
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
