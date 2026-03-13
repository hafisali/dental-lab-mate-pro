import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateCaseNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const labId = user.labId;
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get("status");
    const dentistId = searchParams.get("dentistId");
    const technicianId = searchParams.get("technicianId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (labId) where.labId = labId;
    if (status) where.status = status;
    if (dentistId) where.dentistId = dentistId;
    if (technicianId) where.technicianId = technicianId;

    // For technician role, only show their assigned cases
    if (user.role === "TECHNICIAN") {
      where.technicianId = user.id;
    }

    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: "insensitive" } },
        { dentist: { name: { contains: search, mode: "insensitive" } } },
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { workType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          dentist: { select: { id: true, name: true, clinicName: true, phone: true, whatsapp: true } },
          patient: { select: { id: true, name: true } },
          files: { select: { id: true, fileName: true, fileType: true, filePath: true, fileSize: true } },
        },
      }),
      prisma.case.count({ where }),
    ]);

    return NextResponse.json({
      cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Cases GET error:", error);
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

    const caseNumber = generateCaseNumber();

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        dentistId: body.dentistId,
        patientId: body.patientId || null,
        teethNumbers: body.teethNumbers || [],
        workType: body.workType,
        shade: body.shade || null,
        material: body.material || null,
        technicianId: body.technicianId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority || "NORMAL",
        amount: body.amount || 0,
        remarks: body.remarks || null,
        labId: user.labId,
        status: "RECEIVED",
      },
      include: {
        dentist: { select: { id: true, name: true, clinicName: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    // Update dentist balance
    if (body.amount > 0) {
      await prisma.dentist.update({
        where: { id: body.dentistId },
        data: { balance: { increment: body.amount } },
      });
    }

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error("Cases POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
