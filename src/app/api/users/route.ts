import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

interface SessionUser {
  role?: string;
  labId?: string;
}

/**
 * GET /api/users
 * Performance Optimization:
 * 1. Supports optional `role` filtering (e.g., ?role=TECHNICIAN) directly at the database query level
 *    to avoid fetching all users into memory and filtering client-side.
 * 2. Uses strict Prisma typing (Prisma.UserWhereInput) to avoid `any` types and allow optimal query planning.
 * Expected Impact: Reduces database payload and query execution time by filtering unwanted user roles at DB layer.
 */
export async function GET(req: NextRequest) {
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

    // Optional role filter (e.g., ?role=TECHNICIAN)
    const roleParam = req.nextUrl.searchParams.get("role")?.toUpperCase();
    const roleFilter = roleParam && Object.values(Role).includes(roleParam as Role)
      ? (roleParam as Role)
      : undefined;

    // Filter at database level rather than fetching all users
    const where: Prisma.UserWhereInput = {
      ...getTenantWhere(labId),
      ...(roleFilter ? { role: roleFilter } : {}),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const currentUser = session.user as SessionUser;
    if (!currentUser.role || !["ADMIN", "LAB_OWNER"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: body.role || "RECEPTION",
        phone: body.phone || null,
        labId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
