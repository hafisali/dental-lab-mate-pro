import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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

    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return { monthStart, monthEnd };
    });

    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesStats,
      topDentists,
      allTechnicians,
      casesThisMonth,
      revenueThisMonth,
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
      // Due soon
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
      // Delivered cases stats
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Cases this month
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),
      // Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // Monthly counts
      ...monthlyRanges.map((range) =>
        prisma.case.count({
          where: {
            labId,
            date: { gte: range.monthStart, lt: range.monthEnd },
          },
        })
      ),
    ]);

    // --- Post-processing ---

    interface CaseSummary {
      id: string;
      caseNumber: string;
      dentist: { id: string; name: string };
      patient: { id: string; name: string };
      workType: string;
      dueDate: Date | null;
      status: string;
    }

    const overdueWithDays = (overdueCases as unknown as CaseSummary[]).map((c) => {
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

    const dueSoonWithLabel = (dueSoonCases as unknown as CaseSummary[]).map((c) => {
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

    interface CountResult {
      status?: string;
      workType?: string;
      _count: { id: number };
    }

    const statusCounts = (casesByStatus as unknown as CountResult[]).map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = (casesByWorkType as unknown as CountResult[]).map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    let avgTurnaround = 0;
    let onTimeRate = 0;
    interface DeliveredCase {
      createdAt: Date;
      updatedAt: Date;
      dueDate: Date | null;
    }
    const deliveredStats = deliveredCasesStats as unknown as DeliveredCase[];
    if (deliveredStats.length > 0) {
      const totalDays = deliveredStats.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredStats.length) * 10) / 10;

      const deliveredWithDue = deliveredStats.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    const monthlyCaseVolumes = monthlyRanges.map((range, i) => ({
      month: range.monthStart.toLocaleString("en-IN", { month: "short" }),
      year: range.monthStart.getFullYear(),
      count: monthlyCounts[i] as number,
    }));

    interface DentistStat {
      id: string;
      name: string;
      clinicName: string | null;
      _count: { cases: number };
      cases: { amount: number }[];
    }

    const topDentistData = (topDentists as unknown as DentistStat[]).map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    interface TechUser {
      id: string;
      name: string;
    }

    // Technician workload needs a separate aggregation query since it depends on the technician list
    interface TechCaseGroup {
      technicianId: string | null;
      status: string;
      _count: { id: number };
    }

    const technicianCases = await (prisma.case.groupBy({
      by: ["technicianId", "status"],
      _count: { id: true },
      where: {
        labId,
        technicianId: { in: (allTechnicians as unknown as TechUser[]).map((t) => t.id) },
      },
    }) as unknown as Promise<TechCaseGroup[]>);

    const techStatsMap = new Map<string, { activeCases: number; completedCases: number }>();
    technicianCases.forEach((item) => {
      if (!item.technicianId) return;
      const stats = techStatsMap.get(item.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(item.status)) {
        stats.completedCases += item._count.id;
      } else {
        stats.activeCases += item._count.id;
      }
      techStatsMap.set(item.technicianId, stats);
    });

    const techWorkload = (allTechnicians as unknown as TechUser[]).map((tech) => {
      const stats = techStatsMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
      return {
        id: tech.id,
        name: tech.name,
        ...stats,
      };
    });

    const revenueAmount = (revenueThisMonth as { _sum: { amount: number | null } })._sum.amount || 0;

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
      revenueThisMonth: revenueAmount,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
