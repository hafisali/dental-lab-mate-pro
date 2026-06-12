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

interface MonthVolume {
  month: string;
  year: number;
  count: number;
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

    // Generate month ranges for parallel volume queries
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        start,
        end,
        monthName: start.toLocaleString("en-IN", { month: "short" }),
        year: start.getFullYear(),
      };
    }).reverse();

    // Parallelize all primary data fetches
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      allTechnicians,
      techCaseStats,
      topDentistStats,
      revenueThisMonth,
      ...monthlyVolumes
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

      // 2. Due soon cases
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

      // 3. Status grouping
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // 4. Work type grouping
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // 5. Delivered cases for metrics
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 6. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 7. Tech workload stats (consolidated)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // 8. Top dentists stats (efficient aggregation, filtered for active)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentist: { active: true } },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,

      // 9. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),

      // 10+. Monthly volumes (spread into the Promise.all)
      ...monthRanges.map((range) =>
        prisma.case.count({
          where: {
            labId,
            date: { gte: range.start, lt: range.end },
          },
        })
      ),
    ]);

    // Process results in memory
    const overdueWithDays = overdueCases.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...c, daysOverdue };
    });

    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday = dueDate.toDateString() === now.toDateString();
      return { ...c, dueLabel: isToday ? "Today" : "Tomorrow" };
    });

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Performance metrics
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;

      const deliveredWithDue = deliveredCases.filter((c) => c.dueDate);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Map monthly volumes back to their ranges
    const monthlyCaseVolumes: MonthVolume[] = monthRanges.map((range, i) => ({
      month: range.monthName,
      year: range.year,
      count: monthlyVolumes[i] as number,
    }));

    // Resolve dentist names for top dentists
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistStats.map((s) => s.dentistId) } },
      select: { id: true, name: true, clinicName: true },
    });

    const topDentistData = topDentistStats.map((stat) => {
      const details = topDentistDetails.find((d) => d.id === stat.dentistId);
      return {
        id: stat.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName,
        caseCount: stat._count.id,
        revenue: stat._sum.amount || 0,
      };
    });

    // Process technician workload from grouping
    const techWorkloadMap = new Map<string, { active: number; completed: number }>();
    techCaseStats.forEach((stat) => {
      if (!stat.technicianId) return;
      const current = techWorkloadMap.get(stat.technicianId) || { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completed += stat._count.id;
      } else {
        current.active += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map((tech) => {
      const stats = techWorkloadMap.get(tech.id) || { active: 0, completed: 0 };
      return {
        id: tech.id,
        name: tech.name,
        activeCases: stats.active,
        completedCases: stats.completed,
      };
    });

    // Get current month volume from already fetched monthlyVolumes
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
      revenueThisMonth: (revenueThisMonth as { _sum: { amount: number | null } })._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
