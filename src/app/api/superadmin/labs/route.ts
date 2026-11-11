import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface SessionUser {
  role?: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Performance Optimization:
    // Instead of querying users and login activity in an N+1 loop for every lab (2N+1 round trips),
    // eager-load user emails in the initial findMany query and fetch the latest login per email
    // in a single grouped query (reducing database round-trips from 2N+1 down to 2).
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

    // Collect unique emails across all labs
    const allEmails = Array.from(
      new Set(labs.flatMap((lab) => lab.users.map((u) => u.email)).filter(Boolean))
    );

    // Single batched query for the latest login timestamp per user email
    const lastLoginByEmail = new Map<string, Date>();
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

      for (const act of loginActivities) {
        if (act._max.createdAt) {
          lastLoginByEmail.set(act.email, act._max.createdAt);
        }
      }
    }

    // Attach latest login date per lab in-memory
    const labsWithLogin = labs.map(({ users, ...lab }) => {
      let latestLogin: Date | null = null;
      for (const u of users) {
        const loginDate = lastLoginByEmail.get(u.email);
        if (loginDate && (!latestLogin || loginDate > latestLogin)) {
          latestLogin = loginDate;
        }
      }

      return {
        ...lab,
        lastLogin: latestLogin,
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
