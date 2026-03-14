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

    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = { ...getTenantWhere(labId) };
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { diagnosis: { contains: search, mode: "insensitive" } },
        { dentist: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [plans, total] = await Promise.all([
      prisma.orthodonticPlan.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true, clinicName: true } },
          payments: { orderBy: { date: "desc" } },
          records: { orderBy: { date: "desc" } },
        },
      }),
      prisma.orthodonticPlan.count({ where }),
    ]);

    return NextResponse.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Orthodontics GET error:", error);
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
    const type = body.type || "plan";

    if (type === "plan") {
      const plan = await prisma.orthodonticPlan.create({
        data: {
          patientId: body.patientId,
          dentistId: body.dentistId || null,
          diagnosis: body.diagnosis,
          totalCost: Number(body.totalCost),
          startDate: new Date(body.startDate),
          notes: body.notes || null,
          labId,
          status: "ACTIVE",
        },
        include: {
          patient: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true, clinicName: true } },
          payments: true,
          records: true,
        },
      });

      return NextResponse.json(plan, { status: 201 });
    }

    if (type === "payment") {
      const payment = await prisma.orthoPayment.create({
        data: {
          planId: body.planId,
          date: body.date ? new Date(body.date) : new Date(),
          amount: Number(body.amount),
          method: body.method || "CASH",
          notes: body.notes || null,
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }

    if (type === "record") {
      const record = await prisma.orthoRecord.create({
        data: {
          planId: body.planId,
          date: body.date ? new Date(body.date) : new Date(),
          notes: body.notes || null,
          imagePath: body.imagePath || null,
          doctorName: body.doctorName || null,
        },
      });

      return NextResponse.json(record, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("Orthodontics POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
