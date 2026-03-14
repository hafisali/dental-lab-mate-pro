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

    const tenantWhere = getTenantWhere(labId);
    const searchParams = req.nextUrl.searchParams;

    const type = searchParams.get("type") || "items";
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const lowStock = searchParams.get("lowStock");
    const expiring = searchParams.get("expiring");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (type === "sales") {
      const where: any = { ...tenantWhere };

      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          where.date.lte = end;
        }
      }

      if (search) {
        where.OR = [
          { patientName: { contains: search, mode: "insensitive" } },
          { doctorName: { contains: search, mode: "insensitive" } },
        ];
      }

      const sales = await prisma.pharmacySale.findMany({
        where,
        orderBy: { date: "desc" },
        include: {
          items: true,
          patient: { select: { id: true, name: true } },
        },
      });

      return NextResponse.json(sales);
    }

    // Default: return pharmacy items
    const where: any = { ...tenantWhere };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { genericName: { contains: search, mode: "insensitive" } },
        { batchNo: { contains: search, mode: "insensitive" } },
        { supplier: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (lowStock === "true") {
      where.quantity = { lte: prisma.pharmacyItem.fields.minStock };
      // Prisma doesn't support field comparison directly, we'll filter after fetch
      delete where.quantity;
    }

    if (expiring === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.expiryDate = {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      };
    }

    let items = await prisma.pharmacyItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { sales: true } },
      },
    });

    // Post-filter for low stock (since Prisma can't compare fields)
    if (lowStock === "true") {
      items = items.filter((item) => item.quantity <= item.minStock);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Pharmacy GET error:", error);
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
    const type = body.type || "item";

    if (type === "item") {
      const item = await prisma.pharmacyItem.create({
        data: {
          name: body.name,
          genericName: body.genericName || null,
          category: body.category || null,
          batchNo: body.batchNo || null,
          expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
          quantity: Number(body.quantity) || 0,
          mrp: Number(body.mrp) || 0,
          purchasePrice: Number(body.purchasePrice) || 0,
          minStock: Number(body.minStock) || 5,
          supplier: body.supplier || null,
          rackLocation: body.rackLocation || null,
          labId,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    if (type === "sale") {
      if (!body.items || body.items.length === 0) {
        return NextResponse.json({ error: "Sale must have at least one item" }, { status: 400 });
      }

      const totalAmount = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);

      const sale = await prisma.$transaction(async (tx) => {
        // Create sale
        const newSale = await tx.pharmacySale.create({
          data: {
            patientName: body.patientName || null,
            patientPhone: body.patientPhone || null,
            patientId: body.patientId || null,
            totalAmount,
            paymentMode: body.paymentMode || "CASH",
            doctorName: body.doctorName || null,
            labId,
            items: {
              create: body.items.map((item: any) => ({
                itemId: item.itemId || null,
                itemName: item.itemName,
                quantity: Number(item.quantity),
                price: Number(item.price),
                total: Number(item.quantity) * Number(item.price),
              })),
            },
          },
          include: { items: true },
        });

        // Deduct stock for each item
        for (const item of body.items) {
          if (item.itemId) {
            await tx.pharmacyItem.update({
              where: { id: item.itemId },
              data: { quantity: { decrement: Number(item.quantity) } },
            });
          }
        }

        return newSale;
      });

      return NextResponse.json(sale, { status: 201 });
    }

    if (type === "stock") {
      if (!body.itemId || !body.quantity) {
        return NextResponse.json({ error: "Item ID and quantity required" }, { status: 400 });
      }

      const updatedItem = await prisma.pharmacyItem.update({
        where: { id: body.itemId },
        data: {
          quantity: { increment: Number(body.quantity) },
          ...(body.purchasePrice ? { purchasePrice: Number(body.purchasePrice) } : {}),
          ...(body.supplier ? { supplier: body.supplier } : {}),
          ...(body.batchNo ? { batchNo: body.batchNo } : {}),
          ...(body.expiryDate ? { expiryDate: new Date(body.expiryDate) } : {}),
        },
      });

      return NextResponse.json(updatedItem);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Pharmacy POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
