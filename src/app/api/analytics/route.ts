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

    // Prepare monthly volume promises (last 6 months)
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
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
      }));
    });

    // Execute all independent queries in parallel to maximize performance
    // This reduces the total execution time from sequential sum to the time of the longest query
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredData,
      topDentists,
      allTechnicians,
      techCounts,
      casesThisMonth,
      revenueThisMonth,
      monthlyCaseVolumes
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
      // 3. Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Cases by work type
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Delivered cases for metrics (turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 7. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 8. Technician workload counts (single query replaces N+1 pattern)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      // 9. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 11. Monthly volumes
      Promise.all(monthlyPromises)
    ]);

    // Data Transformation & Post-processing

    // Overdue label processing
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

    // Due soon label processing
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

    // Calculate Average Turnaround (In-memory aggregation)
    let avgTurnaround = 0;
    if (deliveredData.length > 0) {
      const totalDays = deliveredData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;
    }

    // Calculate On-time Rate (In-memory aggregation)
    const deliveredWithDue = deliveredData.filter(c => c.dueDate !== null);
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Aggregate Technician Workload from single groupBy result
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techCounts.forEach((c: { technicianId: string | null; status: string; _count: { id: number } }) => {
      if (!c.technicianId) return;
      const stats = techWorkloadMap.get(c.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(c.status)) {
        stats.completedCases += c._count.id;
      } else {
        stats.activeCases += c._count.id;
      }
      techWorkloadMap.set(c.technicianId, stats);
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 })
    }));

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
