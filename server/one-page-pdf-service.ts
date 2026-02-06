import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

const PAGE_W = 612;
const PAGE_H = 792;

const NAVY = { r: 0x1a / 255, g: 0x36 / 255, b: 0x5d / 255 };
const GOLD = { r: 0xd6 / 255, g: 0x9e / 255, b: 0x2e / 255 };

interface OnePagePdfInput {
  templateId: string;
  merchantName: string;
  agentName: string;
  agentTitle?: string;
  agentPhone?: string;
  agentEmail?: string;
  equipment?: { name: string; price: string } | null;
  savings?: {
    dualPricing?: { programType: string; annualSavings: string; monthlySavings?: string } | null;
    interchangePlus?: { programType: string; annualSavings: string; monthlySavings?: string } | null;
  } | null;
  merchantStatementUploaded?: boolean;
}

const TEMPLATE_FILE_MAP: Record<string, string> = {
  "exclusive-offer-standard": "template-1-exclusive-offer-standard.pdf",
  "exclusive-offer-qr": "template-2-exclusive-offer-qr.pdf",
  "referral-program-client": "template-3-referral-program-client.pdf",
  "enrolled-agent-referral": "template-4-enrolled-agent-referral.pdf",
  "free-payroll": "template-5-free-payroll.pdf",
  "business-grade-audit": "template-6-business-grade-audit.pdf",
  "video-brochure-5min": "template-7-video-brochure-5min.pdf",
};

function getOutputScenario(input: OnePagePdfInput): "A" | "B" | "C" | "D" | "E" {
  const dp = input.savings?.dualPricing;
  const ip = input.savings?.interchangePlus;
  if (dp && ip) return "D";
  if (dp) return "B";
  if (ip) return "C";
  if (input.merchantStatementUploaded) return "E";
  return "A";
}

function buildSavingsText(input: OnePagePdfInput): string[] {
  const scenario = getOutputScenario(input);
  switch (scenario) {
    case "A":
      return ["Let us analyze your current processing statement"];
    case "B":
      return [`Dual Pricing Program: ${input.savings!.dualPricing!.annualSavings} in annual savings`];
    case "C":
      return [`Interchange Plus Program: ${input.savings!.interchangePlus!.annualSavings} in annual savings`];
    case "D":
      return [
        `Dual Pricing: ${input.savings!.dualPricing!.annualSavings} in annual savings`,
        `Interchange Plus: ${input.savings!.interchangePlus!.annualSavings} in annual savings`,
      ];
    case "E":
      return ["Based on your statement, we recommend a full savings analysis"];
  }
}

function buildAgentLine(input: OnePagePdfInput): string {
  const parts = [input.agentName];
  if (input.agentPhone) parts.push(input.agentPhone);
  if (input.agentEmail) parts.push(input.agentEmail);
  return parts.join("  |  ");
}

