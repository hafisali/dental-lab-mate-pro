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
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Prepare monthly volume queries
    const monthlyVolumesPromises = [];
    for (let i = 5; i >= 0; i--) {
      // Use "1st of month" safety pattern to avoid month-skipping
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      monthlyVolumesPromises.push(
        prisma.case.count({
          where: {
            labId,
            date: { gte: monthStart, lt: monthEnd },
          },
        }).then(count => ({
          month: monthStart.toLocaleString("en-IN", { month: "short" }),
          year: monthStart.getFullYear(),
          count
        }))
      );
    }

    // Execute all independent database queries in parallel
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      monthlyCaseVolumes,
      topDentists,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonthResult,
      dentistRevenueRaw
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
      }),
      // 4. Work type counts
      prisma.case.groupBy({
        by: ["workType"],
        _count: { id: true },
        where: { labId },
        orderBy: { _count: { id: "desc" } },
      }),
      // 5. Delivered cases (combined for turnaround and on-time rate)
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      // 6. Monthly volumes (already an array of promises)
      Promise.all(monthlyVolumesPromises),
      // 7. Top dentists (basic info and case count)
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: {
          _count: { select: { cases: true } },
        },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      // 8. Technicians list
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      // 9. Tech stats (groupBy technicianId and status)
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<{ technicianId: string; status: string; _count: { id: number } }[]>,
      // 10. Cases this month
      prisma.case.count({
        where: { labId, date: { gte: currentMonthStart } },
      }),
      // 11. Revenue this month
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      // 12. Revenue per dentist (for top dentists calculation)
      prisma.case.groupBy({
        by: ["dentistId"],
        where: { labId },
        _sum: { amount: true },
      }) as unknown as Promise<{ dentistId: string; _sum: { amount: number | null } }[]>,
    ]);

    // Post-process Overdue
    const overdueWithDays = overdueCases.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Post-process Due Soon
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

    // Post-process Status Counts
    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Post-process Work Type Counts
    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Calculate Turnaround and On-time Rate from consolidated data
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesData.filter(c => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(
          (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
        ).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Map Dentist Revenue for Top Dentists (O(1) lookup)
    const revenueMap = new Map(dentistRevenueRaw.map(r => [r.dentistId, r._sum.amount || 0]));
    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: revenueMap.get(d.id) || 0,
    }));

    // Map Tech Stats for Workload (O(1) lookup)
    // techStatsMap structure: Map<technicianId, { active: number, completed: number }>
    const techStatsMap = new Map<string, { active: number; completed: number }>();
    techStatsRaw.forEach(stat => {
      const techId = stat.technicianId;
      if (!techStatsMap.has(techId)) {
        techStatsMap.set(techId, { active: 0, completed: 0 });
      }
      const entry = techStatsMap.get(techId)!;
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        entry.completed += stat._count.id;
      } else {
        entry.active += stat._count.id;
      }
    });

    const techWorkload = allTechnicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap.get(tech.id)?.active || 0,
      completedCases: techStatsMap.get(tech.id)?.completed || 0,
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
      casesThisMonth,
      revenueThisMonth: revenueThisMonthResult._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
