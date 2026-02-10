export function isMobileOrTablet(): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function buildSmsLink(phone: string, body: string): string {
  const encoded = encodeURIComponent(body);
  return `sms:${phone}&body=${encoded}`;
}

export function buildEmailLink(
  to: string,
  subject: string,
  body: string,
  cc?: string
): string {
  let link = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (cc) link += `&cc=${encodeURIComponent(cc)}`;
  return link;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export const SMS_TEMPLATES = {
  general: (shop: string, customer: string) =>
    `Hi ${customer.split(" ")[0]}, this is ${shop}. Just reaching out — let us know if you need anything!`,

  appointmentReminder: (
    shop: string,
    customer: string,
    date: string,
    time: string,
    service: string
  ) =>
    `Hi ${customer.split(" ")[0]}, this is ${shop}. Reminder: your ${service} appointment is ${date} at ${time}. Reply YES to confirm or call us to reschedule.`,

  estimateApproval: (
    shop: string,
    customer: string,
    roNumber: string,
    total: string,
    approvalUrl: string
  ) =>
    `Hi ${customer.split(" ")[0]}, your estimate from ${shop} is ready. RO #${roNumber} — Total: ${total}. Review and approve here: ${approvalUrl}`,

  vehicleReady: (shop: string, customer: string, vehicle: string) =>
    `Hi ${customer.split(" ")[0]}, your ${vehicle} is ready for pickup at ${shop}! We're open until 5:30 PM today.`,

  paymentRequest: (
    shop: string,
    customer: string,
    total: string,
    paymentUrl: string
  ) =>
    `Hi ${customer.split(" ")[0]}, your invoice from ${shop} is ${total}. Pay securely here: ${paymentUrl}`,

  followUp: (shop: string, customer: string, service: string) =>
    `Hi ${customer.split(" ")[0]}, this is ${shop}. Just checking in — how's everything running after your ${service}? Let us know if you have any questions!`,

  inspectionReport: (
    shop: string,
    customer: string,
    vehicle: string,
    inspectionUrl: string
  ) =>
    `Hi ${customer.split(" ")[0]}, your vehicle inspection report from ${shop} for your ${vehicle} is ready. View it here: ${inspectionUrl}`,
};

export const EMAIL_TEMPLATES = {
  estimateApproval: (
    shop: string,
    customer: string,
    vehicle: string,
    roNumber: string,
    total: string,
    approvalUrl: string,
    shopPhone: string
  ) => ({
    subject: `Estimate from ${shop} — RO #${roNumber}`,
    body:
      `Hi ${customer.split(" ")[0]},\n\n` +
      `Here is your estimate from ${shop}:\n\n` +
      `Vehicle: ${vehicle}\n` +
      `Estimated Total: ${total}\n\n` +
      `Review and approve your estimate here:\n` +
      `${approvalUrl}\n\n` +
      `If you have any questions, reply to this email or call us at ${shopPhone}.\n\n` +
      `Thank you,\n${shop}`,
  }),

  invoice: (
    shop: string,
    customer: string,
    vehicle: string,
    roNumber: string,
    total: string,
    invoiceUrl: string,
    shopPhone: string
  ) => ({
    subject: `Invoice from ${shop} — RO #${roNumber} — ${total}`,
    body:
      `Hi ${customer.split(" ")[0]},\n\n` +
      `Here is your invoice from ${shop}:\n\n` +
      `Vehicle: ${vehicle}\n` +
      `Total: ${total}\n\n` +
      `View your full invoice here:\n` +
      `${invoiceUrl}\n\n` +
      `Thank you for choosing ${shop}!\n\n` +
      `${shop}\n${shopPhone}`,
  }),

  vehicleReady: (
    shop: string,
    customer: string,
    vehicle: string,
    shopPhone: string
  ) => ({
    subject: `Your ${vehicle} is ready — ${shop}`,
    body:
      `Hi ${customer.split(" ")[0]},\n\n` +
      `Great news — your ${vehicle} is ready for pickup!\n\n` +
      `We're open today until 5:30 PM. See you soon!\n\n` +
      `${shop}\n${shopPhone}`,
  }),

  appointmentConfirmation: (
    shop: string,
    customer: string,
    date: string,
    time: string,
    vehicle: string,
    service: string,
    shopPhone: string
  ) => ({
    subject: `Appointment Confirmed — ${shop} — ${date}`,
    body:
      `Hi ${customer.split(" ")[0]},\n\n` +
      `Your appointment at ${shop} is confirmed:\n\n` +
      `Date: ${date}\n` +
      `Time: ${time}\n` +
      `Vehicle: ${vehicle}\n` +
      `Service: ${service}\n\n` +
      `If you need to reschedule, call us at ${shopPhone} or reply to this email.\n\n` +
      `See you then!\n${shop}`,
  }),
};

export interface LogCommunicationParams {
  customerId: number;
  repairOrderId?: number;
  channel: "call" | "sms" | "email" | "link_copy";
  templateUsed?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  bodyPreview?: string;
  invoiceUrl?: string;
}

export async function logCommunication(
  params: LogCommunicationParams,
  token: string
): Promise<void> {
  try {
    await fetch("/api/communication/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Silent fail — logging should never block the user action
  }
}

export function handleCall(
  phone: string,
  customerId: number,
  token: string,
  repairOrderId?: number
): void {
  logCommunication(
    {
      customerId,
      repairOrderId,
      channel: "call",
      recipientPhone: phone,
    },
    token
  );
  window.location.href = `tel:${phone}`;
}

export function handleEmail(
  email: string,
  subject: string,
  body: string,
  customerId: number,
  token: string,
  options?: {
    repairOrderId?: number;
    templateUsed?: string;
    invoiceUrl?: string;
  }
): void {
  logCommunication(
    {
      customerId,
      repairOrderId: options?.repairOrderId,
      channel: "email",
      templateUsed: options?.templateUsed,
      recipientEmail: email,
      subject,
      bodyPreview: body.substring(0, 200),
      invoiceUrl: options?.invoiceUrl,
    },
    token
  );
  window.location.href = buildEmailLink(email, subject, body);
}

export function handleSms(
  phone: string,
  body: string,
  customerId: number,
  token: string,
  options?: {
    repairOrderId?: number;
    templateUsed?: string;
    invoiceUrl?: string;
  }
): {
  isMobile: boolean;
  phone: string;
  body: string;
} {
  logCommunication(
    {
      customerId,
      repairOrderId: options?.repairOrderId,
      channel: "sms",
      templateUsed: options?.templateUsed,
      recipientPhone: phone,
      bodyPreview: body.substring(0, 200),
      invoiceUrl: options?.invoiceUrl,
    },
    token
  );

  if (isMobileOrTablet()) {
    window.location.href = buildSmsLink(phone, body);
    return { isMobile: true, phone, body };
  }

  return { isMobile: false, phone, body };
}
