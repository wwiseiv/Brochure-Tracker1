import PDFDocument from "pdfkit";
import { Response } from "express";
import sharp from "sharp";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";

interface PDFData {
  type: "estimate" | "work_order" | "invoice";
  shop: any;
  customer: any;
  vehicle: any;
  repairOrder: any;
  lineItems: any[];
  payments?: any[];
}

async function fetchLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  try {
    if (!logoUrl || !logoUrl.startsWith("/objects/")) return null;
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!privateDir) return null;
    const entityId = logoUrl.replace("/objects/", "");
    let entityDir = privateDir.endsWith("/") ? privateDir : privateDir + "/";
    const fullPath = `${entityDir}${entityId}`;
    const pathWithoutSlash = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
    const [bucketName, ...rest] = pathWithoutSlash.split("/");
    const objectName = rest.join("/");
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    const pngBuffer = await sharp(buffer).png().toBuffer();
    return pngBuffer;
  } catch (err) {
    console.error("[PDF] Failed to fetch logo:", err);
    return null;
  }
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

  const logoBuffer = shop.logoUrl ? await fetchLogoBuffer(shop.logoUrl) : null;

  let textStartX = MARGIN;
  const LOGO_MAX_HEIGHT = 60;
  const LOGO_MAX_WIDTH = 120;

  if (logoBuffer) {
    try {
      const drawW = LOGO_MAX_WIDTH;
      const drawH = LOGO_MAX_HEIGHT;
      const logoY = MARGIN + (LOGO_MAX_HEIGHT - drawH) / 2;
      doc.image(logoBuffer, MARGIN, logoY, { fit: [LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT] });
      textStartX = MARGIN + drawW + 12;
    } catch (err) {
      console.error("[PDF] Failed to render logo:", err);
    }
  }

  const textAreaWidth = PAGE_WIDTH - MARGIN - textStartX;
  doc.font("Helvetica-Bold").fontSize(20).text(shop.name || "Auto Shop", textStartX, MARGIN, { width: textAreaWidth });
  let headerY = doc.y;

  const shopDetails: string[] = [];
  if (shop.address) shopDetails.push(shop.address);
  const cityStateZip = [shop.city, shop.state, shop.zip].filter(Boolean).join(", ");
  if (cityStateZip) shopDetails.push(cityStateZip);
  if (shop.phone) shopDetails.push(shop.phone);
  if (shop.email) shopDetails.push(shop.email);

  if (shopDetails.length) {
    doc.font("Helvetica").fontSize(9).text(shopDetails.join("  |  "), textStartX, headerY, { width: textAreaWidth });
  }

  headerY = Math.max(doc.y, MARGIN + LOGO_MAX_HEIGHT) + 12;
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

  const grandTotalCard = parseFloat(String(ro.totalCard || "0"));

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#158040");
  doc.text("Cash Price:", totalsX, y, { width: colWidths.price, align: "right" });
  doc.text(formatCurrency(grandTotal), tableX.total, y, { width: colWidths.total, align: "right" });
  y += 14;

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#1d4ed8");
  doc.text("Card Price:", totalsX, y, { width: colWidths.price, align: "right" });
  doc.text(formatCurrency(grandTotalCard), tableX.total, y, { width: colWidths.total, align: "right" });
  doc.fillColor("#000000");
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

    const balanceDue = grandTotalCard - totalPaid;
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

interface DviPdfData {
  shop: any;
  customer: any;
  vehicle: any;
  repairOrder: any;
  inspection: any;
  items: any[];
  technician: any;
}

const CONDITION_COLORS: Record<string, string> = {
  good: "#22c55e",
  fair: "#eab308",
  poor: "#ef4444",
  not_inspected: "#9ca3af",
};

