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

    // Prepare monthly volume promises (last 6 months)
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();

      return prisma.case.count({
        where: { labId, date: { gte: monthStart, lt: monthEnd } },
      }).then(count => ({ month: monthName, year, count }));
    });

    // Parallelize all independent database queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      topDentists,
      allTechnicians,
      techActiveCounts,
      techCompletedCounts,
      casesThisMonth,
      revenueThisMonth,
      monthlyCaseVolumes,
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
      }) as unknown as Promise<CaseSummary[]>,

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
      }) as unknown as Promise<CaseSummary[]>,

      // Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // Delivered cases (consolidated for turnaround and on-time rate)
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

      // Technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // Tech active workload
      prisma.case.groupBy({
        by: ["technicianId"],
        where: {
          labId,
          status: { notIn: ["FINISHED", "DELIVERED"] },
          technicianId: { not: null },
        },
        _count: { id: true },
      }),

      // Tech completed workload
      prisma.case.groupBy({
        by: ["technicianId"],
        where: {
          labId,
          status: { in: ["FINISHED", "DELIVERED"] },
          technicianId: { not: null },
        },
        _count: { id: true },
      }),

      // Monthly stats
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),

      // Spread monthly volume promises
      Promise.all(monthlyPromises),
    ]);

    // Post-process overdue cases
    const overdueWithDays = overdueCases.map((c) => ({
      ...c,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Post-process due soon cases
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return {
        ...c,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    // Calculate turnaround and on-time rate from consolidated delivered data
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;

      const casesWithDue = deliveredCasesData.filter(c => c.dueDate);
      if (casesWithDue.length > 0) {
        const onTimeCount = casesWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / casesWithDue.length) * 100);
      }
    }

    // Map tech workloads
    const activeMap = Object.fromEntries(techActiveCounts.map(t => [t.technicianId, t._count.id]));
    const completedMap = Object.fromEntries(techCompletedCounts.map(t => [t.technicianId, t._count.id]));

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: activeMap[tech.id] || 0,
      completedCases: completedMap[tech.id] || 0,
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts: casesByStatus.map(s => ({ status: s.status, count: s._count.id })),
      workTypeCounts: casesByWorkType.map(w => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentists.map(d => ({
        id: d.id,
        name: d.name,
        clinicName: d.clinicName,
        caseCount: d._count.cases,
        revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
      })),
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
