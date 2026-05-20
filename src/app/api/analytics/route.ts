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

interface DentistStat {
  dentistId: string;
  _sum: { amount: number | null };
  _count: { id: number };
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

    // Optimized: Parallelize all independent database queries
    const [
      activeCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      monthlyVolumes,
      topDentistsSummary,
      allTechnicians,
      techWorkloadSummary,
      revenueThisMonth,
    ] = await Promise.all([
      // 1. Combined Overdue and Due Soon cases
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

      // 2. Cases by status count
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),

      // 3. Cases by work type count
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),

      // 4. Combined Delivered cases for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 5. Monthly case volumes (Parallelized)
      Promise.all(
        Array.from({ length: 6 }).map((_, i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
          return prisma.case.count({
            where: { labId, date: { gte: monthStart, lt: monthEnd } },
          }).then(count => ({
            month: monthStart.toLocaleString("en-IN", { month: "short" }),
            year: monthStart.getFullYear(),
            count,
          }));
        })
      ),

      // 6. Top dentists by volume and revenue (Optimized groupBy)
      prisma.case.groupBy({
        by: ["dentistId"],
        _sum: { amount: true },
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistStat[]>,

      // 7. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 8. Technician workload (Optimized groupBy)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<TechStat[]>,

      // 9. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
    ]);

    // --- Post-processing ---

    // Partition active cases into Overdue and Due Soon
    const overdueWithDays = [];
    const dueSoonWithLabel = [];

    for (const c of activeCases) {
      const dueDate = c.dueDate ? new Date(c.dueDate) : null;
      if (!dueDate) continue;

      if (dueDate < todayStart) {
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdueWithDays.push({ ...c, daysOverdue });
      } else {
        const isToday =
          dueDate.getDate() === now.getDate() &&
          dueDate.getMonth() === now.getMonth() &&
          dueDate.getFullYear() === now.getFullYear();
        dueSoonWithLabel.push({ ...c, dueLabel: isToday ? "Today" : "Tomorrow" });
      }
    }

    // Status counts
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Work type counts
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Performance metrics (Turnaround & On-time)
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let withDueDateCount = 0;

      deliveredCasesData.forEach((c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          withDueDateCount++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      });

      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
      if (withDueDateCount > 0) {
        onTimeRate = Math.round((onTimeCount / withDueDateCount) * 100);
      }
    }

    // Top Dentist Details (N+1 avoided)
    const topDentistIds = topDentistsSummary.map(d => d.dentistId);
    const dentistsInfo = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });
    const dentistInfoMap = new Map(dentistsInfo.map(d => [d.id, d]));

    const topDentistData = topDentistsSummary.map(d => {
      const info = dentistInfoMap.get(d.dentistId);
      return {
        id: d.dentistId,
        name: info?.name || "Unknown",
        clinicName: info?.clinicName,
        caseCount: d._count.id,
        revenue: d._sum.amount || 0,
      };
    });

    // Technician Workload processing (O(N) mapping)
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techWorkloadSummary.forEach(s => {
      if (!s.technicianId) return;
      const current = techWorkloadMap.get(s.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(s.status)) {
        current.completedCases += s._count.id;
      } else {
        current.activeCases += s._count.id;
      }
      techWorkloadMap.set(s.technicianId, current);
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
    }));

    // Reuse monthly volume for 'casesThisMonth'
    const casesThisMonth = monthlyVolumes[monthlyVolumes.length - 1].count;

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes: monthlyVolumes,
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
