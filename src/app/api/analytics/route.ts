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

    // Prepare all top-level independent promises
    const overduePromise = prisma.case.findMany({
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
    }) as unknown as Promise<CaseSummary[]>;

    const dueSoonPromise = prisma.case.findMany({
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
    }) as unknown as Promise<CaseSummary[]>;

    const statusCountsPromise = prisma.case.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { labId },
    });

    const workTypeCountsPromise = prisma.case.groupBy({
      by: ["workType"],
      _count: { id: true },
      where: { labId },
      orderBy: { _count: { id: "desc" } },
    });

    // Consolidate delivered cases queries for both turnaround and on-time rate
    const deliveredCasesPromise = prisma.case.findMany({
      where: { labId, status: "DELIVERED" },
      select: { createdAt: true, updatedAt: true, dueDate: true },
    });

    // Monthly case volumes (last 6 months) - prepare parallel promises
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

    // Top dentists by case count and revenue using groupBy
    const topDentistsPromise = (prisma.case.groupBy({
      by: ["dentistId"],
      where: { labId },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }) as unknown) as Promise<DentistStat[]>;

    // Technician workload using groupBy
    const techWorkloadPromise = (prisma.case.groupBy({
      by: ["technicianId", "status"],
      where: { labId, technicianId: { not: null } },
      _count: { id: true },
    }) as unknown) as Promise<TechStat[]>;

    const techniciansPromise = prisma.user.findMany({
      where: { labId, role: "TECHNICIAN", active: true },
      select: { id: true, name: true },
    });

    const revenueThisMonthPromise = prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: currentMonthStart },
        dentist: { labId },
      },
    });

    // Execute all promises in parallel
    const [
      overdueCases,
      dueSoonCases,
      statusCountsRaw,
      workTypeCountsRaw,
      deliveredCases,
      monthlyCounts,
      topDentistStats,
      techStats,
      technicians,
      revenueThisMonth,
    ] = await Promise.all([
      overduePromise,
      dueSoonPromise,
      statusCountsPromise,
      workTypeCountsPromise,
      deliveredCasesPromise,
      Promise.all(monthlyVolumePromises),
      topDentistsPromise,
      techWorkloadPromise,
      techniciansPromise,
      revenueThisMonthPromise,
    ]);

    // Post-process Overdue
    const overdueWithDays = overdueCases.map((c) => {
      const diffTime = now.getTime() - new Date(c.dueDate!).getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...c, daysOverdue };
    });

    // Post-process Due Soon
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return { ...c, dueLabel: isToday ? "Today" : "Tomorrow" };
    });

    // Post-process Status counts
    const statusCounts = statusCountsRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Post-process Work type counts
    const workTypeCounts = workTypeCountsRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Turnaround and On-time Rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;

      const deliveredWithDue = deliveredCases.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Post-process Monthly volumes
    const monthlyCaseVolumes = monthlyCounts.map((count, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
        count,
      };
    });

    // Post-process Top Dentists (Fetch names for the top IDs)
    const dentistIds = topDentistStats.map((s) => s.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: dentistIds } },
      select: { id: true, name: true, clinicName: true },
    });
    const dentistMap = new Map(topDentistDetails.map((d) => [d.id, d]));

    const topDentistData = topDentistStats.map((s) => ({
      id: s.dentistId,
      name: dentistMap.get(s.dentistId)?.name || "Unknown",
      clinicName: dentistMap.get(s.dentistId)?.clinicName,
      caseCount: s._count.id,
      revenue: s._sum.amount || 0,
    }));

    // Post-process Tech Workload
    const techWorkloadMap = new Map<string, { activeCases: number; completedCases: number }>();
    techStats.forEach((s) => {
      if (!s.technicianId) return;
      const current = techWorkloadMap.get(s.technicianId) || { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(s.status)) {
        current.completedCases += s._count.id;
      } else {
        current.activeCases += s._count.id;
      }
      techWorkloadMap.set(s.technicianId, current);
    });

    const techWorkload = technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      ...(techWorkloadMap.get(tech.id) || { activeCases: 0, completedCases: 0 }),
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
      casesThisMonth: monthlyCounts[5], // Last month in the 6-month array is the current month
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
