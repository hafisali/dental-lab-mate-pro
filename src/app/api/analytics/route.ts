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

    // Monthly case volumes setup (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        start: d,
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
        name: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
      };
    });

    // Parallelize all independent database queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredData,
      monthlyCaseVolumes,
      topDentists,
      dentistRevenueData,
      allTechnicians,
      techStats,
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
      // 5. Consolidated delivered cases (for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Monthly case volumes (last 6 months parallelized)
      Promise.all(
        months.map(async (m) => ({
          month: m.name,
          year: m.year,
          count: await prisma.case.count({
            where: { labId, date: { gte: m.start, lt: m.end } },
          }),
        }))
      ),
      // 7. Top dentists list
      prisma.dentist.findMany({
        where: { labId, active: true },
        select: { id: true, name: true, clinicName: true, _count: { select: { cases: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 8. Top dentists revenue (database-level aggregation)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
      }),
      // 9. All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 10. Technician workload (database-level aggregation to avoid N+1)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
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

    // POST-PROCESSING

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

    // Average turnaround and on-time rate from consolidated delivered data
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredData.length > 0) {
      const totalDays = deliveredData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;

      const deliveredWithDue = deliveredData.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Top dentist data merged with revenue
    const revenueMap = new Map(dentistRevenueData.map((r) => [r.dentistId, r._sum.amount || 0]));
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: revenueMap.get(d.id) || 0,
    }));

    // Technician workload from techStats Map
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    interface TechStat {
      technicianId: string | null;
      status: string;
      _count: { id: number };
    }
    (techStats as unknown as TechStat[]).forEach((s) => {
      if (!s.technicianId) return;
      const current = techStatsMap.get(s.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(s.status)) {
        current.completed += s._count.id;
      } else {
        current.active += s._count.id;
      }
      techStatsMap.set(s.technicianId, current);
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techStatsMap.get(tech.id) || { active: 0, completed: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.active,
        completedCases: stats.completed,
      };
    });

    // Reuse last element of monthlyCaseVolumes for casesThisMonth
    const casesThisMonth = monthlyCaseVolumes[monthlyCaseVolumes.length - 1].count;

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
