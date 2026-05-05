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

    // Parallelize all independent database queries
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
      }) as unknown as Promise<{ status: string; _count: { id: number } }[]>,
      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<{ workType: string; _count: { id: number } }[]>,
      // 5. Average turnaround time data
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true },
      }),
      // 6. On-time delivery rate data
      prisma.case.findMany({
        where: { labId, status: "DELIVERED", dueDate: { not: null } },
        select: { dueDate: true, updatedAt: true },
      }),
      // 7. Monthly case volumes
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
      // 8. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 9. All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 10. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 11. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
    ]);

    // Dependent queries - Layer 2
    const dentistIds = topDentists.map(d => d.id);
    const techIds = allTechnicians.map(t => t.id);

    const [dentistRevenue, activeTechCounts, completedTechCounts] = await Promise.all([
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentistId: { in: dentistIds } },
        _sum: { amount: true },
      }) as unknown as Promise<{ dentistId: string; _sum: { amount: number | null } }[]>,
      prisma.case.groupBy({
        by: ["technicianId"],
        where: {
          labId,
          technicianId: { in: techIds },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        _count: { id: true },
      }) as unknown as Promise<{ technicianId: string | null; _count: { id: number } }[]>,
      prisma.case.groupBy({
        by: ["technicianId"],
        where: {
          labId,
          technicianId: { in: techIds },
          status: { in: ["FINISHED", "DELIVERED"] },
        },
        _count: { id: true },
      }) as unknown as Promise<{ technicianId: string | null; _count: { id: number } }[]>,
    ]);

    // Post-processing
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

    const statusCountsFormatted = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCountsFormatted = casesByWorkType.map((w) => ({
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

    const revenueMap = new Map(dentistRevenue.map(r => [r.dentistId, r._sum.amount || 0]));
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: revenueMap.get(d.id) || 0,
    }));

    const activeMap = new Map(activeTechCounts.map(c => [c.technicianId, c._count.id]));
    const completedMap = new Map(completedTechCounts.map(c => [c.technicianId, c._count.id]));

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      activeCases: activeMap.get(tech.id) || 0,
      completedCases: completedMap.get(tech.id) || 0,
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts: statusCountsFormatted,
      workTypeCounts: workTypeCountsFormatted,
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
