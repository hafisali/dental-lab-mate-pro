import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";
import { sendAppointmentConfirmation } from "@/lib/whatsapp-journey";

// ── In-memory conversation state ───────────────────────────────────
type ConversationStep =
  | "IDLE"
  | "BOOKING_SERVICE"
  | "BOOKING_DATE"
  | "BOOKING_TIME"
  | "BOOKING_NAME"
  | "BOOKING_CONFIRM"
  | "CHECK_STATUS"
  | "CANCEL_APPOINTMENT";

interface ConversationState {
  step: ConversationStep;
  data: Record<string, string>;
  lastActivity: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const conversations = new Map<string, ConversationState>();

// Message log for dashboard (in-memory, last 100 messages)
export const messageLog: {
  id: string;
  from: string;
  direction: "incoming" | "outgoing";
  message: string;
  timestamp: string;
}[] = [];

function addToLog(from: string, direction: "incoming" | "outgoing", message: string) {
  messageLog.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    direction,
    message: message.slice(0, 500),
    timestamp: new Date().toISOString(),
  });
  if (messageLog.length > 100) messageLog.length = 100;
}

function getSession(phone: string): ConversationState {
  const existing = conversations.get(phone);
  if (existing && Date.now() - existing.lastActivity < SESSION_TIMEOUT_MS) {
    existing.lastActivity = Date.now();
    return existing;
  }
  const fresh: ConversationState = { step: "IDLE", data: {}, lastActivity: Date.now() };
  conversations.set(phone, fresh);
  return fresh;
}

function resetSession(phone: string) {
  conversations.set(phone, { step: "IDLE", data: {}, lastActivity: Date.now() });
}

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of conversations.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      conversations.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// ── Available services ─────────────────────────────────────────────
const SERVICES = [
  { id: "1", name: "General Checkup", description: "Routine dental examination and cleaning", duration: 30 },
  { id: "2", name: "Teeth Whitening", description: "Professional teeth whitening treatment", duration: 60 },
  { id: "3", name: "Root Canal", description: "Endodontic treatment for infected teeth", duration: 90 },
  { id: "4", name: "Dental Crown", description: "Custom crown fitting and placement", duration: 60 },
  { id: "5", name: "Dental Filling", description: "Cavity filling and restoration", duration: 45 },
  { id: "6", name: "Tooth Extraction", description: "Safe tooth removal procedure", duration: 30 },
  { id: "7", name: "Orthodontics Consultation", description: "Braces and alignment consultation", duration: 45 },
];

const MENU_TEXT = `Welcome to DentalLab! Choose an option:

1 - Book Appointment
2 - Check Appointment Status
3 - Cancel Appointment
4 - Our Services
5 - Contact Us

Reply with the number of your choice.`;

const SERVICES_TEXT = SERVICES.map(
  (s) => `${s.id}. *${s.name}* - ${s.description} (${s.duration} min)`
).join("\n");

const CONTACT_TEXT = `*DentalLab Contact Information*

Phone: Call us at our clinic number
Email: Contact through our website
Hours: Mon-Sat, 9:00 AM - 6:00 PM

Visit our clinic for in-person consultations.

Reply *menu* to go back to the main menu.`;

