import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  labId?: string;
}

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

    // Optimization: Use explicit field selection instead of full includes on relations
    // to prune unneeded nested relational columns and cut DB / JSON transfer size.
    const caseData = await prisma.case.findFirst({
      where: { id, ...getTenantWhere(labId) },
      include: {
        dentist: {
          select: {
            id: true,
            name: true,
            clinicName: true,
            phone: true,
            email: true,
            whatsapp: true,
            address: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            gender: true,
            age: true,
          },
        },
        files: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            tax: true,
            discount: true,
            total: true,
            status: true,
            dueDate: true,
            createdAt: true,
            payments: {
              select: {
                id: true,
                amount: true,
                paymentMethod: true,
                date: true,
                notes: true,
              },
            },
          },
        },
        usages: {
          select: {
            id: true,
            quantity: true,
            createdAt: true,
            item: {
              select: {
                id: true,
                name: true,
                category: true,
                unit: true,
              },
            },
          },
        },
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

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify the case belongs to this tenant
    const existing = await prisma.case.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const updateData: Prisma.CaseUpdateInput = {};
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
        dentist: { select: { id: true, name: true, clinicName: true, phone: true, whatsapp: true } },
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

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const user = session.user as SessionUser;
    if (!user.role || !["ADMIN", "LAB_OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Verify the case belongs to this tenant
    const existing = await prisma.case.findFirst({
      where: { id, ...getTenantWhere(labId) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    await prisma.case.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Case DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
