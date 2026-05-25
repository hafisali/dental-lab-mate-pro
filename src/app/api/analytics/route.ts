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
  technicianId: string;
  status: string;
  _count: { id: number };
}

interface DentistStat {
  dentistId: string;
  _count: { id: number };
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

    // Prepare monthly case volume promises (last 6 months)
    const monthlyPromises: Promise<number>[] = [];
    const monthLabels: { month: string; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      monthLabels.push({
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
      });
      monthlyPromises.push(
        prisma.case.count({
          where: {
            labId,
            date: { gte: monthStart, lt: monthEnd },
          },
        })
      );
    }

    // Parallelize all top-level database queries
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      topDentistStatsRaw,
      allTechnicians,
      casesThisMonth,
      revenueThisMonth,
      techWorkloadRaw,
      ...monthlyVolumesCounts
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
      }) as unknown as Promise<CaseSummary[]>,
      // 2. Due soon
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
      }) as unknown as Promise<CaseSummary[]>,
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
      // 5. Delivered cases (for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Top dentists by case count
      prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,
      // 7. All technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 8. Cases this month
      prisma.case.count({
        where: {
          labId,
          date: { gte: currentMonthStart },
        },
      }),
      // 9. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 10. Tech workload aggregation via groupBy
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      // 11. Monthly volumes
      ...monthlyPromises,
    ]);

    // Secondary query to get dentist names for top dentists
    const topDentistIds = topDentistStatsRaw.map(s => s.dentistId);
    const topDentistNames = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });

    const dentistNameMap = new Map(topDentistNames.map(d => [d.id, d]));

    // --- Post-processing ---

    // Overdue processing
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

    // Due soon processing
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

    // Average turnaround and on-time rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / (deliveredCasesData.length as number)) * 10) / 10;

      const deliveredWithDue = deliveredCasesData.filter(c => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Monthly volumes
    const monthlyCaseVolumes = monthlyVolumesCounts.map((count, i) => ({
      ...monthLabels[i],
      count: count as number,
    }));

    // Top dentists data
    const topDentistData = topDentistStatsRaw.map((s) => {
      const dentist = dentistNameMap.get(s.dentistId);
      return {
        id: s.dentistId,
        name: dentist?.name || "Unknown",
        clinicName: dentist?.clinicName || null,
        caseCount: s._count.id,
        revenue: s._sum.amount || 0,
      };
    });

    // Technician workload post-processing
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techWorkloadRaw.forEach((item) => {
      if (!item.technicianId) return;
      const current = techWorkloadMap.get(item.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(item.status)) {
        current.completedCases += item._count.id;
      } else {
        current.activeCases += item._count.id;
      }
      techWorkloadMap.set(item.technicianId, current);
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
      return {
        id: tech.id,
        name: tech.name,
        ...stats,
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
