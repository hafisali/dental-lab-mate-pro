// Format phone number for WhatsApp (add country code, remove spaces/dashes)
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+") && !cleaned.startsWith("91")) {
    cleaned = "91" + cleaned;
  }
  cleaned = cleaned.replace("+", "");
  return cleaned;
}

// Format phone number - remove +, spaces, dashes etc.
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[+\s\-\(\)]/g, "");
}

// Generate WhatsApp URL
export function getWhatsAppUrl(phone: string, message: string): string {
  const number = formatWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ── WhatsApp Business API helpers ──────────────────────────────────

// Detect which WhatsApp provider is configured
export function getWhatsAppProvider(): "twilio" | "meta" | "none" {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER
  ) {
    return "twilio";
  }
  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    return "meta";
  }
  return "none";
}

// Send a WhatsApp message via Twilio
async function sendViaTwilio(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

  // Format the "to" number - must be whatsapp:+XXXXXXXXXXX
  const toFormatted = to.startsWith("whatsapp:")
    ? to
    : `whatsapp:+${to.replace(/[+\s\-]/g, "")}`;
  const fromFormatted = fromNumber.startsWith("whatsapp:")
    ? fromNumber
    : `whatsapp:${fromNumber}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append("To", toFormatted);
  params.append("From", fromFormatted);
  params.append("Body", message);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  return response.json();
}

// Send a WhatsApp message via Meta Business API
async function sendViaMeta(to: string, message: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  return response.json();
}

// Send a text message via WhatsApp (auto-detects provider)
export async function sendWhatsAppMessage(to: string, message: string) {
  const provider = getWhatsAppProvider();

  if (provider === "twilio") {
    return sendViaTwilio(to, message);
  }

  if (provider === "meta") {
    return sendViaMeta(to, message);
  }

  console.warn("[WhatsApp] No provider configured. Message not sent:", message.slice(0, 100));
  return { error: "No WhatsApp provider configured" };
}

// Send interactive button message
export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { error: "WhatsApp API not configured" };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply",
            reply: { id: btn.id, title: btn.title.slice(0, 20) },
          })),
        },
      },
    }),
  });

  return response.json();
}

// Send interactive list message
export async function sendWhatsAppList(
  to: string,
  body: string,
  buttonText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { error: "WhatsApp API not configured" };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonText,
          sections,
        },
      },
    }),
  });

  return response.json();
}

// Message templates
export const messageTemplates = {
  caseReceived: (dentist: string, caseNumber: string, patient: string, workType: string, dueDate: string) =>
    `Dear Dr. ${dentist},\n\nWe have received case #${caseNumber} for patient ${patient}.\nWork type: ${workType}\nExpected completion: ${dueDate}\n\nThank you,\nDental Lab Mate Pro`,

  caseReady: (dentist: string, caseNumber: string, patient: string) =>
    `Dear Dr. ${dentist},\n\nGreat news! Case #${caseNumber} for patient ${patient} is ready for delivery.\n\nPlease arrange for pickup at your convenience.\n\nThank you,\nDental Lab Mate Pro`,

  statusUpdate: (dentist: string, caseNumber: string, status: string) =>
    `Dear Dr. ${dentist},\n\nCase #${caseNumber} status has been updated to: ${status}\n\nThank you,\nDental Lab Mate Pro`,

  paymentReminder: (dentist: string, amount: number) =>
    `Dear Dr. ${dentist},\n\nThis is a friendly reminder about your outstanding balance of \u20B9${amount.toLocaleString("en-IN")}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nDental Lab Mate Pro`,

  custom: (dentist: string, message: string) =>
    `Dear Dr. ${dentist},\n\n${message}\n\nThank you,\nDental Lab Mate Pro`,
};
