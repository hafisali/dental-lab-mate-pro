import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

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

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const dentistId = searchParams.get("dentistId");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: Prisma.PatientWhereInput = { ...getTenantWhere(labId) };
    if (dentistId) where.dentistId = dentistId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    // Performance Optimization: Support dynamic pagination to load patients in smaller batches.
    // This dramatically reduces CPU, memory, and database transfer overhead for large patient datasets.
    // If no page/limit parameters are passed, we default to returning 100 records in a plain array
    // to maintain exact backward compatibility with the dashboard UI.
    const hasPagination = !!(pageParam || limitParam);

    const parsedPage = parseInt(pageParam || "1", 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const parsedLimit = parseInt(limitParam || "50", 10);
    // Sanitize and cap limit to prevent extremely large batch sizes from degrading performance.
    const limit = isNaN(parsedLimit) || parsedLimit < 1 ? 50 : Math.min(parsedLimit, 200);

    const skip = (page - 1) * limit;

    const queryOptions: Prisma.PatientFindManyArgs = {
      where,
      orderBy: { name: "asc" },
      include: {
        dentist: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
    };

    if (hasPagination) {
      queryOptions.skip = skip;
      queryOptions.take = limit;

      // Execute both the data fetch and total count query in parallel
      const [patients, total] = await Promise.all([
        prisma.patient.findMany(queryOptions),
        prisma.patient.count({ where }),
      ]);

      return NextResponse.json({
        patients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      queryOptions.take = 100;
      // Performance Optimization: Avoid the extra count query if pagination is not requested
      const patients = await prisma.patient.findMany(queryOptions);
      return NextResponse.json(patients);
    }
  } catch (error) {
    console.error("Patients GET error:", error);
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

    const body = await req.json();

    const patient = await prisma.patient.create({
      data: {
        name: body.name,
        age: body.age ? parseInt(body.age) : null,
        gender: body.gender || null,
        phone: body.phone || null,
        notes: body.notes || null,
        dentistId: body.dentistId,
        labId,
      },
      include: {
        dentist: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Patients POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
