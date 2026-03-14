import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any).role;

    if (role !== "SUPERADMIN" && role !== "LAB_OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const filterAction = searchParams.get("action");
    const filterEmail = searchParams.get("email");

    let where: any = {};

    // LAB_OWNER can only see their own lab's users
    if (role === "LAB_OWNER") {
      const labId = (session.user as any).labId;
      if (labId) {
        const labUsers = await prisma.user.findMany({
          where: { labId },
          select: { email: true },
        });
        const labEmails = labUsers.map(u => u.email);
        where.email = { in: labEmails };
      } else {
        where.email = session.user.email!;
      }
    }
    // SUPERADMIN sees everything (where stays {})

    if (filterAction) where.action = filterAction;
    if (filterEmail) where.email = { contains: filterEmail, mode: "insensitive" };

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
