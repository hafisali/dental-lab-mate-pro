import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        dentist: true,
        patient: true,
        files: true,
        invoices: { include: { payments: true } },
        usages: { include: { item: true } },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Case GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.technicianId !== undefined) updateData.technicianId = body.technicianId;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.shade !== undefined) updateData.shade = body.shade;
    if (body.material !== undefined) updateData.material = body.material;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.workType !== undefined) updateData.workType = body.workType;
    if (body.teethNumbers !== undefined) updateData.teethNumbers = body.teethNumbers;

    const updated = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        dentist: { select: { id: true, name: true, clinicName: true } },
        patient: { select: { id: true, name: true } },
        files: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Case PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!["ADMIN", "LAB_OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.case.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Case DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
