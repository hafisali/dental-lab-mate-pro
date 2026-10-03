import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Optimization: Use explicit `select` projection instead of full record fetching with `include`.
    // This prunes unneeded database columns (id, labId, token, invitedBy, createdAt, updatedAt)
    // from the initial query payload, speeding up database fetch and serialization.
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        email: true,
        role: true,
        expiresAt: true,
        accepted: true,
        lab: {
          select: { name: true },
        },
      },
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
  } catch (error) {
    console.error("Invitation lookup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