// ── Webhook verification (GET) ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ── Handle incoming messages (POST) ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Meta sends a verification ping on webhook setup
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          if (msg.type === "text") {
            const from = msg.from; // sender phone number
            const text = (msg.text?.body || "").trim();

            addToLog(from, "incoming", text);

            const reply = await handleMessage(from, text);
            if (reply) {
              await sendWhatsAppMessage(from, reply);
              addToLog(from, "outgoing", reply);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// ── Message handler ────────────────────────────────────────────────
async function handleMessage(phone: string, text: string): Promise<string> {
  const session = getSession(phone);
  const input = text.toLowerCase().trim();

  // ── Journey reply handlers (CONFIRM, RESCHEDULE, HELP) ──
  if (input === "confirm") {
    // Find the patient's most recent SCHEDULED appointment and confirm it
    const confirmed = await handleConfirmReply(phone);
    if (confirmed) return confirmed;
    // Fall through to normal flow if no appointment found
  }

  if (input === "reschedule") {
    return handleRescheduleReply(phone);
  }

  if (input === "help") {
    return `*Need Help?*\n\nHere's how we can assist you:\n\n1️⃣ Reply *MENU* to see all options\n2️⃣ Reply *2* to check appointment status\n3️⃣ Reply *3* to cancel an appointment\n\n📞 For urgent queries, please call our clinic directly.\n🕐 Working hours: Mon-Sat, 9:00 AM - 6:00 PM\n\nReply *MENU* to go back to the main menu.`;
  }

  // Global reset commands
  if (["hi", "hello", "hey", "menu", "start", "home"].includes(input)) {
    resetSession(phone);
    return MENU_TEXT;
  }

  // Handle based on current step
  switch (session.step) {
    case "IDLE":
      return handleMainMenu(phone, input, session);

    case "BOOKING_SERVICE":
      return handleBookingService(phone, input, session);

    case "BOOKING_DATE":
      return handleBookingDate(phone, input, session);

    case "BOOKING_TIME":
      return handleBookingTime(phone, input, session);

    case "BOOKING_NAME":
      return handleBookingName(phone, text, session);

    case "BOOKING_CONFIRM":
      return handleBookingConfirm(phone, input, session);

    case "CHECK_STATUS":
      return handleCheckStatus(phone, text, session);

    case "CANCEL_APPOINTMENT":
      return handleCancelAppointment(phone, text, session);

    default:
      resetSession(phone);
      return MENU_TEXT;
  }
}

function handleMainMenu(phone: string, input: string, session: ConversationState): string {
  switch (input) {
    case "1":
      session.step = "BOOKING_SERVICE";
      return `*Book an Appointment*\n\nPlease select a service:\n\n${SERVICES_TEXT}\n\nReply with the service number (1-${SERVICES.length}).`;

    case "2":
      session.step = "CHECK_STATUS";
      return "Please enter your *appointment reference number* (e.g., APT-XXXXXX):";

    case "3":
      session.step = "CANCEL_APPOINTMENT";
      return "Please enter the *appointment reference number* you want to cancel (e.g., APT-XXXXXX):";

    case "4":
      return `*Our Services*\n\n${SERVICES_TEXT}\n\nReply *1* to book an appointment or *menu* to go back.`;

    case "5":
      return CONTACT_TEXT;

    default:
      return `Sorry, I didn't understand that. ${MENU_TEXT}`;
  }
}

function handleBookingService(phone: string, input: string, session: ConversationState): string {
  const service = SERVICES.find((s) => s.id === input);
  if (!service) {
    return `Please select a valid service number (1-${SERVICES.length}).\n\n${SERVICES_TEXT}`;
  }

  session.data.service = service.name;
  session.data.duration = String(service.duration);
  session.step = "BOOKING_DATE";

  return `You selected: *${service.name}*\n\nPlease enter your preferred *date* in format DD/MM/YYYY (e.g., 25/03/2026).\n\nNote: We are available Mon-Sat.`;
}

function handleBookingDate(phone: string, input: string, session: ConversationState): string {
  // Parse date in DD/MM/YYYY format
  const dateMatch = input.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!dateMatch) {
    return "Please enter a valid date in *DD/MM/YYYY* format (e.g., 25/03/2026).";
  }

  const [, day, month, year] = dateMatch;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return "That doesn't seem to be a valid date. Please try again in *DD/MM/YYYY* format.";
  }

  if (date < now) {
    return "Please select a future date. Try again in *DD/MM/YYYY* format.";
  }

  if (date.getDay() === 0) {
    return "Sorry, we are closed on Sundays. Please select another date (Mon-Sat).";
  }

  session.data.date = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  session.data.dateISO = date.toISOString();
  session.step = "BOOKING_TIME";

  return `Date selected: *${session.data.date}*\n\nPlease choose a time slot:\n\n1 - 09:00 AM\n2 - 10:00 AM\n3 - 11:00 AM\n4 - 12:00 PM\n5 - 02:00 PM\n6 - 03:00 PM\n7 - 04:00 PM\n8 - 05:00 PM\n\nReply with the slot number.`;
}

function handleBookingTime(phone: string, input: string, session: ConversationState): string {
  const timeSlots: Record<string, string> = {
    "1": "09:00 AM",
    "2": "10:00 AM",
    "3": "11:00 AM",
    "4": "12:00 PM",
    "5": "02:00 PM",
    "6": "03:00 PM",
    "7": "04:00 PM",
    "8": "05:00 PM",
  };

  const time = timeSlots[input];
  if (!time) {
    return "Please select a valid time slot (1-8).";
  }

  session.data.time = time;
  session.step = "BOOKING_NAME";

  return `Time selected: *${time}*\n\nPlease enter the *patient's full name*:`;
}

function handleBookingName(phone: string, text: string, session: ConversationState): string {
  const name = text.trim();
  if (name.length < 2) {
    return "Please enter a valid name (at least 2 characters).";
  }

  session.data.patientName = name;
  session.step = "BOOKING_CONFIRM";

  return `*Please confirm your appointment:*\n\nPatient: ${name}\nService: ${session.data.service}\nDate: ${session.data.date}\nTime: ${session.data.time}\nDuration: ${session.data.duration} minutes\n\nReply *yes* to confirm or *no* to cancel.`;
}

