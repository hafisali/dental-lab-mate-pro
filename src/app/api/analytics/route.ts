import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseSummary {
  id: string;
  caseNumber: string;
  workType: string;
  dueDate: Date | null;
  status: string;
  dentist: { id: string; name: string };
  patient: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

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
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume promises
    const monthlyVolumePromises = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthlyVolumePromises.push(
        prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        })
      );
    }

    // Execute all primary queries in parallel
    const [
      incompleteCases,
      deliveredCasesData,
      casesByStatus,
      casesByWorkType,
      monthlyCounts,
      topDentistStatsRaw,
      allTechnicians,
      techStatsRaw,
      revenueThisMonth,
    ] = await Promise.all([
      // 1. Unified query for overdue and due soon cases
      prisma.case.findMany({
        where: {
          labId,
          dueDate: { lt: tomorrowEnd },
          status: { notIn: ["FINISHED", "DELIVERED"] },
        },
        include: {
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseSummary[]>,

      // 2. Unified query for delivery metrics
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 3. Cases by status
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // 4. Cases by work type
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // 5. Monthly volumes
      Promise.all(monthlyVolumePromises),

      // 6. Top dentists by volume/revenue via Case aggregation
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,

      // 7. Technicians for mapping
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 8. Unified technician workload stats
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // 9. Revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
    ]);

    // Fetch names for top dentists in parallel
    const topDentistIds = topDentistStatsRaw.map((s) => s.dentistId);
    const dentistsInfo = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });
    const dentistInfoMap = new Map(dentistsInfo.map((d) => [d.id, d]));

    // Post-processing: Overdue and Due Soon
    const overdueCases = [];
    const dueSoonCases = [];

    for (const c of incompleteCases) {
      if (!c.dueDate) continue;
      const dueDate = new Date(c.dueDate);
      if (dueDate < todayStart) {
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          daysOverdue,
        });
      } else {
        const isToday =
          dueDate.getDate() === now.getDate() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();
        dueSoonCases.push({
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          dueLabel: isToday ? "Today" : "Tomorrow",
        });
      }
    }

    // Post-processing: Delivery metrics
    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesData.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Post-processing: Monthly volumes
    const monthlyCaseVolumes = monthlyCounts.map((count, index) => {
      const i = 5 - index;
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count,
      };
    });

    // Post-processing: Technician workload
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    for (const stat of techStatsRaw) {
      if (!stat.technicianId) continue;
      const current = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    }

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
    }));

    // Post-processing: Top dentists
    const topDentistData = topDentistStatsRaw.map((s) => {
      const info = dentistInfoMap.get(s.dentistId);
      return {
        id: s.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName || null,
        caseCount: s._count.id,
        revenue: s._sum.amount || 0,
      };
    });

    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts: casesByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      workTypeCounts: casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth: monthlyCounts[5],
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
