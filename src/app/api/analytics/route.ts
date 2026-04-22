import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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

    // Prepare monthly volume queries
    const monthlyVolumePromises = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();

      monthlyVolumePromises.push(
        prisma.case.count({
          where: { labId, date: { gte: monthStart, lt: monthEnd } }
        }).then(count => ({ month: monthName, year, count }))
      );
    }

    /**
     * BOLT OPTIMIZATION:
     * 1. Parallelized 10+ independent database queries into a single Promise.all.
     * 2. Eliminated N+1 query pattern for technician workload by using groupBy.
     * 3. Reduced data transfer for top dentists by using aggregation.
     * Expected impact: ~60-80% reduction in API response time.
     */
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCases,
      deliveredWithDue,
      monthlyCaseVolumes,
      topDentistAggs,
      allTechnicians,
      techStatusCounts,
      casesThisMonth,
      revenueThisMonth
    ] = await Promise.all([
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),
      prisma.case.findMany({ where: { labId, status: "DELIVERED" }, select: { createdAt: true, updatedAt: true } }),
      prisma.case.findMany({ where: { labId, status: "DELIVERED", dueDate: { not: null } }, select: { dueDate: true, updatedAt: true } }),
      Promise.all(monthlyVolumePromises),
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _count: { id: true },
        _sum: { amount: true },
        orderBy: { _count: { id: "desc" } },
        take: 10
      }),
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true }
      }),
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } })
    ]);

    // Process overdue cases
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

    // Process due soon cases
    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday = dueDate.getDate() === now.getDate() &&
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
    const statusCounts = casesByStatus.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkType.map((w) => ({ workType: w.workType, count: w._count.id }));

    // Average turnaround time
    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    // On-time delivery rate
    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Process top dentists names (additional small query but for only 10 dentists)
    const topDentistIds = topDentistAggs.map(agg => agg.dentistId);
    const topDentistDetails = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true }
    });

    const topDentistData = topDentistAggs.map(agg => {
      const detail = topDentistDetails.find(d => d.id === agg.dentistId);
      return {
        id: agg.dentistId,
        name: detail?.name || "Unknown",
        clinicName: detail?.clinicName || "",
        caseCount: agg._count.id,
        revenue: agg._sum.amount || 0
      };
    });

    // Process technician workload from in-memory aggregation
    const techWorkload = allTechnicians.map(tech => {
      const techCounts = techStatusCounts.filter(c => c.technicianId === tech.id);
      const activeCases = techCounts
        .filter(c => !["FINISHED", "DELIVERED"].includes(c.status))
        .reduce((sum, c) => sum + c._count.id, 0);
      const completedCases = techCounts
        .filter(c => ["FINISHED", "DELIVERED"].includes(c.status))
        .reduce((sum, c) => sum + c._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases
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
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
