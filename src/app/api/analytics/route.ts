import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Interfaces to satisfy ESLint and provide type safety
interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface MonthlyVolume {
  month: string;
  year: number;
  count: number;
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

    // Parallelize all top-level independent queries to maximize performance
    // This reduces the sequential database roundtrips significantly.
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      topDentistsRaw,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumesRaw
    ] = await Promise.all([
      // Overdue cases: dueDate < now AND status NOT IN ('FINISHED', 'DELIVERED')
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
      }),
      // Due soon: cases where dueDate is today or tomorrow
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
      }),
      // Cases by status count
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // Cases by work type count
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // For average turnaround time calculation
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),
      // For on-time delivery rate calculation
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),
      // Identify top dentists by case volume and revenue via groupBy (more efficient than full include)
      prisma.case.groupBy({
        by: ['dentistId'],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Technician metadata
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Technician workload stats - replacing N+1 query loop with a single groupBy
      (prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>),
      // Current month case volume
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),
      // Current month revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // Parallelize 6-month time-series volume queries
      ...Array.from({ length: 6 }, (_, i) => {
        const monthIndex = 5 - i;
        const d = new Date(now.getFullYear(), now.getMonth() - monthIndex, 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        }).then(count => ({
          month: monthStart.toLocaleString("en-IN", { month: "short" }),
          year: monthStart.getFullYear(),
          count
        } as MonthlyVolume));
      })
    ]);

    // POST-PROCESSING

    // 1. Overdue cases processing
    const overdueWithDays = overdueCasesRaw.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const diffTime = now.getTime() - dueDate.getTime();
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

    // 2. Due soon processing
    const dueSoonWithLabel = dueSoonCasesRaw.map((c) => {
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

    // 3. Status and Work Type counts
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // 4. Metrics: Turnaround and On-time Rate
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // 5. Top Dentists Metadata Resolution
    const topDentistIds = topDentistsRaw.map(d => d.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });
    const dentistMap = new Map(topDentistDetails.map(d => [d.id, d]));

    const topDentistData = topDentistsRaw.map(d => {
      const details = dentistMap.get(d.dentistId);
      return {
        id: d.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName || null,
        caseCount: d._count.id,
        revenue: d._sum.amount || 0,
      };
    });

    // 6. Technician Workload Aggregation (O(1) lookup via Map)
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStatsRaw.forEach((stat) => {
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
      monthlyCaseVolumes: monthlyVolumesRaw,
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
