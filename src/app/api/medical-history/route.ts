import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId } from "@/lib/tenant";

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

    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Verify the patient belongs to this tenant before returning data
    if (labId) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, labId },
      });
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }
    }

    const history = await prisma.medicalHistory.findUnique({
      where: { patientId },
      include: {
        patient: { select: { id: true, name: true, age: true, gender: true, phone: true } },
      },
    });

    // Also get dental charts for this patient
    const dentalCharts = await prisma.dentalChart.findMany({
      where: { patientId },
      orderBy: { updatedAt: "desc" },
    });

    // Get patient photos
    const photos = await prisma.patientPhoto.findMany({
      where: { patientId },
      orderBy: { dateAdded: "desc" },
    });

    // Get medical certificates
    const certificates = await prisma.medicalCertificate.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      history,
      dentalCharts,
      photos,
      certificates,
    });
  } catch (error) {
    console.error("Medical history GET error:", error);
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
    const { type } = body;

    if (type === "history") {
      // Upsert medical history
      const history = await prisma.medicalHistory.upsert({
        where: { patientId: body.patientId },
        update: {
          allergies: body.allergies || null,
          conditions: body.conditions || null,
          bloodGroup: body.bloodGroup || null,
          notes: body.notes || null,
          lastUpdated: new Date(),
        },
        create: {
          patientId: body.patientId,
          allergies: body.allergies || null,
          conditions: body.conditions || null,
          bloodGroup: body.bloodGroup || null,
          notes: body.notes || null,
        },
      });
      return NextResponse.json(history, { status: 201 });
    }

    if (type === "dental-chart") {
      const chart = await prisma.dentalChart.upsert({
        where: {
          id: body.id || "new-entry",
        },
        update: {
          diagnosis: body.diagnosis || null,
          treatment: body.treatment || null,
          status: body.status || "HEALTHY",
          surface: body.surface || null,
          completionDate: body.completionDate ? new Date(body.completionDate) : null,
          notes: body.notes || null,
        },
        create: {
          patientId: body.patientId,
          toothNumber: body.toothNumber,
          diagnosis: body.diagnosis || null,
          treatment: body.treatment || null,
          status: body.status || "HEALTHY",
          surface: body.surface || null,
          completionDate: body.completionDate ? new Date(body.completionDate) : null,
          notes: body.notes || null,
          labId,
        },
      });
      return NextResponse.json(chart, { status: 201 });
    }

    if (type === "certificate") {
      const cert = await prisma.medicalCertificate.create({
        data: {
          patientId: body.patientId,
          doctorName: body.doctorName,
          diagnosis: body.diagnosis,
          restPeriodFrom: body.restPeriodFrom ? new Date(body.restPeriodFrom) : new Date(),
          restPeriodTo: body.restPeriodTo ? new Date(body.restPeriodTo) : new Date(),
          fitnessDate: body.fitnessDate ? new Date(body.fitnessDate) : null,
          notes: body.notes || null,
          labId,
        },
      });
      return NextResponse.json(cert, { status: 201 });
    }

    if (type === "photo") {
      const photo = await prisma.patientPhoto.create({
        data: {
          patientId: body.patientId,
          filePath: body.filePath,
          description: body.description || null,
          toothNumber: body.toothNumber || null,
        },
      });
      return NextResponse.json(photo, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Medical history POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
