import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

    const labIds = labs.map((lab) => lab.id);

    // Fetch all users associated with these labs to map their emails to lab IDs
    const allUsers = await prisma.user.findMany({
      where: { labId: { in: labIds } },
      select: { email: true, labId: true },
    });

    const emailToLabId: Record<string, string> = {};
    const allEmails: string[] = [];

    for (const user of allUsers) {
      if (user.email && user.labId) {
        emailToLabId[user.email] = user.labId;
        allEmails.push(user.email);
      }
    }

    // Group login activities by email to find the latest successful login for each user in one query
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

    const labLastLogin: Record<string, Date> = {};
    for (const activity of loginActivities) {
      const email = activity.email;
      const lastLoginDate = activity._max.createdAt;
      if (email && lastLoginDate) {
        const labId = emailToLabId[email];
        if (labId) {
          const existingDate = labLastLogin[labId];
          if (!existingDate || lastLoginDate > existingDate) {
            labLastLogin[labId] = lastLoginDate;
          }
        }
      }
    }

    const labsWithLogin = labs.map((lab) => ({
      ...lab,
      lastLogin: labLastLogin[lab.id] || null,
    }));

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
