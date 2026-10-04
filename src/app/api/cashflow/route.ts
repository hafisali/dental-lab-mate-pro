import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

/**
 * Performance Optimization:
 * 1. Consolidated 20+ sequential/batched database queries into a single parallelized `Promise.all` call,
 *    reducing network round-trips from ~11 down to 1.
 * 2. Optimized `outstandingInvoices` query with explicit `select` fields (`total`, `payments: { select: { amount: true } }`),
 *    pruning unneeded database columns and payload transfer size.
 * 3. Standardized start-of-month date calculations with `setDate(1)` to prevent date rollover bugs on 31-day months.
 */
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

    // Helper to calculate start-of-month Date safely without date rollover bugs
    const getMonthStart = (offsetMonths: number) => {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setMonth(d.getMonth() + offsetMonths);
      return d;
    };

    const currentMonthStart = getMonthStart(0);
    const lastMonthStart = getMonthStart(-1);
    const last3MonthsStart = getMonthStart(-2);
    const last6MonthsStart = getMonthStart(-5);

    // Prepare 6-month breakdown date ranges and promises
    const monthRanges: Array<{ monthName: string; year: number; monthStart: Date; monthEnd: Date }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = getMonthStart(-i);
      const monthEnd = getMonthStart(-i + 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();
      monthRanges.push({ monthName, year, monthStart, monthEnd });
    }

    // Parallelize all independent DB queries in a single Promise.all stage
    const [
      // Income summary aggregates
      currentMonthIncome,
      lastMonthIncome,
      last3MonthsIncome,
      last6MonthsIncome,
      // Expense summary aggregates
      currentMonthExpenses,
      lastMonthExpenses,
      last3MonthsExpenses,
      last6MonthsExpenses,
      // Monthly breakdown aggregates (6 months x 2 queries each)
      m5Income, m5Expense,
      m4Income, m4Expense,
      m3Income, m3Expense,
      m2Income, m2Expense,
      m1Income, m1Expense,
      m0Income, m0Expense,
      // Top expense categories
      expensesByCategory,
      // Outstanding receivables (pruned select payload)
      outstandingInvoices,
      // Collection rate counts
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      // Income queries
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, dentist: { labId } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: lastMonthStart, lt: currentMonthStart }, dentist: { labId } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: last3MonthsStart }, dentist: { labId } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { date: { gte: last6MonthsStart }, dentist: { labId } },
      }),

      // Expense queries
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: currentMonthStart }, labId },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: lastMonthStart, lt: currentMonthStart }, labId },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: last3MonthsStart }, labId },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: last6MonthsStart }, labId },
      }),

      // Monthly breakdown queries for last 6 months
      ...monthRanges.flatMap((r) => [
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { date: { gte: r.monthStart, lt: r.monthEnd }, dentist: { labId } },
        }),
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: r.monthStart, lt: r.monthEnd }, labId },
        }),
      ]),

      // Top expense categories
      prisma.expense.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: { labId, date: { gte: last6MonthsStart } },
        orderBy: { _sum: { amount: "desc" } },
      }),

      // Outstanding receivables
      prisma.invoice.findMany({
        where: {
          labId,
          status: { in: ["SENT", "PARTIAL", "OVERDUE", "DRAFT"] },
        },
        select: {
          total: true,
          payments: { select: { amount: true } },
        },
      }),

      // Collection rate counts
      prisma.invoice.count({ where: { labId, status: { not: "CANCELLED" } } }),
      prisma.invoice.count({ where: { labId, status: "PAID" } }),
    ]);

    // Build monthly breakdown array from parallelized results
    const monthlyResults = [
      { inc: m5Income, exp: m5Expense },
      { inc: m4Income, exp: m4Expense },
      { inc: m3Income, exp: m3Expense },
      { inc: m2Income, exp: m2Expense },
      { inc: m1Income, exp: m1Expense },
      { inc: m0Income, exp: m0Expense },
    ];

    const monthlyBreakdown = monthRanges.map((range, idx) => {
      const income = monthlyResults[idx].inc._sum.amount || 0;
      const expenses = monthlyResults[idx].exp._sum.amount || 0;
      return {
        month: range.monthName,
        year: range.year,
        income,
        expenses,
        net: income - expenses,
      };
    });

    const topCategories = expensesByCategory.map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }));

    const outstandingReceivables = outstandingInvoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      return sum + (inv.total - paid);
    }, 0);

    const collectionRate =
      totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    const curIncome = currentMonthIncome._sum.amount || 0;
    const curExpenses = currentMonthExpenses._sum.amount || 0;
    const prevIncome = lastMonthIncome._sum.amount || 0;
    const prevExpenses = lastMonthExpenses._sum.amount || 0;

    return NextResponse.json({
      currentMonth: {
        income: curIncome,
        expenses: curExpenses,
        net: curIncome - curExpenses,
      },
      lastMonth: {
        income: prevIncome,
        expenses: prevExpenses,
        net: prevIncome - prevExpenses,
      },
      last3Months: {
        income: last3MonthsIncome._sum.amount || 0,
        expenses: last3MonthsExpenses._sum.amount || 0,
        net:
          (last3MonthsIncome._sum.amount || 0) -
          (last3MonthsExpenses._sum.amount || 0),
      },
      last6Months: {
        income: last6MonthsIncome._sum.amount || 0,
        expenses: last6MonthsExpenses._sum.amount || 0,
        net:
          (last6MonthsIncome._sum.amount || 0) -
          (last6MonthsExpenses._sum.amount || 0),
      },
      monthlyBreakdown,
      topCategories,
      outstandingReceivables,
      collectionRate,
    });
  } catch (error) {
    console.error("Cash flow GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
