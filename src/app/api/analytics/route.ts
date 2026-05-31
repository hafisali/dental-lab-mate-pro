import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface TechStat {
  technicianId: string;
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

    // Generate promises for monthly volumes to run in parallel
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return prisma.case.count({
        where: { labId, date: { gte: start, lt: end } },
      });
    });

    // Run all top-level database queries in parallel to eliminate sequential bottlenecks
    const [
      activeCasesNearDue,
      deliveredCasesData,
      casesByStatus,
      casesByWorkType,
      techStatsRaw,
      allTechnicians,
      revenueThisMonthResult,
      dentistStatsRaw,
      ...monthlyVolumesData
    ] = await Promise.all([
      // 1. Overdue and Due Soon cases combined into a single query
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
      }),
      // 2. Delivered cases for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 3. Status breakdown
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Work type breakdown
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Tech workload aggregated by status to eliminate N+1 queries
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      // 6. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 7. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 8. Top dentists stats by revenue and count via groupBy
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentist: { active: true } },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // 9. Monthly volumes
      ...monthlyPromises,
    ]);

    const techStats = techStatsRaw as unknown as TechStat[];
    const dentistStats = dentistStatsRaw as unknown as DentistStat[];

    // Resolve top dentist names in a single dependent query
    const topDentistIds = dentistStats.map((s) => s.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });

    // ─── Post-processing ──────────────────────────────────────────────────

    // Split combined cases into Overdue and Due Soon
    const overdueWithDays = activeCasesNearDue
      .filter((c) => c.dueDate && new Date(c.dueDate) < todayStart)
      .map((c) => {
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

    const dueSoonWithLabel = activeCasesNearDue
      .filter((c) => c.dueDate && new Date(c.dueDate) >= todayStart)
      .map((c) => {
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

    // Turnaround and On-time rate from single deliveredCasesData
    let avgTurnaround = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
    }

    const deliveredWithDue = deliveredCasesData.filter((c) => c.dueDate !== null);
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Map monthly volumes
    const monthlyCaseVolumes = monthlyVolumesData.map((count, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        count,
      };
    });

    // Map top dentists
    const topDentistData = dentistStats.map((stat) => {
      const details = topDentistDetails.find((d) => d.id === stat.dentistId);
      return {
        id: stat.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName || null,
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // Process tech workload map for O(1) correlation
    const workloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStats.forEach((stat) => {
      const id = stat.technicianId;
      if (!workloadMap.has(id)) {
        workloadMap.set(id, { activeCases: 0, completedCases: 0 });
      }
      const current = workloadMap.get(id)!;
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = workloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 };
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
      casesThisMonth: monthlyVolumesData[5], // Reuse last element from monthly time-series
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
