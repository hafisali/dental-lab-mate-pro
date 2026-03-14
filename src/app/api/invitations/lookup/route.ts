import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { lab: { select: { name: true } } },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: invitation.email,
      labName: invitation.lab.name,
      role: invitation.role,
      expired: new Date() > invitation.expiresAt,
      accepted: invitation.accepted,
    });
  } catch (error: any) {
    console.error("Invitation lookup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
