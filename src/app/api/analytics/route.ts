import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Explicit interfaces to avoid @typescript-eslint/no-explicit-any
interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface DentistStat {
  dentistId: string;
  _sum: { amount: number | null };
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
    const tomorrowEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2
    );
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare 6 month ranges for parallel volume fetching
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        start,
        end,
        name: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear()
      };
    });

    // ⚡ Bolt: Execute all independent data-fetching queries in parallel to minimize total latency
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      monthlyVolumesResults,
      allTechnicians,
      techStatsRaw,
      dentistRevenueRaw,
      casesThisMonth,
      revenueThisMonthResult,
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
      // 2. Due soon: cases where dueDate is today or tomorrow
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
      // 3. Cases by status count (aggregated at DB level)
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Cases by work type count (aggregated at DB level)
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
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
      // 7. Monthly case volumes (Parallelized historical counts)
      Promise.all(monthRanges.map(m =>
        prisma.case.count({
          where: { labId, date: { gte: m.start, lt: m.end } }
        })
      )),
      // 8. Technicians list for mapping
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 9. Technician stats (Bulk aggregation replaces N+1 queries)
      (prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true }
      }) as unknown as Promise<TechStat[]>),
      // 10. Top dentists by revenue (Aggregated at DB level for efficiency)
      (prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentist: { active: true } },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10
      }) as unknown as Promise<DentistStat[]>),
      // 11. Cases this month count
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 12. Revenue this month (from payments)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
    ]);

    // POST-PROCESSING

    // 1. Overdue with days calculation
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

    // 2. Due soon with label calculation
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

    // 3. Status counts mapping
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // 4. Work type counts mapping
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // 5. Avg Turnaround calculation
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    // 6. On-time Rate calculation
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // 7. Monthly case volumes formatting
    const monthlyCaseVolumes = monthRanges.map((m, i) => ({
      month: m.name,
      year: m.year,
      count: monthlyVolumesResults[i]
    }));

    // 8. Top dentists details fetching (Second layer for name enrichment)
    const topDentistIds = dentistRevenueRaw.map(d => d.dentistId);
    const topDentistsInfo = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });
    const dentistInfoMap = new Map(topDentistsInfo.map(d => [d.id, d]));

    const topDentistData = dentistRevenueRaw.map(d => {
      const info = dentistInfoMap.get(d.dentistId);
      return {
        id: d.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName || null,
        caseCount: d._count.id,
        revenue: d._sum.amount || 0
      };
    });

    // 9. Technician workload aggregation from bulk stats
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techStatsRaw.forEach(stat => {
      const techId = stat.technicianId;
      if (!techId) return;
      if (!techStatsMap.has(techId)) {
        techStatsMap.set(techId, { active: 0, completed: 0 });
      }
      const counts = techStatsMap.get(techId)!;
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        counts.completed += stat._count.id;
      } else {
        counts.active += stat._count.id;
      }
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap.get(tech.id)?.active || 0,
      completedCases: techStatsMap.get(tech.id)?.completed || 0,
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
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
