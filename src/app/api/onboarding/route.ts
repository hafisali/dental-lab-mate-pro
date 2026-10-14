import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Optimization: Parallelize session authentication and request JSON parsing.
    // Executing auth session verification concurrently with JSON stream parsing eliminates sequential latency.
    const [session, body] = await Promise.all([
      getServerSession(authOptions),
      req.json(),
    ]);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { labId?: string };
    if (!user.labId) {
      return NextResponse.json({ error: "No clinic associated" }, { status: 400 });
    }

    const {
      address,
      phone,
      timezone,
      currency,
      logo,
      primaryColor,
      tagline,
    } = body;

    await prisma.lab.update({
      where: { id: user.labId },
      data: {
        ...(address && { address }),
        ...(phone && { phone }),
        ...(timezone && { timezone }),
        ...(currency && { currency }),
        ...(logo && { logo }),
        ...(primaryColor && { primaryColor }),
        ...(tagline && { tagline }),
        onboardingComplete: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
