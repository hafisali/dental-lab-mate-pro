import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

// Interfaces for better type safety and code readability
interface CaseDetails {
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
  _count: { id: number };
}

interface TopDentistData {
  id: string;
  name: string;
  clinicName: string | null;
  _count: { cases: number };
  cases: { amount: number }[];
}

interface DeliveredCase {
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
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

    // Prepare monthly volume ranges for the last 6 months
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      // Set to 1st of month to avoid issues with 31st/30th
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));

      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        monthStart,
        monthEnd,
        monthName: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear()
      };
    });

    /**
     * PERFORMANCE OPTIMIZATION:
     * Parallelize all independent database queries to minimize total wait time.
     * This reduces sequential database round-trips significantly.
     */
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      topDentists,
      allTechnicians,
      techActiveCounts,
      techCompletedCounts,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyVolumes
    ] = await Promise.all([
      // 1. Overdue cases
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      // 2. Due soon cases
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      // 3. Status breakdown
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),
      // 4. Work type breakdown
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),
      // 5. Delivered cases (consolidated for turnaround and on-time rate calculations)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }) as unknown as Promise<DeliveredCase[]>,
      // 6. Top dentists
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }) as unknown as Promise<TopDentistData[]>,
      // 7. Technician list
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      // 8. Technician active workload (Optimized: groupBy instead of N+1 count queries)
      prisma.case.groupBy({
        by: ["technicianId"],
        where: { labId, technicianId: { not: null }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      // 9. Technician completed workload (Optimized: groupBy instead of N+1 count queries)
      prisma.case.groupBy({
        by: ["technicianId"],
        where: { labId, technicianId: { not: null }, status: { in: ["FINISHED", "DELIVERED"] } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      // 10. Current month case count
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      // 11. Current month revenue
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
      // 12. Monthly case volumes time-series
      ...monthlyRanges.map(range =>
        prisma.case.count({ where: { labId, date: { gte: range.monthStart, lt: range.monthEnd } } })
      ),
    ]);

    // Post-process overdue cases with days count
    const overdueWithDays = overdueCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const diffTime = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist.name, // Maintain original flat structure
        patient: c.patient?.name || null, // Maintain original structure
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        daysOverdue,
      };
    });

    // Post-process due soon cases with labels
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday =
        dueDate.getDate() === now.getDate() &&
        dueDate.getMonth() === now.getMonth() &&
        dueDate.getFullYear() === now.getFullYear();
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        dentist: c.dentist.name, // Maintain original flat structure
        patient: c.patient?.name || null, // Maintain original structure
        workType: c.workType,
        dueDate: c.dueDate,
        status: c.status,
        dueLabel: isToday ? "Today" : "Tomorrow",
      };
    });

    // Calculate Average turnaround time and On-time delivery rate from consolidated delivered cases
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;

      const deliveredWithDue = deliveredCases.filter(c => c.dueDate);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Process technician workload using Map for O(1) lookups
    const activeMap = new Map(techActiveCounts.map(t => [t.technicianId, t._count.id]));
    const completedMap = new Map(techCompletedCounts.map(t => [t.technicianId, t._count.id]));

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: activeMap.get(tech.id) || 0,
      completedCases: completedMap.get(tech.id) || 0,
    }));

    // Assemble monthly volume time-series data
    const monthlyCaseVolumes = monthlyRanges.map((range, index) => ({
      month: range.monthName,
      year: range.year,
      count: monthlyVolumes[index] as number,
    }));

    return NextResponse.json({
      overdueCases: overdueWithDays,
      dueSoonCases: dueSoonWithLabel,
      statusCounts: casesByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      workTypeCounts: casesByWorkType.map((w) => ({
        workType: w.workType,
        count: w._count.id,
      })),
      avgTurnaround,
      onTimeRate,
      monthlyCaseVolumes,
      topDentists: topDentists.map((d) => ({
        id: d.id,
        name: d.name,
        clinicName: d.clinicName,
        caseCount: d._count.cases,
        revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
      })),
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
