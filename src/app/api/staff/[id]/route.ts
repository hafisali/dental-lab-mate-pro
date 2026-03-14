import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const staff = await prisma.staff.findFirst({
      where: { id, ...getTenantWhere(labId) },
      include: {
        attendance: {
          orderBy: { date: "desc" },
          take: 90,
        },
        payments: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff [id] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Verify the staff belongs to this tenant
    const existing = await prisma.staff.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.salary !== undefined) updateData.salary = body.salary;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.joinedDate !== undefined) updateData.joinedDate = new Date(body.joinedDate);

    const staff = await prisma.staff.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff [id] PATCH error:", error);
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

    // Verify the staff belongs to this tenant
    const existing = await prisma.staff.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Deactivate instead of delete
    const staff = await prisma.staff.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Staff [id] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