export async function generateDviPdf(res: Response, data: DviPdfData): Promise<void> {
  const { shop, customer, vehicle, repairOrder: ro, inspection, items, technician } = data;

  const filename = `DVI-${ro?.roNumber || inspection.id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  });

  doc.pipe(res);

  const logoBuffer = shop?.logoUrl ? await fetchLogoBuffer(shop.logoUrl) : null;

  let textStartX = MARGIN;
  const LOGO_MAX_HEIGHT = 60;
  const LOGO_MAX_WIDTH = 120;

  if (logoBuffer) {
    try {
      const drawW = LOGO_MAX_WIDTH;
      const drawH = LOGO_MAX_HEIGHT;
      const logoY = MARGIN + (LOGO_MAX_HEIGHT - drawH) / 2;
      doc.image(logoBuffer, MARGIN, logoY, { fit: [LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT] });
      textStartX = MARGIN + drawW + 12;
    } catch (err) {
      console.error("[PDF] Failed to render logo:", err);
    }
  }

  const textAreaWidth = PAGE_WIDTH - MARGIN - textStartX;
  doc.font("Helvetica-Bold").fontSize(20).text(shop?.name || "Auto Shop", textStartX, MARGIN, { width: textAreaWidth });
  let headerY = doc.y;

  const shopDetails: string[] = [];
  if (shop?.address) shopDetails.push(shop.address);
  const cityStateZip = [shop?.city, shop?.state, shop?.zip].filter(Boolean).join(", ");
  if (cityStateZip) shopDetails.push(cityStateZip);
  if (shop?.phone) shopDetails.push(shop.phone);
  if (shop?.email) shopDetails.push(shop.email);

  if (shopDetails.length) {
    doc.font("Helvetica").fontSize(9).text(shopDetails.join("  |  "), textStartX, headerY, { width: textAreaWidth });
  }

  headerY = Math.max(doc.y, MARGIN + LOGO_MAX_HEIGHT) + 12;
  doc.moveTo(MARGIN, headerY).lineTo(PAGE_WIDTH - MARGIN, headerY).lineWidth(1).strokeColor("#333333").stroke();

  headerY += 10;
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#333333")
    .text("DIGITAL VEHICLE INSPECTION REPORT", MARGIN, headerY, { width: CONTENT_WIDTH, align: "center" });

  let y = doc.y + 14;
  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
  y += 10;

  const colLeft = MARGIN;
  const colRight = MARGIN + CONTENT_WIDTH / 2 + 20;
  const colWidth = CONTENT_WIDTH / 2 - 20;

  doc.font("Helvetica").fontSize(9).fillColor("#000000");

  const vehParts: string[] = [];
  if (vehicle?.year) vehParts.push(String(vehicle.year));
  if (vehicle?.make) vehParts.push(vehicle.make);
  if (vehicle?.model) vehParts.push(vehicle.model);
  const vehStr = vehParts.join(" ");

  if (vehStr) {
    doc.font("Helvetica-Bold").fontSize(9).text("Vehicle: ", colLeft, y, { continued: true });
    doc.font("Helvetica").text(vehStr);
    y = doc.y;
  }

  const vehDetails: string[] = [];
  if (vehicle?.vin) vehDetails.push(`VIN: ${vehicle.vin}`);
  if (vehicle?.color) vehDetails.push(`Color: ${vehicle.color}`);
  if (vehicle?.licensePlate) vehDetails.push(`Plate: ${vehicle.licensePlate}`);
  if (inspection.vehicleMileage) vehDetails.push(`Mileage: ${Number(inspection.vehicleMileage).toLocaleString()}`);
  if (vehDetails.length) {
    doc.font("Helvetica").fontSize(8).text(vehDetails.join("  |  "), colLeft, y, { width: CONTENT_WIDTH });
    y = doc.y;
  }

  y += 4;

  if (customer?.firstName) {
    doc.font("Helvetica-Bold").fontSize(9).text("Customer: ", colLeft, y, { continued: true });
    doc.font("Helvetica").text(customer.firstName);
    y = doc.y;
  }

  if (ro?.roNumber) {
    doc.font("Helvetica-Bold").fontSize(9).text("RO #: ", colLeft, y, { continued: true });
    doc.font("Helvetica").text(ro.roNumber);
    y = doc.y;
  }

  doc.font("Helvetica-Bold").fontSize(9).text("Inspection Date: ", colLeft, y, { continued: true });
  doc.font("Helvetica").text(formatDate(inspection.createdAt));
  y = doc.y;

  if (technician) {
    doc.font("Helvetica-Bold").fontSize(9).text("Technician: ", colLeft, y, { continued: true });
    doc.font("Helvetica").text(`${technician.firstName || ""} ${technician.lastName || ""}`.trim());
    y = doc.y;
  }

  y += 10;

  const goodCount = items.filter(i => i.condition === "good").length;
  const fairCount = items.filter(i => i.condition === "fair").length;
  const poorCount = items.filter(i => i.condition === "poor").length;

  doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
  y += 8;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("OVERALL SUMMARY", MARGIN, y);
  y += 16;

  const summaryBoxWidth = CONTENT_WIDTH / 3;

  doc.save();
  doc.roundedRect(MARGIN, y, summaryBoxWidth - 8, 30, 4).fillColor("#f0fdf4").fill();
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#22c55e").text(String(goodCount), MARGIN, y + 4, { width: summaryBoxWidth - 8, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#166534").text("Good", MARGIN, y + 20, { width: summaryBoxWidth - 8, align: "center" });
  doc.restore();

  doc.save();
  doc.roundedRect(MARGIN + summaryBoxWidth, y, summaryBoxWidth - 8, 30, 4).fillColor("#fefce8").fill();
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#eab308").text(String(fairCount), MARGIN + summaryBoxWidth, y + 4, { width: summaryBoxWidth - 8, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#854d0e").text("Fair", MARGIN + summaryBoxWidth, y + 20, { width: summaryBoxWidth - 8, align: "center" });
  doc.restore();

  doc.save();
  doc.roundedRect(MARGIN + summaryBoxWidth * 2, y, summaryBoxWidth - 8, 30, 4).fillColor("#fef2f2").fill();
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#ef4444").text(String(poorCount), MARGIN + summaryBoxWidth * 2, y + 4, { width: summaryBoxWidth - 8, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#991b1b").text("Poor", MARGIN + summaryBoxWidth * 2, y + 20, { width: summaryBoxWidth - 8, align: "center" });
  doc.restore();

  y += 44;

  const categories = new Map<string, typeof items>();
  for (const item of items) {
    const cat = item.category || "General";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  }

  for (const [categoryName, categoryItems] of Array.from(categories)) {
    if (y > PAGE_HEIGHT - 120) {
      doc.addPage();
      y = MARGIN;
    }

    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#cccccc").stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333").text(categoryName.toUpperCase(), MARGIN, y);
    y += 16;

    for (const item of categoryItems) {
      if (y > PAGE_HEIGHT - 80) {
        doc.addPage();
        y = MARGIN;
      }

      const color = CONDITION_COLORS[item.condition] || CONDITION_COLORS.not_inspected;
      doc.save();
      doc.circle(MARGIN + 6, y + 4, 4).fillColor(color).fill();
      doc.restore();

      doc.font("Helvetica").fontSize(9).fillColor("#000000")
        .text(item.name || item.itemName || "", MARGIN + 16, y, { width: CONTENT_WIDTH - 16 });
      y = doc.y;

      if (item.notes) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor("#666666")
          .text(item.notes, MARGIN + 16, y, { width: CONTENT_WIDTH - 16 });
        y = doc.y;
      }

      y += 4;
    }
  }

  if (inspection.notes) {
    if (y > PAGE_HEIGHT - 100) {
      doc.addPage();
      y = MARGIN;
    }
    y += 6;
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).lineWidth(0.5).strokeColor("#999999").stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("TECHNICIAN NOTES", MARGIN, y);
    y += 14;
    doc.font("Helvetica").fontSize(9).fillColor("#333333")
      .text(inspection.notes, MARGIN, y, { width: CONTENT_WIDTH });
    y = doc.y;
  }

  doc.font("Helvetica").fontSize(7).fillColor("#aaaaaa")
    .text(`Generated by PCB Auto on ${new Date().toLocaleDateString("en-US")}`, MARGIN, PAGE_HEIGHT - MARGIN - 12, {
      width: CONTENT_WIDTH, align: "center",
    });

  doc.end();
}
