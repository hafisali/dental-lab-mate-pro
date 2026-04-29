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

    // Prepare month boundaries for parallel monthly volume calculation
    const monthBoundaries = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return {
        start: monthStart,
        end: monthEnd,
        name: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
      };
    });

    // Execute all independent queries in parallel to significantly reduce total API latency
    // This replaces a sequential chain of ~12+ queries (plus loops) with parallel execution.
    const [
      overdueCases,
      dueSoonCases,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredCases,
      deliveredWithDue,
      monthlyCounts,
      topDentistsGroupBy,
      allDentists,
      allTechnicians,
      techWorkloadRaw,
      casesThisMonth,
      revenueThisMonthRaw,
    ] = await Promise.all([
      // 1. Overdue cases
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      // 2. Due soon cases
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      // 3. Cases by status
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }),
      // 4. Cases by work type
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }),
      // 5. Turnaround time data
      prisma.case.findMany({ where: { labId, status: "DELIVERED" }, select: { createdAt: true, updatedAt: true } }),
      // 6. On-time delivery data
      prisma.case.findMany({ where: { labId, status: "DELIVERED", dueDate: { not: null } }, select: { dueDate: true, updatedAt: true } }),
      // 7. Monthly case volumes (Parallelized loop)
      Promise.all(monthBoundaries.map(m => prisma.case.count({ where: { labId, date: { gte: m.start, lt: m.end } } }))),
      // 8. Top dentists (Aggregated at DB level for maximum performance)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // 8b. Dentist info for mapping
      prisma.dentist.findMany({
        where: { labId, active: true },
        select: { id: true, name: true, clinicName: true },
      }),
      // 9. Technicians list
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      // 10. Technician workload (Optimized with groupBy to avoid N+1 queries)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }),
      // 11. Cases this month
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      // 12. Revenue this month
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
    ]);

    // --- Post-processing (In-memory) ---

    const overdueWithDays = overdueCases.map((c) => {
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

    const dueSoonWithLabel = dueSoonCases.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const isToday = dueDate.toDateString() === now.toDateString();
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

    const statusCounts = casesByStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkTypeRaw.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    const monthlyCaseVolumes = monthBoundaries.map((m, i) => ({
      month: m.name,
      year: m.year,
      count: monthlyCounts[i],
    }));

    const topDentistData = topDentistsGroupBy.map((g) => {
      const dentist = allDentists.find((d) => d.id === g.dentistId);
      return {
        id: g.dentistId,
        name: dentist?.name || "Unknown Dentist",
        clinicName: dentist?.clinicName,
        caseCount: g._count.id,
        revenue: g._sum.amount || 0,
      };
    });

    const techWorkload = allTechnicians.map((tech) => {
      const techStats = techWorkloadRaw.filter((s) => s.technicianId === tech.id);
      const activeCases = techStats
        .filter((s) => !["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      const completedCases = techStats
        .filter((s) => ["FINISHED", "DELIVERED"].includes(s.status))
        .reduce((sum, s) => sum + s._count.id, 0);
      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
      };
    });

    const revenueThisMonth = revenueThisMonthRaw._sum.amount || 0;

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
      revenueThisMonth,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
