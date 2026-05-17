import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface StatusStat {
  status: string;
  _count: { id: number };
}

interface WorkTypeStat {
  workType: string;
  _count: { id: number };
}

interface TechStat {
  id: string;
  name: string;
  activeCases: number;
  completedCases: number;
}

interface DentistStat {
  id: string;
  name: string;
  clinicName: string | null;
  caseCount: number;
  revenue: number;
}

interface GroupedTechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface GroupedDentistStat {
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

    // Optimized: Run independent top-level queries in parallel
    const [
      allDueCases,
      allDeliveredCases,
      statusCountsRaw,
      workTypeCountsRaw,
      monthlyVolumes,
      technicians,
      revenueThisMonthData,
      topDentistsRaw,
    ] = await Promise.all([
      // 1. Unified due cases fetch (overdue + due soon)
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

      // 2. Unified delivered cases fetch (for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 3. Status breakdown
      (prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusStat[]>),

      // 4. Work type breakdown
      (prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeStat[]>),

      // 5. Monthly volumes parallelized
      Promise.all(
        Array.from({ length: 6 }).map(async (_, i) => {
          const index = 5 - i;
          const monthStart = new Date(now.getFullYear(), now.getMonth() - index, 1);
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
          const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
          const year = monthStart.getFullYear();

          const count = await prisma.case.count({
            where: { labId, date: { gte: monthStart, lt: monthEnd } },
          });

          return { month: monthName, year, count };
        })
      ),

      // 6. Technician list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 7. Monthly revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),

      // 8. Identify top dentists by case count (Only active dentists)
      (prisma.case.groupBy({
        by: ["dentistId"],
        _count: { id: true },
        _sum: { amount: true },
        where: {
          labId,
          dentist: { active: true } // Maintain "active" filter
        },
        orderBy: { _count: { id: "desc" } }, // Corrected orderBy field
        take: 10,
      }) as unknown as Promise<GroupedDentistStat[]>),
    ]);

    // POST-PROCESSING:

    // Split unified due cases
    const overdueWithDays = allDueCases
      .filter((c) => c.dueDate && c.dueDate < todayStart)
      .map((c) => {
        const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
        return {
          id: c.id,
          caseNumber: c.caseNumber,
          dentist: c.dentist,
          patient: c.patient,
          workType: c.workType,
          dueDate: c.dueDate,
          status: c.status,
          daysOverdue: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
        };
      });

    const dueSoonWithLabel = allDueCases
      .filter((c) => c.dueDate && c.dueDate >= todayStart)
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

    // Stats calculations
    const statusCounts = statusCountsRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = workTypeCountsRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (allDeliveredCases.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let casesWithDue = 0;

      for (const c of allDeliveredCases) {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          casesWithDue++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      }

      avgTurnaround = Math.round((totalDays / allDeliveredCases.length) * 10) / 10;
      if (casesWithDue > 0) {
        onTimeRate = Math.round((onTimeCount / casesWithDue) * 100);
      }
    }

    // Technician Workload optimized with Map and groupBy
    const techStatsRaw = await (prisma.case.groupBy({
      by: ["technicianId", "status"],
      where: {
        labId,
        technicianId: { in: technicians.map(t => t.id) }
      },
      _count: { id: true }
    }) as unknown as Promise<GroupedTechStat[]>);

    const techWorkloadMap = new Map<string, { active: number; completed: number }>();
    for (const stat of techStatsRaw) {
      if (!stat.technicianId) continue;
      const current = techWorkloadMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.id;
      } else {
        current.active += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    }

    const techWorkload: TechStat[] = technicians.map(tech => {
      const stats = techWorkloadMap.get(tech.id) || { active: 0, completed: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.active,
        completedCases: stats.completed
      };
    });

    // Layer 2: Fetch dentist details in one query instead of multiple findUnique
    const dentistIds = topDentistsRaw.map(d => d.dentistId);
    const dentistsInfo = await prisma.dentist.findMany({
      where: { id: { in: dentistIds } },
      select: { id: true, name: true, clinicName: true }
    });

    const dentistsInfoMap = new Map(dentistsInfo.map(d => [d.id, d]));

    const topDentists: DentistStat[] = topDentistsRaw.map((d) => {
      const info = dentistsInfoMap.get(d.dentistId);
      return {
        id: d.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName || null,
        caseCount: d._count.id,
        revenue: d._sum.amount || 0
      };
    });

    // Final result
    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes: monthlyVolumes,
      topDentists,
      techWorkload,
      casesThisMonth: monthlyVolumes[5].count,
      revenueThisMonth: revenueThisMonthData._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
