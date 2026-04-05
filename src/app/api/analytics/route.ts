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

    // Optimized: Parallelize independent database queries to reduce total response time
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      topDentistStats,
      allTechnicians,
      techStats,
      casesThisMonth,
      revenueThisMonth,
      monthlyCaseVolumes, // Optimized: parallelized below
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

      // 2. Due soon
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

      // 5. Delivered cases for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Top dentist stats
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // 7. Technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 8. Technician stats
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId, technicianId: { not: null } },
      }),

      // 9. Cases this month
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),

      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),

      // 11. Monthly case volumes (last 6 months) - parallelized
      Promise.all(
        Array.from({ length: 6 }).map(async (_, i) => {
          const monthIdx = 5 - i;
          const monthStart = new Date(now.getFullYear(), now.getMonth() - monthIdx, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthIdx + 1, 1);
          const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
          const year = monthStart.getFullYear();

          const count = await prisma.case.count({
            where: {
              labId,
              date: { gte: monthStart, lt: monthEnd },
            },
          });
          return { month: monthName, year, count };
        })
      ),
    ]);

    // Map stats for top dentists
    const topDentistIds = topDentistStats.map(s => s.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });

    const topDentistData = topDentistStats.map(s => {
      const details = topDentistDetails.find(d => d.id === s.dentistId);
      return {
        id: s.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName,
        caseCount: s._count.id,
        revenue: s._sum.amount || 0,
      };
    });

    // Process Overdue
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

    // Process Due Soon
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

    // Metrics Calculation
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    const deliveredWithDue = deliveredCases.filter(c => c.dueDate !== null);
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Process technician workload
    const techWorkload = allTechnicians.map((tech) => {
      const techCaseStats = techStats.filter(s => s.technicianId === tech.id);
      const activeCases = techCaseStats
        .filter(s => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = techCaseStats
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
