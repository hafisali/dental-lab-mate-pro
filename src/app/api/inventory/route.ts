import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
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
    const search = searchParams.get("search");
    const lowStock = searchParams.get("lowStock");

    const where: any = { ...getTenantWhere(labId) };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { usages: true, purchases: true } },
      },
    });

    const result = lowStock === "true"
      ? items.filter((item) => item.stock <= item.minStock)
      : items;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    if (body.type === "purchase") {
      // Purchase entry - add stock
      const purchase = await prisma.purchaseEntry.create({
        data: {
          itemId: body.itemId,
          quantity: body.quantity,
          costPerUnit: body.costPerUnit,
          totalCost: body.quantity * body.costPerUnit,
          supplier: body.supplier || null,
          notes: body.notes || null,
        },
      });

      // Update stock
      await prisma.inventoryItem.update({
        where: { id: body.itemId },
        data: {
          stock: { increment: body.quantity },
          costPerUnit: body.costPerUnit,
        },
      });

      return NextResponse.json(purchase, { status: 201 });
    }

    // Create new inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        name: body.name,
        category: body.category || null,
        stock: body.stock || 0,
        unit: body.unit || "pcs",
        costPerUnit: body.costPerUnit || 0,
        minStock: body.minStock || 5,
        labId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
