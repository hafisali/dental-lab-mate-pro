import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const labs = await prisma.lab.findMany({
      include: {
        _count: { select: { users: true, cases: true, dentists: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ labs });
  } catch (error) {
    console.error("Labs fetch error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { name, email, phone, address, plan, maxUsers } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Lab name is required" }, { status: 400 });
    }

    const lab = await prisma.lab.create({
      data: {
        name,
        email,
        phone,
        address,
        plan: plan || "trial",
        maxUsers: maxUsers || 5,
        isActive: true,
      },
    });

    return NextResponse.json({ lab });
  } catch (error) {
    console.error("Lab creation error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
