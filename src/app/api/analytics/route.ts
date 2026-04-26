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

    // Fetch all independent analytics data in parallel (Optimized: Massive parallelism)
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      monthlyCaseVolumes,
      topDentists,
      allTechnicians,
      casesThisMonth,
      revenueThisMonth,
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
      }),
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
      // Delivered cases (for turnaround)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),
      // Delivered with due date (for on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),
      // Monthly volumes
      Promise.all(
        Array.from({ length: 6 }, (_, i) => 5 - i).map(async (i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
          const year = monthStart.getFullYear();
          const count = await prisma.case.count({
            where: { labId, date: { gte: monthStart, lt: monthEnd } },
          });
          return { month: monthName, year, count };
        })
      ),
      // Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // Technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
    ]);

    // Secondary dependent queries (Optimized: Parallelizing follow-up aggregations)
    const dentistIds = topDentists.map((d) => d.id);
    const techIds = allTechnicians.map((t) => t.id);

    const [revenueByDentist, casesByTechAndStatus] = await Promise.all([
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentistId: { in: dentistIds } },
        _sum: { amount: true },
      }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { in: techIds } },
        _count: { id: true },
      }),
    ]);

    // Data Processing & Mapping
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

    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const topDentistData = topDentists.map((d) => {
      const rev = revenueByDentist.find((r) => r.dentistId === d.id);
      return {
        id: d.id,
        name: d.name,
        clinicName: d.clinicName,
        caseCount: d._count.cases,
        revenue: rev?._sum.amount || 0,
      };
    });

    const techWorkload = allTechnicians.map((tech) => {
      const techStats = casesByTechAndStatus.filter(
        (s) => s.technicianId === tech.id
      );

      const activeCases = techStats
        .filter((s) => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      const completedCases = techStats
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
