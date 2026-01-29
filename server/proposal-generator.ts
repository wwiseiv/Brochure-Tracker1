import pdfParse from "pdf-parse";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from "docx";

export interface CardBreakdown {
  volume: number;
  transactions: number;
  ratePercent: number;
  perTxFee: number;
  totalCost: number;
}

export interface ProposalCurrentState {
  totalVolume: number;
  totalTransactions: number;
  avgTicket: number;
  cardBreakdown: {
    visa: CardBreakdown;
    mastercard: CardBreakdown;
    discover: CardBreakdown;
    amex: CardBreakdown;
  };
  fees: {
    statementFee: number;
    pciNonCompliance: number;
    creditPassthrough: number;
    otherFees: number;
    batchHeader: number;
  };
  totalMonthlyCost: number;
  effectiveRatePercent: number;
}

export interface InterchangePlusOption {
  discountRatePercent: number;
  perTransactionFee: number;
  projectedCosts: {
    visaCost: number;
    mastercardCost: number;
    discoverCost: number;
    amexCost: number;
    transactionFees: number;
    onFileFee: number;
    creditPassthrough: number;
    otherFees: number;
  };
  totalMonthlyCost: number;
  monthlySavings: number;
  savingsPercent: number;
  annualSavings: number;
}

export interface DualPricingOption {
  merchantDiscountRate: number;
  perTransactionFee: number;
  monthlyProgramFee: number;
  projectedCosts: {
    processingCost: number;
    dualPricingMonthly: number;
    creditPassthrough: number;
    otherFees: number;
  };
  totalMonthlyCost: number;
  monthlySavings: number;
  savingsPercent: number;
  annualSavings: number;
}

export interface ParsedProposal {
  merchantName: string;
  preparedDate: Date | null;
  agentName: string | null;
  agentTitle: string | null;
  currentState: ProposalCurrentState;
  optionInterchangePlus?: InterchangePlusOption;
  optionDualPricing?: DualPricingOption;
  proposalType: "interchange_plus" | "dual_pricing";
}

