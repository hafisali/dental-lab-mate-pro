import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

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

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: Prisma.ExpenseWhereInput = { ...getTenantWhere(labId) };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (category && category !== "all") {
      where.category = category;
    }

    // Check if dynamic pagination is explicitly requested
    const hasPagination = pageParam !== null || limitParam !== null;

    if (hasPagination) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20", 10) || 20));
      const skip = (page - 1) * limit;

      // Execute data retrieval and total count in parallel
      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          orderBy: { date: "desc" },
          skip,
          take: limit,
        }),
        prisma.expense.count({ where }),
      ]);

      return NextResponse.json({
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Fallback for non-paginated requests (preserves backward compatibility)
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    if (!body.description || !body.amount || !body.category) {
      return NextResponse.json(
        { error: "Description, amount, and category are required" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        description: body.description,
        amount: Number(body.amount),
        category: body.category,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes || null,
        labId,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Expenses POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
