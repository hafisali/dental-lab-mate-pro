import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

interface SessionUser {
  id?: string;
  role?: string;
  labId?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session as { user: SessionUser });
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const all = searchParams.get("all");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    // Strictly type tenant filter
    const where: Prisma.DentistWhereInput = {
      ...getTenantWhere(labId),
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clinicName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    // Optimization: Support page-based pagination with concurrent count query when paginated
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20") || 20));
      const skip = (page - 1) * limit;

      // Parallelize findMany and count queries to avoid sequential DB round-trips
      const [dentists, total] = await Promise.all([
        prisma.dentist.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take: limit,
          include: {
            _count: { select: { cases: true, patients: true } },
          },
        }),
        prisma.dentist.count({ where }),
      ]);

      return NextResponse.json({
        dentists,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Unpaginated fallback (bounded to max 100 items unless all flag is passed) for backward compatibility
    const dentists = await prisma.dentist.findMany({
      where,
      orderBy: { name: "asc" },
      ...(all ? {} : { take: 100 }),
      include: {
        _count: { select: { cases: true, patients: true } },
      },
    });

    return NextResponse.json(dentists);
  } catch (error) {
    console.error("Dentists GET error:", error);
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
      labId = requireLabId(session as { user: SessionUser });
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const body = await req.json();

    const dentist = await prisma.dentist.create({
      data: {
        name: body.name,
        clinicName: body.clinicName || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        address: body.address || null,
        notes: body.notes || null,
        labId,
      },
    });

    return NextResponse.json(dentist, { status: 201 });
  } catch (error) {
    console.error("Dentists POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