function parseNumber(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = str.replace(/[$,\s%]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function extractMerchantName(text: string): string {
  const patterns = [
    /Prepared For:\s*\n?\s*(.+?)(?:\n|$)/i,
    /Prepared For:\s*(.+?)(?:\n|$)/i,
    /Statement for:\s*(.+?)(?:\n|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return "Unknown Merchant";
}

function extractAgentInfo(text: string): { name: string | null; title: string | null } {
  const patterns = [
    /This Proposal Prepared For:\s*\n?\s*(.+?)(?:\n|$)/i,
    /Prepared By:\s*\n?\s*(.+?)(?:\n|$)/i,
    /Account Executive:\s*(.+?)(?:\n|$)/i,
  ];
  
  let name: string | null = null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      break;
    }
  }
  
  const titlePattern = /PCBancard\s+(.+?)(?:\n|$)/i;
  const titleMatch = text.match(titlePattern);
  const title = titleMatch ? titleMatch[1].trim() : "Account Executive";
  
  return { name, title };
}

function extractDate(text: string): Date | null {
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+\d{1,2}:\d{2}/,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return null;
}

function extractCardData(text: string, cardType: string, section: "current" | "proposed"): CardBreakdown {
  const result: CardBreakdown = {
    volume: 0,
    transactions: 0,
    ratePercent: 0,
    perTxFee: 0,
    totalCost: 0,
  };
  
  const cardPatterns: Record<string, RegExp[]> = {
    visa: [/VS\s+Interchange/i, /Visa\s+Interchange/i],
    mastercard: [/MC\s+Interchange/i, /Mastercard\s+Interchange/i],
    discover: [/Discover/i],
    amex: [/American\s*Express/i, /Amex/i],
  };
  
  const patterns = cardPatterns[cardType] || [];
  
  const volumePattern = /\$?([\d,]+\.?\d*)\s+(\d+\.?\d*)%\s+\$?([\d,]+\.?\d*)/g;
  const feePattern = new RegExp(`${cardType === "visa" ? "VS" : cardType === "mastercard" ? "MC" : cardType}\\s+Item\\s+Fee\\s+\\$?([\\d.]+)\\s+(\\d+)\\s+\\$?([\\d.]+)`, "i");
  
  for (const pattern of patterns) {
    const sectionMatch = text.match(pattern);
    if (sectionMatch) {
      const startIndex = sectionMatch.index || 0;
      const sectionText = text.substring(startIndex, startIndex + 500);
      
      const volumeMatch = sectionText.match(/\$?([\d,]+\.?\d*)\s+(\d+\.?\d*)%\s+\$?([\d,]+\.?\d*)/);
      if (volumeMatch) {
        result.volume = parseNumber(volumeMatch[1]);
        result.ratePercent = parseNumber(volumeMatch[2]);
        result.totalCost = parseNumber(volumeMatch[3]);
      }
    }
  }
  
  const feeMatch = text.match(feePattern);
  if (feeMatch) {
    result.perTxFee = parseNumber(feeMatch[1]);
    result.transactions = parseNumber(feeMatch[2]);
  }
  
  return result;
}

function extractFees(text: string): { statementFee: number; pciNonCompliance: number; creditPassthrough: number; otherFees: number; batchHeader: number } {
  const fees = {
    statementFee: 0,
    pciNonCompliance: 0,
    creditPassthrough: 0,
    otherFees: 0,
    batchHeader: 0,
  };
  
  const statementMatch = text.match(/Statement\s+Fee\s+\$?([\d,]+\.?\d*)/i);
  if (statementMatch) fees.statementFee = parseNumber(statementMatch[1]);
  
  const pciMatch = text.match(/(?:Non\s*PCI|PCI\s+(?:Non-?)?Compliance)\s+\$?([\d,]+\.?\d*)/i);
  if (pciMatch) fees.pciNonCompliance = parseNumber(pciMatch[1]);
  
  const passthroughMatch = text.match(/Credit\s+Pass-?through\s+\$?([\d,]+\.?\d*)/i);
  if (passthroughMatch) fees.creditPassthrough = parseNumber(passthroughMatch[1]);
  
  const batchMatch = text.match(/(?:Batch\s+Header|Settlement\/Batch\s+Fees?)\s+\$?([\d,]+\.?\d*)/i);
  if (batchMatch) fees.batchHeader = parseNumber(batchMatch[1]);
  
  const otherMatch = text.match(/Other\s+Fees\s+\$?([\d,]+\.?\d*)/i);
  if (otherMatch) fees.otherFees = parseNumber(otherMatch[1]);
  
  return fees;
}

function extractTotalProcessingFees(text: string): number {
  const pattern = /TOTAL\s+PROCESSING\s+FEES:\s+\$?([\d,]+\.?\d*)/i;
  const match = text.match(pattern);
  return match ? parseNumber(match[1]) : 0;
}

function extractMonthlySavings(text: string): { monthly: number; percent: number; yearly: number } {
  const result = { monthly: 0, percent: 0, yearly: 0 };
  
  const monthlyPattern = /Estimated\s+Monthly\s+(?:Processing\s+)?Savings\s+(?:over\s+IC\s+)?\$?([\d,]+\.?\d*)/i;
  const monthlyMatch = text.match(monthlyPattern);
  if (monthlyMatch) result.monthly = parseNumber(monthlyMatch[1]);
  
  const percentPattern = /Estimated\s+Percentage\s+of\s+Monthly\s+Savings\s+(?:over\s+IC\s+)?([\d.]+)%/i;
  const percentMatch = text.match(percentPattern);
  if (percentMatch) result.percent = parseNumber(percentMatch[1]);
  
  const yearlyPattern = /Estimated\s+Yearly\s+(?:Processing\s+)?Savings\s+(?:over\s+IC\s+)?\$?([\d,]+\.?\d*)/i;
  const yearlyMatch = text.match(yearlyPattern);
  if (yearlyMatch) {
    result.yearly = parseNumber(yearlyMatch[1]);
  } else {
    result.yearly = result.monthly * 12;
  }
  
  return result;
}

function isDualPricingProposal(text: string): boolean {
  const dpIndicators = [
    /Dual\s+Pricing\s+Monthly/i,
    /0\.00%.*TOTAL:.*\$0\.00/i,
    /Merchant\s+Discount\s+Rate.*0\.00%/i,
  ];
  
  return dpIndicators.some(pattern => pattern.test(text));
}

export async function parsePDFProposal(pdfBuffer: Buffer): Promise<ParsedProposal> {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;
  
  const merchantName = extractMerchantName(text);
  const preparedDate = extractDate(text);
  const agentInfo = extractAgentInfo(text);
  const proposalType = isDualPricingProposal(text) ? "dual_pricing" : "interchange_plus";
  
  const currentVisa = extractCardData(text, "visa", "current");
  const currentMC = extractCardData(text, "mastercard", "current");
  const currentDiscover = extractCardData(text, "discover", "current");
  const currentAmex = extractCardData(text, "amex", "current");
  const fees = extractFees(text);
  
  const totalVolume = currentVisa.volume + currentMC.volume + currentDiscover.volume + currentAmex.volume;
  const totalTransactions = currentVisa.transactions + currentMC.transactions + currentDiscover.transactions + currentAmex.transactions;
  const avgTicket = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  
  const currentProcessingFees = extractTotalProcessingFees(text);
  const totalMonthlyCost = currentProcessingFees + fees.statementFee + fees.pciNonCompliance + 
    fees.creditPassthrough + fees.otherFees + fees.batchHeader;
  
  const effectiveRate = totalVolume > 0 ? (totalMonthlyCost / totalVolume) * 100 : 0;
  
  const currentState: ProposalCurrentState = {
    totalVolume,
    totalTransactions,
    avgTicket,
    cardBreakdown: {
      visa: currentVisa,
      mastercard: currentMC,
      discover: currentDiscover,
      amex: currentAmex,
    },
    fees,
    totalMonthlyCost,
    effectiveRatePercent: effectiveRate,
  };
  
  const savings = extractMonthlySavings(text);
  
  const result: ParsedProposal = {
    merchantName,
    preparedDate,
    agentName: agentInfo.name,
    agentTitle: agentInfo.title,
    currentState,
    proposalType,
  };
  
  if (proposalType === "dual_pricing") {
    const dpMonthlyMatch = text.match(/Dual\s+Pricing\s+Monthly\s+\$?([\d,]+\.?\d*)/i);
    const dpMonthlyFee = dpMonthlyMatch ? parseNumber(dpMonthlyMatch[1]) : 64.95;
    
    result.optionDualPricing = {
      merchantDiscountRate: 0,
      perTransactionFee: 0,
      monthlyProgramFee: dpMonthlyFee,
      projectedCosts: {
        processingCost: 0,
        dualPricingMonthly: dpMonthlyFee,
        creditPassthrough: 0,
        otherFees: 0,
      },
      totalMonthlyCost: dpMonthlyFee,
      monthlySavings: savings.monthly,
      savingsPercent: savings.percent,
      annualSavings: savings.yearly,
    };
  } else {
    const proposedRateMatch = text.match(/Proposed.*?(\d+\.?\d*)%/i);
    const proposedRate = proposedRateMatch ? parseNumber(proposedRateMatch[1]) : 2.0;
    
    const proposedFeeMatch = text.match(/\$?(0\.\d+)\s+\d+\s+\$?[\d.]+.*?Proposed/i);
    const proposedFee = proposedFeeMatch ? parseNumber(proposedFeeMatch[1]) : 0.15;
    
    const proposedTotalMatch = text.match(/TOTAL:\s+\$?([\d,]+\.?\d*).*?(?:On\s+File|Statement)/i);
    const proposedTotal = proposedTotalMatch ? parseNumber(proposedTotalMatch[1]) : 0;
    
    const onFileMatch = text.match(/On\s+File\s+Fee\s+\$?([\d,]+\.?\d*)/i);
    const onFileFee = onFileMatch ? parseNumber(onFileMatch[1]) : 9.95;
    
    result.optionInterchangePlus = {
      discountRatePercent: proposedRate,
      perTransactionFee: proposedFee,
      projectedCosts: {
        visaCost: currentVisa.volume * (proposedRate / 100) + currentVisa.transactions * proposedFee,
        mastercardCost: currentMC.volume * (proposedRate / 100) + currentMC.transactions * proposedFee,
        discoverCost: currentDiscover.volume * (proposedRate / 100) + currentDiscover.transactions * proposedFee,
        amexCost: currentAmex.volume * (proposedRate / 100) + currentAmex.transactions * proposedFee,
        transactionFees: totalTransactions * proposedFee,
        onFileFee: onFileFee,
        creditPassthrough: fees.creditPassthrough,
        otherFees: 0,
      },
      totalMonthlyCost: proposedTotal > 0 ? proposedTotal + onFileFee + fees.creditPassthrough : savings.monthly,
      monthlySavings: savings.monthly,
      savingsPercent: savings.percent,
      annualSavings: savings.yearly,
    };
  }
  
  return result;
}

export interface ProposalBlueprint {
  cover: {
    headline: string;
    subheadline: string;
    merchantName: string;
    preparedDate: string;
    agentName: string;
    agentTitle: string;
  };
  executiveSummary: {
    intro: string;
    currentSituation: string;
    recommendation: string;
  };
  savingsComparison: {
    currentCost: number;
    dualPricingCost?: number;
    dualPricingSavings?: number;
    interchangePlusCost?: number;
    interchangePlusSavings?: number;
    recommendedOption: "dual_pricing" | "interchange_plus";
  };
  equipment?: {
    terminalName: string;
    terminalFeatures: string[];
    whyRecommended: string;
  };
  callToAction: string;
}

export async function generateProposalBlueprint(
  parsedData: ParsedProposal,
  equipment?: { name: string; features: string[]; whySelected: string }
): Promise<ProposalBlueprint> {
  const hasDP = !!parsedData.optionDualPricing;
  const hasIC = !!parsedData.optionInterchangePlus;
  
  const dpSavings = parsedData.optionDualPricing?.monthlySavings || 0;
  const icSavings = parsedData.optionInterchangePlus?.monthlySavings || 0;
  
  const recommendedOption = dpSavings >= icSavings ? "dual_pricing" : "interchange_plus";
  const maxSavings = Math.max(dpSavings, icSavings);
  const annualSavings = maxSavings * 12;
  
  return {
    cover: {
      headline: "Custom Payment Processing Proposal",
      subheadline: `Prepared exclusively for ${parsedData.merchantName}`,
      merchantName: parsedData.merchantName,
      preparedDate: parsedData.preparedDate?.toLocaleDateString() || new Date().toLocaleDateString(),
      agentName: parsedData.agentName || "PCBancard Representative",
      agentTitle: parsedData.agentTitle || "Account Executive",
    },
    executiveSummary: {
      intro: `Thank you for the opportunity to review your current payment processing. We've analyzed your monthly volume of $${parsedData.currentState.totalVolume.toLocaleString()} and identified significant savings opportunities.`,
      currentSituation: `Currently, you're paying approximately $${parsedData.currentState.totalMonthlyCost.toLocaleString()} per month in processing fees, with an effective rate of ${parsedData.currentState.effectiveRatePercent.toFixed(2)}%.`,
      recommendation: recommendedOption === "dual_pricing"
        ? `We recommend our Dual Pricing program, which can save you up to $${maxSavings.toLocaleString()} per month ($${annualSavings.toLocaleString()} annually) by allowing customers to choose between cash and credit pricing.`
        : `We recommend our Interchange Plus pricing model, which provides transparent pricing and can save you $${maxSavings.toLocaleString()} per month ($${annualSavings.toLocaleString()} annually).`,
    },
    savingsComparison: {
      currentCost: parsedData.currentState.totalMonthlyCost,
      dualPricingCost: parsedData.optionDualPricing?.totalMonthlyCost,
      dualPricingSavings: parsedData.optionDualPricing?.monthlySavings,
      interchangePlusCost: parsedData.optionInterchangePlus?.totalMonthlyCost,
      interchangePlusSavings: parsedData.optionInterchangePlus?.monthlySavings,
      recommendedOption,
    },
    equipment: equipment ? {
      terminalName: equipment.name,
      terminalFeatures: equipment.features,
      whyRecommended: equipment.whySelected,
    } : undefined,
    callToAction: `Ready to start saving? Contact ${parsedData.agentName || "your PCBancard representative"} today to get started. There's no cost to switch, and we handle all the paperwork.`,
  };
}

export async function generateProposalDOCX(
  blueprint: ProposalBlueprint,
  parsedData: ParsedProposal
): Promise<Buffer> {
  const primaryColor = "7C5CFC";
  
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: blueprint.cover.headline,
                bold: true,
                size: 48,
                color: primaryColor,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: blueprint.cover.subheadline,
                size: 28,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Prepared: ${blueprint.cover.preparedDate}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `By: ${blueprint.cover.agentName}, ${blueprint.cover.agentTitle}`,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          
          new Paragraph({
            text: "Executive Summary",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: blueprint.executiveSummary.intro })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: blueprint.executiveSummary.currentSituation })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: blueprint.executiveSummary.recommendation, bold: true })],
            spacing: { after: 400 },
          }),
          
          new Paragraph({
            text: "Savings Comparison",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Option", bold: true })] })],
                    shading: { type: ShadingType.SOLID, fill: primaryColor, color: primaryColor },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Monthly Cost", bold: true })] })],
                    shading: { type: ShadingType.SOLID, fill: primaryColor, color: primaryColor },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Monthly Savings", bold: true })] })],
                    shading: { type: ShadingType.SOLID, fill: primaryColor, color: primaryColor },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Annual Savings", bold: true })] })],
                    shading: { type: ShadingType.SOLID, fill: primaryColor, color: primaryColor },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Current")] }),
                  new TableCell({ children: [new Paragraph(`$${blueprint.savingsComparison.currentCost.toLocaleString()}`)] }),
                  new TableCell({ children: [new Paragraph("-")] }),
                  new TableCell({ children: [new Paragraph("-")] }),
                ],
              }),
              ...(blueprint.savingsComparison.dualPricingCost !== undefined ? [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Dual Pricing")] }),
                    new TableCell({ children: [new Paragraph(`$${blueprint.savingsComparison.dualPricingCost!.toLocaleString()}`)] }),
                    new TableCell({ children: [new Paragraph(`$${blueprint.savingsComparison.dualPricingSavings!.toLocaleString()}`)] }),
                    new TableCell({ children: [new Paragraph(`$${(blueprint.savingsComparison.dualPricingSavings! * 12).toLocaleString()}`)] }),
                  ],
                }),
              ] : []),
              ...(blueprint.savingsComparison.interchangePlusCost !== undefined ? [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Interchange Plus")] }),
                    new TableCell({ children: [new Paragraph(`$${blueprint.savingsComparison.interchangePlusCost!.toLocaleString()}`)] }),
                    new TableCell({ children: [new Paragraph(`$${blueprint.savingsComparison.interchangePlusSavings!.toLocaleString()}`)] }),
                    new TableCell({ children: [new Paragraph(`$${(blueprint.savingsComparison.interchangePlusSavings! * 12).toLocaleString()}`)] }),
                  ],
                }),
              ] : []),
            ],
          }),
          
          ...(blueprint.equipment ? [
            new Paragraph({
              text: "Recommended Equipment",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: blueprint.equipment.terminalName, bold: true, size: 28 })],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: blueprint.equipment.whyRecommended })],
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: "Key Features:",
              spacing: { before: 100, after: 100 },
            }),
            ...blueprint.equipment.terminalFeatures.map(feature => 
              new Paragraph({
                children: [new TextRun({ text: `• ${feature}` })],
              })
            ),
          ] : []),
          
          new Paragraph({
            text: "Next Steps",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: blueprint.callToAction })],
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export async function generateProposalPDF(
  blueprint: ProposalBlueprint,
  parsedData: ParsedProposal
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const primaryColor = rgb(124 / 255, 92 / 255, 252 / 255);
  const textColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.4, 0.4, 0.4);
  
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  let y = height - 80;
  
  page.drawText(blueprint.cover.headline, {
    x: 50,
    y,
    size: 24,
    font: boldFont,
    color: primaryColor,
  });
  y -= 30;
  
  page.drawText(blueprint.cover.subheadline, {
    x: 50,
    y,
    size: 14,
    font,
    color: grayColor,
  });
  y -= 30;
  
  page.drawText(`Prepared: ${blueprint.cover.preparedDate}`, {
    x: 50,
    y,
    size: 12,
    font,
    color: textColor,
  });
  y -= 20;
  
  page.drawText(`By: ${blueprint.cover.agentName}, ${blueprint.cover.agentTitle}`, {
    x: 50,
    y,
    size: 12,
    font,
    color: textColor,
  });
  y -= 50;
  
  page.drawText("Executive Summary", {
    x: 50,
    y,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });
  y -= 25;
  
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
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
  
  const drawWrappedText = (text: string, startY: number, fontSize: number = 11): number => {
    const lines = wrapText(text, 500, fontSize);
    let currentY = startY;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y: currentY,
        size: fontSize,
        font,
        color: textColor,
      });
      currentY -= fontSize + 4;
    }
    return currentY;
  };
  
  y = drawWrappedText(blueprint.executiveSummary.intro, y);
  y -= 10;
  y = drawWrappedText(blueprint.executiveSummary.currentSituation, y);
  y -= 10;
  y = drawWrappedText(blueprint.executiveSummary.recommendation, y);
  y -= 40;
  
  page.drawText("Savings Comparison", {
    x: 50,
    y,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });
  y -= 30;
  
  const tableHeaders = ["Option", "Monthly Cost", "Monthly Savings", "Annual Savings"];
  const colWidths = [120, 100, 110, 110];
  let x = 50;
  
  page.drawRectangle({
    x: 48,
    y: y - 5,
    width: 450,
    height: 20,
    color: primaryColor,
  });
  
  for (let i = 0; i < tableHeaders.length; i++) {
    page.drawText(tableHeaders[i], {
      x,
      y,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    x += colWidths[i];
  }
  y -= 25;
  
  const tableData: string[][] = [
    ["Current", `$${blueprint.savingsComparison.currentCost.toLocaleString()}`, "-", "-"],
  ];
  
  if (blueprint.savingsComparison.dualPricingCost !== undefined) {
    tableData.push([
      "Dual Pricing",
      `$${blueprint.savingsComparison.dualPricingCost.toLocaleString()}`,
      `$${blueprint.savingsComparison.dualPricingSavings!.toLocaleString()}`,
      `$${(blueprint.savingsComparison.dualPricingSavings! * 12).toLocaleString()}`,
    ]);
  }
  
  if (blueprint.savingsComparison.interchangePlusCost !== undefined) {
    tableData.push([
      "Interchange Plus",
      `$${blueprint.savingsComparison.interchangePlusCost.toLocaleString()}`,
      `$${blueprint.savingsComparison.interchangePlusSavings!.toLocaleString()}`,
      `$${(blueprint.savingsComparison.interchangePlusSavings! * 12).toLocaleString()}`,
    ]);
  }
  
  for (const row of tableData) {
    x = 50;
    for (let i = 0; i < row.length; i++) {
      page.drawText(row[i], {
        x,
        y,
        size: 10,
        font,
        color: textColor,
      });
      x += colWidths[i];
    }
    y -= 20;
  }
  
  y -= 30;
  
  if (blueprint.equipment) {
    page.drawText("Recommended Equipment", {
      x: 50,
      y,
      size: 16,
      font: boldFont,
      color: primaryColor,
    });
    y -= 25;
    
    page.drawText(blueprint.equipment.terminalName, {
      x: 50,
      y,
      size: 14,
      font: boldFont,
      color: textColor,
    });
    y -= 20;
    
    y = drawWrappedText(blueprint.equipment.whyRecommended, y, 10);
    y -= 10;
    
    for (const feature of blueprint.equipment.terminalFeatures.slice(0, 5)) {
      page.drawText(`• ${feature}`, {
        x: 60,
        y,
        size: 10,
        font,
        color: textColor,
      });
      y -= 15;
    }
    y -= 20;
  }
  
  page.drawText("Next Steps", {
    x: 50,
    y,
    size: 16,
    font: boldFont,
    color: primaryColor,
  });
  y -= 25;
  
  y = drawWrappedText(blueprint.callToAction, y);
  
  page.drawText("PCBancard", {
    x: 50,
    y: 30,
    size: 10,
    font: boldFont,
    color: primaryColor,
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
