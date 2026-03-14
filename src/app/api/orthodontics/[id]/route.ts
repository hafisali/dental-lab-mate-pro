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

    const plan = await prisma.orthodonticPlan.findFirst({
      where: { id, ...getTenantWhere(labId) },
      include: {
        patient: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true, clinicName: true } },
        payments: { orderBy: { date: "desc" } },
        records: { orderBy: { date: "desc" } },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Orthodontics GET [id] error:", error);
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

    // Verify the plan belongs to this tenant
    const existing = await prisma.orthodonticPlan.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const data: any = {};

    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.diagnosis !== undefined) data.diagnosis = body.diagnosis;
    if (body.totalCost !== undefined) data.totalCost = Number(body.totalCost);
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);

    const plan = await prisma.orthodonticPlan.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true, clinicName: true } },
        payments: { orderBy: { date: "desc" } },
        records: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Orthodontics PATCH error:", error);
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

    // Verify the plan belongs to this tenant
    const existing = await prisma.orthodonticPlan.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    await prisma.orthodonticPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Orthodontics DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
