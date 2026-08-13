import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

interface MonthlyAggregationResult {
  _sum: {
    amount: number | null;
  };
}

interface ExpenseCategoryResult {
  category: string;
  _sum: {
    amount: number | null;
  };
}

interface InvoiceWithPayments {
  total: number;
  payments: {
    amount: number;
  }[];
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
    const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Prepare month ranges for the last 6 months
    const monthRanges = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = monthStart.toLocaleString("en-IN", { month: "short" });
      const year = monthStart.getFullYear();
      monthRanges.push({ monthStart, monthEnd, monthName, year });
    }

    /**
     * OPTIMIZATION: Parallelize all database queries.
     *
     * Previously, this endpoint made sequential calls for income and expenses across multiple months,
     * leading to ~11-13 sequential database round-trips. By consolidating all queries into a single
     * Promise.all block and deriving summary metrics in-memory, we reduce this to 1 round-trip.
     */
    const [
      monthlyIncomeResults,
      monthlyExpenseResults,
      expensesByCategory,
      outstandingInvoices,
      totalInvoices,
      paidInvoices,
    ] = await Promise.all([
      // 6 Monthly Income Queries
      Promise.all(monthRanges.map(range =>
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: range.monthStart, lt: range.monthEnd },
            dentist: { labId },
          },
        })
      )),
      // 6 Monthly Expense Queries
      Promise.all(monthRanges.map(range =>
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: range.monthStart, lt: range.monthEnd },
            labId,
          },
        })
      )),
      // Top expense categories (last 6 months)
      prisma.expense.groupBy({
        by: ["category"],
        _sum: { amount: true },
        where: {
          labId,
          date: { gte: last6MonthsStart },
        },
        orderBy: { _sum: { amount: "desc" } },
      }),
      // Outstanding receivables (unpaid/partial invoices)
      prisma.invoice.findMany({
        where: {
          labId,
          status: { in: ["SENT", "PARTIAL", "OVERDUE", "DRAFT"] },
        },
        include: {
          payments: { select: { amount: true } },
        },
      }),
      // Collection rate stats
      prisma.invoice.count({ where: { labId, status: { not: "CANCELLED" } } }),
      prisma.invoice.count({ where: { labId, status: "PAID" } }),
    ]);

    // Process monthly breakdown
    const monthlyBreakdown = monthRanges.map((range, index) => {
      const income = (monthlyIncomeResults[index] as MonthlyAggregationResult)._sum.amount || 0;
      const expenses = (monthlyExpenseResults[index] as MonthlyAggregationResult)._sum.amount || 0;
      return {
        month: range.monthName,
        year: range.year,
        income,
        expenses,
        net: income - expenses,
      };
    });

    // Derive summary metrics from the monthlyBreakdown array in-memory to avoid redundant database calls
    const currentMonth = monthlyBreakdown[5];
    const lastMonth = monthlyBreakdown[4];

    const last3MonthsAgg = monthlyBreakdown.slice(3).reduce((acc, curr) => ({
      income: acc.income + curr.income,
      expenses: acc.expenses + curr.expenses,
    }), { income: 0, expenses: 0 });

    const last6MonthsAgg = monthlyBreakdown.reduce((acc, curr) => ({
      income: acc.income + curr.income,
      expenses: acc.expenses + curr.expenses,
    }), { income: 0, expenses: 0 });

    // Format top categories
    const topCategories = (expensesByCategory as unknown as ExpenseCategoryResult[]).map((e) => ({
      category: e.category,
      amount: e._sum.amount || 0,
    }));

    // Calculate outstanding receivables from fetched invoices
    const outstandingReceivables = (outstandingInvoices as unknown as InvoiceWithPayments[]).reduce((sum, inv) => {
      const paid = inv.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      return sum + (inv.total - paid);
    }, 0);

    // Calculate collection rate
    const collectionRate =
      totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

    return NextResponse.json({
      currentMonth,
      lastMonth,
      last3Months: {
        ...last3MonthsAgg,
        net: last3MonthsAgg.income - last3MonthsAgg.expenses,
      },
      last6Months: {
        ...last6MonthsAgg,
        net: last6MonthsAgg.income - last6MonthsAgg.expenses,
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
