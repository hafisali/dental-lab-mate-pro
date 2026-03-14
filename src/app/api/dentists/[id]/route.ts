import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    const dentist = await prisma.dentist.findFirst({
      where: { id, ...getTenantWhere(labId) },
      include: {
        cases: {
          orderBy: { createdAt: "desc" },
          include: {
            patient: { select: { id: true, name: true } },
            files: { select: { id: true } },
          },
        },
        patients: {
          orderBy: { name: "asc" },
          include: {
            _count: { select: { cases: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          include: {
            payments: true,
            case: { select: { id: true, caseNumber: true } },
          },
        },
        payments: {
          orderBy: { date: "desc" },
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
    });

    if (!dentist) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    // Calculate aggregates
    const totalCasesValue = dentist.cases.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalPayments = dentist.payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      ...dentist,
      _aggregates: {
        totalCasesValue,
        totalPayments,
        outstandingBalance: dentist.balance,
        totalCases: dentist.cases.length,
        totalPatients: dentist.patients.length,
      },
    });
  } catch (error) {
    console.error("Dentist GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
