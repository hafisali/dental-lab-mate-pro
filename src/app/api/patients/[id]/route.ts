import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        dentist: {
          select: { id: true, name: true, clinicName: true, phone: true },
        },
        cases: {
          orderBy: { createdAt: "desc" },
          include: {
            dentist: { select: { id: true, name: true } },
            files: { select: { id: true } },
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const totalCasesValue = patient.cases.reduce((sum, c) => sum + (c.amount || 0), 0);

    return NextResponse.json({
      ...patient,
      _aggregates: {
        totalCases: patient.cases.length,
        totalCasesValue,
      },
    });
  } catch (error) {
    console.error("Patient GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
