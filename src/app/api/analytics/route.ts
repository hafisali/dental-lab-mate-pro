import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface StatusCount {
  status: string;
  _count: { id: number };
}

interface WorkTypeCount {
  workType: string;
  _count: { id: number };
}

interface TechWorkloadAgg {
  technicianId: string | null;
  status: string;
  _count: { id: number };
}

interface TopDentistAgg {
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

    // Prepare month ranges for case volumes (last 6 months)
    const monthRanges = Array.from({ length: 6 }).map((_, i) => {
      const idx = 5 - i;
      const start = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - idx + 1, 1);
      return { start, end };
    });

    const [
      overdueCases,
      dueSoonCases,
      statusCountsRaw,
      workTypeCountsRaw,
      deliveredData,
      allTechnicians,
      techWorkloadRaw,
      topDentistGroups,
      casesThisMonth,
      revenueThisMonthAgg,
      ...monthlyVolumesRaw
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
      }),
      // 3. Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }) as unknown as Promise<StatusCount[]>,
      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }) as unknown as Promise<WorkTypeCount[]>,
      // 5. Delivered data for turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Technicians
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 7. Tech workload aggregation
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechWorkloadAgg[]>,
      // 8. Top dentists aggregation
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }) as unknown as Promise<TopDentistAgg[]>,
      // 9. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 10. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 11+. Monthly volumes
      ...monthRanges.map((range) =>
        prisma.case.count({
          where: { labId, date: { gte: range.start, lt: range.end } },
        })
      ),
    ]);

    // Post-processing
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

    const statusCounts = statusCountsRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = workTypeCountsRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Average turnaround and On-time rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredData.length > 0) {
      let totalDays = 0;
      let onTimeCount = 0;
      let casesWithDue = 0;

      deliveredData.forEach((c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);

        if (c.dueDate) {
          casesWithDue++;
          if (new Date(c.updatedAt) <= new Date(c.dueDate)) {
            onTimeCount++;
          }
        }
      });

      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;
      if (casesWithDue > 0) {
        onTimeRate = Math.round((onTimeCount / casesWithDue) * 100);
      }
    }

    const monthlyCaseVolumes = monthlyVolumesRaw.map((count, i) => {
      const { start } = monthRanges[i];
      return {
        month: start.toLocaleString("en-IN", { month: "short" }),
        year: start.getFullYear(),
        count,
      };
    });

    // Resolve top dentists names
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistGroups.map((g) => g.dentistId) } },
      select: { id: true, name: true, clinicName: true },
    });

    const dentistMap = new Map(topDentistDetails.map((d) => [d.id, d]));
    const topDentistData = topDentistGroups.map((g) => {
      const details = dentistMap.get(g.dentistId);
      return {
        id: g.dentistId,
        name: details?.name || "Unknown",
        clinicName: details?.clinicName || "N/A",
        caseCount: g._count.id,
        revenue: g._sum.amount || 0,
      };
    });

    // Tech workload mapping
    const workloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techWorkloadRaw.forEach((item) => {
      if (!item.technicianId) return;
      const current = workloadMap.get(item.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(item.status)) {
        current.completedCases += item._count.id;
      } else {
        current.activeCases += item._count.id;
      }
      workloadMap.set(item.technicianId, current);
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
