import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.labId) {
      return NextResponse.json({ error: "No clinic associated" }, { status: 400 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { labId: user.labId, accepted: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error("Invitations GET error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!user.labId) {
      return NextResponse.json({ error: "No clinic associated" }, { status: 400 });
    }

    const { email, role } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if already invited
    const existing = await prisma.invitation.findUnique({
      where: { email_labId: { email, labId: user.labId } },
    });

    if (existing && !existing.accepted) {
      return NextResponse.json({ error: "This email has already been invited" }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email,
        labId: user.labId,
        role: role || "RECEPTION",
        token,
        expiresAt,
        invitedBy: user.id,
      },
    });

    // Try to send invite email via Resend
    let emailSent = false;
    try {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const lab = await prisma.lab.findUnique({ where: { id: user.labId } });
        const joinUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/join/${token}`;

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Dental Lab Mate Pro <onboarding@resend.dev>",
          to: email,
          subject: `You're invited to join ${lab?.name || "a clinic"} on Dental Lab Mate Pro`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">Dental Lab Mate Pro</h1>
                <p style="color: #64748b; margin-top: 8px;">Team Invitation</p>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 16px;">
                  You've been invited to join <strong>${lab?.name || "a clinic"}</strong> as a team member.
                </p>
                <a href="${joinUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">This invitation expires in 7 days.</p>
              </div>
            </div>
          `,
        });
        emailSent = true;
      }
    } catch (e) {
      console.error("Failed to send invite email:", e);
    }

    return NextResponse.json({
      invitation,
      emailSent,
      ...(!emailSent && { token }),
    });
  } catch (error: any) {
    console.error("Invitations POST error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
