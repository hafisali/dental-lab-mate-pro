import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

export async function GET(_req: NextRequest) {
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
    const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Overdue cases: dueDate < now AND status NOT IN ('FINISHED', 'DELIVERED')
    const overdueCases = await prisma.case.findMany({
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
    });

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

    // Due soon: cases where dueDate is today or tomorrow
    const dueSoonCases = await prisma.case.findMany({
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

    // Cases by status count
    const casesByStatus = await prisma.case.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { labId },
    });

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Cases by work type count
    const casesByWorkType = await prisma.case.groupBy({
      by: ["workType"],
      _count: { id: true },
      where: { labId },
      orderBy: { _count: { id: "desc" } },
    });

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Average turnaround time (avg days from createdAt to updatedAt where status=DELIVERED)
    const deliveredCases = await prisma.case.findMany({
      where: { labId, status: "DELIVERED" },
      select: { createdAt: true, updatedAt: true },
    });

    let avgTurnaround = 0;
    if (deliveredCases.length > 0) {
      const totalDays = deliveredCases.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCases.length) * 10) / 10;
    }

    // On-time delivery rate
    const deliveredWithDue = await prisma.case.findMany({
      where: { labId, status: "DELIVERED", dueDate: { not: null } },
      select: { dueDate: true, updatedAt: true },
    });

    let onTimeRate = 0;
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Monthly case volumes (last 6 months)
    // BOLT OPTIMIZATION: Use a single findMany query for the entire 6-month period
    // instead of 6 separate count queries to reduce database round-trips (resolves N+1).
    const casesInLast6Months = await prisma.case.findMany({
      where: {
        labId,
        date: { gte: last6MonthsStart },
      },
      select: { date: true },
    });

    const monthlyCaseVolumes = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();

      const count = casesInLast6Months.filter((c) => {
        const d = new Date(c.date);
        return d >= monthStart && d < monthEnd;
      }).length;

      monthlyCaseVolumes.push({ month: monthName, year, count });
    }

    // Top dentists by case count and revenue
    // BOLT OPTIMIZATION: Use groupBy on the Case model to calculate revenue and case counts at once,
    // avoiding fetching every case record for each dentist.
    const topDentistsByVolume = await prisma.case.groupBy({
      by: ["dentistId"],
      where: {
        labId,
        dentist: { active: true }
      },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const topDentistIds = topDentistsByVolume.map((v) => v.dentistId);
    const dentistNames = await prisma.dentist.findMany({
      where: { id: { in: topDentistIds } },
      select: { id: true, name: true, clinicName: true },
    });

    const topDentistData = topDentistsByVolume.map((v) => {
      const d = dentistNames.find((dn) => dn.id === v.dentistId);
      return {
        id: v.dentistId,
        name: d?.name || "Unknown",
        clinicName: d?.clinicName || null,
        caseCount: v._count.id,
        revenue: v._sum.amount || 0,
      };
    });

    // Technician workload
    // BOLT OPTIMIZATION: Use a single groupBy query on the Case model to get all technician counts at once,
    // avoiding the N+1 problem (2 queries per technician).
    const allTechnicians = await prisma.user.findMany({
      where: { labId, role: "TECHNICIAN", active: true },
      select: { id: true, name: true },
    });

    const techCountsByStatus = await prisma.case.groupBy({
      by: ["technicianId", "status"],
      where: {
        labId,
        technicianId: { in: allTechnicians.map((t) => t.id) },
      },
      _count: { id: true },
    });

    const techWorkload = allTechnicians.map((tech) => {
      const activeCases = techCountsByStatus
        .filter(
          (c) =>
            c.technicianId === tech.id &&
            !["FINISHED", "DELIVERED"].includes(c.status)
        )
        .reduce((sum, c) => sum + c._count.id, 0);

      const completedCases = techCountsByStatus
        .filter(
          (c) =>
            c.technicianId === tech.id &&
            ["FINISHED", "DELIVERED"].includes(c.status)
        )
        .reduce((sum, c) => sum + c._count.id, 0);

      return {
        id: tech.id,
        name: tech.name,
        activeCases,
        completedCases,
      };
    });

    // Cases this month count
    const casesThisMonth = await prisma.case.count({
      where: {
        labId,
        date: { gte: currentMonthStart },
      },
    });

    // Revenue this month (from payments)
    const revenueThisMonth = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: currentMonthStart },
        dentist: { labId },
      },
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