async function overlayFooter(
  page: any,
  font: any,
  input: OnePagePdfInput
) {
  page.drawRectangle({
    x: 30,
    y: 25,
    width: 420,
    height: 25,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  const agentLine = buildAgentLine(input);
  page.drawText(agentLine, {
    x: 40,
    y: 35,
    size: 9,
    font,
    color: rgb(0.8, 0.85, 0.9),
  });
}

async function generateTemplate1(input: OnePagePdfInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "one-page-templates", TEMPLATE_FILE_MAP[input.templateId]);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 55,
    width: PAGE_W,
    height: 30,
    color: rgb(1, 1, 1),
    opacity: 0.85,
  });
  page.drawText(`Prepared for: ${input.merchantName}`, {
    x: 40,
    y: PAGE_H - 45,
    size: 14,
    font: bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  const savingsLines = buildSavingsText(input);
  let savingsY = PAGE_H - 350;
  page.drawRectangle({
    x: 30,
    y: savingsY - 10,
    width: 350,
    height: savingsLines.length * 20 + 10,
    color: rgb(1, 1, 1),
    opacity: 0.9,
  });
  for (const line of savingsLines) {
    page.drawText(line, {
      x: 40,
      y: savingsY,
      size: 10,
      font: regular,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
    savingsY -= 18;
  }

  if (input.equipment) {
    let eqY = savingsY - 15;
    page.drawRectangle({
      x: 30,
      y: eqY - 10,
      width: 350,
      height: 40,
      color: rgb(1, 1, 1),
      opacity: 0.9,
    });
    page.drawText(`Equipment: ${input.equipment.name} - ${input.equipment.price}`, {
      x: 40,
      y: eqY,
      size: 10,
      font: regular,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
  }

  const agentLine = buildAgentLine(input);
  if (input.agentTitle) {
    page.drawText(input.agentName, {
      x: 40,
      y: 28,
      size: 10,
      font: bold,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
    page.drawText(input.agentTitle, {
      x: 40,
      y: 16,
      size: 8,
      font: regular,
      color: rgb(0.3, 0.3, 0.35),
    });
    const contactParts = [];
    if (input.agentPhone) contactParts.push(input.agentPhone);
    if (input.agentEmail) contactParts.push(input.agentEmail);
    if (contactParts.length > 0) {
      page.drawText(contactParts.join("  |  "), {
        x: 250,
        y: 22,
        size: 8,
        font: regular,
        color: rgb(0.3, 0.3, 0.35),
      });
    }
  } else {
    page.drawText(agentLine, {
      x: 40,
      y: 20,
      size: 9,
      font: regular,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateTemplate2(input: OnePagePdfInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "one-page-templates", TEMPLATE_FILE_MAP[input.templateId]);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  await overlayFooter(page, regular, input);

  page.drawRectangle({
    x: 30,
    y: PAGE_H - 115,
    width: 400,
    height: 18,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawText(`Customized savings proposal for ${input.merchantName}`, {
    x: 40,
    y: PAGE_H - 110,
    size: 11,
    font: regular,
    color: rgb(0.8, 0.85, 0.9),
  });

  const savingsLines = buildSavingsText(input);
  let bulletY = PAGE_H - 185;
  page.drawRectangle({
    x: 50,
    y: bulletY - (savingsLines.length * 18) + 5,
    width: 400,
    height: savingsLines.length * 18 + 10,
    color: rgb(0xf7 / 255, 0xfa / 255, 0xfc / 255),
  });
  for (const line of savingsLines) {
    page.drawText("\u2022", {
      x: 55,
      y: bulletY,
      size: 10,
      font: regular,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    });
    page.drawText(line, {
      x: 69,
      y: bulletY,
      size: 10,
      font: regular,
      color: rgb(0.3, 0.3, 0.35),
    });
    bulletY -= 18;
  }

  if (input.equipment) {
    page.drawRectangle({
      x: 50,
      y: PAGE_H - 305,
      width: 400,
      height: 20,
      color: rgb(0xf7 / 255, 0xfa / 255, 0xfc / 255),
    });
    page.drawText("\u2022", {
      x: 55,
      y: PAGE_H - 290,
      size: 10,
      font: regular,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    });
    page.drawText(`${input.equipment.name}: ${input.equipment.price}`, {
      x: 69,
      y: PAGE_H - 290,
      size: 10,
      font: regular,
      color: rgb(0.3, 0.3, 0.35),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateGenericTemplate(input: OnePagePdfInput): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), "public", "one-page-templates", TEMPLATE_FILE_MAP[input.templateId]);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  await overlayFooter(page, regular, input);

  if (input.merchantName) {
    const headerBottom = input.templateId === "enrolled-agent-referral" ? PAGE_H - 210
      : input.templateId === "video-brochure-5min" ? PAGE_H - 190
      : PAGE_H - 130;

    page.drawRectangle({
      x: 30,
      y: headerBottom - 5,
      width: 400,
      height: 22,
      color: rgb(1, 1, 1),
      opacity: 0.85,
    });
    page.drawText(`Prepared for: ${input.merchantName}`, {
      x: 40,
      y: headerBottom,
      size: 12,
      font: bold,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateOnePagePdf(input: OnePagePdfInput): Promise<Buffer> {
  const filename = TEMPLATE_FILE_MAP[input.templateId];
  if (!filename) {
    throw new Error(`Unknown template ID: ${input.templateId}`);
  }

  const templatePath = path.join(process.cwd(), "public", "one-page-templates", filename);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${filename}`);
  }

  switch (input.templateId) {
    case "exclusive-offer-standard":
      return generateTemplate1(input);
    case "exclusive-offer-qr":
      return generateTemplate2(input);
    default:
      return generateGenericTemplate(input);
  }
}

export function extractSavingsFromText(text: string): {
  programType: string;
  annualSavings: string;
  monthlySavings?: string;
  monthlyVolume?: string;
  effectiveRate?: string;
} {
  const dollarPattern = /\$[\d,]+\.?\d{0,2}/g;
  const dollarAmounts = text.match(dollarPattern) || [];

  let programType = "Unknown";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("dual pricing") || lowerText.includes("surcharge")) {
    programType = "Dual Pricing";
  } else if (lowerText.includes("interchange plus") || lowerText.includes("interchange-plus")) {
    programType = "Interchange Plus";
  } else if (lowerText.includes("traditional")) {
    programType = "Traditional";
  }

  let annualSavings = "";
  let monthlySavings = "";
  let monthlyVolume = "";
  let effectiveRate = "";

  const annualMatch = text.match(/annual\s+savings[:\s]*(\$[\d,]+\.?\d{0,2})/i)
    || text.match(/yearly\s+savings[:\s]*(\$[\d,]+\.?\d{0,2})/i)
    || text.match(/(\$[\d,]+\.?\d{0,2})\s*(?:in\s+)?annual\s+savings/i)
    || text.match(/(\$[\d,]+\.?\d{0,2})\s*(?:in\s+)?yearly\s+savings/i);
  if (annualMatch) {
    annualSavings = annualMatch[1];
  }

  const monthlyMatch = text.match(/monthly\s+savings[:\s]*(\$[\d,]+\.?\d{0,2})/i)
    || text.match(/(\$[\d,]+\.?\d{0,2})\s*(?:in\s+)?monthly\s+savings/i);
  if (monthlyMatch) {
    monthlySavings = monthlyMatch[1];
  }

  const volumeMatch = text.match(/monthly\s+volume[:\s]*(\$[\d,]+\.?\d{0,2})/i)
    || text.match(/volume[:\s]*(\$[\d,]+\.?\d{0,2})/i);
  if (volumeMatch) {
    monthlyVolume = volumeMatch[1];
  }

  const rateMatch = text.match(/effective\s+rate[:\s]*([\d.]+%?)/i);
  if (rateMatch) {
    effectiveRate = rateMatch[1];
  }

  if (!annualSavings && dollarAmounts.length > 0) {
    const sortedAmounts = dollarAmounts
      .map((a) => ({
        raw: a,
        value: parseFloat(a.replace(/[$,]/g, "")),
      }))
      .sort((a, b) => b.value - a.value);

    if (sortedAmounts.length > 0) {
      annualSavings = sortedAmounts[0].raw;
    }
  }

  return {
    programType,
    annualSavings: annualSavings || "N/A",
    monthlySavings: monthlySavings || undefined,
    monthlyVolume: monthlyVolume || undefined,
    effectiveRate: effectiveRate || undefined,
  };
}
