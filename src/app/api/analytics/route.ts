import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface CaseDetails {
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

interface MonthlyVolume {
  month: string;
  year: number;
  count: number;
}

interface TopDentistData {
  id: string;
  name: string;
  clinicName: string | null;
  caseCount: number;
  revenue: number;
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

    // Parallelize all independent database queries to minimize response time
    // Consolidates redundant queries for pending and delivered cases
    const [
      pendingCases,
      allDeliveredCases,
      casesByStatus,
      casesByWorkType,
      topDentists,
      allTechnicians,
      techStats,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyCounts
    ] = await Promise.all([
      // 1. Consolidated Pending cases (overdue + due soon)
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
      }) as unknown as Promise<CaseDetails[]>,
      // 2. Consolidated Delivered cases (for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 3. Status counts
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 6. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 7. Tech workload stats (replaces loop with a single groupBy)
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
      // 10+. Last 6 months volumes
      ...Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } },
        });
      }),
    ]);

    // Process Overdue cases
    const overdueWithDays = pendingCases
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

    // Process Due Soon cases
    const dueSoonWithLabel = pendingCases
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

    // Process status and work type counts
    const statusCounts = (casesByStatus as { status: string; _count: { id: number } }[]).map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = (casesByWorkType as { workType: string; _count: { id: number } }[]).map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Calculate Average turnaround and On-time rate from consolidated delivered cases
    let avgTurnaround = 0;
    let onTimeRate = 0;

    if (allDeliveredCases.length > 0) {
      const totalDays = allDeliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / allDeliveredCases.length) * 10) / 10;

      const deliveredWithDue = allDeliveredCases.filter((c) => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Process Monthly case volumes
    const monthlyCaseVolumes: MonthlyVolume[] = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        count: monthlyCounts[i] as number,
      };
    });

    // Process Top Dentists
    const topDentistData: TopDentistData[] = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + (c as { amount: number }).amount, 0),
    }));

    // Process Technician Workload from grouped stats
    const techWorkload = allTechnicians.map((tech) => {
      const activeCases = techStats
        .filter((s) => s.technicianId === tech.id && !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      const completedCases = techStats
        .filter((s) => s.technicianId === tech.id && ["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
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
      revenueThisMonth: (revenueThisMonth as { _sum: { amount: number | null } })._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
