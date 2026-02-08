# PCB Auto — Resend Email Integration (Invoice & Receipt)

**For:** Replit AI / Developer implementing email on PCB Auto
**Date:** February 8, 2026
**Prerequisite:** Resend is already configured and verified for PCBISV.com. DNS records (DKIM, SPF, MX) are set up in GoDaddy. The same Resend API key used by the Field Sales Suite works here.

---

## 1. Environment Variable

The Resend API key must be stored as a Replit Secret (never in code):

```
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

This is the SAME key already in use on the Field Sales Suite project. Copy it from that project's Secrets into the PCB Auto project's Secrets.

**To find it:** Open the Field Sales Suite Repl → Tools → Secrets → copy the value of `RESEND_API_KEY`
**To add it:** Open the PCB Auto Repl → Tools → Secrets → add `RESEND_API_KEY` with the copied value

---

## 2. Install Dependencies

```bash
npm install resend
npm install puppeteer-core        # For PDF generation (lightweight)
# OR if puppeteer-core doesn't work on Replit:
npm install html-pdf-node         # Alternative PDF generator
# OR the simplest option:
npm install jspdf jspdf-autotable # Client-side PDF (no headless browser needed)
```

**Recommended approach for Replit:** Use `jspdf` + `jspdf-autotable` on the server side (they work in Node.js without a headless browser, which Replit can struggle with). If the project already uses Puppeteer, use that instead.

---

## 3. Backend: Email Service

Create this file:

```typescript
// server/services/emailService.ts (or .js)

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = 'service@pcbisv.com';  // Must match verified Resend domain
const REPLY_TO = 'support@pcbisv.com';      // Optional, can be shop-specific later

interface SendInvoiceEmailParams {
  to: string;                    // Customer email
  customerName: string;
  roNumber: string;
  vehicleDescription: string;    // e.g. "2019 Ford F-150 XLT"
  totalAmount: string;           // e.g. "$613.23"
  paymentMethod?: string;        // e.g. "Visa ····4821" or "Cash"
  isPaid: boolean;
  shopName: string;
  shopPhone: string;
  invoiceHtml: string;           // Full HTML invoice for email body
  pdfBuffer?: Buffer;            // PDF attachment (optional)
}

export async function sendInvoiceEmail(params: SendInvoiceEmailParams) {
  const {
    to, customerName, roNumber, vehicleDescription,
    totalAmount, paymentMethod, isPaid, shopName, shopPhone,
    invoiceHtml, pdfBuffer
  } = params;

  const subject = isPaid
    ? `Payment Receipt — ${vehicleDescription} — RO #${roNumber}`
    : `Invoice — ${vehicleDescription} — RO #${roNumber}`;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: isPaid
        ? `Receipt_RO_${roNumber}.pdf`
        : `Invoice_RO_${roNumber}.pdf`,
      content: pdfBuffer,
    });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${shopName} <${FROM_ADDRESS}>`,
      to: [to],
      replyTo: REPLY_TO,
      subject,
      html: invoiceHtml,
      attachments,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`Email sent to ${to} — Resend ID: ${data?.id}`);
    return { success: true, emailId: data?.id };

  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
}
```

---

## 4. Backend: PDF Invoice Generator

