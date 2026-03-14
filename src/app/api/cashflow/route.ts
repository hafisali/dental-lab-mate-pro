import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Income from payments
    const [
      currentMonthIncome,
      lastMonthIncome,
      last3MonthsIncome,
      last6MonthsIncome,
    ] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          dentist: { labId },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: lastMonthStart, lt: currentMonthStart },
          dentist: { labId },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: last3MonthsStart },
          dentist: { labId },
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: last6MonthsStart },
          dentist: { labId },
        },
      }),
    ]);

    // Expenses
    const [
      currentMonthExpenses,
      lastMonthExpenses,
      last3MonthsExpenses,
      last6MonthsExpenses,
    ] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: currentMonthStart },
          labId,
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: lastMonthStart, lt: currentMonthStart },
          labId,
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: last3MonthsStart },
          labId,
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: last6MonthsStart },
          labId,
        },
      }),
    ]);

    // Monthly breakdown for last 6 months
    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();

      const [monthIncome, monthExpenses] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: monthStart, lt: monthEnd },
            dentist: { labId },
          },
        }),
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: monthStart, lt: monthEnd },
            labId,
          },
        }),
      ]);

      const income = monthIncome._sum.amount || 0;
      const expenses = monthExpenses._sum.amount || 0;

      monthlyBreakdown.push({
        month: monthName,
        year,
        income,
        expenses,
        net: income - expenses,
      });
    }

    // Top expense categories
    const expensesByCategory = await prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: {
        labId,
        date: { gte: last6MonthsStart },
      },
      orderBy: { _sum: { amount: "desc" } },
    });

    const topCategories = expensesByCategory.map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }));

    // Outstanding receivables (unpaid/partial invoices)
    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        labId,
        status: { in: ["SENT", "PARTIAL", "OVERDUE", "DRAFT"] },
      },
      include: {
        payments: { select: { amount: true } },
      },
    });

    const outstandingReceivables = outstandingInvoices.reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
      return sum + (inv.total - paid);
    }, 0);

    // Collection rate
    const [totalInvoices, paidInvoices] = await Promise.all([
      prisma.invoice.count({ where: { labId, status: { not: "CANCELLED" } } }),
      prisma.invoice.count({ where: { labId, status: "PAID" } }),
    ]);

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
