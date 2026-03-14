import { sendWhatsAppMessage } from "./whatsapp";
import { prisma } from "./prisma";

// ── 1. APPOINTMENT REMINDER ──
// Sent 24 hours and 1 hour before appointment
export async function sendAppointmentReminder(appointmentId: string, type: "24h" | "1h") {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, dentist: true },
  });
  if (!appointment || !appointment.patient.phone) return;

  const dateStr = new Date(appointment.date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const message = type === "24h"
    ? `⏰ *Appointment Reminder*\n\nDear ${appointment.patient.name},\n\nThis is a reminder for your appointment tomorrow.\n\n📅 Date: ${dateStr}\n🕐 Time: ${appointment.time}\n🏥 Treatment: ${appointment.treatment}\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}\n\nReply *CONFIRM* to confirm or *RESCHEDULE* to change your appointment.`
    : `⏰ *Appointment in 1 Hour*\n\nDear ${appointment.patient.name},\n\nYour appointment is in 1 hour!\n\n🕐 Time: ${appointment.time}\n🏥 Treatment: ${appointment.treatment}\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}\n\nPlease arrive 10 minutes early. See you soon!`;

  await sendWhatsAppMessage(appointment.patient.phone, message);
  // Mark reminder as sent
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { reminderSent: true },
  });
}

// ── 2. APPOINTMENT CONFIRMATION ──
// Sent when patient confirms via WhatsApp reply or staff confirms
export async function sendAppointmentConfirmation(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, dentist: true },
  });
  if (!appointment || !appointment.patient.phone) return;

  const dateStr = new Date(appointment.date).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const message = `✅ *Appointment Confirmed*\n\nDear ${appointment.patient.name},\n\nYour appointment has been confirmed!\n\n📅 Date: ${dateStr}\n🕐 Time: ${appointment.time}\n🏥 Treatment: ${appointment.treatment}\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}\n\nPlease arrive 10 minutes before your scheduled time.\n\n📍 Location: Our clinic\n\nReply *HELP* for assistance.`;

  await sendWhatsAppMessage(appointment.patient.phone, message);
}

// ── 3. QUEUE UPDATE ──
// Sent when patient checks in / arrives at clinic
export async function sendQueueUpdate(appointmentId: string, queuePosition: number, estimatedWaitMinutes: number) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, dentist: true },
  });
  if (!appointment || !appointment.patient.phone) return;

  const message = queuePosition === 0
    ? `🏥 *Your Turn!*\n\nDear ${appointment.patient.name},\n\nThe doctor is ready to see you now. Please proceed to the treatment room.\n\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}`
    : `🏥 *Queue Update*\n\nDear ${appointment.patient.name},\n\nYou have checked in successfully!\n\n📊 Your position: #${queuePosition} in queue\n⏱️ Estimated wait: ~${estimatedWaitMinutes} minutes\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}\n\nWe'll notify you when it's your turn. Thank you for your patience!`;

  await sendWhatsAppMessage(appointment.patient.phone, message);
}

// ── 4. TREATMENT SUMMARY ──
// Sent after treatment is completed
export async function sendTreatmentSummary(appointmentId: string, treatmentDetails: {
  proceduresDone: string[];
  findings: string;
  recommendations: string;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, dentist: true },
  });
  if (!appointment || !appointment.patient.phone) return;

  const procedures = treatmentDetails.proceduresDone.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const message = `🦷 *Treatment Summary*\n\nDear ${appointment.patient.name},\n\nHere's a summary of your visit today:\n\n*Procedures Performed:*\n${procedures}\n\n*Findings:*\n${treatmentDetails.findings}\n\n*Recommendations:*\n${treatmentDetails.recommendations}\n\n👨‍⚕️ Treated by: Dr. ${appointment.dentist.name}\n\nIf you experience any discomfort, please contact us immediately.`;

  await sendWhatsAppMessage(appointment.patient.phone, message);
}

// ── 5. PRESCRIPTION / MEDICINE DETAILS ──
// Sent after treatment with medicine details
export async function sendPrescriptionDetails(prescriptionId: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: true,
      dentist: true,
      items: true,
    },
  });
  if (!prescription || !prescription.patient.phone) return;

  const medicines = prescription.items.map((item, i) =>
    `${i + 1}. *${item.medicineName}*\n   💊 Dosage: ${item.dosage}\n   🔄 Frequency: ${item.frequency}\n   📅 Duration: ${item.duration}${item.instructions ? `\n   ℹ️ ${item.instructions}` : ""}`
  ).join("\n\n");

  const message = `💊 *Prescription Details*\n\nDear ${prescription.patient.name},\n\nYour prescribed medications:\n\n${medicines}\n\n${prescription.notes ? `📝 Note: ${prescription.notes}\n\n` : ""}👨‍⚕️ Prescribed by: Dr. ${prescription.dentist?.name || "N/A"}\n📅 Date: ${new Date(prescription.date).toLocaleDateString("en-IN")}\n\n⚠️ Please complete the full course of medication. If you have any allergies or side effects, contact us immediately.`;

  await sendWhatsAppMessage(prescription.patient.phone, message);
}

