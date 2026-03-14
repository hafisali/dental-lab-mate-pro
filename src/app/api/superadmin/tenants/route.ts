import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const planFilter = searchParams.get("plan") || "";
    const statusFilter = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (planFilter && planFilter !== "all") {
      where.plan = planFilter;
    }

    if (statusFilter === "active") {
      where.isActive = true;
    } else if (statusFilter === "inactive") {
      where.isActive = false;
    }

    const labs = await prisma.lab.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            cases: true,
            invoices: true,
            dentists: true,
          },
        },
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            stripePriceId: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json({ labs });
  } catch (error) {
    console.error("Tenants fetch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, address, plan, maxUsers, slug, ownerName, ownerEmail } = body;

    if (!name) {
      return NextResponse.json({ error: "Lab name is required" }, { status: 400 });
    }

    // Generate slug if not provided
    const labSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    // Check slug uniqueness
    const existingSlug = await prisma.lab.findUnique({ where: { slug: labSlug } });
    if (existingSlug) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 400 });
    }

    // Create lab and optionally the owner user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const lab = await tx.lab.create({
        data: {
          name,
          slug: labSlug,
          email,
          phone,
          address,
          plan: plan || "trial",
          maxUsers: maxUsers || 5,
          isActive: true,
        },
      });

      let owner = null;
      if (ownerEmail) {
        // Check if user already exists
        const existingUser = await tx.user.findUnique({ where: { email: ownerEmail } });
        if (existingUser) {
          // Link existing user to the new lab
          owner = await tx.user.update({
            where: { id: existingUser.id },
            data: { labId: lab.id, role: "LAB_OWNER" },
          });
        } else {
          owner = await tx.user.create({
            data: {
              name: ownerName || name,
              email: ownerEmail,
              role: "LAB_OWNER",
              labId: lab.id,
              active: true,
            },
          });
        }
      }

      return { lab, owner };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Tenant creation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
