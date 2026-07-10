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
  createdAt: Date;
  updatedAt: Date;
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

    // Pre-calculate months for volume queries
    const months = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return {
        start: monthStart,
        end: monthEnd,
        label: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
      };
    });

    // Execute all independent database queries in parallel
    // Reduces sequential round-trips from ~16+2N to 1
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
      }) as unknown as Promise<TechStat[]>,
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
      // Spread monthly volume counts
      ...months.map(m => prisma.case.count({ where: { labId, date: { gte: m.start, lt: m.end } } })),
    ]);

    // 1. Process Overdue Cases
    const overdueWithDays = overdueCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // 2. Process Due Soon Cases
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday = dueDate.getDate() === now.getDate() && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
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

    // 3. Status and Work Type Counts
    const statusCounts = casesByStatus.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id }));

    // 4. Performance Metrics (Consolidated DELIVERED queries)
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;

      const casesWithDue = deliveredCases.filter(c => c.dueDate);
      if (casesWithDue.length > 0) {
        const onTimeCount = casesWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / casesWithDue.length) * 100);
      }
    }

    // 5. Monthly Volume
    const monthlyCaseVolumes = months.map((m, i) => ({ month: m.label, year: m.year, count: monthlyVolumes[i] }));

    // 6. Top Dentists
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // 7. Technician Workload (Optimized using in-memory mapping)
    const techStatsMap = techStats.reduce((acc, stat) => {
      const techId = stat.technicianId!;
      if (!acc[techId]) acc[techId] = { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        acc[techId].completed += stat._count.id;
      } else {
        acc[techId].active += stat._count.id;
      }
      return acc;
    }, {} as Record<string, { active: number; completed: number }>);

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap[tech.id]?.active || 0,
      completedCases: techStatsMap[tech.id]?.completed || 0,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
