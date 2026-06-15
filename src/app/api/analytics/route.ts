import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Interfaces for typed query results
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

    // Prepare 6-month ranges
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        start,
        end,
        monthName: start.toLocaleString("en-IN", { month: "short" }),
        year: start.getFullYear(),
      };
    });

    // Parallelize all top-level independent queries
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatus,
      casesByWorkType,
      deliveredCasesRaw,
      topDentistsByVolume,
      technicianStatsRaw,
      allTechnicians,
      casesThisMonth,
      revenueThisMonthRaw,
      ...monthlyCounts
    ] = await Promise.all([
      // Overdue cases
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
      // Due soon cases
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
      // Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // Cases by work type
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // Delivered cases (for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // Top dentists by volume and revenue
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId, dentist: { active: true } },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistRevenueStat[]>,
      // Technician workload aggregation
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }) as unknown as Promise<TechStat[]>,
      // Active technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      // Monthly case volumes (spread promises)
      ...monthlyRanges.map((range) =>
        prisma.case.count({
          where: { labId, date: { gte: range.start, lt: range.end } },
        })
      ),
    ]);

    // Process overdue cases
    const overdueWithDays = overdueCasesRaw.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      };
    });

    // Process due soon cases
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

    // Turnaround and On-time metrics
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesRaw.length > 0) {
      const totalDays = deliveredCasesRaw.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesRaw.length) * 10) / 10;

      const casesWithDue = deliveredCasesRaw.filter((c) => c.dueDate !== null);
      if (casesWithDue.length > 0) {
        const onTimeCount = casesWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / casesWithDue.length) * 100);
      }
    }

    // Monthly case volumes
    const monthlyCaseVolumes = monthlyRanges.map((range, index) => ({
      month: range.monthName,
      year: range.year,
      count: monthlyCounts[index],
    }));

    // Top Dentist Details
    const topDentistIds = topDentistsByVolume.map((d) => d.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });

    const topDentistData = topDentistsByVolume.map((d) => {
      const details = topDentistDetails.find((det) => det.id === d.dentistId);
      return {
        id: d.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName,
        caseCount: d._count.id,
        revenue: d._sum.amount || 0,
      };
    });

    // Technician workload mapping
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    technicianStatsRaw.forEach((stat) => {
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
      statusCounts: casesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      workTypeCounts: casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonthRaw._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
