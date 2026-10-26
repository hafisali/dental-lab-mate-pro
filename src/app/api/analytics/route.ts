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

    // Pre-calculate month ranges for the last 6 months
    const monthRanges = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();
      return { monthStart, monthEnd, monthName, year };
    });

    // PERFORMANCE OPTIMIZATION:
    // Consolidate all independent database queries into a single Promise.all call.
    // This reduces sequential DB round-trips from ~16+ down to 1 single parallel stage.
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      monthlyCaseCounts,
      topDentists,
      allTechnicians,
      techCaseGroups,
      casesThisMonth,
      revenueThisMonth,
    ] = await Promise.all([
      // 1. Overdue cases: dueDate < today AND status NOT IN ('FINISHED', 'DELIVERED')
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

      // 2. Due soon: cases where dueDate is today or tomorrow
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

      // 5. Consolidated DELIVERED cases query (used for both turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Monthly case volumes (last 6 months parallelized)
      Promise.all(
        monthRanges.map((m) =>
          prisma.case.count({
            where: {
              labId,
              date: { gte: m.monthStart, lt: m.monthEnd },
            },
          })
        )
      ),

      // 7. Top dentists by case count and revenue
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

      // 8. Active technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 9. Grouped technician case counts (eliminates N+1 count queries per technician)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: {
          labId,
          technicianId: { not: null },
        },
      }),

      // 10. Cases this month count
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),

      // 11. Revenue this month (from payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
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

    // Calculate turnaround time & on-time delivery rate from single deliveredCases array
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    const deliveredWithDue = deliveredCases.filter((c) => c.dueDate !== null);
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Combine month names with calculated counts
    const monthlyCaseVolumes = monthRanges.map((m, index) => ({
      month: m.monthName,
      year: m.year,
      count: monthlyCaseCounts[index],
    }));

    // Format top dentist data
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Map technician workload in memory from techCaseGroups
    const techMap = new Map<string, { active: number; completed: number }>();
    for (const group of techCaseGroups) {
      if (!group.technicianId) continue;
      const current = techMap.get(group.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(group.status)) {
        current.completed += group._count.id;
      } else {
        current.active += group._count.id;
      }
      techMap.set(group.technicianId, current);
    }

    const techWorkload = allTechnicians.map((tech) => {
      const counts = techMap.get(tech.id) || { active: 0, completed: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: counts.active,
        completedCases: counts.completed,
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