// ── 6. BILL DETAILS ──
// Sent after billing is done
export async function sendBillDetails(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      dentist: true,
      case: { include: { patient: true } },
      payments: true,
    },
  });
  if (!invoice) return;

  const patientPhone = invoice.case?.patient?.phone;
  const patientName = invoice.case?.patient?.name || "Patient";
  if (!patientPhone) return;

  const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = invoice.total - paidAmount;

  const message = `💰 *Bill Summary*\n\nDear ${patientName},\n\nHere's your bill details:\n\n📄 Invoice: ${invoice.invoiceNumber}\n\n💵 Amount: ₹${invoice.amount.toLocaleString("en-IN")}\n${invoice.discount > 0 ? `🏷️ Discount: ₹${invoice.discount.toLocaleString("en-IN")}\n` : ""}${invoice.tax > 0 ? `📊 Tax: ₹${invoice.tax.toLocaleString("en-IN")}\n` : ""}━━━━━━━━━━━━\n💰 *Total: ₹${invoice.total.toLocaleString("en-IN")}*\n${paidAmount > 0 ? `✅ Paid: ₹${paidAmount.toLocaleString("en-IN")}\n` : ""}${balance > 0 ? `⏳ Balance: ₹${balance.toLocaleString("en-IN")}\n` : ""}\n${balance <= 0 ? "✅ *FULLY PAID* - Thank you!" : "Please clear the balance at your earliest convenience."}\n\nReply *HELP* for payment options.`;

  await sendWhatsAppMessage(patientPhone, message);
}

// ── 7. FOLLOW-UP REMINDER ──
// Sent when a follow-up visit is scheduled
export async function sendFollowUpReminder(appointmentId: string, followUpDate: Date, reason: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true, dentist: true },
  });
  if (!appointment || !appointment.patient.phone) return;

  const dateStr = followUpDate.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const message = `📋 *Follow-Up Reminder*\n\nDear ${appointment.patient.name},\n\nA follow-up visit has been scheduled for you.\n\n📅 Date: ${dateStr}\n🏥 Reason: ${reason}\n👨‍⚕️ Doctor: Dr. ${appointment.dentist.name}\n\nPlease make sure to attend this appointment for proper recovery and care.\n\nReply *CONFIRM* to confirm or *RESCHEDULE* to change the date.`;

  await sendWhatsAppMessage(appointment.patient.phone, message);
}

// ── BATCH: Auto-send reminders for upcoming appointments ──
// Called by a cron job or scheduled task
export async function processUpcomingReminders() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  // Find appointments within next 24 hours that haven't been reminded
  const startOf24h = new Date(in24h);
  startOf24h.setHours(0, 0, 0, 0);
  const endOf24h = new Date(in24h);
  endOf24h.setHours(23, 59, 59, 999);

  const upcoming24h = await prisma.appointment.findMany({
    where: {
      date: { gte: startOf24h, lte: endOf24h },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      reminderSent: false,
    },
  });

  let reminded24h = 0;
  for (const apt of upcoming24h) {
    try {
      await sendAppointmentReminder(apt.id, "24h");
      reminded24h++;
    } catch (error) {
      console.error(`[WhatsApp Journey] Failed to send 24h reminder for ${apt.id}:`, error);
    }
  }

  // Find appointments today that haven't had 1h reminder
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const upcomingToday = await prisma.appointment.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      NOT: { notes: { contains: "1h-reminder-sent" } },
    },
  });

  // Filter by time to find ones within next hour
  let reminded1h = 0;
  for (const apt of upcomingToday) {
    try {
      // Parse appointment time (e.g., "09:00 AM")
      const timeMatch = apt.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) continue;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const aptTime = new Date(apt.date);
      aptTime.setHours(hours, minutes, 0, 0);

      const diffMs = aptTime.getTime() - now.getTime();
      // Send if appointment is between 45 minutes and 75 minutes away
      if (diffMs > 45 * 60 * 1000 && diffMs < 75 * 60 * 1000) {
        await sendAppointmentReminder(apt.id, "1h");
        // Mark 1h reminder in notes
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { notes: (apt.notes || "") + " | 1h-reminder-sent" },
        });
        reminded1h++;
      }
    } catch (error) {
      console.error(`[WhatsApp Journey] Failed to send 1h reminder for ${apt.id}:`, error);
    }
  }

  return { reminded24h, reminded1h };
}
