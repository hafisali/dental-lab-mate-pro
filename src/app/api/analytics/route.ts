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
  createdAt: Date;
  updatedAt: Date;
}

interface TechStat {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface DentistRevenueStat {
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
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume promises (6 months)
    const monthlyPromises = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return prisma.case.count({
        where: { labId, date: { gte: monthStart, lt: monthEnd } },
      }).then(count => ({
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count
      }));
    });

    // Execute all top-level queries in parallel to minimize round-trips
    const [
      pendingCases,
      statusCountsRaw,
      workTypeCountsRaw,
      deliveryStats,
      topDentistGroups,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonthRaw,
      monthlyCaseVolumes
    ] = await Promise.all([
      // 1. Consolidated cases due before tomorrow end
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

      // 4. Delivery stats (Consolidated turnaround and on-time data)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),

      // 5. Top dentists by volume and revenue
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId, dentist: { active: true } },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<DentistRevenueStat[]>,

      // 6. Technicians for workload mapping
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),

      // 7. Technician workload stats
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,

      // 8. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),

      // 9. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),

      // 10. Monthly volumes (already parallelized)
      Promise.all(monthlyPromises)
    ]);

    // Process Case Summaries (Overdue vs Due Soon)
    const overdueCases = pendingCases
      .filter(c => c.dueDate && c.dueDate < todayStart)
      .map(c => ({
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist,
        patient: c.patient,
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
      }));

    const dueSoonCases = pendingCases
      .filter(c => c.dueDate && c.dueDate >= todayStart)
      .map(c => {
        const d = new Date(c.dueDate!);
        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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

    // Process delivery stats
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveryStats.length > 0) {
      const totalDays = deliveryStats.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveryStats.length) * 10) / 10;

      const withDue = deliveryStats.filter(c => c.dueDate);
      if (withDue.length > 0) {
        const onTimeCount = withDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / withDue.length) * 100);
      }
    }

    // Resolve top dentist names
    const topDentistNames = await prisma.dentist.findMany({
      where: { id: { in: topDentistGroups.map(g => g.dentistId) } },
      select: { id: true, name: true, clinicName: true },
    });

    const topDentistData = topDentistGroups.map(g => {
      const d = topDentistNames.find(dn => dn.id === g.dentistId);
      return {
        id: g.dentistId,
        name: d?.name || "Unknown",
        clinicName: d?.clinicName || "",
        caseCount: g._count.id,
        revenue: g._sum.amount || 0,
      };
    });

    // Process technician workload
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStatsRaw.forEach(stat => {
      if (!stat.technicianId) return;
      const current = techWorkloadMap.get(stat.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        current.completedCases += stat._count.id;
      } else {
        current.activeCases += stat._count.id;
      }
      techWorkloadMap.set(stat.technicianId, current);
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
    }));

    return NextResponse.json({
      overdueCases,
      dueSoonCases,
      statusCounts: statusCountsRaw.map(s => ({ status: s.status, count: s._count.id })),
      workTypeCounts: workTypeCountsRaw.map(w => ({ workType: w.workType, count: w._count.id })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
      revenueThisMonth: revenueThisMonthRaw._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
