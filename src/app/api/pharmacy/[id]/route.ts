import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const body = await req.json();

    // Verify the item belongs to this tenant
    const existing = await prisma.pharmacyItem.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.genericName !== undefined) data.genericName = body.genericName || null;
    if (body.category !== undefined) data.category = body.category || null;
    if (body.batchNo !== undefined) data.batchNo = body.batchNo || null;
    if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.quantity !== undefined) data.quantity = Number(body.quantity);
    if (body.mrp !== undefined) data.mrp = Number(body.mrp);
    if (body.purchasePrice !== undefined) data.purchasePrice = Number(body.purchasePrice);
    if (body.minStock !== undefined) data.minStock = Number(body.minStock);
    if (body.supplier !== undefined) data.supplier = body.supplier || null;
    if (body.rackLocation !== undefined) data.rackLocation = body.rackLocation || null;

    const item = await prisma.pharmacyItem.update({
      where: { id },
      data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Pharmacy PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    // Verify the item belongs to this tenant
    const existing = await prisma.pharmacyItem.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.pharmacyItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pharmacy DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
