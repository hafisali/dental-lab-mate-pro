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
  updatedAt: Date;
  createdAt: Date;
}

interface StatusCount {
  status: string;
  _count: { id: number };
}

interface WorkTypeCount {
  workType: string;
  _count: { id: number };
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

    // Parallelize all independent database queries
    // Expected impact: Reduces database round-trips from ~16 + 2N to 1 sequential block.
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return { start, end, label: start.toLocaleString("en-IN", { month: "short" }), year: start.getFullYear() };
    });

    const [
      overdueCasesRaw,
      dueSoonCasesRaw,
      casesByStatusRaw,
      casesByWorkTypeRaw,
      deliveredCasesRaw,
      monthlyVolumesRaw,
      topDentistsRaw,
      technicians,
      techCaseStatsRaw,
      casesThisMonth,
      revenueThisMonth,
    ]: [
      CaseDetails[],
      CaseDetails[],
      StatusCount[],
      WorkTypeCount[],
      Pick<CaseDetails, "createdAt" | "updatedAt" | "dueDate">[],
      number[],
      { id: string; name: string; clinicName: string | null; _count: { cases: number }; cases: { amount: number }[] }[],
      { id: string, name: string }[],
      TechStat[],
      number,
      { _sum: { amount: number | null } }
    ] = await Promise.all([
      prisma.case.findMany({
        where: { labId, dueDate: { lt: todayStart }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      prisma.case.findMany({
        where: { labId, dueDate: { gte: todayStart, lt: tomorrowEnd }, status: { notIn: ["FINISHED", "DELIVERED"] } },
        include: { dentist: { select: { id: true, name: true } }, patient: { select: { id: true, name: true } } },
        orderBy: { dueDate: "asc" },
      }) as unknown as Promise<CaseDetails[]>,
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }) as unknown as Promise<StatusCount[]>,
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }) as unknown as Promise<WorkTypeCount[]>,
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }) as unknown as Promise<Pick<CaseDetails, "createdAt" | "updatedAt" | "dueDate">[]>,
      Promise.all(monthRanges.map(range =>
        prisma.case.count({ where: { labId, date: { gte: range.start, lt: range.end } } })
      )),
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }) as unknown as Promise<{ id: string; name: string; clinicName: string | null; _count: { cases: number }; cases: { amount: number }[] }[]>,
      prisma.user.findMany({
        where: { labId, role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
      }),
      prisma.case.groupBy({
        by: ["technicianId", "status"],
        where: { labId, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechStat[]>,
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: currentMonthStart }, dentist: { labId } } }) as unknown as Promise<{ _sum: { amount: number | null } }>,
    ]);

    // Process results in-memory
    const overdueWithDays = overdueCasesRaw.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      dentist: c.dentist,
      patient: c.patient,
      workType: c.workType,
      dueDate: c.dueDate,
      status: c.status,
      daysOverdue: Math.ceil((now.getTime() - new Date(c.dueDate!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const dueSoonWithLabel = dueSoonCasesRaw.map((c) => {
      const d = new Date(c.dueDate!);
      const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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

    // Consolidated delivered cases logic: avg turnaround and on-time rate
    let avgTurnaround = 0;
    let onTimeRate = 0;
    if (deliveredCasesRaw.length > 0) {
      const totalDays = deliveredCasesRaw.reduce((sum, c) => {
        return sum + (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesRaw.length) * 10) / 10;

      const deliveredWithDue = deliveredCasesRaw.filter(c => c.dueDate);
      if (deliveredWithDue.length > 0) {
        const onTimeCount = deliveredWithDue.filter(c => new Date(c.updatedAt) <= new Date(c.dueDate!)).length;
        onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
      }
    }

    const monthlyCaseVolumes: MonthlyVolume[] = monthlyVolumesRaw.map((count, i) => ({
      month: monthRanges[i].label,
      year: monthRanges[i].year,
      count,
    }));

    const topDentistData: TopDentistData[] = topDentistsRaw.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0),
    }));

    // Technician workload optimization: replace N+1 queries with in-memory map lookup from groupBy result
    const techStatsMap = techCaseStatsRaw.reduce((acc, stat) => {
      const techId = stat.technicianId!;
      if (!acc[techId]) acc[techId] = { activeCases: 0, completedCases: 0 };
      if (["FINISHED", "DELIVERED"].includes(stat.status)) {
        acc[techId].completedCases += stat._count.id;
      } else {
        acc[techId].activeCases += stat._count.id;
      }
      return acc;
    }, {} as Record<string, { activeCases: number, completedCases: number }>);

    const techWorkload = technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      activeCases: techStatsMap[tech.id]?.activeCases || 0,
      completedCases: techStatsMap[tech.id]?.completedCases || 0,
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
      revenueThisMonth: revenueThisMonth._sum.amount || 0,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