async function handleBookingConfirm(phone: string, input: string, session: ConversationState): Promise<string> {
  if (input === "no" || input === "cancel") {
    resetSession(phone);
    return `Booking cancelled.\n\n${MENU_TEXT}`;
  }

  if (input !== "yes" && input !== "y" && input !== "confirm") {
    return "Please reply *yes* to confirm or *no* to cancel.";
  }

  try {
    // Find the first lab to associate with
    const lab = await prisma.lab.findFirst({ where: { isActive: true } });
    if (!lab) {
      resetSession(phone);
      return "Sorry, we are unable to process bookings at this time. Please contact us directly.\n\nReply *menu* for options.";
    }

    // Find or use first dentist
    const dentist = await prisma.dentist.findFirst({
      where: { labId: lab.id, active: true },
    });
    if (!dentist) {
      resetSession(phone);
      return "Sorry, no dentists are currently available. Please contact us directly.\n\nReply *menu* for options.";
    }

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        name: session.data.patientName,
        phone: formatPhoneNumber(phone),
        dentistId: dentist.id,
        labId: lab.id,
      },
    });

    // Parse the date
    const [day, month, year] = session.data.date.split("/");
    const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Generate reference number
    const refNumber = `APT-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        dentistId: dentist.id,
        labId: lab.id,
        date: appointmentDate,
        time: session.data.time,
        duration: parseInt(session.data.duration),
        treatment: session.data.service,
        status: "SCHEDULED",
        notes: `Booked via WhatsApp. Ref: ${refNumber}. Phone: ${phone}`,
      },
    });

    resetSession(phone);

    return `*Appointment Confirmed!*\n\nReference: *${refNumber}*\nPatient: ${session.data.patientName}\nService: ${session.data.service}\nDate: ${session.data.date}\nTime: ${session.data.time}\n\nPlease save your reference number to check status or make changes.\n\nReply *menu* for more options.`;
  } catch (error) {
    console.error("[WhatsApp Bot] Booking error:", error);
    resetSession(phone);
    return "Sorry, something went wrong while booking your appointment. Please try again or contact us directly.\n\nReply *menu* for options.";
  }
}

async function handleCheckStatus(phone: string, text: string, session: ConversationState): Promise<string> {
  const ref = text.trim().toUpperCase();

  if (!ref.startsWith("APT-")) {
    resetSession(phone);
    return `Invalid reference number. It should start with APT-.\n\n${MENU_TEXT}`;
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        notes: { contains: ref },
      },
      include: {
        patient: true,
        dentist: true,
      },
    });

    resetSession(phone);

    if (!appointment) {
      return `No appointment found with reference *${ref}*.\n\nPlease check the reference number and try again.\n\nReply *menu* for options.`;
    }

    const dateStr = new Date(appointment.date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `*Appointment Status*\n\nReference: *${ref}*\nPatient: ${appointment.patient.name}\nDentist: Dr. ${appointment.dentist.name}\nDate: ${dateStr}\nTime: ${appointment.time}\nTreatment: ${appointment.treatment}\nStatus: *${appointment.status}*\n\nReply *menu* for more options.`;
  } catch (error) {
    console.error("[WhatsApp Bot] Status check error:", error);
    resetSession(phone);
    return "Sorry, something went wrong. Please try again.\n\nReply *menu* for options.";
  }
}

async function handleCancelAppointment(phone: string, text: string, session: ConversationState): Promise<string> {
  const ref = text.trim().toUpperCase();

  if (!ref.startsWith("APT-")) {
    resetSession(phone);
    return `Invalid reference number. It should start with APT-.\n\n${MENU_TEXT}`;
  }

  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        notes: { contains: ref },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
      include: { patient: true },
    });

    if (!appointment) {
      resetSession(phone);
      return `No active appointment found with reference *${ref}*.\n\nIt may have already been cancelled or completed.\n\nReply *menu* for options.`;
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });

    resetSession(phone);

    return `*Appointment Cancelled*\n\nReference: *${ref}*\nPatient: ${appointment.patient.name}\nTreatment: ${appointment.treatment}\n\nYour appointment has been successfully cancelled.\n\nReply *1* to book a new appointment or *menu* for options.`;
  } catch (error) {
    console.error("[WhatsApp Bot] Cancel error:", error);
    resetSession(phone);
    return "Sorry, something went wrong. Please try again.\n\nReply *menu* for options.";
  }
}

// ── Journey reply handlers ──────────────────────────────────────────

async function handleConfirmReply(phone: string): Promise<string | null> {
  try {
    // Find the patient's most recent SCHEDULED appointment by phone
    const cleanPhone = formatPhoneNumber(phone);
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { phone: phone },
          { phone: { contains: cleanPhone.slice(-10) } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (!patient) return null;

    const appointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        status: "SCHEDULED",
        date: { gte: new Date() },
      },
      orderBy: { date: "asc" },
      include: { dentist: true },
    });

    if (!appointment) return null;

    // Update status to CONFIRMED
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CONFIRMED" },
    });

    // Send confirmation message
    await sendAppointmentConfirmation(appointment.id);

    const dateStr = new Date(appointment.date).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    return `✅ *Appointment Confirmed!*\n\nYour appointment on ${dateStr} at ${appointment.time} with Dr. ${appointment.dentist.name} has been confirmed.\n\nSee you soon! Reply *MENU* for more options.`;
  } catch (error) {
    console.error("[WhatsApp Bot] Confirm error:", error);
    return null;
  }
}

function handleRescheduleReply(phone: string): string {
  resetSession(phone);
  return `📅 *Reschedule Appointment*\n\nTo reschedule your appointment, please:\n\n1. Reply *1* to book a new appointment\n2. Reply *3* to cancel the current appointment first\n\nOr contact our clinic directly for assistance.\n\nReply *MENU* for more options.`;
}
