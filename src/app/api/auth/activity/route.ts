import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface SessionUser {
  role?: string;
  labId?: string;
  email?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const role = user.role;

    if (role !== "SUPERADMIN" && role !== "LAB_OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const filterAction = searchParams.get("action");
    const filterEmail = searchParams.get("email");

    const where: Prisma.LoginActivityWhereInput = {};

    if (filterAction) {
      where.action = filterAction;
    }

    // LAB_OWNER can only see their own lab's users
    if (role === "LAB_OWNER") {
      const labId = user.labId;
      if (labId) {
        // Performance optimization: Push filterEmail into user query for LAB_OWNER
        // to reduce retrieved emails from DB and preserve tenant isolation.
        const labUsers = await prisma.user.findMany({
          where: {
            labId,
            ...(filterEmail ? { email: { contains: filterEmail, mode: "insensitive" } } : {}),
          },
          select: { email: true },
        });

        // Early return if no matching lab users exist, avoiding 2 unnecessary loginActivity queries
        if (labUsers.length === 0) {
          return NextResponse.json({
            activities: [],
            total: 0,
            page,
            totalPages: 0,
          });
        }

        const labEmails = labUsers.map((u) => u.email);
        where.email = { in: labEmails };
      } else if (user.email) {
        // If labId is missing, scope strictly to user's own email while supporting filterEmail
        where.email = filterEmail
          ? { equals: user.email, contains: filterEmail, mode: "insensitive" }
          : user.email;
      }
    } else if (filterEmail) {
      // SUPERADMIN with email filter
      where.email = { contains: filterEmail, mode: "insensitive" };
    }

    const [activities, total] = await Promise.all([
      prisma.loginActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.loginActivity.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
