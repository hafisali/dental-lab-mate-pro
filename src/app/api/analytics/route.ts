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

    // Prepare monthly volume ranges
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return { monthStart, monthEnd };
    });

    // Execute all independent database queries in parallel to minimize round-trips
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesAll,
      monthlyVolumesResults,
      dentistRevenueStats,
      allTechnicians,
      techStatusCounts,
      casesThisMonth,
      revenueThisMonth,
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
      // 3. Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Delivered cases (Merged query for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Monthly volumes (Parallelized counts)
      Promise.all(
        monthlyRanges.map((range) =>
          prisma.case.count({
            where: {
              labId,
              date: { gte: range.monthStart, lt: range.monthEnd },
            },
          })
        )
      ),
      // 7. Top dentists by revenue/count using groupBy to avoid fetching all case records
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // 8. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 9. Technician workload aggregation (Single query replaces N+1 pattern)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      // 10. Cases this month
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
      }),
    ]);

    // Process overdue cases with days calculation
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

    // Process due soon with labels
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

    // Calculate turnaround and on-time rate from merged delivered cases query
    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (deliveredCasesAll.length > 0) {
      const totalDays = deliveredCasesAll.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesAll.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesAll.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Format monthly case volumes
    const monthlyCaseVolumes = monthlyRanges.map((range, i) => ({
      month: range.monthStart.toLocaleString("en-IN", { month: "short" }),
      year: range.monthStart.getFullYear(),
      count: monthlyVolumesResults[i],
    }));

    // Fetch dentist names for top dentists (Second step after groupBy)
    const topDentistIds = dentistRevenueStats.map((s) => s.dentistId);
    const dentistNames = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });

    const topDentistData = dentistRevenueStats.map((stat) => {
      const dentist = dentistNames.find((d) => d.id === stat.dentistId);
      return {
        id: stat.dentistId,
        name: dentist?.name || "Unknown",
        clinicName: dentist?.clinicName || "Unknown",
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // Process technician workload in-memory from groupBy results
    const techWorkload = allTechnicians.map((tech) => {
      const techCounts = techStatusCounts.filter((s) => s.technicianId === tech.id);
      const activeCases = techCounts
        .filter((s) => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = techCounts
        .filter((s) => ["FINISHED", "DELIVERED"].includes(s.status))
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
