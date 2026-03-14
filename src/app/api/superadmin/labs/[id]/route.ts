import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;

    const lab = await prisma.lab.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            cases: true,
            dentists: true,
            invoices: true,
            users: true,
          },
        },
      },
    });

    if (!lab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    return NextResponse.json({ lab });
  } catch (error) {
    console.error("Lab detail error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const { plan, planExpiresAt, maxUsers, isActive } = await req.json();

    const updateData: Record<string, unknown> = {};
    if (plan !== undefined) updateData.plan = plan;
    if (planExpiresAt !== undefined) updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
    if (maxUsers !== undefined) updateData.maxUsers = maxUsers;
    if (isActive !== undefined) updateData.isActive = isActive;

    const lab = await prisma.lab.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ lab });
  } catch (error) {
    console.error("Lab update error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
