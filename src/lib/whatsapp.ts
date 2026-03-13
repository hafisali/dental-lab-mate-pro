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

// Generate WhatsApp URL
export function getWhatsAppUrl(phone: string, message: string): string {
  const number = formatWhatsAppNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
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
