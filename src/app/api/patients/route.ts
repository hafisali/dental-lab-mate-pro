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

    const user = session.user as any;
    const labId = user.labId;
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const dentistId = searchParams.get("dentistId");

    const where: any = {};
    if (labId) where.labId = labId;
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

    const user = session.user as any;
    const body = await req.json();

    const patient = await prisma.patient.create({
      data: {
        name: body.name,
        age: body.age ? parseInt(body.age) : null,
        gender: body.gender || null,
        phone: body.phone || null,
        notes: body.notes || null,
        dentistId: body.dentistId,
        labId: user.labId,
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
