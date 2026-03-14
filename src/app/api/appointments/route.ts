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

    const view = searchParams.get("view");
    const status = searchParams.get("status");
    const dentistId = searchParams.get("dentistId");
    const patientId = searchParams.get("patientId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: any = { ...getTenantWhere(labId) };
    if (status) where.status = status;
    if (dentistId) where.dentistId = dentistId;
    if (patientId) where.patientId = patientId;

    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { dentist: { name: { contains: search, mode: "insensitive" } } },
        { treatment: { contains: search, mode: "insensitive" } },
      ];
    }

    // Handle date filters
    if (view === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.date = { gte: today, lt: tomorrow };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: [{ date: "asc" }, { time: "asc" }],
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          dentist: { select: { id: true, name: true, clinicName: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    // For calendar view, group appointments by date
    if (view === "calendar") {
      const grouped: Record<string, any[]> = {};
      appointments.forEach((apt) => {
        const dateKey = new Date(apt.date).toISOString().split("T")[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(apt);
      });
      return NextResponse.json({ appointments: grouped, total });
    }

    return NextResponse.json({
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Appointments GET error:", error);
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

    // Validation
    if (!body.patientId || !body.dentistId || !body.date || !body.time || !body.treatment) {
      return NextResponse.json(
        { error: "Patient, dentist, date, time, and treatment are required" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        dentistId: body.dentistId,
        labId,
        date: new Date(body.date),
        time: body.time,
        duration: body.duration || 30,
        treatment: body.treatment,
        status: "SCHEDULED",
        notes: body.notes || null,
        reminderSent: false,
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        dentist: { select: { id: true, name: true, clinicName: true } },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Appointments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
