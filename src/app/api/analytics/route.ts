import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseSummary {
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

    // Parallelize all independent data fetching to eliminate sequential await bottlenecks
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      topDentists,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumes
    ] = await Promise.all([
      // 1. Overdue cases
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // 2. Due soon
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // 3. Status counts
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),

      // 4. Work type counts
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),

      // 5. Delivered cases for turnaround
      prisma.case.findMany({ where: { labId, status: "DELIVERED" }, select: { createdAt: true, updatedAt: true } }),

      // 6. Delivered with due date for on-time rate
      prisma.case.findMany({ where: { labId, status: "DELIVERED", dueDate: { not: null } }, select: { dueDate: true, updatedAt: true } }),

      // 7. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),

      // 8. Technicians
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),

      // 9. Tech Stats (Optimized: single groupBy replaces N+1 pattern)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // 10. Cases this month
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),

      // 11. Revenue this month
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),

      // 12-17. Monthly volumes (Parallelized loop)
      ...Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return prisma.case.count({ where: { labId, date: { gte: start, lt: end } } }).then(count => ({
          month: start.toLocaleString("en-IN", { month: "short" }),
          year: start.getFullYear(),
          count
        }));
      })
    ]);

    // Data Processing (O(n) or O(1) post-fetch logic)
    const overdueWithDays = overdueCases.map((c) => ({
      ...c,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const dueSoonWithLabel = dueSoonCases.map((c) => ({
      ...c,
      dueLabel: new Date(c.dueDate!).getDate() === now.getDate() ? "Today" : "Tomorrow",
    }));

    const avgTurnaround = deliveredCases.length > 0
      ? Math.round((deliveredCases.reduce((sum, c) => sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0) / deliveredCases.length) * 10) / 10
      : 0;

    const onTimeRate = deliveredWithDue.length > 0
      ? Math.round((deliveredWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length / deliveredWithDue.length) * 100)
      : 0;

    // Process Tech Workload from grouped stats
    const techMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStatsRaw.forEach(stat => {
      if (!stat.technicianId) return;
      const entry = techMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        entry.completedCases += stat._count.id;
      } else {
        entry.activeCases += stat._count.id;
      }
      techMap.set(stat.technicianId, entry);
    });

    const techWorkload = allTechnicians.map(tech => ({
      ...tech,
      ...(techMap.get(tech.id) || { activeCases: 0, completedCases: 0 })
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts: casesByStatus.map(s => ({ status: s.status, count: s._count.id })),
      workTypeCounts: casesByWorkType.map(w => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes: monthlyVolumes,
      topDentists: topDentists.map(d => ({
        id: d.id,
        name: d.name,
        clinicName: d.clinicName,
        caseCount: d._count.cases,
        revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
      })),
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
