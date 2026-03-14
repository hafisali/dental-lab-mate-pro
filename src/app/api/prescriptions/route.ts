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

    const patientId = searchParams.get("patientId");
    const dentistId = searchParams.get("dentistId");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { ...getTenantWhere(labId) };
    if (patientId) where.patientId = patientId;
    if (dentistId) where.dentistId = dentistId;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { dentist: { name: { contains: search, mode: "insensitive" } } },
        { items: { some: { medicineName: { contains: search, mode: "insensitive" } } } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true, clinicName: true } },
          items: true,
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({
      prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Prescriptions GET error:", error);
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

    if (!body.patientId) {
      return NextResponse.json({ error: "Patient is required" }, { status: 400 });
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "At least one medicine item is required" }, { status: 400 });
    }

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item.medicineName || !item.dosage || !item.frequency || !item.duration) {
        return NextResponse.json(
          { error: `Item ${i + 1}: medicineName, dosage, frequency, and duration are required` },
          { status: 400 }
        );
      }
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: body.patientId,
        dentistId: body.dentistId || null,
        labId,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes || null,
        items: {
          create: body.items.map((item: any) => ({
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || null,
          })),
        },
      },
      include: {
        patient: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true, clinicName: true } },
        items: true,
      },
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error("Prescriptions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
