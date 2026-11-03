import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface SessionUser {
  id?: string;
  role?: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ⚡ Bolt Optimization: Batch fetch lab user emails with users: { select: { email: true } }
    // to eliminate N sequential prisma.user.findMany queries.
    const labs = await prisma.lab.findMany({
      include: {
        users: {
          select: { email: true },
        },
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

    // Collect all unique user emails across all labs
    const allEmails: string[] = [];
    for (const lab of labs) {
      for (const u of lab.users) {
        if (u.email) {
          allEmails.push(u.email);
        }
      }
    }

    // ⚡ Bolt Optimization: Replace N per-lab prisma.loginActivity.findFirst queries
    // with a single batched groupBy query across all retrieved user emails.
    const emailToLastLogin = new Map<string, Date>();
    if (allEmails.length > 0) {
      const loginActivities = await prisma.loginActivity.groupBy({
        by: ["email"],
        where: {
          action: "LOGIN_SUCCESS",
          userId: { not: null },
          email: { in: allEmails },
        },
        _max: {
          createdAt: true,
        },
      });

      for (const item of loginActivities) {
        if (item.email && item._max.createdAt) {
          emailToLastLogin.set(item.email, item._max.createdAt);
        }
      }
    }

    // Map the most recent login date in-memory for each lab
    const labsWithLogin = labs.map((lab) => {
      let latestLogin: Date | null = null;
      for (const u of lab.users) {
        const userLastLogin = emailToLastLogin.get(u.email);
        if (userLastLogin) {
          if (!latestLogin || userLastLogin > latestLogin) {
            latestLogin = userLastLogin;
          }
        }
      }

      // Omit the loaded users array from lab output to match previous shape exactly
      const labData = { ...lab };
      delete (labData as { users?: unknown }).users;
      return {
        ...labData,
        lastLogin: latestLogin || null,
      };
    });

    return NextResponse.json({ labs: labsWithLogin });
  } catch (error) {
    console.error("Labs fetch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "SUPERADMIN") {
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
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "SUPERADMIN") {
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
