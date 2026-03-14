import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Create appointment booking from chatbot
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, date, time, name, phone } = body;

    if (!service || !date || !time || !name || !phone) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Find the first available lab (public booking goes to default lab)
    const lab = await prisma.lab.findFirst({
      where: { isActive: true },
      include: { dentists: { where: { active: true }, take: 1 } },
    });

    if (!lab) {
      return NextResponse.json(
        { success: false, error: "No active lab found" },
        { status: 404 }
      );
    }

    // Use the first active dentist, or create a default one
    let dentist = lab.dentists[0];
    if (!dentist) {
      dentist = await prisma.dentist.create({
        data: {
          name: "General Dentist",
          labId: lab.id,
        },
      });
    }

    // Find existing patient by phone or create new one
    let patient = await prisma.patient.findFirst({
      where: { phone, labId: lab.id },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name,
          phone,
          dentistId: dentist.id,
          labId: lab.id,
        },
      });
    }

    // Create the appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        dentistId: dentist.id,
        labId: lab.id,
        date: new Date(date),
        time,
        treatment: service,
        status: "SCHEDULED",
        notes: `Booked via chatbot. Patient name: ${name}, Phone: ${phone}`,
      },
    });

    // Generate a short reference from the appointment id
    const reference = `APT-${appointment.id.slice(-6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      reference,
      appointmentId: appointment.id,
    });
  } catch (error) {
    console.error("Appointment bot POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// GET - Check appointment status by phone number
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Find patients with this phone number
    const patients = await prisma.patient.findMany({
      where: { phone },
      select: { id: true },
    });

    if (patients.length === 0) {
      return NextResponse.json({
        success: true,
        appointments: [],
        message: "No appointments found for this phone number",
      });
    }

    const patientIds = patients.map((p) => p.id);

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: { in: patientIds },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      orderBy: { date: "asc" },
      include: {
        patient: { select: { name: true, phone: true } },
      },
    });

    const formatted = appointments.map((apt) => ({
      reference: `APT-${apt.id.slice(-6).toUpperCase()}`,
      service: apt.treatment,
      date: apt.date.toISOString().split("T")[0],
      time: apt.time,
      status: apt.status,
      name: apt.patient.name,
    }));

    return NextResponse.json({ success: true, appointments: formatted });
  } catch (error) {
    console.error("Appointment bot GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel appointment by reference
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get("ref");

    if (!ref) {
      return NextResponse.json(
        { success: false, error: "Reference number is required" },
        { status: 400 }
      );
    }

    // Extract the last 6 chars from the reference (APT-XXXXXX)
    const idSuffix = ref.replace("APT-", "").toLowerCase();

    // Find appointment where id ends with the suffix
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    });

    const appointment = appointments.find((apt) =>
      apt.id.toLowerCase().endsWith(idSuffix)
    );

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found or already cancelled" },
        { status: 404 }
      );
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
    });
  } catch (error) {
    console.error("Appointment bot DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
