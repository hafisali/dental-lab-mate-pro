import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

export async function GET(_req: NextRequest) {
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

    // Prepare months for parallel fetching
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();
      last6Months.push({ start: monthStart, end: monthEnd, monthName, year });
    }

    // Optimization: Consolidate independent database queries into a single Promise.all
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      monthlyCaseVolumes,
      allTechnicians,
      techCaseStats,
      dentistStats,
      casesThisMonth,
      revenueThisMonthResult
    ] = await Promise.all([
      // 1. Overdue cases
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
      // 2. Due soon cases
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
      // 3. Cases by status count
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Cases by work type count
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Delivered cases (merged query for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Monthly case volumes (parallelized)
      Promise.all(last6Months.map(async (m) => {
        const count = await prisma.case.count({
          where: { labId, date: { gte: m.start, lt: m.end } },
        });
        return { month: m.monthName, year: m.year, count };
      })),
      // 7. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 8. Technician workload stats (single groupBy instead of N+1)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      // 9. Top dentists by case count and revenue (using groupBy aggregation)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // 10. Cases this month count
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 11. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      })
    ]);

    // Process overdue cases
    const overdueWithDays = overdueCases.map((c) => {
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

    // Process due soon cases
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

    // Format status counts
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Format work type counts
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Calculate turnaround and on-time rate from merged delivered cases data
    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (deliveredCasesData.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let casesWithDue = 0;

      deliveredCasesData.forEach((c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          casesWithDue++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      });

      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
      if (casesWithDue > 0) {
        onTimeRate = Math.round((onTimeCount / casesWithDue) * 100);
      }
    }

    // Process top dentists metadata
    const topDentistIds = dentistStats.map(s => s.dentistId);
    const dentistInfos = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });

    const topDentistData = dentistStats.map((s) => {
      const info = dentistInfos.find(i => i.id === s.dentistId);
      return {
        id: s.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName,
        caseCount: s._count.id,
        revenue: s._sum.amount || 0,
      };
    });

    // Process technician workload
    const techWorkload = allTechnicians.map((tech) => {
      const techStats = techCaseStats.filter(s => s.technicianId === tech.id);
      const activeCases = techStats
        .filter(s => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = techStats
        .filter(s => ["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
      };
    });

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
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
