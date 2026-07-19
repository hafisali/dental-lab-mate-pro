import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireLabId, getTenantWhere } from "@/lib/tenant";
import { Prisma } from "@prisma/client";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: "cases" | "dentists" | "patients" | "invoices";
  href: string;
}

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
    const q = req.nextUrl.searchParams.get("q")?.trim();

    // PERFORMANCE OPTIMIZATION: Avoid expensive database scans (like LIKE/contains queries across 4 major tables)
    // on extremely short search strings (e.g. 1 character) which match a massive portion of the database.
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = q;

    // Type-safe 'where' parameters instead of 'any' to satisfy strict TS/linter rules and ensure clean compiled code
    const caseWhere: Prisma.CaseWhereInput = {
      ...tenantWhere,
      OR: [
        { caseNumber: { contains: searchTerm, mode: "insensitive" } },
        { workType: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    const dentistWhere: Prisma.DentistWhereInput = {
      ...tenantWhere,
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { clinicName: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    const patientWhere: Prisma.PatientWhereInput = {
      ...tenantWhere,
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      ...tenantWhere,
      OR: [
        { invoiceNumber: { contains: searchTerm, mode: "insensitive" } },
      ],
    };

    // Run all searches in parallel to avoid waterfalls
    const [cases, dentists, patients, invoices] = await Promise.all([
      // Search Cases by caseNumber, workType
      prisma.case.findMany({
        where: caseWhere,
        include: {
          dentist: { select: { name: true } },
          patient: { select: { name: true } },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // Search Dentists by name, clinicName
      prisma.dentist.findMany({
        where: dentistWhere,
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // Search Patients by name, phone
      prisma.patient.findMany({
        where: patientWhere,
        include: {
          dentist: { select: { name: true } },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // Search Invoices by invoiceNumber
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
          dentist: { select: { name: true } },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const results: SearchResult[] = [];

    // Map Cases
    for (const c of cases) {
      results.push({
        id: c.id,
        title: `${c.caseNumber} - ${c.workType}`,
        subtitle: `${c.dentist.name}${c.patient ? ` / ${c.patient.name}` : ""} · ${c.status}`,
        category: "cases",
        href: `/cases/${c.id}`,
      });
    }

    // Map Dentists
    for (const d of dentists) {
      results.push({
        id: d.id,
        title: d.name,
        subtitle: d.clinicName || d.phone || "Dentist",
        category: "dentists",
        href: `/dentists?highlight=${d.id}`,
      });
    }

    // Map Patients
    for (const p of patients) {
      results.push({
        id: p.id,
        title: p.name,
        subtitle: `${p.dentist.name}${p.phone ? ` · ${p.phone}` : ""}`,
        category: "patients",
        href: `/patients?highlight=${p.id}`,
      });
    }

    // Map Invoices
    for (const inv of invoices) {
      results.push({
        id: inv.id,
        title: inv.invoiceNumber,
        subtitle: `${inv.dentist.name} · ₹${inv.total.toLocaleString()} · ${inv.status}`,
        category: "invoices",
        href: `/billing?invoice=${inv.id}`,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
