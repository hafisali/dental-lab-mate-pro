import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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

    // Prepare 6-month date ranges for monthly case volume parallel queries
    const monthRanges = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();
      return { monthStart, monthEnd, monthName, year };
    });

    // Execute all independent database queries concurrently via Promise.all
    // Performance optimization: reduces ~15 sequential database round trips down to 2 parallel stages.
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      monthlyCaseVolumes,
      topDentistsRaw,
      allTechnicians,
      casesThisMonth,
      revenueThisMonthAggregate,
    ] = await Promise.all([
      // Overdue cases: dueDate < todayStart AND status NOT IN ('FINISHED', 'DELIVERED')
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

      // Consolidated DELIVERED cases query used for both avg turnaround & on-time delivery rate calculations
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // Monthly case volumes (last 6 months queried in parallel)
      Promise.all(
        monthRanges.map(async ({ monthStart, monthEnd, monthName, year }) => {
          const count = await prisma.case.count({
            where: {
              labId,
              date: { gte: monthStart, lt: monthEnd },
            },
          });
          return { month: monthName, year, count };
        })
      ),

      // Top dentists by case count and revenue
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: {
            select: { amount: true },
          },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),

      // Active technicians for workload metrics
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // Cases this month count
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),

      // Revenue this month (from payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
    ]);

    // Format overdue cases with daysOverdue calculation
    const overdueCases = overdueCasesRaw.map((c) => {
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

    // Format due soon cases with dueLabel calculation
    const dueSoonCases = dueSoonCasesRaw.map((c) => {
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

    // In-memory calculation of average turnaround time from consolidated deliveredCases
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    // In-memory calculation of on-time delivery rate from consolidated deliveredCases
    const deliveredWithDue = deliveredCases.filter((c) => c.dueDate !== null);
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const topDentists = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Stage 2: Technician workload queried concurrently for all technicians
    const techWorkload = await Promise.all(
      allTechnicians.map(async (tech) => {
        const [activeCases, completedCases] = await Promise.all([
          prisma.case.count({
            where: {
              labId,
              technicianId: tech.id,
              status: { notIn: ["FINISHED", "DELIVERED"] },
            },
          }),
          prisma.case.count({
            where: {
              labId,
              technicianId: tech.id,
              status: { in: ["FINISHED", "DELIVERED"] },
            },
          }),
        ]);
        return {
          id: tech.id,
          name: tech.name,
          activeCases,
          completedCases,
        };
      })
    );

    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonthAggregate._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
