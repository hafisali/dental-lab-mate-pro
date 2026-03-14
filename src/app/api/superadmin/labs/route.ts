import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const labs = await prisma.lab.findMany({
      include: {
        _count: {
          select: {
            users: true,
            cases: true,
            dentists: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch last login for each lab
    const labsWithLogin = await Promise.all(
      labs.map(async (lab) => {
        const lastLoginActivity = await prisma.loginActivity.findFirst({
          where: {
            action: "LOGIN_SUCCESS",
            userId: { not: null },
            email: {
              in: await prisma.user
                .findMany({ where: { labId: lab.id }, select: { email: true } })
                .then((users) => users.map((u) => u.email)),
            },
          },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        return {
          ...lab,
          lastLogin: lastLoginActivity?.createdAt || null,
        };
      })
    );

    return NextResponse.json({ labs: labsWithLogin });
  } catch (error) {
    console.error("Labs fetch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { name, email, phone, address, plan, maxUsers } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Lab name is required" }, { status: 400 });
    }

    const lab = await prisma.lab.create({
      data: {
        name,
        email,
        phone,
        address,
        plan: plan || "trial",
        maxUsers: maxUsers || 5,
        isActive: true,
      },
    });

    return NextResponse.json({ lab });
  } catch (error) {
    console.error("Lab creation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id, plan, planExpiresAt, maxUsers, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Lab ID is required" }, { status: 400 });
    }

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
