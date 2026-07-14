import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseDetails {
  id: string;
  caseNumber: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  workType: string;
  dueDate: Date | null;
  status: string;
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
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
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume queries (last 6 months)
    const monthlyQueries = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyQueries.push(
        prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        })
      );
    }

    // Execute all independent queries in parallel to reduce sequential database round-trips
    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      topDentists,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumesRaw
    ] = await Promise.all([
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
      ...monthlyQueries,
    ]);

    // Process Overdue Cases
    const overdueCases = (overdueCasesRaw as unknown as CaseDetails[]).map((c) => ({
      ...c,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Process Due Soon Cases
    const dueSoonCases = (dueSoonCasesRaw as unknown as CaseDetails[]).map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return {
        ...c,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    // Process Turnaround and On-time Rate (consolidated loop)
    let totalTurnaroundDays = 0;
    let onTimeCount = 0;
    let deliveredWithDueCount = 0;

    deliveredCases.forEach((c) => {
      const created = new Date(c.createdAt).getTime();
      const updated = new Date(c.updatedAt).getTime();
      totalTurnaroundDays += (updated - created) / (1000 * 60 * 60 * 24);

      if (c.dueDate) {
        deliveredWithDueCount++;
        if (updated <= new Date(c.dueDate).getTime()) {
          onTimeCount++;
        }
      }
    });

    // Process Technician Workload (from single groupBy result)
    const techStats = techStatsRaw as unknown as TechStat[];
    const techWorkload = allTechnicians.map((tech) => {
      const stats = techStats.filter((s) => s.technicianId === tech.id);
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.filter((s) => !["FINISHED", "DELIVERED"].includes(s.status)).reduce((sum, s) => sum + s._count.id, 0),
        completedCases: stats.filter((s) => ["FINISHED", "DELIVERED"].includes(s.status)).reduce((sum, s) => sum + s._count.id, 0),
      };
    });

    // Final mapping of results
    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts: casesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      workTypeCounts: casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround: deliveredCases.length > 0 ? Math.round((totalTurnaroundDays / deliveredCases.length) * 10) / 10 : 0,
      onTimeRate: deliveredWithDueCount > 0 ? Math.round((onTimeCount / deliveredWithDueCount) * 100) : 0,
      monthlyCaseVolumes: monthlyVolumesRaw.map((count, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          month: monthStart.toLocaleString("en-IN", { month: "short" }),
          year: monthStart.getFullYear(),
          count,
        };
      }),
      topDentists: topDentists.map((d) => ({
        id: d.id,
        name: d.name,
        clinicName: d.clinicName,
        caseCount: d._count.cases,
        revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
      })),
      techWorkload,
      casesThisMonth,
      revenueThisMonth: (revenueThisMonth as { _sum: { amount: number | null } })._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
