import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== "SUPERADMIN") {
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

    // Batched fetch of last login for each lab
    const labIds = labs.map((l) => l.id);
    const users = await prisma.user.findMany({
      where: { labId: { in: labIds } },
      select: { email: true, labId: true },
    });

    const labEmailsMap = new Map<string, string[]>();
    const allEmailsSet = new Set<string>();
    for (const u of users) {
      if (u.labId) {
        let emails = labEmailsMap.get(u.labId);
        if (!emails) {
          emails = [];
          labEmailsMap.set(u.labId, emails);
        }
        emails.push(u.email);
        allEmailsSet.add(u.email);
      }
    }

    const loginActivities = await prisma.loginActivity.groupBy({
      by: ["email"],
      where: {
        action: "LOGIN_SUCCESS",
        email: { in: Array.from(allEmailsSet) },
      },
      _max: {
        createdAt: true,
      },
    });

    const emailLastLoginMap = new Map<string, Date>();
    for (const act of loginActivities) {
      if (act._max.createdAt) {
        emailLastLoginMap.set(act.email, act._max.createdAt);
      }
    }

    const labsWithLogin = labs.map((lab) => {
      const emails = labEmailsMap.get(lab.id) || [];
      let latestLogin: Date | null = null;
      for (const email of emails) {
        const loginDate = emailLastLoginMap.get(email);
        if (loginDate) {
          if (!latestLogin || loginDate > latestLogin) {
            latestLogin = loginDate;
          }
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
    if (!session?.user || (session.user as { role?: string }).role !== "SUPERADMIN") {
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
    if (!session?.user || (session.user as { role?: string }).role !== "SUPERADMIN") {
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
