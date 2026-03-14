import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "No account found with this email" }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Invalidate old OTPs
    await prisma.otpCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.otpCode.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Try sending via Resend
    let emailSent = false;
    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Dental Lab Mate Pro <onboarding@resend.dev>",
          to: email,
          subject: "Your new verification code - Dental Lab Mate Pro",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1;">Dental Lab Mate Pro</h1>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 24px;">Your new verification code:</p>
                <div style="background: white; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">Expires in 10 minutes.</p>
              </div>
            </div>
          `,
        });
        emailSent = true;
      }
    } catch (e) {
      console.error("Failed to send email:", e);
    }

    return NextResponse.json({
      message: "New OTP sent!",
      emailSent,
      ...((!emailSent) && { otp }),
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
