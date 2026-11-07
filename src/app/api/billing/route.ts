import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma, InvoiceStatus } from "@prisma/client";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  labId?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    const tenantWhere = getTenantWhere(labId);
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "invoices";
    const dentistId = searchParams.get("dentistId");
    const status = searchParams.get("status");

    if (type === "payments") {
      const where: Prisma.PaymentWhereInput = {};
      if (dentistId) where.dentistId = dentistId;
      if (labId) where.dentist = { ...tenantWhere };

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { date: "desc" },
        take: 100,
        include: {
          dentist: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });
      return NextResponse.json(payments);
    }

    // Invoices
    const where: Prisma.InvoiceWhereInput = { ...tenantWhere };
    if (dentistId) where.dentistId = dentistId;
    if (status && Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      where.status = status as InvoiceStatus;
    }

    // Performance optimization: omit full `payments` relation in invoice list view.
    // The billing UI consumes invoice summary fields, so avoiding loading nested payment
    // records slashes payload size and avoids unnecessary joins/eager loading.
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        dentist: { select: { id: true, name: true } },
        case: { select: { id: true, caseNumber: true, workType: true } },
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Billing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Performance optimization: execute session retrieval and request payload parsing concurrently
    // to eliminate sequential async blocking latency.
    const [session, body] = await Promise.all([
      getServerSession(authOptions),
      req.json().catch(() => ({})),
    ]);

    const user = session?.user as SessionUser | undefined;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let labId: string;
    try {
      labId = requireLabId(session);
    } catch {
      return NextResponse.json({ error: "No clinic associated" }, { status: 403 });
    }

    if (body.type === "payment") {
      // Record payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId: body.invoiceId || null,
          dentistId: body.dentistId,
          amount: body.amount,
          method: body.method || "CASH",
          reference: body.reference || null,
          notes: body.notes || null,
        },
      });

      // Update dentist balance
      await prisma.dentist.update({
        where: { id: body.dentistId },
        data: { balance: { decrement: body.amount } },
      });

      // Update invoice status if linked
      if (body.invoiceId) {
        // Performance optimization: select only required fields (total and payment amounts)
        // rather than full invoice record and full payment records.
        const invoice = await prisma.invoice.findUnique({
          where: { id: body.invoiceId },
          select: {
            total: true,
            payments: {
              select: { amount: true },
            },
          },
        });
        if (invoice) {
          const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + body.amount;
          const newStatus = totalPaid >= invoice.total ? "PAID" : "PARTIAL";
          await prisma.invoice.update({
            where: { id: body.invoiceId },
            data: { status: newStatus },
          });
        }
      }

      return NextResponse.json(payment, { status: 201 });
    }

    // Create invoice
    const invoiceNumber = generateInvoiceNumber();
    const total = (body.amount || 0) - (body.discount || 0) + (body.tax || 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        caseId: body.caseId || null,
        dentistId: body.dentistId,
        amount: body.amount,
        discount: body.discount || 0,
        tax: body.tax || 0,
        total,
        notes: body.notes || null,
        labId,
        status: "SENT",
      },
      include: {
        dentist: { select: { id: true, name: true } },
        case: { select: { id: true, caseNumber: true } },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Billing POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
