import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface CaseSummary {
  id: string;
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
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare promises for parallel execution
    const monthlyPromises = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyPromises.push(
        prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        })
      );
    }

    const [
      pendingCases,
      statusCountsRaw,
      workTypeCountsRaw,
      deliveredData,
      topDentistsRaw,
      allTechnicians,
      techWorkloadRaw,
      casesThisMonth,
      revenueThisMonthRaw,
      ...monthlyCounts
    ] = await Promise.all([
      // Combined overdue and due soon query
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }),
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
      // Combined turnaround and on-time data
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }) as unknown as Promise<CaseSummary[]>,
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Technician workload optimization: single groupBy instead of N+1
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
      ...monthlyPromises,
    ]);

    // Process pending cases (overdue vs due soon)
    const overdueCases = [];
    const dueSoonCases = [];
    for (const c of pendingCases) {
      if (!c.dueDate) continue;
      const dueDate = new Date(c.dueDate);
      if (dueDate < todayStart) {
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          daysOverdue,
        });
      } else {
        const isToday =
          dueDate.getDate() === now.getDate() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();
        dueSoonCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          dueLabel: isToday ? "Today" : "Tomorrow",
        });
      }
    }

    // Process status and work type counts
    const statusCounts = statusCountsRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));
    const workTypeCounts = workTypeCountsRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Process turnaround and on-time rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredData.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let withDueDateCount = 0;

      for (const c of deliveredData) {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          withDueDateCount++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      }
      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;
      if (withDueDateCount > 0) {
        onTimeRate = Math.round((onTimeCount / withDueDateCount) * 100);
      }
    }

    // Process monthly volumes
    const monthlyCaseVolumes = monthlyCounts.map((count, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count,
      };
    });

    // Process top dentists
    const topDentistData = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Process technician workload from groupBy
    const techMap = new Map<string, { activeCases: number; completedCases: number }>();
    for (const stat of techWorkloadRaw) {
      if (!stat.technicianId) continue;
      const current = techMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techMap.set(stat.technicianId, current);
    }

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
      return {
        id: tech.id,
        name: tech.name,
        ...stats,
      };
    });

    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts,
      workTypeCounts,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
