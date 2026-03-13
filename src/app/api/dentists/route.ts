import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const labId = user.labId;
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const all = searchParams.get("all");

    const where: any = {};
    if (labId) where.labId = labId;
    where.active = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { clinicName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const dentists = await prisma.dentist.findMany({
      where,
      orderBy: { name: "asc" },
      ...(all ? {} : { take: 100 }),
      include: {
        _count: { select: { cases: true, patients: true } },
      },
    });

    return NextResponse.json(dentists);
  } catch (error) {
    console.error("Dentists GET error:", error);
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

    const dentist = await prisma.dentist.create({
      data: {
        name: body.name,
        clinicName: body.clinicName || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        address: body.address || null,
        notes: body.notes || null,
        labId: user.labId,
      },
    });

    return NextResponse.json(dentist, { status: 201 });
  } catch (error) {
    console.error("Dentists POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
