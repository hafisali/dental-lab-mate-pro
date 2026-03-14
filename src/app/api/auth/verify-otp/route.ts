import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Verify user email
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";

    await logActivity({
      email,
      action: "OTP_VERIFIED",
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
