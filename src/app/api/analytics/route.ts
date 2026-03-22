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
    const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Overdue cases: dueDate < now AND status NOT IN ('FINISHED', 'DELIVERED')
    const overdueCases = await prisma.case.findMany({
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
    });

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

    // Due soon: cases where dueDate is today or tomorrow
    const dueSoonCases = await prisma.case.findMany({
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
    });

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

    // Cases by status count
    const casesByStatus = await prisma.case.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { labId },
    });

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Cases by work type count
    const casesByWorkType = await prisma.case.groupBy({
      by: ["workType"],
      _count: { id: true },
      where: { labId },
      orderBy: { _count: { id: "desc" } },
    });

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Average turnaround time & On-time delivery rate (Consolidated query)
    const deliveredCases = await prisma.case.findMany({
      where: { labId, status: "DELIVERED" },
      select: { createdAt: true, updatedAt: true, dueDate: true },
    });

    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;

      const casesWithDue = deliveredCases.filter((c) => c.dueDate !== null);
      if (casesWithDue.length > 0) {
        const onTimeCount = casesWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / casesWithDue.length) * 100);
      }
    }

    // Monthly case volumes (last 6 months) - Parallelized
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return { monthStart, monthEnd };
    });

    const monthlyCounts = await Promise.all(
      monthRanges.map((range) =>
        prisma.case.count({
          where: {
            labId,
            date: { gte: range.monthStart, lt: range.monthEnd },
          },
        })
      )
    );

    const monthlyCaseVolumes = monthRanges.map((range, i) => ({
      month: range.monthStart.toLocaleString("en-IN", { month: "short" }),
      year: range.monthStart.getFullYear(),
      count: monthlyCounts[i],
    }));

    // Top dentists by case count and revenue
    const topDentists = await prisma.dentist.findMany({
      where: { labId, active: true },
      include: {
        _count: { select: { cases: true } },
        cases: {
          select: { amount: true },
        },
      },
      orderBy: { cases: { _count: "desc" } },
      take: 10,
    });

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Technician workload - Optimized with single groupBy to avoid N+1 queries
    const allTechnicians = await prisma.user.findMany({
      where: { labId, role: "TECHNICIAN", active: true },
      select: { id: true, name: true },
    });

    const workloadStats = await prisma.case.groupBy({
      by: ["technicianId", "status"],
      where: {
        labId,
        technicianId: { in: allTechnicians.map((t) => t.id) },
      },
      _count: { id: true },
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = workloadStats.filter((s) => s.technicianId === tech.id);
      const activeCases = stats
        .filter((s) => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = stats
        .filter((s) => ["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
      };
    });

    // Cases this month count
    const casesThisMonth = await prisma.case.count({
      where: {
        labId,
        date: { gte: currentMonthStart },
      },
    });

    // Revenue this month (from payments)
    const revenueThisMonth = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: currentMonthStart },
        dentist: { labId },
      },
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
