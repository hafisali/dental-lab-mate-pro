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

    // Return list of dentists with phone/whatsapp numbers for the selector
    const dentists = await prisma.dentist.findMany({
      where: {
        ...(labId ? { labId } : {}),
        active: true,
        OR: [
          { phone: { not: null } },
          { whatsapp: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        clinicName: true,
        phone: true,
        whatsapp: true,
        balance: true,
        _count: { select: { cases: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(dentists);
  } catch (error) {
    console.error("WhatsApp GET error:", error);
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

    const { dentistName, dentistId, template, message } = body;

    // Log the WhatsApp message as a notification with type "whatsapp"
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: `WhatsApp: ${template || "Custom"} - ${dentistName}`,
        message: message || "",
        type: "whatsapp",
        read: true,
        link: dentistId ? `/dentists/${dentistId}` : null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("WhatsApp POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
