import PDFDocument from "pdfkit";
import { Response } from "express";

interface PDFData {
  type: "estimate" | "work_order" | "invoice";
  shop: any;
  customer: any;
  vehicle: any;
  repairOrder: any;
  lineItems: any[];
  payments?: any[];
}

const MARGIN = 50;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatCurrency(val: string | number | null | undefined): string {
  const num = parseFloat(String(val || "0"));
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function typeLabel(type: string): string {
  switch (type) {
    case "estimate": return "ESTIMATE";
    case "work_order": return "WORK ORDER";
    case "invoice": return "INVOICE";
    default: return type.toUpperCase();
  }
}

export async function generateROPdf(res: Response, data: PDFData): Promise<void> {
  const { type, shop, customer, vehicle, repairOrder: ro, lineItems, payments } = data;

  const filename = `${ro.roNumber}-${type}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  });

  doc.pipe(res);

  doc.font("Helvetica-Bold").fontSize(20).text(shop.name || "Auto Shop", MARGIN, MARGIN);
  let headerY = doc.y;

  const shopDetails: string[] = [];
  if (shop.address) shopDetails.push(shop.address);
  const cityStateZip = [shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  if (cityStateZip) shopDetails.push(cityStateZip);
  if (shop.phone) shopDetails.push(shop.phone);
  if (shop.email) shopDetails.push(shop.email);

  if (shopDetails.length) {
    doc.font("Helvetica").fontSize(9).text(shopDetails.join("  |  "), MARGIN, headerY, { width: CONTENT_WIDTH });
  }

  headerY = doc.y + 12;
  doc.moveTo(MARGIN, headerY).lineTo(PAGE_WIDTH - MARGIN, headerY).lineWidth(1).strokeColor("#333333").stroke();

  headerY += 10;
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#333333")
    .text(typeLabel(type), MARGIN, headerY, { width: CONTENT_WIDTH, align: "center" });

  let y = doc.y + 14;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
  y += 10;

  const colLeft = MARGIN;
  const colRight = MARGIN + CONTENT_WIDTH / 2 + 20;
  const colWidth = CONTENT_WIDTH / 2 - 20;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("CUSTOMER", colLeft, y);
  doc.font("Helvetica-Bold").fontSize(10).text("DETAILS", colRight, y);
  y += 14;

  const custName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim();
  doc.font("Helvetica").fontSize(9);
  if (custName) { doc.text(custName, colLeft, y); y = doc.y; }
  if (customer?.address) { doc.text(customer.address, colLeft, y); y = doc.y; }
  const custCity = [customer?.city, customer?.state, customer?.zip].filter(Boolean).join(", ");
  if (custCity) { doc.text(custCity, colLeft, y); y = doc.y; }
  if (customer?.phone) { doc.text(customer.phone, colLeft, y); y = doc.y; }
  if (customer?.email) { doc.text(customer.email, colLeft, y); y = doc.y; }

  let rightY = y - (custName ? 14 : 0) - (customer?.address ? 11 : 0) - (custCity ? 11 : 0) - (customer?.phone ? 11 : 0);
  rightY = y;
  rightY = colLeft === colRight ? y : y - 56;
  if (rightY < y - 56) rightY = y - 56;
  rightY = Math.max(y - 70, MARGIN + 100);

  const detailStartY = y - (doc.y - (y - 14)) + 14;
  let dY = detailStartY;
  dY = y - 56;
  if (dY < MARGIN + 100) dY = MARGIN + 100;

  const infoItems: [string, string][] = [
    ["RO #:", ro.roNumber || ""],
    ["Date:", formatDate(ro.createdAt)],
  ];
  if (type === "invoice" && ro.invoiceNumber) {
    infoItems.push(["Invoice #:", ro.invoiceNumber]);
  }
  if (ro.promisedDate) {
    infoItems.push(["Promised:", formatDate(ro.promisedDate)]);
  }
  infoItems.push(["Status:", (ro.status || "").replace(/_/g, " ").toUpperCase()]);

  let infoY = y - 56;
  if (infoY < MARGIN + 100) infoY = MARGIN + 100;

  for (const [label, value] of infoItems) {
    doc.font("Helvetica-Bold").fontSize(9).text(label, colRight, infoY, { continued: true, width: colWidth });
    doc.font("Helvetica").text(` ${value}`);
    infoY = doc.y;
  }

  y = Math.max(y, infoY) + 10;

  const vehParts: string[] = [];
  if (vehicle?.year) vehParts.push(String(vehicle.year));
  if (vehicle?.make) vehParts.push(vehicle.make);
  if (vehicle?.model) vehParts.push(vehicle.model);
  const vehStr = vehParts.join(" ");

  if (vehStr || vehicle?.vin) {
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("VEHICLE", MARGIN, y);
    y += 14;
    doc.font("Helvetica").fontSize(9);
    if (vehStr) { doc.text(vehStr, MARGIN, y); y = doc.y; }

    const vehDetails: string[] = [];
    if (vehicle?.vin) vehDetails.push(`VIN: ${vehicle.vin}`);
    if (vehicle?.color) vehDetails.push(`Color: ${vehicle.color}`);
    if (vehicle?.licensePlate) vehDetails.push(`Plate: ${vehicle.licensePlate}`);
    if (ro.mileageIn != null) vehDetails.push(`Mileage In: ${ro.mileageIn.toLocaleString()}`);
    if (ro.mileageOut != null) vehDetails.push(`Mileage Out: ${ro.mileageOut.toLocaleString()}`);
    if (vehDetails.length) {
      doc.text(vehDetails.join("  |  "), MARGIN, y, { width: CONTENT_WIDTH });
      y = doc.y;
    }
    y += 6;
  }

  if (ro.customerConcern) {
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("CUSTOMER CONCERN", MARGIN, y);
    y += 14;
    doc.font("Helvetica-Oblique").fontSize(9).text(ro.customerConcern, MARGIN, y, { width: CONTENT_WIDTH });
    y = doc.y + 6;
  }

  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
  y += 8;

  const colWidths = {
    desc: CONTENT_WIDTH * 0.40,
    type: CONTENT_WIDTH * 0.12,
    qty: CONTENT_WIDTH * 0.10,
    price: CONTENT_WIDTH * 0.18,
    total: CONTENT_WIDTH * 0.20,
  };

  const tableX = {
    desc: MARGIN,
    type: MARGIN + colWidths.desc,
    qty: MARGIN + colWidths.desc + colWidths.type,
    price: MARGIN + colWidths.desc + colWidths.type + colWidths.qty,
    total: MARGIN + colWidths.desc + colWidths.type + colWidths.qty + colWidths.price,
  };

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#555555");
  doc.text("DESCRIPTION", tableX.desc, y, { width: colWidths.desc });
  doc.text("TYPE", tableX.type, y, { width: colWidths.type });
  doc.text("QTY", tableX.qty, y, { width: colWidths.qty, align: "right" });
  doc.text("UNIT PRICE", tableX.price, y, { width: colWidths.price, align: "right" });
  doc.text("TOTAL", tableX.total, y, { width: colWidths.total, align: "right" });
  y += 12;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#cccccc").stroke();
  y += 4;

  doc.fillColor("#000000");
  for (const item of lineItems) {
    if (y > PAGE_HEIGHT - 150) {
      doc.addPage();
      y = MARGIN;
    }

    const qty = parseFloat(String(item.quantity || "1"));
    const unitPrice = parseFloat(String(item.unitPriceCash || "0"));
    const total = parseFloat(String(item.totalCash || "0"));

    doc.font("Helvetica").fontSize(8.5);
    const descText = item.description || "";
    doc.text(descText, tableX.desc, y, { width: colWidths.desc - 5 });
    const descHeight = doc.heightOfString(descText, { width: colWidths.desc - 5 });

    doc.text((item.type || "").charAt(0).toUpperCase() + (item.type || "").slice(1), tableX.type, y, { width: colWidths.type });
    doc.text(qty.toString(), tableX.qty, y, { width: colWidths.qty, align: "right" });
    doc.text(formatCurrency(unitPrice), tableX.price, y, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(total), tableX.total, y, { width: colWidths.total, align: "right" });

    y += Math.max(descHeight, 12) + 2;

    if (item.partNumber && item.type === "parts") {
      doc.font("Helvetica").fontSize(7).fillColor("#777777")
        .text(`Part #: ${item.partNumber}`, tableX.desc + 10, y);
      doc.fillColor("#000000");
      y = doc.y + 2;
    }
  }

  y += 4;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#cccccc").stroke();
  y += 10;

  if (y > PAGE_HEIGHT - 120) {
    doc.addPage();
    y = MARGIN;
  }

  const totalsX = tableX.price;
  const totalsWidth = colWidths.price + colWidths.total;

  const subtotal = parseFloat(String(ro.subtotalCash || "0"));
  const taxParts = parseFloat(String(ro.taxPartsAmount || "0"));
  const taxLabor = parseFloat(String(ro.taxLaborAmount || "0"));
  const totalTax = parseFloat(String(ro.taxAmount || "0"));
  const grandTotal = parseFloat(String(ro.totalCash || "0"));

  doc.font("Helvetica").fontSize(9);
  doc.text("Subtotal:", totalsX, y, { width: colWidths.price, align: "right" });
  doc.text(formatCurrency(subtotal), tableX.total, y, { width: colWidths.total, align: "right" });
  y += 14;

  if (taxParts > 0) {
    doc.text("Parts Tax:", totalsX, y, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(taxParts), tableX.total, y, { width: colWidths.total, align: "right" });
    y += 14;
  }

  if (taxLabor > 0) {
    doc.text("Labor Tax:", totalsX, y, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(taxLabor), tableX.total, y, { width: colWidths.total, align: "right" });
    y += 14;
  }

  if (totalTax > 0) {
    doc.text("Total Tax:", totalsX, y, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(totalTax), tableX.total, y, { width: colWidths.total, align: "right" });
    y += 14;
  }

  doc.moveTo(totalsX, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(1).strokeColor("#333333").stroke();
  y += 6;

  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Total:", totalsX, y, { width: colWidths.price, align: "right" });
  doc.text(formatCurrency(grandTotal), tableX.total, y, { width: colWidths.total, align: "right" });
  y += 20;

  if (type === "invoice" && payments && payments.length > 0) {
    doc.font("Helvetica-Bold").fontSize(10).text("PAYMENTS", MARGIN, y);
    y += 14;

    let totalPaid = 0;
    for (const pmt of payments) {
      if (pmt.status === "completed" || pmt.status === "captured") {
        const pmtAmt = parseFloat(String(pmt.amount || "0"));
        totalPaid += pmtAmt;
        const pmtMethod = (pmt.method || "").toUpperCase();
        const pmtDate = formatDate(pmt.processedAt || pmt.createdAt);
        const pmtInfo = pmt.cardLast4 ? `${pmtMethod} ****${pmt.cardLast4}` : pmtMethod;

        doc.font("Helvetica").fontSize(9);
        doc.text(`${pmtDate} - ${pmtInfo}`, MARGIN, y, { width: CONTENT_WIDTH - colWidths.total });
        doc.text(formatCurrency(pmtAmt), tableX.total, y, { width: colWidths.total, align: "right" });
        y += 14;
      }
    }

    const balanceDue = grandTotal - totalPaid;
    doc.moveTo(totalsX, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(1).strokeColor("#333333").stroke();
    y += 6;
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Balance Due:", totalsX, y, { width: colWidths.price, align: "right" });
    doc.text(formatCurrency(balanceDue), tableX.total, y, { width: colWidths.total, align: "right" });
    y += 20;
  }

  const footerY = PAGE_HEIGHT - MARGIN - 30;
  if (shop.invoiceFooter) {
    doc.font("Helvetica").fontSize(8).fillColor("#777777")
      .text(shop.invoiceFooter, MARGIN, footerY, { width: CONTENT_WIDTH, align: "center" });
  }

  doc.font("Helvetica").fontSize(7).fillColor("#aaaaaa")
    .text(`Generated on ${new Date().toLocaleDateString("en-US")}`, MARGIN, PAGE_HEIGHT - MARGIN - 12, {
      width: CONTENT_WIDTH, align: "center",
    });

  doc.end();
}
