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

    // Optimized: Parallelized all independent database queries
    interface MonthVolume { month: string; year: number; count: number }
    interface TechStat { technicianId: string | null; status: string; _count: { id: number } }
    interface DentistStat { dentistId: string | null; _count: { id: number }; _sum: { amount: number | null } }
    interface CaseSummary { id: string; caseNumber: string; dentist: { id: string, name: string }; patient: { id: string, name: string } | null; workType: string; dueDate: Date | null; status: string; createdAt: Date; updatedAt: Date }

    const [
      overdueCases,
      dueSoonCases,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredCasesRaw,
      deliveredWithDueRaw,
      monthlyCaseVolumes,
      topDentistStats,
      allTechnicians,
      revenueThisMonthAgg,
      techStatsRaw
    ] = await (Promise.all([
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
      prisma.case.findMany({ where: { labId, status: "DELIVERED" }, select: { createdAt: true, updatedAt: true } }),
      prisma.case.findMany({ where: { labId, status: "DELIVERED", dueDate: { not: null } }, select: { dueDate: true, updatedAt: true } }),
      Promise.all(Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
        return prisma.case.count({ where: { labId, date: { gte: monthStart, lt: monthEnd } } }).then(count => ({
          month: monthStart.toLocaleString("en-IN", { month: "short" }),
          year: monthStart.getFullYear(),
          count
        }));
      })),
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10
      }),
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true }
      })
    ]) as unknown as Promise<[CaseSummary[], CaseSummary[], { status: string; _count: { id: number } }[], { workType: string; _count: { id: number } }[], { createdAt: Date; updatedAt: Date }[], { dueDate: Date; updatedAt: Date }[], MonthVolume[], DentistStat[], { id: string, name: string }[], { _sum: { amount: number | null } }, TechStat[]]>);

    // Dependent query: Get dentist names for top dentists
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistStats.map((s) => s.dentistId).filter(Boolean) as string[] } },
      select: { id: true, name: true, clinicName: true }
    });

    const dentistMap = new Map(topDentistDetails.map(d => [d.id, d]));

    // Post-processing
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

    const dueSoonWithLabel = dueSoonCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      dueLabel: new Date(c.dueDate!).getDate() === now.getDate() ? "Today" : "Tomorrow",
    }));

    const statusCounts = casesByStatusRaw.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkTypeRaw.map((w) => ({ workType: w.workType, count: w._count.id }));

    let avgTurnaround = 0;
    if (deliveredCasesRaw.length > 0) {
      const totalDays = deliveredCasesRaw.reduce((sum, c) =>
        sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24), 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesRaw.length) * 10) / 10;
    }

    let onTimeRate = 0;
    if (deliveredWithDueRaw.length > 0) {
      const onTimeCount = deliveredWithDueRaw.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDueRaw.length) * 100);
    }

    const topDentistData = topDentistStats.map((s) => ({
      id: s.dentistId,
      name: dentistMap.get(s.dentistId!)?.name || "Unknown",
      clinicName: dentistMap.get(s.dentistId!)?.clinicName || null,
      caseCount: s._count.id,
      revenue: s._sum.amount || 0,
    }));

    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techStatsRaw.forEach(stat => {
      if (!stat.technicianId) return;
      const current = techStatsMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.id;
      } else {
        current.active += stat._count.id;
      }
      techStatsMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap.get(tech.id)?.active || 0,
      completedCases: techStatsMap.get(tech.id)?.completed || 0,
    }));

    // Reuse last month's volume for casesThisMonth (Optimized: Removed redundant query)
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
      revenueThisMonth: revenueThisMonthAgg._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
