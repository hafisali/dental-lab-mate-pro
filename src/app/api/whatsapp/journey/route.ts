import { NextRequest, NextResponse } from "next/server";
import {
  sendAppointmentReminder,
  sendAppointmentConfirmation,
  sendQueueUpdate,
  sendTreatmentSummary,
  sendPrescriptionDetails,
  sendBillDetails,
  sendFollowUpReminder,
} from "@/lib/whatsapp-journey";

// POST /api/whatsapp/journey
// Body: { action, ...params }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "reminder": {
        const { appointmentId, type } = body;
        if (!appointmentId || !type) {
          return NextResponse.json({ error: "Missing appointmentId or type" }, { status: 400 });
        }
        if (type !== "24h" && type !== "1h") {
          return NextResponse.json({ error: "type must be '24h' or '1h'" }, { status: 400 });
        }
        await sendAppointmentReminder(appointmentId, type);
        return NextResponse.json({ success: true, message: `${type} reminder sent` });
      }

      case "confirm": {
        const { appointmentId } = body;
        if (!appointmentId) {
          return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
        }
        await sendAppointmentConfirmation(appointmentId);
        return NextResponse.json({ success: true, message: "Confirmation sent" });
      }

      case "queue": {
        const { appointmentId, queuePosition, estimatedWaitMinutes } = body;
        if (!appointmentId || queuePosition === undefined || estimatedWaitMinutes === undefined) {
          return NextResponse.json({ error: "Missing appointmentId, queuePosition, or estimatedWaitMinutes" }, { status: 400 });
        }
        await sendQueueUpdate(appointmentId, queuePosition, estimatedWaitMinutes);
        return NextResponse.json({ success: true, message: "Queue update sent" });
      }

      case "treatment": {
        const { appointmentId, proceduresDone, findings, recommendations } = body;
        if (!appointmentId || !proceduresDone || !findings || !recommendations) {
          return NextResponse.json({ error: "Missing required treatment fields" }, { status: 400 });
        }
        await sendTreatmentSummary(appointmentId, { proceduresDone, findings, recommendations });
        return NextResponse.json({ success: true, message: "Treatment summary sent" });
      }

      case "prescription": {
        const { prescriptionId } = body;
        if (!prescriptionId) {
          return NextResponse.json({ error: "Missing prescriptionId" }, { status: 400 });
        }
        await sendPrescriptionDetails(prescriptionId);
        return NextResponse.json({ success: true, message: "Prescription details sent" });
      }

      case "bill": {
        const { invoiceId } = body;
        if (!invoiceId) {
          return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
        }
        await sendBillDetails(invoiceId);
        return NextResponse.json({ success: true, message: "Bill details sent" });
      }

      case "followup": {
        const { appointmentId, followUpDate, reason } = body;
        if (!appointmentId || !followUpDate || !reason) {
          return NextResponse.json({ error: "Missing appointmentId, followUpDate, or reason" }, { status: 400 });
        }
        await sendFollowUpReminder(appointmentId, new Date(followUpDate), reason);
        return NextResponse.json({ success: true, message: "Follow-up reminder sent" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[WhatsApp Journey API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send journey notification" },
      { status: 500 }
    );
  }
}