```typescript
// server/services/invoicePdfService.ts

// Option A: Using jspdf (no headless browser — works on Replit)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  shop: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    website: string;
  };
  customer: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    vin: string;
    mileage: string;
    license: string;
  };
  roNumber: string;
  date: string;
  lines: Array<{
    type: string;       // 'labor' | 'part' | 'fee'
    description: string;
    partNumber?: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  surchargeRate: number;     // e.g. 3.49
  surchargeAmount: number;
  cashTotal: number;
  cardTotal: number;
  // Payment info (if paid)
  isPaid: boolean;
  paymentMethod?: string;    // 'cash' | 'card'
  cardBrand?: string;
  cardLast4?: string;
  authCode?: string;
  tipAmount?: number;
  totalCharged?: number;
  paidAt?: string;
}

export function generateInvoicePdf(data: InvoiceData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ---- SHOP HEADER ----
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.shop.name, 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${data.shop.address} · ${data.shop.city}`, 14, y + 7);
  doc.text(`${data.shop.phone} · ${data.shop.email}`, 14, y + 12);

  // Invoice title (right side)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.isPaid ? 22 : 0, data.isPaid ? 163 : 0, data.isPaid ? 74 : 0);
  doc.text(data.isPaid ? 'PAID' : 'INVOICE', pageWidth - 14, y, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`RO #${data.roNumber}`, pageWidth - 14, y + 8, { align: 'right' });
  doc.text(`Date: ${data.date}`, pageWidth - 14, y + 13, { align: 'right' });

  y += 25;

  // ---- DIVIDER ----
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // ---- CUSTOMER / VEHICLE ----
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150);
  doc.text('BILL TO', 14, y);
  doc.text('VEHICLE', pageWidth / 2 + 5, y);
  y += 5;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(data.customer.name, 14, y);
  doc.text(`${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`, pageWidth / 2 + 5, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(data.customer.address, 14, y);
  doc.text(`VIN: ${data.vehicle.vin}`, pageWidth / 2 + 5, y);
  y += 4;
  doc.text(data.customer.phone, 14, y);
  doc.text(`Mileage: ${data.vehicle.mileage} · Plate: ${data.vehicle.license}`, pageWidth / 2 + 5, y);
  y += 4;
  doc.text(data.customer.email, 14, y);
  y += 10;

  // ---- LINE ITEMS TABLE ----
  const tableRows = data.lines.map(line => [
    line.type.toUpperCase(),
    line.description + (line.partNumber ? `\n#${line.partNumber}` : ''),
    line.qty.toString(),
    `$${line.unitPrice.toFixed(2)}`,
    `$${line.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Type', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', fontSize: 7 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right', font: 'courier' },
      4: { cellWidth: 28, halign: 'right', font: 'courier', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ---- TOTALS ----
  const totalsX = pageWidth - 80;

  const addTotalLine = (label: string, value: string, bold = false, color = [0, 0, 0]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 10);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - 14, y, { align: 'right' });
    y += 6;
  };

  addTotalLine('Subtotal', `$${data.subtotal.toFixed(2)}`);
  addTotalLine(`Tax (${(data.taxRate * 100).toFixed(0)}%)`, `$${data.taxAmount.toFixed(2)}`, false, [100, 100, 100]);

  y += 2;
  doc.setDrawColor(200);
  doc.line(totalsX, y, pageWidth - 14, y);
  y += 6;

  // Dual pricing
  addTotalLine('Cash Price', `$${data.cashTotal.toFixed(2)}`, true, [21, 128, 61]);
  addTotalLine(
    `Card Price (incl. ${data.surchargeRate}% surcharge)`,
    `$${data.cardTotal.toFixed(2)}`,
    true,
    [29, 78, 216]
  );

  // ---- PAYMENT INFO (if paid) ----
  if (data.isPaid) {
    y += 4;
    doc.setDrawColor(200);
    doc.line(totalsX - 40, y, pageWidth - 14, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(150);
    doc.text('PAYMENT DETAILS', 14, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    const method = data.paymentMethod === 'card'
      ? `${data.cardBrand} ····${data.cardLast4}`
      : 'Cash';
    doc.text(`Method: ${method}`, 14, y);
    y += 5;

    if (data.paymentMethod === 'card' && data.authCode) {
      doc.text(`Auth Code: ${data.authCode}`, 14, y);
      y += 5;
    }

    if (data.tipAmount && data.tipAmount > 0) {
      doc.text(`Tip: $${data.tipAmount.toFixed(2)}`, 14, y);
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const charged = data.totalCharged || (data.paymentMethod === 'card' ? data.cardTotal : data.cashTotal);
    doc.text(`Total Charged: $${charged.toFixed(2)}`, 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Paid: ${data.paidAt}`, 14, y);
    y += 5;
  }

  // ---- FOOTER ----
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150);
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(7);
  doc.text(`${data.shop.website} · Powered by PCB Auto`, pageWidth / 2, y, { align: 'center' });

  // Return as Buffer
  return Buffer.from(doc.output('arraybuffer'));
}
```

---

## 5. Backend: API Route

```typescript
// server/routes/email.ts (or add to existing routes file)

