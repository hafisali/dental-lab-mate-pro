import { NextRequest, NextResponse } from "next/server";
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
  id: string;
  name: string;
  activeCases: number;
  completedCases: number;
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

export async function GET(req: NextRequest) {
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

    // Optimized: Parallelize all independent database queries to reduce total execution time
    const [
      allDueSoonAndOverdueCases,
      casesByStatus,
      casesByWorkType,
      allDeliveredCases,
      monthlyVolumesResults,
      topDentists,
      allTechnicians,
      techWorkloadGroupBy,
      casesThisMonth,
      revenueThisMonthData,
    ] = await Promise.all([
      // Combined overdue and due soon cases into one query
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
      }) as Promise<CaseDetails[]>,
      prisma.case.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { labId },
      }),
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // Single fetch for all delivered cases to compute both turnaround and on-time rate
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // Parallelize monthly counts instead of sequential loop
      Promise.all(
        Array.from({ length: 6 }).map((_, i) => {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
          return prisma.case.count({
            where: { labId, date: { gte: monthStart, lt: monthEnd } },
          }).then(count => ({
            month: monthStart.toLocaleString("en-IN", { month: "short" }),
            year: monthStart.getFullYear(),
            count
          }));
        })
      ) as Promise<MonthlyVolume[]>,
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
          cases: { select: { amount: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // Efficiently aggregate technician workload using groupBy
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
    ]);

    // Post-process combined overdue/due-soon cases
    const overdueWithDays = (allDueSoonAndOverdueCases as CaseDetails[])
      .filter((c) => c.dueDate && new Date(c.dueDate) < todayStart)
      .map((c) => {
        const dueDate = new Date(c.dueDate!);
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, daysOverdue };
      });

    const dueSoonWithLabel = (allDueSoonAndOverdueCases as CaseDetails[])
      .filter((c) => c.dueDate && new Date(c.dueDate) >= todayStart)
      .map((c) => {
        const dueDate = new Date(c.dueDate!);
        const isToday = dueDate.getDate() === now.getDate() &&
                        dueDate.getMonth() === now.getMonth() &&
                        dueDate.getFullYear() === now.getFullYear();
        return { ...c, dueLabel: isToday ? "Today" : "Tomorrow" };
      });

    // Format status and work type counts
    const statusCounts = (casesByStatus as { status: string; _count: { id: number } }[]).map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = (casesByWorkType as { workType: string; _count: { id: number } }[]).map((w) => ({ workType: w.workType, count: w._count.id }));

    // Compute turnaround and on-time rate in-memory from single delivered data set
    let avgTurnaround = 0;
    let onTimeRate = 0;
    const delivered = allDeliveredCases as { createdAt: Date; updatedAt: Date; dueDate: Date | null }[];
    if (delivered.length > 0) {
      const totalDays = delivered.reduce((sum: number, c) => {
        return sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / delivered.length) * 10) / 10;

      const casesWithDue = delivered.filter((c) => c.dueDate);
      if (casesWithDue.length > 0) {
        const onTimeCount = casesWithDue.filter((c) => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / casesWithDue.length) * 100);
      }
    }

    // Format top dentist data
    const topDentistData: TopDentistData[] = (
      topDentists as unknown as (CaseDetails["dentist"] & {
        clinicName: string | null;
        _count: { cases: number };
        cases: { amount: number }[];
      })[]
    ).map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum: number, c) => sum + c.amount, 0),
    }));

    // Map technician workload from groupBy results
    const techGroupBy = techWorkloadGroupBy as { technicianId: string | null; status: string; _count: { id: number } }[];
    const techWorkload: TechStat[] = (allTechnicians as { id: string; name: string }[]).map((tech) => {
      const stats = techGroupBy.filter((g) => g.technicianId === tech.id);
      const activeCases = stats
        .filter((g) => !["FINISHED", "DELIVERED"].includes(g.status))
        .reduce((sum, g) => sum + g._count.id, 0);
      const completedCases = stats
        .filter((g) => ["FINISHED", "DELIVERED"].includes(g.status))
        .reduce((sum, g) => sum + g._count.id, 0);
      return { id: tech.id, name: tech.name, activeCases, completedCases };
    });

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts,
      workTypeCounts,
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes: monthlyVolumesResults,
      topDentists: topDentistData,
      techWorkload,
      casesThisMonth,
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
