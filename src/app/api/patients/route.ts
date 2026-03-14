import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

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

    const where: any = { ...getTenantWhere(labId) };
    if (dentistId) where.dentistId = dentistId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { name: "asc" },
      take: 100,
      include: {
        dentist: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
    });

    return NextResponse.json(patients);
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
