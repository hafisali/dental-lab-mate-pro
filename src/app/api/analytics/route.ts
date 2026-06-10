import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseSummary {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface DentistRevenueStat {
  dentistId: string;
  _count: { id: number };
  _sum: { amount: number | null };
}

interface DentistSummary {
  id: string;
  name: string;
  clinicName: string | null;
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
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Optimization: Parallelize all independent database queries to reduce total response time
    // and replace N+1 patterns with set-based operations (groupBy).

    // Prepare monthly volume promises
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return prisma.case.count({
        where: { labId, date: { gte: monthStart, lt: monthEnd } },
      }).then(count => ({
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count
      }));
    });

    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      topDentistStatsRaw,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonth,
      monthlyCaseVolumesRaw
    ] = await Promise.all([
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
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistRevenueStat[]>,
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechStat[]>,
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      Promise.all(monthlyPromises)
    ]);

    // Resolve dentist details for top dentists
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistStatsRaw.map(s => s.dentistId) } },
      select: { id: true, name: true, clinicName: true }
    }) as DentistSummary[];

    const dentistMap = new Map(topDentistDetails.map(d => [d.id, d]));

    // Processing results
    const overdueWithDays = overdueCases.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue,
      };
    });

    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
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

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Turnaround and On-time rate calculations in one pass
    let totalTurnaroundDays = 0;
    let onTimeCount = 0;
    let withDueCount = 0;

    deliveredCasesData.forEach((c) => {
      const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
      totalTurnaroundDays += diff / (1000 * 60 * 60 * 24);

      if (c.dueDate) {
        withDueCount++;
        if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
          onTimeCount++;
        }
      }
    });

    const avgTurnaround = deliveredCasesData.length > 0
      ? Math.round((totalTurnaroundDays / deliveredCasesData.length) * 10) / 10
      : 0;

    const onTimeRate = withDueCount > 0
      ? Math.round((onTimeCount / withDueCount) * 100)
      : 0;

    const topDentistData = topDentistStatsRaw.map((stat) => {
      const detail = dentistMap.get(stat.dentistId);
      return {
        id: stat.dentistId,
        name: detail?.name || "Unknown",
        clinicName: detail?.clinicName || null,
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // Efficiently map technician workload from aggregated stats
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStatsRaw.forEach(stat => {
      if (!stat.technicianId) return;
      const current = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map(tech => ({
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
      monthlyCaseVolumes: monthlyCaseVolumesRaw.reverse(),
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
