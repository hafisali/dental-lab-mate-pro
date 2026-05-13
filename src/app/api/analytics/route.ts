import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseSummary {
  status: string;
  workType?: string;
  _count: { id: number };
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface DentistStat {
  dentistId: string;
  _sum: { amount: number | null };
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

    // Parallelize top-level independent queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      allTechnicians,
      revenueThisMonth,
      casesThisMonth
    ] = await Promise.all([
      // Overdue cases: dueDate < now AND status NOT IN ('FINISHED', 'DELIVERED')
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
      // Consolidated delivered cases for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // All technicians for workload
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Revenue this month (from payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // Cases this month count
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),
    ]);

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

    const statusCounts = (casesByStatus as unknown as CaseSummary[]).map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = (casesByWorkType as unknown as CaseSummary[]).map((w) => ({
      workType: w.workType || "Unknown",
      count: w._count.id,
    }));

    // Average turnaround time (avg days from createdAt to updatedAt where status=DELIVERED)
    let avgTurnaround = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
    }

    // On-time delivery rate
    let onTimeRate = 0;
    const deliveredWithDue = deliveredCasesData.filter(c => c.dueDate !== null);
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Monthly case volumes (last 6 months) - Parallelized
    const monthlyCaseVolumes = await Promise.all(
      Array.from({ length: 6 }, (_, i) => 5 - i).map(async (offset) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
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
    );

    // Top dentists by case count and revenue - Optimized with groupBy
    const topDentistsBase = await prisma.dentist.findMany({
      where: { labId, active: true },
      include: {
        _count: { select: { cases: true } },
      },
      orderBy: { cases: { _count: "desc" } },
      take: 10,
    });

    const topDentistIds = topDentistsBase.map(d => d.id);
    const topDentistRevenue = await (prisma.case.groupBy({
      by: ["dentistId"],
      where: { dentistId: { in: topDentistIds } },
      _sum: { amount: true },
    }) as unknown as Promise<DentistStat[]>);

    const revenueMap = new Map(topDentistRevenue.map(r => [r.dentistId, r._sum.amount || 0]));

    const topDentistData = topDentistsBase.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: revenueMap.get(d.id) || 0,
    }));

    // Technician workload - Optimized with single groupBy
    const techStats = await (prisma.case.groupBy({
      by: ["technicianId", "status"],
      where: {
        labId,
        technicianId: { in: allTechnicians.map(t => t.id) },
      },
      _count: { id: true },
    }) as unknown as Promise<TechStat[]>);

    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStats.forEach(stat => {
      if (!stat.technicianId) return;
      const counts = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        counts.completedCases += stat._count.id;
      } else {
        counts.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, counts);
    });

    const techWorkload = allTechnicians.map(tech => {
      const stats = techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.activeCases,
        completedCases: stats.completedCases,
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
      revenueThisMonth: (revenueThisMonth as { _sum: { amount: number | null } })._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
