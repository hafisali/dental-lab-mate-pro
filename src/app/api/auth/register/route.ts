import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Find default lab
    const defaultLab = await prisma.lab.findFirst();

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "RECEPTION",
        active: true,
        labId: defaultLab?.id || null,
      },
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.otpCode.create({
      data: {
        email,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Try to send email via Resend, but also return OTP for development
    let emailSent = false;
    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Dental Lab Mate Pro <onboarding@resend.dev>",
          to: email,
          subject: "Verify your email - Dental Lab Mate Pro",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">Dental Lab Mate Pro</h1>
                <p style="color: #64748b; margin-top: 8px;">Email Verification</p>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 24px;">Your verification code is:</p>
                <div style="background: white; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${otp}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">This code expires in 10 minutes.</p>
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
      message: "Account created! Please verify your email.",
      emailSent,
      // In development or if Resend not configured, return OTP directly
      ...((!emailSent) && { otp }),
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
