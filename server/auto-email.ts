import { Resend } from "resend";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getCredentials } from "./email";

interface InvoiceEmailData {
  shop: {
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    email: string | null;
    cardFeePercent: string;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  vehicle: {
    year: number | null;
    make: string | null;
    model: string | null;
    vin: string | null;
  } | null;
  ro: {
    roNumber: string;
    mileageIn: number | null;
    subtotalCash: string;
    subtotalCard: string;
    taxAmount: string;
    totalCash: string;
    totalCard: string;
    feeAmount: string;
    shopSupplyAmountCash: string;
    shopSupplyAmountCard: string;
    discountAmountCash: string;
    discountAmountCard: string;
  };
  lineItems: Array<{
    description: string | null;
    type: string;
    quantity: string;
    unitPriceCash: string;
    unitPriceCard: string;
    totalCash: string;
    totalCard: string;
  }>;
  isPaid: boolean;
  paymentMethod?: string;
  cardBrand?: string;
  cardLast4?: string;
  authCode?: string;
  tipAmount?: number;
  totalCharged?: number;
  paidAt?: string;
}

function fmt(val: string | null | undefined): number {
  return parseFloat(val || "0") || 0;
}

function money(n: number): string {
  return "$" + n.toFixed(2);
}

function generateInvoicePdf(data: InvoiceEmailData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.shop.name, 14, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const shopAddr = [data.shop.address, data.shop.city, data.shop.state, data.shop.zip].filter(Boolean).join(", ");
  if (shopAddr) doc.text(shopAddr, 14, y + 7);
  const shopContact = [data.shop.phone, data.shop.email].filter(Boolean).join(" | ");
  if (shopContact) doc.text(shopContact, 14, y + 12);

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  if (data.isPaid) {
    doc.setTextColor(22, 163, 74);
    doc.text("PAID", pageWidth - 14, y, { align: "right" });
  } else {
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", pageWidth - 14, y, { align: "right" });
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`RO #${data.ro.roNumber}`, pageWidth - 14, y + 8, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, y + 13, { align: "right" });

  y += 25;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150);
  doc.text("BILL TO", 14, y);
  doc.text("VEHICLE", pageWidth / 2 + 5, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
  doc.text(customerName, 14, y);

  if (data.vehicle) {
    const vehicleDesc = [data.vehicle.year, data.vehicle.make, data.vehicle.model].filter(Boolean).join(" ");
    doc.text(vehicleDesc || "N/A", pageWidth / 2 + 5, y);
  }
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  if (data.customer.phone) doc.text(data.customer.phone, 14, y);
  if (data.vehicle?.vin) doc.text(`VIN: ${data.vehicle.vin}`, pageWidth / 2 + 5, y);
  y += 4;
  if (data.customer.email) doc.text(data.customer.email, 14, y);
  if (data.ro.mileageIn) doc.text(`Mileage: ${data.ro.mileageIn.toLocaleString()}`, pageWidth / 2 + 5, y);
  y += 10;

  const tableRows = data.lineItems.map((item) => [
    (item.type || "").toUpperCase(),
    item.description || "",
    parseFloat(item.quantity || "1").toString(),
    money(fmt(item.unitPriceCash)),
    money(fmt(item.unitPriceCard)),
    money(fmt(item.totalCash)),
    money(fmt(item.totalCard)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Type", "Description", "Qty", "Unit (Cash)", "Unit (Card)", "Total (Cash)", "Total (Card)"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold", fontSize: 7 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  const totalsX = pageWidth - 100;

  const addTotalLine = (label: string, value: string, bold = false, color: number[] = [0, 0, 0]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - 14, y, { align: "right" });
    y += 6;
  };

  addTotalLine("Subtotal (Cash)", money(fmt(data.ro.subtotalCash)));
  addTotalLine("Subtotal (Card)", money(fmt(data.ro.subtotalCard)));

  const discCash = fmt(data.ro.discountAmountCash);
  const discCard = fmt(data.ro.discountAmountCard);
  if (discCash > 0 || discCard > 0) {
    addTotalLine("Discount (Cash)", `-${money(discCash)}`, false, [220, 38, 38]);
    addTotalLine("Discount (Card)", `-${money(discCard)}`, false, [220, 38, 38]);
  }

  const supplyCash = fmt(data.ro.shopSupplyAmountCash);
  const supplyCard = fmt(data.ro.shopSupplyAmountCard);
  if (supplyCash > 0 || supplyCard > 0) {
    addTotalLine("Shop Supplies (Cash)", money(supplyCash));
    addTotalLine("Shop Supplies (Card)", money(supplyCard));
  }

  addTotalLine("Tax", money(fmt(data.ro.taxAmount)));

  const feeAmt = fmt(data.ro.feeAmount);
  if (feeAmt > 0) {
    addTotalLine(`Card Fee (${fmt(data.shop.cardFeePercent)}%)`, money(feeAmt), false, [100, 100, 100]);
  }

  y += 2;
  doc.setDrawColor(200);
  doc.line(totalsX, y, pageWidth - 14, y);
  y += 6;

  addTotalLine("Cash Price", money(fmt(data.ro.totalCash)), true, [21, 128, 61]);
  addTotalLine("Card Price", money(fmt(data.ro.totalCard)), true, [29, 78, 216]);

  if (data.isPaid && data.paymentMethod) {
    y += 6;
    doc.setDrawColor(200);
    doc.line(totalsX, y, pageWidth - 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("PAYMENT RECEIVED", totalsX, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.setFontSize(9);
    addTotalLine("Method", data.paymentMethod, false, [80, 80, 80]);
    if (data.cardBrand && data.cardLast4) {
      addTotalLine("Card", `${data.cardBrand} ****${data.cardLast4}`, false, [80, 80, 80]);
    }
    if (data.authCode) addTotalLine("Auth Code", data.authCode, false, [80, 80, 80]);
    if (data.tipAmount && data.tipAmount > 0) addTotalLine("Tip", money(data.tipAmount), false, [80, 80, 80]);
    if (data.totalCharged) addTotalLine("Total Charged", money(data.totalCharged), true, [22, 163, 74]);
    if (data.paidAt) addTotalLine("Paid At", new Date(data.paidAt).toLocaleString(), false, [80, 80, 80]);
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

function buildEmailHtml(data: InvoiceEmailData): string {
  const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
  const vehicleDesc = data.vehicle
    ? [data.vehicle.year, data.vehicle.make, data.vehicle.model].filter(Boolean).join(" ")
    : "N/A";
  const statusColor = data.isPaid ? "#16a34a" : "#2563eb";
  const statusLabel = data.isPaid ? "PAYMENT RECEIVED" : "INVOICE";

  let lineItemsHtml = data.lineItems
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;">${item.description || ""}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;">${parseFloat(item.quantity || "1")}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${money(fmt(item.totalCash))}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">${money(fmt(item.totalCard))}</td>
    </tr>`
    )
    .join("");

  let paymentHtml = "";
  if (data.isPaid && data.paymentMethod) {
    const paymentDetails = [];
    paymentDetails.push(`<strong>Method:</strong> ${data.paymentMethod}`);
    if (data.cardBrand && data.cardLast4) paymentDetails.push(`<strong>Card:</strong> ${data.cardBrand} ****${data.cardLast4}`);
    if (data.authCode) paymentDetails.push(`<strong>Auth Code:</strong> ${data.authCode}`);
    if (data.tipAmount && data.tipAmount > 0) paymentDetails.push(`<strong>Tip:</strong> ${money(data.tipAmount)}`);
    if (data.totalCharged) paymentDetails.push(`<strong>Total Charged:</strong> ${money(data.totalCharged)}`);
    if (data.paidAt) paymentDetails.push(`<strong>Paid:</strong> ${new Date(data.paidAt).toLocaleString()}`);

    paymentHtml = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:20px;">
        <h3 style="margin:0 0 10px;color:#16a34a;font-size:14px;">Payment Details</h3>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">
          ${paymentDetails.join("<br>")}
        </p>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:640px;margin:0 auto;padding:0;background:#f3f4f6;">
  <div style="background:#111827;padding:24px 30px;text-align:center;">
    <h1 style="color:white;margin:0;font-size:22px;">${data.shop.name}</h1>
    <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">
      ${[data.shop.address, data.shop.city, data.shop.state, data.shop.zip].filter(Boolean).join(", ")}
    </p>
  </div>

  <div style="background:white;padding:30px;border:1px solid #e5e7eb;border-top:none;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;background:${statusColor};color:white;padding:6px 20px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:0.5px;">
        ${statusLabel}
      </span>
    </div>

    <table style="width:100%;margin-bottom:20px;">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:10px;">
          <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">Customer</p>
          <p style="margin:0;font-size:14px;font-weight:600;">${customerName}</p>
          ${data.customer.phone ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">${data.customer.phone}</p>` : ""}
          ${data.customer.email ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">${data.customer.email}</p>` : ""}
        </td>
        <td style="vertical-align:top;width:50%;padding-left:10px;">
          <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">Vehicle</p>
          <p style="margin:0;font-size:14px;font-weight:600;">${vehicleDesc}</p>
          ${data.vehicle?.vin ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">VIN: ${data.vehicle.vin}</p>` : ""}
          ${data.ro.mileageIn ? `<p style="margin:2px 0;font-size:13px;color:#6b7280;">Mileage: ${data.ro.mileageIn.toLocaleString()}</p>` : ""}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">RO #${data.ro.roNumber}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="background:#111827;">
          <th style="padding:8px;color:white;font-size:12px;text-align:left;">Description</th>
          <th style="padding:8px;color:white;font-size:12px;text-align:center;">Qty</th>
          <th style="padding:8px;color:white;font-size:12px;text-align:right;">Cash</th>
          <th style="padding:8px;color:white;font-size:12px;text-align:right;">Card</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div style="margin-top:20px;border-top:2px solid #e5e7eb;padding-top:16px;">
      <table style="width:100%;max-width:300px;margin-left:auto;">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal (Cash)</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;">${money(fmt(data.ro.subtotalCash))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal (Card)</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;">${money(fmt(data.ro.subtotalCard))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">Tax</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;">${money(fmt(data.ro.taxAmount))}</td>
        </tr>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;color:#16a34a;">Cash Price</td>
          <td style="padding:8px 0 4px;font-size:15px;font-weight:700;text-align:right;color:#16a34a;">${money(fmt(data.ro.totalCash))}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:15px;font-weight:700;color:#2563eb;">Card Price</td>
          <td style="padding:4px 0;font-size:15px;font-weight:700;text-align:right;color:#2563eb;">${money(fmt(data.ro.totalCard))}</td>
        </tr>
      </table>
    </div>

    ${paymentHtml}
  </div>

  <div style="background:#f9fafb;padding:20px 30px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">
      ${data.shop.name}${data.shop.phone ? ` | ${data.shop.phone}` : ""}${data.shop.email ? ` | ${data.shop.email}` : ""}
    </p>
    <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">
      This email was sent from an automated system. Please contact the shop directly with any questions.
    </p>
  </div>
</body>
</html>`;
}

export async function sendAutoInvoiceEmail(
  data: InvoiceEmailData
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const { apiKey, fromEmail } = await getCredentials();
    const resend = new Resend(apiKey);

    const pdfBuffer = generateInvoicePdf(data);
    const html = buildEmailHtml(data);

    const customerName = `${data.customer.firstName} ${data.customer.lastName}`;
    const vehicleDesc = data.vehicle
      ? [data.vehicle.year, data.vehicle.make, data.vehicle.model].filter(Boolean).join(" ")
      : "";

    const subject = data.isPaid
      ? `Payment Receipt - ${vehicleDesc} - RO #${data.ro.roNumber}`
      : `Invoice - ${vehicleDesc} - RO #${data.ro.roNumber}`;

    const filename = data.isPaid
      ? `Receipt_RO_${data.ro.roNumber}.pdf`
      : `Invoice_RO_${data.ro.roNumber}.pdf`;

    const fromAddress = `${data.shop.name} <service@pcbisv.com>`;

    const { data: result, error } = await resend.emails.send({
      from: fromAddress,
      to: [data.customer.email!],
      subject,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: (error as any).message || "Failed to send email" };
    }

    console.log(`[AutoEmail] Sent ${data.isPaid ? "receipt" : "invoice"} to ${data.customer.email} - ID: ${result?.id}`);
    return { success: true, emailId: result?.id };
  } catch (err: any) {
    console.error("[AutoEmail] Failed:", err?.message || err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}
