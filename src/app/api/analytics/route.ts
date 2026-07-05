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

interface CaseByStatus {
  status: string;
  _count: { id: number };
}

interface CaseByWorkType {
  workType: string;
  _count: { id: number };
}

interface TechWorkloadGroup {
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

    // Prepare month range for parallel queries
    const months = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
      return {
        start: monthStart,
        end: monthEnd,
        name: monthStart.toLocaleString("en-IN", { month: "short" }),
        year: monthStart.getFullYear(),
      };
    });

    // Parallelize all independent database operations
    const [
      overdueCases,
      dueSoonCases,
      casesByStatus,
      casesByWorkType,
      deliveredCasesData,
      topDentists,
      allTechnicians,
      activeCasesGroup,
      completedCasesGroup,
      casesThisMonth,
      revenueThisMonth,
      ...monthlyCounts
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
      prisma.case.groupBy({ by: ["status"], _count: { id: true }, where: { labId } }) as unknown as Promise<CaseByStatus[]>,
      prisma.case.groupBy({ by: ["workType"], _count: { id: true }, where: { labId }, orderBy: { _count: { id: "desc" } } }) as unknown as Promise<CaseByWorkType[]>,
      prisma.case.findMany({
        where: { labId, status: "DELIVERED" },
        select: { createdAt: true, updatedAt: true, dueDate: true },
      }),
      prisma.dentist.findMany({
        where: { labId, active: true },
        include: { _count: { select: { cases: true } }, cases: { select: { amount: true } } },
        orderBy: { cases: { _count: "desc" } },
        take: 10,
      }) as unknown as Promise<TopDentistData[]>,
      prisma.user.findMany({ where: { labId, role: "TECHNICIAN", active: true }, select: { id: true, name: true } }),
      prisma.case.groupBy({
        by: ["technicianId"],
        where: { labId, status: { notIn: ["FINISHED", "DELIVERED"] }, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechWorkloadGroup[]>,
      prisma.case.groupBy({
        by: ["technicianId"],
        where: { labId, status: { in: ["FINISHED", "DELIVERED"] }, technicianId: { not: null } },
        _count: { id: true },
      }) as unknown as Promise<TechWorkloadGroup[]>,
      prisma.case.count({ where: { labId, date: { gte: currentMonthStart } } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      ...months.map((m) =>
        prisma.case.count({ where: { labId, date: { gte: m.start, lt: m.end } } })
      ),
    ]);

    // Process overdue cases with days calculation
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

    // Process due soon cases with relative label
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

    const statusCounts = casesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    const workTypeCounts = casesByWorkType.map((w) => ({
      workType: w.workType,
      count: w._count.id,
    }));

    // Calculate turnaround and on-time rate from consolidated delivered data
    let avgTurnaround = 0;
    if (deliveredCasesData.length > 0) {
      const totalDays = deliveredCasesData.reduce((sum, c) => {
        const diff = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTurnaround = Math.round((totalDays / deliveredCasesData.length) * 10) / 10;
    }

    let onTimeRate = 0;
    const deliveredWithDue = deliveredCasesData.filter((c) => c.dueDate !== null);
    if (deliveredWithDue.length > 0) {
      const onTimeCount = deliveredWithDue.filter(
        (c) => new Date(c.updatedAt) <= new Date(c.dueDate!)
      ).length;
      onTimeRate = Math.round((onTimeCount / deliveredWithDue.length) * 100);
    }

    // Map monthly counts back to expected structure
    const monthlyCaseVolumes = months.map((m, i) => ({
      month: m.name,
      year: m.year,
      count: monthlyCounts[i] as number,
    }));

    const topDentistData = topDentists.map((d) => ({
      id: d.id,
      name: d.name,
      clinicName: d.clinicName,
      caseCount: d._count.cases,
      revenue: d.cases.reduce((sum, c) => sum + c.amount, 0),
    }));

    const activeMap = Object.fromEntries(
      activeCasesGroup.map((g) => [g.technicianId!, g._count.id])
    );
    const completedMap = Object.fromEntries(
      completedCasesGroup.map((g) => [g.technicianId!, g._count.id])
    );

    const techWorkload = allTechnicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      activeCases: activeMap[tech.id] || 0,
      completedCases: completedMap[tech.id] || 0,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
