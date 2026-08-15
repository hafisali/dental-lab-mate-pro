import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateInvoiceNumber } from "@/lib/utils";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma, InvoiceStatus } from "@prisma/client";

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

    const tenantWhere = getTenantWhere(labId);
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "invoices";
    const dentistId = searchParams.get("dentistId");
    const status = searchParams.get("status");

    // Optional pagination parameters
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = Math.max(1, parseInt(pageParam || "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || "20") || 20));
    const skip = (page - 1) * limit;

    if (type === "payments") {
      const where: Prisma.PaymentWhereInput = {};
      if (dentistId) where.dentistId = dentistId;
      if (labId) where.dentist = tenantWhere;

      // Optimization: Dynamic pagination for payment history
      if (pageParam) {
        const [payments, total] = await Promise.all([
          prisma.payment.findMany({
            where,
            orderBy: { date: "desc" },
            skip,
            take: limit,
            include: {
              dentist: { select: { id: true, name: true } },
              invoice: { select: { id: true, invoiceNumber: true } },
            },
          }),
          prisma.payment.count({ where }),
        ]);

        return NextResponse.json({
          payments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      // Backward-compatible unpaginated fallback
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
    if (status) where.status = status as InvoiceStatus;

    // Optimization: Dynamic pagination for invoices
    if (pageParam) {
      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            dentist: { select: { id: true, name: true } },
            case: { select: { id: true, caseNumber: true, workType: true } },
            payments: true,
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      return NextResponse.json({
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Backward-compatible unpaginated fallback
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        dentist: { select: { id: true, name: true } },
        case: { select: { id: true, caseNumber: true, workType: true } },
        payments: true,
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
        const invoice = await prisma.invoice.findUnique({
          where: { id: body.invoiceId },
          include: { payments: true },
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