import express from 'express';
import { sendInvoiceEmail } from '../services/emailService';
import { generateInvoicePdf } from '../services/invoicePdfService';

const router = express.Router();

// POST /api/pcbauto/v1/email/invoice
router.post('/invoice', async (req, res) => {
  try {
    const {
      to,                // customer email
      customerName,
      roNumber,
      shopName,
      shopPhone,
      vehicleDescription,
      invoiceData,       // full invoice data object for PDF generation
      sendPdf = true,    // whether to attach PDF (default: yes)
    } = req.body;

    // Validate required fields
    if (!to || !invoiceData) {
      return res.status(400).json({ error: 'Missing required fields: to, invoiceData' });
    }

    // Generate PDF
    let pdfBuffer: Buffer | undefined;
    if (sendPdf) {
      pdfBuffer = generateInvoicePdf(invoiceData);
    }

    // Build HTML email body
    const emailHtml = buildInvoiceEmailHtml(invoiceData);

    // Send via Resend
    const result = await sendInvoiceEmail({
      to,
      customerName: customerName || invoiceData.customer.name,
      roNumber: roNumber || invoiceData.roNumber,
      vehicleDescription: vehicleDescription || `${invoiceData.vehicle.year} ${invoiceData.vehicle.make} ${invoiceData.vehicle.model}`,
      totalAmount: invoiceData.isPaid
        ? `$${(invoiceData.totalCharged || invoiceData.cashTotal).toFixed(2)}`
        : `$${invoiceData.cashTotal.toFixed(2)} cash / $${invoiceData.cardTotal.toFixed(2)} card`,
      paymentMethod: invoiceData.paymentMethod === 'card'
        ? `${invoiceData.cardBrand} ····${invoiceData.cardLast4}`
        : invoiceData.paymentMethod === 'cash' ? 'Cash' : undefined,
      isPaid: invoiceData.isPaid,
      shopName: shopName || invoiceData.shop.name,
      shopPhone: shopPhone || invoiceData.shop.phone,
      invoiceHtml: emailHtml,
      pdfBuffer,
    });

    if (result.success) {
      // Log the email event on the RO timeline
      // await logRoEvent(invoiceData.roNumber, 'email.sent', { to, type: invoiceData.isPaid ? 'receipt' : 'invoice', emailId: result.emailId });

      return res.json({
        success: true,
        emailId: result.emailId,
        message: `${invoiceData.isPaid ? 'Receipt' : 'Invoice'} sent to ${to}`,
      });
    } else {
      return res.status(500).json({ success: false, error: result.error });
    }

  } catch (err) {
    console.error('Invoice email error:', err);
    return res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

// POST /api/pcbauto/v1/email/inspection
// (Future: send DVI inspection report to customer)

export default router;


// ============================================
// HTML Email Template Builder
// ============================================
function buildInvoiceEmailHtml(data: any): string {
  const isPaid = data.isPaid;
  const lines = data.lines || [];

  const lineRowsHtml = lines.map((line: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
        ${line.description}
        ${line.partNumber ? `<br><span style="color:#999;font-size:12px;">#${line.partNumber}</span>` : ''}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">${line.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-size:14px;">$${line.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:#111827;color:white;padding:24px 28px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:22px;font-weight:800;">${data.shop.name}</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.7;">${data.shop.address} · ${data.shop.city} · ${data.shop.phone}</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:28px;border-radius:0 0 12px 12px;">

      <!-- Status badge -->
      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:8px 24px;border-radius:20px;font-size:14px;font-weight:700;
          background:${isPaid ? '#dcfce7' : '#dbeafe'};color:${isPaid ? '#15803d' : '#1d4ed8'};">
          ${isPaid ? '✓ PAYMENT RECEIVED' : 'INVOICE'}
        </span>
      </div>

      <!-- Customer & vehicle -->
      <table style="width:100%;margin-bottom:20px;font-size:14px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;color:#666;">Customer:</td>
          <td style="padding:4px 0;font-weight:600;">${data.customer.name}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#666;">Vehicle:</td>
          <td style="padding:4px 0;font-weight:600;">${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#666;">RO #:</td>
          <td style="padding:4px 0;font-weight:600;">${data.roNumber}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#666;">Mileage:</td>
          <td style="padding:4px 0;">${data.vehicle.mileage}</td>
        </tr>
      </table>

      <!-- Line items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;" cellpadding="0" cellspacing="0">
        <tr style="background:#f8f9fa;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:0.5px;">Description</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#666;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#666;">Total</th>
        </tr>
        ${lineRowsHtml}
      </table>

      <!-- Totals -->
      <table style="width:100%;font-size:14px;margin-bottom:20px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 12px;text-align:right;color:#666;">Subtotal:</td>
          <td style="padding:4px 12px;text-align:right;font-family:monospace;width:100px;">$${data.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 12px;text-align:right;color:#666;">Tax (${(data.taxRate * 100).toFixed(0)}%):</td>
          <td style="padding:4px 12px;text-align:right;font-family:monospace;">$${data.taxAmount.toFixed(2)}</td>
        </tr>
      </table>

      <!-- Dual pricing -->
      <table style="width:100%;margin-bottom:20px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding:8px;">
            <div style="background:#f0fdf4;border:2px solid ${isPaid && data.paymentMethod === 'cash' ? '#16a34a' : '#bbf7d0'};border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;">Cash Price</div>
              <div style="font-size:26px;font-weight:800;color:#15803d;font-family:monospace;margin-top:4px;">$${data.cashTotal.toFixed(2)}</div>
              ${isPaid && data.paymentMethod === 'cash' ? '<div style="font-size:12px;font-weight:700;color:#16a34a;margin-top:6px;">✓ PAID</div>' : ''}
            </div>
          </td>
          <td style="width:50%;padding:8px;">
            <div style="background:#eff6ff;border:2px solid ${isPaid && data.paymentMethod === 'card' ? '#2563eb' : '#93c5fd'};border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;">Card Price</div>
              <div style="font-size:26px;font-weight:800;color:#1d4ed8;font-family:monospace;margin-top:4px;">$${data.cardTotal.toFixed(2)}</div>
              <div style="font-size:11px;color:#666;margin-top:4px;">incl. ${data.surchargeRate}% surcharge ($${data.surchargeAmount.toFixed(2)})</div>
              ${isPaid && data.paymentMethod === 'card' ? '<div style="font-size:12px;font-weight:700;color:#2563eb;margin-top:6px;">✓ PAID</div>' : ''}
            </div>
          </td>
        </tr>
      </table>

      ${isPaid ? `
      <!-- Payment confirmation -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;">
        <div style="font-weight:700;margin-bottom:8px;">Payment Details</div>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:2px 12px 2px 0;color:#666;">Method:</td><td style="font-weight:600;">${data.paymentMethod === 'card' ? `${data.cardBrand} ····${data.cardLast4}` : 'Cash'}</td></tr>
          ${data.paymentMethod === 'card' && data.authCode ? `<tr><td style="padding:2px 12px 2px 0;color:#666;">Auth Code:</td><td style="font-weight:600;font-family:monospace;">${data.authCode}</td></tr>` : ''}
          ${data.tipAmount > 0 ? `<tr><td style="padding:2px 12px 2px 0;color:#666;">Tip:</td><td style="font-weight:600;font-family:monospace;">$${data.tipAmount.toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:2px 12px 2px 0;color:#666;">Total Charged:</td><td style="font-weight:800;font-family:monospace;font-size:16px;">$${(data.totalCharged || data.cashTotal).toFixed(2)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0;color:#666;">Date:</td><td>${data.paidAt}</td></tr>
        </table>
      </div>
      ` : ''}

      <p style="font-size:13px;color:#666;margin-top:8px;">A PDF copy of this ${isPaid ? 'receipt' : 'invoice'} is attached to this email for your records.</p>

      <!-- Footer -->
      <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <p style="font-size:14px;color:#666;">Thank you for your business!</p>
        <p style="font-size:12px;color:#ccc;margin-top:8px;">
          ${data.shop.name} · ${data.shop.phone}<br>
          Powered by <a href="https://pcbisv.com" style="color:#60a5fa;text-decoration:none;">PCB Auto</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
```

---

## 6. Frontend: Wire the Email Button

Replace the simulated email handler in the payment/invoice UI with a real API call:

```typescript
// In the React component (invoice/receipt page)

const handleEmailInvoice = async () => {
  setEmailSending(true);

  try {
    const response = await fetch('/api/pcbauto/v1/email/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customer.email,
        customerName: customer.name,
        roNumber: RO_NUMBER,
        shopName: shop.name,
        shopPhone: shop.phone,
        vehicleDescription: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        sendPdf: true,
        invoiceData: {
          shop,
          customer,
          vehicle,
          roNumber: RO_NUMBER,
          date: new Date().toLocaleDateString(),
          lines: SERVICE_LINES.map(l => ({
            type: l.type,
            description: l.desc,
            partNumber: l.partNum || null,
            qty: l.qty,
            unitPrice: l.price,
            total: l.price * l.qty,
          })),
          subtotal,
          taxRate: shop.taxRate,
          taxAmount: tax,
          surchargeRate,
          surchargeAmount,
          cashTotal,
          cardTotal,
          // Payment details (if paid)
          isPaid: !!paidAt,
          paymentMethod,
          cardBrand,
          cardLast4,
          authCode,
          tipAmount,
          totalCharged: totalWithTip,
          paidAt: paidAt ? paidAt.toLocaleString() : null,
        },
      }),
    });

    const result = await response.json();

    if (result.success) {
      setEmailSent(true);
      showNotification(`Invoice emailed to ${customer.email} ✅`);
    } else {
      showNotification(`Email failed: ${result.error}`, 'error');
    }
  } catch (err) {
    showNotification('Email failed — check connection', 'error');
  } finally {
    setEmailSending(false);
  }
};
```

---

## 7. Route Registration

Add the email route to your Express app:

```typescript
// server/index.ts or server/app.ts

import emailRoutes from './routes/email';

// ... existing middleware ...

app.use('/api/pcbauto/v1/email', emailRoutes);
```

---

## 8. What the Customer Receives

### Email (in their inbox):

**From:** Demo Auto Repair <service@pcbisv.com>
**Subject:** Payment Receipt — 2019 Ford F-150 XLT — RO #1001

- Professional HTML email with shop branding
- Dual pricing box showing cash vs card price
- Itemized line items (labor, parts with part numbers, fees)
- Payment confirmation (method, auth code, amount, timestamp)
- "Thank you for your business" footer

### PDF Attachment:

**Filename:** `Receipt_RO_1001.pdf`

- Full-page professional invoice/receipt
- Shop header with contact info
- Customer and vehicle details
- Line items table (type, description, qty, unit price, total)
- Subtotal, tax, dual pricing (cash price / card price)
- Payment details block (if paid)
- Footer with shop website and "Powered by PCB Auto"

---

## 9. Testing Checklist

Before sending to real customers, test with your own email:

```
□ RESEND_API_KEY is set in Replit Secrets
□ pcbisv.com domain is verified in Resend dashboard (should already be ✓)
□ Send test invoice (unpaid) → check email arrives with PDF
□ Send test receipt (paid, cash) → check dual pricing shows cash highlighted
□ Send test receipt (paid, card) → check surcharge line and auth code
□ Send test with tip → check tip and total charged on PDF
□ Open PDF on phone → readable, properly formatted
□ Print PDF → clean layout, no cut-off content
□ Check spam folder → emails should NOT land in spam (DKIM/SPF verified)
```

---

## 10. Future: More Email Types

The same `emailService.ts` handles all PCB Auto emails. Future additions:

| Email Type | Trigger | Template |
|---|---|---|
| Invoice (unpaid) | Advisor sends estimate | Dual pricing, "approve online" button |
| Receipt (paid) | Payment processed | Payment details, PDF attached |
| DVI Inspection Report | Tech completes inspection | Green/yellow/red summary, photo links |
| Appointment Reminder | 24hrs before appointment | Date/time, shop address, "confirm" button |
| Declined Service Follow-up | 14/30/60 day timer | "We noticed X still needs attention" |
| Service Complete | RO marked complete | "Your vehicle is ready for pickup" |

All use the same Resend API key, same verified domain, same `sendEmail()` function with different HTML templates and optional PDF attachments.
