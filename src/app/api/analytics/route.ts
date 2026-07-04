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
  daysOverdue?: number;
  dueLabel?: string;
}

interface TechStat {
  technicianId: string | null;
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

    // Monthly volume ranges
    const monthlyRanges = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return { start, end, name: start.toLocaleString("en-IN", { month: "short" }), year: start.getFullYear() };
    });

    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredData,
      topDentistsRaw,
      allTechnicians,
      techStatsRaw,
      casesThisMonth,
      revenueThisMonthAggregate,
      ...monthlyCounts
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
      prisma.case.findMany({ where: { labId, status: "DELIVERED" }, select: { createdAt: true, updatedAt: true, dueDate: true } }),
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }),
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      prisma.case.groupBy({ by: ["technicianId", "status"], _count: { id: true }, where: { labId, technicianId: { not: null } } }) as unknown as Promise<TechStat[]>,
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }),
      ...monthlyRanges.map(range => prisma.case.count({ where: { labId, date: { gte: range.start, lt: range.end } } })),
    ]);

    // Format Overdue Cases
    const overdueWithDays: CaseDetails[] = overdueCasesRaw.map((c) => {
      const dueDate = new Date(c.dueDate!);
      const diffTime = now.getTime() - dueDate.getTime();
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

    // Format Due Soon Cases
    const dueSoonWithLabel: CaseDetails[] = dueSoonCasesRaw.map((c) => {
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

    const statusCounts = casesByStatusRaw.map((s) => ({ status: s.status, count: s._count.id }));
    const workTypeCounts = casesByWorkTypeRaw.map((w) => ({ workType: w.workType, count: w._count.id }));

    // Turnaround and On-time Delivery Rate (Consolidated)
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredData.length > 0) {
      const totalDays = deliveredData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredData.length) * 10) / 10;

      const deliveredWithDue = deliveredData.filter(c => c.dueDate !== null);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    // Monthly case volumes
    const monthlyCaseVolumes: MonthlyVolume[] = monthlyRanges.map((range, idx) => ({
      month: range.name,
      year: range.year,
      count: monthlyCounts[idx],
    }));

    // Top dentists data
    const topDentistData: TopDentistData[] = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    // Technician workload (Optimized with lookup map)
    const techStatsMap = techStatsRaw.reduce((acc, curr) => {
      if (!curr.technicianId) return acc;
      if (!acc[curr.technicianId]) acc[curr.technicianId] = { active: 0, completed: 0 };
      if (["FINISHED", "DELIVERED"].includes(curr.status)) {
        acc[curr.technicianId].completed += curr._count.id;
      } else {
        acc[curr.technicianId].active += curr._count.id;
      }
      return acc;
    }, {} as Record<string, { active: number; completed: number }>);

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap[tech.id]?.active || 0,
      completedCases: techStatsMap[tech.id]?.completed || 0,
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
      revenueThisMonth: (revenueThisMonthAggregate as any)._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
