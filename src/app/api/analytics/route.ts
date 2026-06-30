import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseDetails {
  id: string;
  caseNumber: string;
  workType: string;
  dueDate: Date | null;
  status: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
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

    // Parallelize all independent database queries to reduce round-trips from ~16+ to 1 sequential block
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      topDentists,
      allTechnicians,
      techStats,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumes
    ] = await Promise.all([
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),
      // Consolidated 'DELIVERED' cases fetch for turnaround and on-time rate calculations
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
      // Optimized technician workload fetch: replaces O(N) queries with 1 groupBy round-trip
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      // Parallelize 6 months of case volume counts
      ...Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        return prisma.case.count({ where: { labId, date: { gte: monthStart, lt: monthEnd } } });
      }),
    ]);

    // Map overdue cases with days calculation
    const overdueWithDays = overdueCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue: Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    // Map due soon cases with labels
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday = dueDate.getDate() === now.getDate() &&
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

    const statusCounts = casesByStatus.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id }));

    // Turnaround and on-time rate calculations from consolidated deliveredCases data
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    const deliveredWithDue = deliveredCases.filter((c) => c.dueDate !== null);
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter((c) => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Process parallelized monthly volumes results
    const monthlyCaseVolumes = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthDate.toLocaleString("en-IN", { month: "short" }),
        year: monthDate.getFullYear(),
        count: monthlyVolumes[i],
      };
    });

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Reconstruct technician workload from single groupBy result map
    const techWorkload = allTechnicians.map((tech) => {
      const stats = techStats.filter((s) => s.technicianId === tech.id);
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.filter((s) => !["FINISHED", "DELIVERED"].includes(s.status)).reduce((sum, s) => sum + s._count.id, 0),
        completedCases: stats.filter((s) => ["FINISHED", "DELIVERED"].includes(s.status)).reduce((sum, s) => sum + s._count.id, 0),
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
