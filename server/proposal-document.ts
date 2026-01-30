import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import type { PricingComparison, MerchantScrapedData, SalespersonInfo } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

const PRIMARY_COLOR = rgb(124/255, 92/255, 252/255); // #7C5CFC PCBancard purple
const SECONDARY_COLOR = rgb(98/255, 72/255, 201/255); // Darker purple
const SUCCESS_COLOR = rgb(34/255, 197/255, 94/255); // Green for savings
const TEXT_COLOR = rgb(30/255, 30/255, 30/255);
const GRAY_COLOR = rgb(107/255, 114/255, 128/255);
const LIGHT_GRAY = rgb(243/255, 244/255, 246/255);
const WHITE = rgb(1, 1, 1);
const LIGHT_PURPLE = rgb(243/255, 240/255, 255/255);

interface EnhancedProposalConfig {
  merchantData: MerchantScrapedData;
  pricingComparison: PricingComparison;
  salesperson: SalespersonInfo;
  selectedEquipment?: {
    name: string;
    features: string[];
    imageBase64?: string;
  };
  generatedImages?: {
    heroBanner?: string;
    comparisonBackground?: string;
    trustVisual?: string;
  };
}

export async function generateEnhancedProposalPDF(config: EnhancedProposalConfig): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  const formatCurrency = (value: number) => {
    const safeValue = isNaN(value) || value === null || value === undefined ? 0 : value;
    return `$${safeValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    const safeValue = isNaN(value) || value === null || value === undefined ? 0 : value;
    return `${safeValue.toFixed(2)}%`;
  };

  const wrapText = (text: string, maxWidth: number, fontSize: number, usedFont: PDFFont = font): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = usedFont.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Helper to embed merchant logo
  let merchantLogoImage: any = null;
  if (config.merchantData.logoBase64) {
    try {
      const matches = config.merchantData.logoBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (matches) {
        const [, format, data] = matches;
        const imageBytes = Buffer.from(data, 'base64');
        if (format === 'png') {
          merchantLogoImage = await pdfDoc.embedPng(imageBytes);
        } else {
          merchantLogoImage = await pdfDoc.embedJpg(imageBytes);
        }
      }
    } catch (err) {
      console.log("Could not embed merchant logo:", err);
    }
  }

  // Load PCBancard logo
  let pcbLogo: any = null;
  try {
    const logoPaths = [
      path.join(process.cwd(), "server", "assets", "logos", "pcb_logo_fullcolor.png"),
      path.join(process.cwd(), "server", "assets", "logos", "pcb_logo_light.png"),
      path.join(process.cwd(), "attached_assets", "pcb_logo_fullcolor.png"),
    ];
    
    for (const logoPath of logoPaths) {
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        pcbLogo = await pdfDoc.embedPng(logoBytes);
        break;
      }
    }
  } catch (err) {
    console.log("Could not load PCBancard logo:", err);
  }

  const drawTableHeader = (page: PDFPage, y: number, columns: { text: string; width: number }[]) => {
    page.drawRectangle({
      x: margin,
      y: y - 5,
      width: contentWidth,
      height: 28,
      color: PRIMARY_COLOR,
    });
    
    let x = margin + 8;
    for (const col of columns) {
      page.drawText(col.text, {
        x,
        y: y + 3,
        size: 10,
        font: boldFont,
        color: WHITE,
      });
      x += col.width;
    }
    return y - 30;
  };

  const drawTableRow = (page: PDFPage, y: number, values: string[], widths: number[], isAlt: boolean, isHighlight: boolean = false) => {
    const rowHeight = 24;
    
    if (isHighlight) {
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: contentWidth,
        height: rowHeight,
        color: LIGHT_PURPLE,
        borderColor: PRIMARY_COLOR,
        borderWidth: 1,
      });
    } else if (isAlt) {
      page.drawRectangle({
        x: margin,
        y: y - 5,
        width: contentWidth,
        height: rowHeight,
        color: LIGHT_GRAY,
      });
    }
    
    let x = margin + 8;
    for (let i = 0; i < values.length; i++) {
      page.drawText(values[i], {
        x,
        y: y + 2,
        size: 10,
        font: i === 0 ? font : boldFont,
        color: TEXT_COLOR,
      });
      x += widths[i];
    }
    return y - rowHeight;
  };

  const addPageFooter = (page: PDFPage, pageNum: number, totalPages: number) => {
    if (pcbLogo) {
      const footerLogoWidth = 70;
      const footerLogoHeight = (pcbLogo.height / pcbLogo.width) * footerLogoWidth;
      page.drawImage(pcbLogo, {
        x: margin,
        y: 25,
        width: footerLogoWidth,
        height: footerLogoHeight,
      });
    }
    
    page.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: pageWidth - margin - 60,
      y: 30,
      size: 8,
      font,
      color: GRAY_COLOR,
    });
    
    page.drawText("Confidential Proposal", {
      x: pageWidth / 2 - 40,
      y: 30,
      size: 8,
      font,
      color: GRAY_COLOR,
    });
  };

  // =====================================
  // PAGE 1: COVER PAGE
  // =====================================
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 80;

  // PCBancard logo
  if (pcbLogo) {
    const logoWidth = 180;
    const logoHeight = (pcbLogo.height / pcbLogo.width) * logoWidth;
    page1.drawImage(pcbLogo, {
      x: (pageWidth - logoWidth) / 2,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    y -= logoHeight + 50;
  }

  // Title
  page1.drawText("Payment Processing", { x: margin, y, size: 32, font: boldFont, color: PRIMARY_COLOR });
  y -= 40;
  page1.drawText("Cost Savings Proposal", { x: margin, y, size: 28, font: boldFont, color: TEXT_COLOR });
  y -= 50;

  // Divider
  page1.drawRectangle({ x: margin, y, width: 100, height: 4, color: PRIMARY_COLOR });
  y -= 50;

  // Prepared for section
  page1.drawText("Prepared For:", { x: margin, y, size: 12, font, color: GRAY_COLOR });
  y -= 25;
  
  const merchantName = config.merchantData.businessName || "Valued Merchant";
  page1.drawText(merchantName, { x: margin, y, size: 24, font: boldFont, color: TEXT_COLOR });
  y -= 30;

  // Merchant logo if available
  if (merchantLogoImage) {
    const mLogoWidth = 100;
    const mLogoHeight = (merchantLogoImage.height / merchantLogoImage.width) * mLogoWidth;
    page1.drawImage(merchantLogoImage, {
      x: pageWidth - margin - mLogoWidth,
      y: y - mLogoHeight + 60,
      width: mLogoWidth,
      height: Math.min(mLogoHeight, 60),
    });
  }

  // Merchant contact details
  if (config.merchantData.ownerName) {
    page1.drawText(`Owner: ${config.merchantData.ownerName}`, { x: margin, y, size: 11, font, color: TEXT_COLOR });
    y -= 16;
  }
  if (config.merchantData.address) {
    page1.drawText(config.merchantData.address, { x: margin, y, size: 11, font, color: GRAY_COLOR });
    y -= 16;
  }
  if (config.merchantData.phone) {
    page1.drawText(`Phone: ${config.merchantData.phone}`, { x: margin, y, size: 11, font, color: GRAY_COLOR });
    y -= 16;
  }
  if (config.merchantData.email) {
    page1.drawText(`Email: ${config.merchantData.email}`, { x: margin, y, size: 11, font, color: GRAY_COLOR });
    y -= 16;
  }

  if (config.merchantData.businessDescription) {
    const descLines = wrapText(config.merchantData.businessDescription, contentWidth - 120, 11);
    for (const line of descLines.slice(0, 2)) {
      page1.drawText(line, { x: margin, y, size: 11, font, color: GRAY_COLOR });
      y -= 16;
    }
  }
  y -= 30;

  // Date
  page1.drawText("Date:", { x: margin, y, size: 12, font, color: GRAY_COLOR });
  y -= 20;
  page1.drawText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), {
    x: margin, y, size: 14, font, color: TEXT_COLOR,
  });
  y -= 40;

  // Prepared by
  page1.drawText("Prepared By:", { x: margin, y, size: 12, font, color: GRAY_COLOR });
  y -= 20;
  page1.drawText(config.salesperson.name, { x: margin, y, size: 16, font: boldFont, color: TEXT_COLOR });
  y -= 18;
  page1.drawText(config.salesperson.title, { x: margin, y, size: 12, font, color: GRAY_COLOR });
  y -= 18;
  page1.drawText("PCBancard", { x: margin, y, size: 12, font: boldFont, color: PRIMARY_COLOR });
  y -= 18;
  if (config.salesperson.phone) {
    page1.drawText(config.salesperson.phone, { x: margin, y, size: 11, font, color: GRAY_COLOR });
    y -= 14;
  }
  if (config.salesperson.email) {
    page1.drawText(config.salesperson.email, { x: margin, y, size: 11, font, color: GRAY_COLOR });
    y -= 14;
  }

  addPageFooter(page1, 1, 3);

  // =====================================
  // PAGE 2: SIDE-BY-SIDE PRICING COMPARISON
  // =====================================
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  page2.drawText("Pricing Comparison", { x: margin, y, size: 22, font: boldFont, color: PRIMARY_COLOR });
  y -= 35;

  // Current Processing Summary
  page2.drawText("Your Current Processing", { x: margin, y, size: 14, font: boldFont, color: TEXT_COLOR });
  y -= 25;

  const currentCols = [
    { text: "Metric", width: 200 },
    { text: "Value", width: contentWidth - 200 },
  ];
  y = drawTableHeader(page2, y, currentCols);

  const currentData = config.pricingComparison.currentProcessor;
  const currentRows = [
    ["Monthly Volume", formatCurrency(currentData.monthlyVolume)],
    ["Monthly Transactions", currentData.monthlyTransactions.toLocaleString()],
    ["Average Ticket", formatCurrency(currentData.avgTicket)],
    ["Current Monthly Fees", formatCurrency(currentData.monthlyFees)],
    ["Effective Rate", formatPercent(currentData.effectiveRate)],
    ["Annual Processing Cost", formatCurrency(currentData.annualCost)],
  ];

  currentRows.forEach((row, i) => {
    y = drawTableRow(page2, y, row, [200, contentWidth - 200], i % 2 === 1);
  });
  y -= 30;

  // SIDE-BY-SIDE OPTIONS COMPARISON
  page2.drawText("Options Comparison", { x: margin, y, size: 14, font: boldFont, color: TEXT_COLOR });
  y -= 25;

  const hasDual = !!config.pricingComparison.dualPricing;
  const hasIC = !!config.pricingComparison.interchangePlus;
  const recommended = config.pricingComparison.recommendedOption;

  // Comparison table columns
  const compCols = [
    { text: "", width: 160 },
    { text: "Current", width: 130 },
    ...(hasDual ? [{ text: recommended === "dual_pricing" ? "Dual Pricing ★" : "Dual Pricing", width: 130 }] : []),
    ...(hasIC ? [{ text: recommended === "interchange_plus" ? "Interchange Plus ★" : "Interchange Plus", width: 130 }] : []),
  ];
  
  y = drawTableHeader(page2, y, compCols);

  const compWidths = [160, 130, ...(hasDual ? [130] : []), ...(hasIC ? [130] : [])];

  // Monthly Cost row
  y = drawTableRow(page2, y, [
    "Monthly Cost",
    formatCurrency(currentData.monthlyFees),
    ...(hasDual ? [formatCurrency(config.pricingComparison.dualPricing!.monthlyFees)] : []),
    ...(hasIC ? [formatCurrency(config.pricingComparison.interchangePlus!.monthlyFees)] : []),
  ], compWidths, false);

  // Monthly Savings row (highlighted)
  y = drawTableRow(page2, y, [
    "Monthly Savings",
    "-",
    ...(hasDual ? [formatCurrency(config.pricingComparison.dualPricing!.monthlySavings)] : []),
    ...(hasIC ? [formatCurrency(config.pricingComparison.interchangePlus!.monthlySavings)] : []),
  ], compWidths, true, true);

  // Annual Savings row (highlighted)
  y = drawTableRow(page2, y, [
    "Annual Savings",
    "-",
    ...(hasDual ? [formatCurrency(config.pricingComparison.dualPricing!.annualSavings)] : []),
    ...(hasIC ? [formatCurrency(config.pricingComparison.interchangePlus!.annualSavings)] : []),
  ], compWidths, false, true);

  // Savings Percent row
  y = drawTableRow(page2, y, [
    "Savings %",
    "-",
    ...(hasDual ? [formatPercent(config.pricingComparison.dualPricing!.savingsPercent)] : []),
    ...(hasIC ? [formatPercent(config.pricingComparison.interchangePlus!.savingsPercent)] : []),
  ], compWidths, true);

  y -= 40;

  // Recommendation box
  const recommendedName = recommended === "dual_pricing" ? "Dual Pricing" : "Interchange Plus";
  const recommendedSavings = recommended === "dual_pricing" 
    ? config.pricingComparison.dualPricing?.annualSavings || 0
    : config.pricingComparison.interchangePlus?.annualSavings || 0;

  page2.drawRectangle({
    x: margin,
    y: y - 80,
    width: contentWidth,
    height: 85,
    color: LIGHT_PURPLE,
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  });

  page2.drawText("★ Our Recommendation", { x: margin + 15, y: y - 5, size: 14, font: boldFont, color: PRIMARY_COLOR });
  y -= 25;
  page2.drawText(`Based on your processing volumes, we recommend ${recommendedName}.`, {
    x: margin + 15, y: y - 5, size: 12, font, color: TEXT_COLOR,
  });
  y -= 22;
  page2.drawText(`Projected Annual Savings: ${formatCurrency(recommendedSavings)}`, {
    x: margin + 15, y: y - 5, size: 16, font: boldFont, color: SUCCESS_COLOR,
  });

  y -= 80;

  // Card Volume Breakdown (if we have data)
  if (currentData.cardBreakdown) {
    page2.drawText("Card Volume Breakdown", { x: margin, y, size: 14, font: boldFont, color: TEXT_COLOR });
    y -= 25;

    const cardCols = [
      { text: "Card Type", width: 150 },
      { text: "Volume", width: 170 },
      { text: "Processing Cost", width: contentWidth - 320 },
    ];
    y = drawTableHeader(page2, y, cardCols);

    const cardData = [
      ["Visa", formatCurrency(currentData.cardBreakdown.visa.volume), formatCurrency(currentData.cardBreakdown.visa.cost)],
      ["Mastercard", formatCurrency(currentData.cardBreakdown.mastercard.volume), formatCurrency(currentData.cardBreakdown.mastercard.cost)],
      ["Discover", formatCurrency(currentData.cardBreakdown.discover.volume), formatCurrency(currentData.cardBreakdown.discover.cost)],
      ["American Express", formatCurrency(currentData.cardBreakdown.amex.volume), formatCurrency(currentData.cardBreakdown.amex.cost)],
    ];

    cardData.forEach((row, i) => {
      y = drawTableRow(page2, y, row, [150, 170, contentWidth - 320], i % 2 === 1);
    });
  }

  addPageFooter(page2, 2, 3);

  // =====================================
  // PAGE 3: CONTACT & NEXT STEPS
  // =====================================
  const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  page3.drawText("Next Steps", { x: margin, y, size: 22, font: boldFont, color: PRIMARY_COLOR });
  y -= 40;

  const steps = [
    "Review this proposal and the savings comparison",
    "Schedule a brief call to discuss your questions",
    "Complete the simple application process",
    "Receive your new equipment and start saving",
  ];

  steps.forEach((step, i) => {
    page3.drawRectangle({ x: margin, y: y - 3, width: 28, height: 28, color: PRIMARY_COLOR });
    page3.drawText((i + 1).toString(), { x: margin + 10, y: y + 2, size: 14, font: boldFont, color: WHITE });
    
    const stepLines = wrapText(step, contentWidth - 45, 12);
    stepLines.forEach((line, j) => {
      page3.drawText(line, { x: margin + 40, y: y - (j * 16), size: 12, font, color: TEXT_COLOR });
    });
    y -= 45;
  });

  y -= 30;

  // Risk Reversal
  page3.drawRectangle({
    x: margin,
    y: y - 70,
    width: contentWidth,
    height: 75,
    color: LIGHT_GRAY,
  });

  page3.drawText("90-Day Risk-Free Guarantee", { x: margin + 15, y: y - 5, size: 14, font: boldFont, color: TEXT_COLOR });
  y -= 28;
  const guaranteeText = "Try our service completely risk-free. If you're not satisfied with our service or the savings aren't as promised, we'll help you switch back at no cost.";
  const guaranteeLines = wrapText(guaranteeText, contentWidth - 30, 11);
  for (const line of guaranteeLines) {
    page3.drawText(line, { x: margin + 15, y: y - 5, size: 11, font, color: TEXT_COLOR });
    y -= 15;
  }

  y -= 60;

  // SALESPERSON CONTACT INFO
  page3.drawRectangle({
    x: margin,
    y: y - 120,
    width: contentWidth,
    height: 125,
    color: PRIMARY_COLOR,
  });

  page3.drawText("Your Account Representative", { x: margin + 20, y: y - 5, size: 14, font: boldFont, color: WHITE });
  y -= 35;

  page3.drawText(config.salesperson.name, { x: margin + 20, y: y - 5, size: 18, font: boldFont, color: WHITE });
  y -= 25;
  page3.drawText(config.salesperson.title, { x: margin + 20, y: y - 5, size: 12, font, color: rgb(220/255, 210/255, 255/255) });
  y -= 25;

  if (config.salesperson.email) {
    page3.drawText(`Email: ${config.salesperson.email}`, { x: margin + 20, y: y - 5, size: 12, font, color: WHITE });
    y -= 20;
  }
  if (config.salesperson.phone) {
    page3.drawText(`Phone: ${config.salesperson.phone}`, { x: margin + 20, y: y - 5, size: 12, font, color: WHITE });
  }

  addPageFooter(page3, 3, 3);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
