import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Server-side PDF generation using raw PDF spec
// This generates simple but functional PDFs without external dependencies

function escapePdf(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: { text: string; x: number; y: number; size: number; bold?: boolean }[], title: string): Buffer {
  // Minimal PDF 1.4 builder
  const objects: string[] = [];
  let objCount = 0;

  function addObj(content: string): number {
    objCount++;
    objects.push(`${objCount} 0 obj\n${content}\nendobj\n`);
    return objCount;
  }

  // Catalog
  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  // Pages
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  // Page
  addObj("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>");

  // Content stream
  let stream = "BT\n";
  for (const line of lines) {
    const font = line.bold ? "/F2" : "/F1";
    stream += `${font} ${line.size} Tf\n`;
    stream += `${line.x} ${line.y} Td\n`;
    stream += `(${escapePdf(line.text)}) Tj\n`;
    stream += `0 0 Td\n`;
  }
  stream += "ET\n";

  addObj(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);

  // Fonts
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  // Build file
  const header = "%PDF-1.4\n";
  let body = "";
  const xref: number[] = [];

  for (const obj of objects) {
    xref.push(header.length + body.length);
    body += obj;
  }

  const xrefOffset = header.length + body.length;
  let xrefSection = `xref\n0 ${objCount + 1}\n0000000000 65535 f \n`;
  for (const offset of xref) {
    xrefSection += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(header + body + xrefSection + trailer);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const type = req.nextUrl.searchParams.get("type"); // "invoice", "case", "receipt"
    const id = req.nextUrl.searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    // Get lab info
    const lab = user.labId ? await prisma.lab.findUnique({ where: { id: user.labId } }) : null;
    const labName = lab?.name || "Dental Lab";
    const labAddress = lab?.address || "";
    const labPhone = lab?.phone || "";
    const labEmail = lab?.email || "";

    let lines: { text: string; x: number; y: number; size: number; bold?: boolean }[] = [];

    if (type === "invoice") {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          dentist: true,
          case: true,
          payments: true,
        },
      });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

      let y = 780;
      lines.push({ text: labName, x: 50, y, size: 18, bold: true });
      y -= 20;
      if (labAddress) { lines.push({ text: labAddress, x: 50, y, size: 9 }); y -= 14; }
      if (labPhone) { lines.push({ text: `Phone: ${labPhone}`, x: 50, y, size: 9 }); y -= 14; }
      y -= 10;
      lines.push({ text: "INVOICE", x: 400, y: 780, size: 24, bold: true });
      lines.push({ text: `#${invoice.invoiceNumber}`, x: 400, y: 758, size: 10 });
      lines.push({ text: `Date: ${formatDate(invoice.createdAt)}`, x: 400, y: 744, size: 9 });
      lines.push({ text: `Status: ${invoice.status}`, x: 400, y: 730, size: 9 });

      y -= 10;
      lines.push({ text: "Bill To:", x: 50, y, size: 10, bold: true }); y -= 16;
      lines.push({ text: invoice.dentist.name, x: 50, y, size: 11, bold: true }); y -= 14;
      if (invoice.dentist.clinicName) { lines.push({ text: invoice.dentist.clinicName, x: 50, y, size: 9 }); y -= 14; }
      if (invoice.dentist.phone) { lines.push({ text: `Phone: ${invoice.dentist.phone}`, x: 50, y, size: 9 }); y -= 14; }

      y -= 20;
      // Table header
      lines.push({ text: "Description", x: 50, y, size: 9, bold: true });
      lines.push({ text: "Amount", x: 450, y, size: 9, bold: true });
      y -= 6;
      lines.push({ text: "___________________________________________________________", x: 50, y, size: 8 });
      y -= 16;

      // Case details
      if (invoice.case) {
        lines.push({ text: `Case: ${invoice.case.caseNumber} - ${invoice.case.workType}`, x: 50, y, size: 9 });
        lines.push({ text: formatCurrency(invoice.amount), x: 450, y, size: 9 });
        y -= 16;
      } else {
        lines.push({ text: "Lab Services", x: 50, y, size: 9 });
        lines.push({ text: formatCurrency(invoice.amount), x: 450, y, size: 9 });
        y -= 16;
      }

      y -= 6;
      lines.push({ text: "___________________________________________________________", x: 50, y, size: 8 });
      y -= 16;

      // Totals
      lines.push({ text: "Subtotal:", x: 350, y, size: 9 }); lines.push({ text: formatCurrency(invoice.amount), x: 450, y, size: 9 }); y -= 14;
      if (invoice.discount > 0) { lines.push({ text: "Discount:", x: 350, y, size: 9 }); lines.push({ text: `-${formatCurrency(invoice.discount)}`, x: 450, y, size: 9 }); y -= 14; }
      if (invoice.tax > 0) { lines.push({ text: "Tax:", x: 350, y, size: 9 }); lines.push({ text: formatCurrency(invoice.tax), x: 450, y, size: 9 }); y -= 14; }
      y -= 4;
      lines.push({ text: "Total:", x: 350, y, size: 12, bold: true }); lines.push({ text: formatCurrency(invoice.total), x: 450, y, size: 12, bold: true }); y -= 20;

      // Payments
      if (invoice.payments.length > 0) {
        const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
        lines.push({ text: "Payments Received:", x: 50, y, size: 10, bold: true }); y -= 16;
        for (const p of invoice.payments) {
          lines.push({ text: `${formatDate(p.date)} - ${p.method} - ${formatCurrency(p.amount)}`, x: 50, y, size: 9 }); y -= 14;
        }
        y -= 4;
        lines.push({ text: "Balance Due:", x: 350, y, size: 11, bold: true });
        lines.push({ text: formatCurrency(invoice.total - totalPaid), x: 450, y, size: 11, bold: true });
      }

      // Footer
      lines.push({ text: "Thank you for your business!", x: 50, y: 60, size: 9 });
      lines.push({ text: `Generated on ${formatDate(new Date())}`, x: 50, y: 46, size: 7 });

    } else if (type === "case") {
      const caseData = await prisma.case.findUnique({
        where: { id },
        include: {
          dentist: true,
          patient: true,
        },
      });
      if (!caseData) return NextResponse.json({ error: "Case not found" }, { status: 404 });

      let y = 780;
      lines.push({ text: labName, x: 50, y, size: 18, bold: true });
      y -= 20;
      if (labAddress) { lines.push({ text: labAddress, x: 50, y, size: 9 }); y -= 14; }

      lines.push({ text: "CASE REPORT", x: 380, y: 780, size: 20, bold: true });
      lines.push({ text: `#${caseData.caseNumber}`, x: 380, y: 758, size: 10 });

      y -= 20;
      lines.push({ text: "Case Details", x: 50, y, size: 12, bold: true }); y -= 20;

      const details = [
        ["Status", caseData.status],
        ["Priority", caseData.priority],
        ["Work Type", caseData.workType],
        ["Material", caseData.material || "N/A"],
        ["Shade", caseData.shade || "N/A"],
        ["Teeth", caseData.teethNumbers.join(", ") || "N/A"],
        ["Date Received", formatDate(caseData.date)],
        ["Due Date", caseData.dueDate ? formatDate(caseData.dueDate) : "N/A"],
        ["Amount", formatCurrency(caseData.amount)],
      ];

      for (const [label, value] of details) {
        lines.push({ text: `${label}:`, x: 50, y, size: 9, bold: true });
        lines.push({ text: value, x: 180, y, size: 9 });
        y -= 16;
      }

      y -= 10;
      lines.push({ text: "Dentist", x: 50, y, size: 12, bold: true }); y -= 18;
      lines.push({ text: caseData.dentist.name, x: 50, y, size: 10 }); y -= 14;
      if (caseData.dentist.clinicName) { lines.push({ text: caseData.dentist.clinicName, x: 50, y, size: 9 }); y -= 14; }
      if (caseData.dentist.phone) { lines.push({ text: `Phone: ${caseData.dentist.phone}`, x: 50, y, size: 9 }); y -= 14; }

      if (caseData.patient) {
        y -= 10;
        lines.push({ text: "Patient", x: 50, y, size: 12, bold: true }); y -= 18;
        lines.push({ text: caseData.patient.name, x: 50, y, size: 10 }); y -= 14;
      }

      if (caseData.remarks) {
        y -= 10;
        lines.push({ text: "Remarks", x: 50, y, size: 12, bold: true }); y -= 18;
        lines.push({ text: caseData.remarks, x: 50, y, size: 9 }); y -= 14;
      }

      lines.push({ text: `Generated on ${formatDate(new Date())}`, x: 50, y: 46, size: 7 });

    } else if (type === "receipt") {
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          dentist: true,
          invoice: true,
        },
      });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      let y = 780;
      lines.push({ text: labName, x: 50, y, size: 18, bold: true });
      y -= 20;
      if (labAddress) { lines.push({ text: labAddress, x: 50, y, size: 9 }); y -= 14; }

      lines.push({ text: "PAYMENT RECEIPT", x: 350, y: 780, size: 18, bold: true });
      lines.push({ text: `Date: ${formatDate(payment.date)}`, x: 350, y: 758, size: 9 });

      y -= 20;
      lines.push({ text: "Received From:", x: 50, y, size: 10, bold: true }); y -= 16;
      lines.push({ text: payment.dentist.name, x: 50, y, size: 11, bold: true }); y -= 14;
      if (payment.dentist.clinicName) { lines.push({ text: payment.dentist.clinicName, x: 50, y, size: 9 }); y -= 14; }

      y -= 20;
      lines.push({ text: "Payment Details", x: 50, y, size: 12, bold: true }); y -= 20;
      lines.push({ text: "Amount:", x: 50, y, size: 10, bold: true }); lines.push({ text: formatCurrency(payment.amount), x: 180, y, size: 14, bold: true }); y -= 18;
      lines.push({ text: "Method:", x: 50, y, size: 9 }); lines.push({ text: payment.method, x: 180, y, size: 9 }); y -= 14;
      if (payment.reference) { lines.push({ text: "Reference:", x: 50, y, size: 9 }); lines.push({ text: payment.reference, x: 180, y, size: 9 }); y -= 14; }
      if (payment.invoice) { lines.push({ text: "Invoice:", x: 50, y, size: 9 }); lines.push({ text: payment.invoice.invoiceNumber, x: 180, y, size: 9 }); y -= 14; }
      if (payment.notes) { lines.push({ text: "Notes:", x: 50, y, size: 9 }); lines.push({ text: payment.notes, x: 180, y, size: 9 }); y -= 14; }

      y -= 30;
      lines.push({ text: "Thank you for your payment!", x: 50, y, size: 10 });

      lines.push({ text: `Generated on ${formatDate(new Date())}`, x: 50, y: 46, size: 7 });

    } else {
      return NextResponse.json({ error: "Invalid type. Use 'invoice', 'case', or 'receipt'" }, { status: 400 });
    }

    const pdfBuffer = buildPdf(lines, type);
    const uint8 = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${type}-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
