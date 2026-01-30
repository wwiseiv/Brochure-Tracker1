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
  ImageRun,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// Helper function to parse PDF using pdf-parse with proper lazy loading
async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string }> {
  // Check for empty buffer before attempting to parse
  if (!buffer || buffer.length === 0) {
    throw new Error("The uploaded file is empty (0 bytes). Please upload a valid PDF file.");
  }
  
  try {
    // pdf-parse v2.x uses a class-based API
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    
    // Handle different response formats
    let text = "";
    if (textResult && textResult.pages && Array.isArray(textResult.pages)) {
      text = textResult.pages.map((page: any) => page?.text || "").join("\n");
    } else if (typeof textResult === "string") {
      text = textResult;
    } else if (textResult && typeof textResult.text === "string") {
      text = textResult.text;
    }
    
    await parser.destroy();
    
    if (!text || text.trim().length === 0) {
      console.warn("PDF parsing returned empty text");
    }
    
    return { text };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

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
  extractionWarnings?: string[];
  extractionStatus?: "success" | "partial" | "needs_review";
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

interface ExtractionWarnings {
  warnings: string[];
  status: "success" | "partial" | "needs_review";
}

function validateExtractedData(data: ParsedProposal): ExtractionWarnings {
  const warnings: string[] = [];
  
  if (data.currentState.totalVolume > 0 && data.currentState.totalMonthlyCost === 0) {
    warnings.push("Data check needed: Volume detected but fees computed to $0. Please verify spreadsheet format.");
  }
  
  if (data.currentState.effectiveRatePercent > 10) {
    warnings.push("Effective rate exceeds 10% — please verify calculation.");
  }
  
  if ((data.optionDualPricing?.monthlySavings ?? 0) < 0 || 
      (data.optionInterchangePlus?.monthlySavings ?? 0) < 0) {
    warnings.push("Warning: Current rates appear lower than proposed. Please verify data.");
  }
  
  if (data.currentState.totalVolume === 0 && data.currentState.totalTransactions === 0) {
    warnings.push("No volume or transaction data extracted. Please verify the document format.");
  }
  
  if (data.merchantName === "Unknown Merchant") {
    warnings.push("Merchant name could not be extracted. Please verify manually.");
  }
  
  return {
    warnings,
    status: warnings.length === 0 ? "success" : warnings.length > 2 ? "needs_review" : "partial"
  };
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
  const data = await parsePdfBuffer(pdfBuffer);
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
  
  // ALWAYS calculate both options for comparison display
  // Dual Pricing Option
  const dpMonthlyMatch = text.match(/Dual\s+Pricing\s+Monthly\s+\$?([\d,]+\.?\d*)/i);
  const dpMonthlyFee = dpMonthlyMatch ? parseNumber(dpMonthlyMatch[1]) : 64.95;
  const dpTotalMonthlyCost = dpMonthlyFee;
  const dpMonthlySavings = totalMonthlyCost - dpTotalMonthlyCost;
  const dpSavingsPercent = totalMonthlyCost > 0 ? (dpMonthlySavings / totalMonthlyCost) * 100 : 0;
  
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
    totalMonthlyCost: dpTotalMonthlyCost,
    monthlySavings: dpMonthlySavings > 0 ? dpMonthlySavings : savings.monthly,
    savingsPercent: dpSavingsPercent > 0 ? dpSavingsPercent : savings.percent,
    annualSavings: dpMonthlySavings > 0 ? dpMonthlySavings * 12 : savings.yearly,
  };
  
  // Interchange Plus Option
  const proposedRateMatch = text.match(/Proposed.*?(\d+\.?\d*)%/i);
  const proposedRate = proposedRateMatch ? parseNumber(proposedRateMatch[1]) : 2.0;
  
  const proposedFeeMatch = text.match(/\$?(0\.\d+)\s+\d+\s+\$?[\d.]+.*?Proposed/i);
  const proposedFee = proposedFeeMatch ? parseNumber(proposedFeeMatch[1]) : 0.15;
  
  const proposedTotalMatch = text.match(/TOTAL:\s+\$?([\d,]+\.?\d*).*?(?:On\s+File|Statement)/i);
  const proposedTotal = proposedTotalMatch ? parseNumber(proposedTotalMatch[1]) : 0;
  
  const onFileMatch = text.match(/On\s+File\s+Fee\s+\$?([\d,]+\.?\d*)/i);
  const onFileFee = onFileMatch ? parseNumber(onFileMatch[1]) : 9.95;
  
  // Calculate IC+ costs
  const icVisaCost = currentVisa.volume * (proposedRate / 100) + currentVisa.transactions * proposedFee;
  const icMCCost = currentMC.volume * (proposedRate / 100) + currentMC.transactions * proposedFee;
  const icDiscoverCost = currentDiscover.volume * (proposedRate / 100) + currentDiscover.transactions * proposedFee;
  const icAmexCost = currentAmex.volume * (proposedRate / 100) + currentAmex.transactions * proposedFee;
  const icTransactionFees = totalTransactions * proposedFee;
  const icTotalCost = proposedTotal > 0 
    ? proposedTotal + onFileFee + fees.creditPassthrough 
    : icVisaCost + icMCCost + icDiscoverCost + icAmexCost + onFileFee + fees.creditPassthrough;
  const icMonthlySavings = totalMonthlyCost - icTotalCost;
  const icSavingsPercent = totalMonthlyCost > 0 ? (icMonthlySavings / totalMonthlyCost) * 100 : 0;
  
  result.optionInterchangePlus = {
    discountRatePercent: proposedRate,
    perTransactionFee: proposedFee,
    projectedCosts: {
      visaCost: icVisaCost,
      mastercardCost: icMCCost,
      discoverCost: icDiscoverCost,
      amexCost: icAmexCost,
      transactionFees: icTransactionFees,
      onFileFee: onFileFee,
      creditPassthrough: fees.creditPassthrough,
      otherFees: 0,
    },
    totalMonthlyCost: icTotalCost,
    monthlySavings: icMonthlySavings > 0 ? icMonthlySavings : savings.monthly,
    savingsPercent: icSavingsPercent > 0 ? icSavingsPercent : savings.percent,
    annualSavings: icMonthlySavings > 0 ? icMonthlySavings * 12 : savings.yearly,
  };
  
  return result;
}

// Parse Word documents using mammoth
async function parseWordDocument(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

interface ExcelExtractedData {
  text: string;
  cellData: {
    totalProcessingFees?: number;
    currentTotal?: number;
    proposedTotal?: number;
    monthlySavings?: number;
    yearlySavings?: number;
    effectiveRate?: number;
    merchantName?: string;
    totalVolume?: number;
  };
}

function findCellValue(sheet: any, XLSX: any, searchLabel: string): number | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      
      if (cell && typeof cell.v === 'string' && 
          cell.v.toLowerCase().includes(searchLabel.toLowerCase())) {
        const adjacentCells = [
          XLSX.utils.encode_cell({ r: row, c: col + 1 }),
          XLSX.utils.encode_cell({ r: row, c: col + 2 }),
          XLSX.utils.encode_cell({ r: row + 1, c: col }),
          XLSX.utils.encode_cell({ r: row + 1, c: col + 1 }),
        ];
        
        for (const addr of adjacentCells) {
          const adjacentCell = sheet[addr];
          if (adjacentCell) {
            if (typeof adjacentCell.v === 'number') {
              return adjacentCell.v;
            } else if (typeof adjacentCell.v === 'string') {
              const parsed = parseNumber(adjacentCell.v);
              if (parsed > 0) return parsed;
            }
          }
        }
      }
    }
  }
  return null;
}

function findColumnValues(sheet: any, XLSX: any, columnHeaders: string[]): { current: number | null; proposed: number | null } {
  const result = { current: null as number | null, proposed: null as number | null };
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  let currentCol = -1;
  let proposedCol = -1;
  
  for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      
      if (cell && typeof cell.v === 'string') {
        const cellValue = cell.v.toLowerCase().trim();
        if (cellValue === 'current' || cellValue.includes('current')) {
          currentCol = col;
        }
        if (cellValue === 'proposed' || cellValue.includes('proposed') || 
            cellValue === 'new' || cellValue.includes('pcbancard')) {
          proposedCol = col;
        }
      }
    }
  }
  
  for (const header of columnHeaders) {
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];
        
        if (cell && typeof cell.v === 'string' && 
            cell.v.toLowerCase().includes(header.toLowerCase())) {
          if (currentCol >= 0) {
            const currentCellAddr = XLSX.utils.encode_cell({ r: row, c: currentCol });
            const currentCell = sheet[currentCellAddr];
            if (currentCell) {
              result.current = typeof currentCell.v === 'number' ? currentCell.v : parseNumber(String(currentCell.v));
            }
          }
          
          if (proposedCol >= 0) {
            const proposedCellAddr = XLSX.utils.encode_cell({ r: row, c: proposedCol });
            const proposedCell = sheet[proposedCellAddr];
            if (proposedCell) {
              result.proposed = typeof proposedCell.v === 'number' ? proposedCell.v : parseNumber(String(proposedCell.v));
            }
          }
          
          if (result.current !== null || result.proposed !== null) {
            return result;
          }
        }
      }
    }
  }
  
  return result;
}

async function parseExcelFile(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  const cellData: ExcelExtractedData['cellData'] = {};
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    text += csv + "\n";
    
    const totalFees = findCellValue(sheet, XLSX, "TOTAL PROCESSING FEES");
    if (totalFees !== null) cellData.totalProcessingFees = totalFees;
    
    const monthlySavings = findCellValue(sheet, XLSX, "Estimated Monthly Processing Savings");
    if (monthlySavings !== null) cellData.monthlySavings = monthlySavings;
    
    const monthlyAltSavings = findCellValue(sheet, XLSX, "Monthly Savings");
    if (monthlyAltSavings !== null && !cellData.monthlySavings) cellData.monthlySavings = monthlyAltSavings;
    
    const yearlySavings = findCellValue(sheet, XLSX, "Estimated Yearly Savings");
    if (yearlySavings !== null) cellData.yearlySavings = yearlySavings;
    
    const yearlyAltSavings = findCellValue(sheet, XLSX, "Annual Savings");
    if (yearlyAltSavings !== null && !cellData.yearlySavings) cellData.yearlySavings = yearlyAltSavings;
    
    const effectiveRate = findCellValue(sheet, XLSX, "Effective Rate");
    if (effectiveRate !== null) cellData.effectiveRate = effectiveRate;
    
    const totalVolume = findCellValue(sheet, XLSX, "Total Volume");
    if (totalVolume !== null) cellData.totalVolume = totalVolume;
    
    const monthlyVolume = findCellValue(sheet, XLSX, "Monthly Volume");
    if (monthlyVolume !== null && !cellData.totalVolume) cellData.totalVolume = monthlyVolume;
    
    const totalCosts = findColumnValues(sheet, XLSX, ["Total", "TOTAL", "Total Cost", "Monthly Cost"]);
    if (totalCosts.current !== null) cellData.currentTotal = totalCosts.current;
    if (totalCosts.proposed !== null) cellData.proposedTotal = totalCosts.proposed;
  }
  
  if (cellData.totalProcessingFees) {
    text += `\nTOTAL PROCESSING FEES: $${cellData.totalProcessingFees}\n`;
  }
  if (cellData.monthlySavings) {
    text += `\nEstimated Monthly Processing Savings $${cellData.monthlySavings}\n`;
  }
  if (cellData.yearlySavings) {
    text += `\nEstimated Yearly Savings $${cellData.yearlySavings}\n`;
  }
  if (cellData.currentTotal) {
    text += `\nCurrent Total: $${cellData.currentTotal}\n`;
  }
  if (cellData.proposedTotal) {
    text += `\nProposed Total: $${cellData.proposedTotal}\n`;
  }
  
  return text;
}

// Main function to parse any supported file type
export async function parseProposalFile(buffer: Buffer, filename: string): Promise<ParsedProposal> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  let text = "";
  
  if (ext === 'pdf') {
    // Use PDF parser
    const data = await parsePdfBuffer(buffer);
    text = data.text;
  } else if (ext === 'doc' || ext === 'docx') {
    // Use mammoth for Word docs
    text = await parseWordDocument(buffer);
  } else if (ext === 'xls' || ext === 'xlsx') {
    // Use xlsx for Excel files
    text = await parseExcelFile(buffer);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  
  // Now extract data from the text (same logic as PDF)
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
  
  // ALWAYS calculate both options for comparison display
  // Dual Pricing Option
  const dpMonthlyMatch = text.match(/Dual\s+Pricing\s+Monthly\s+\$?([\d,]+\.?\d*)/i);
  const dpMonthlyFee = dpMonthlyMatch ? parseNumber(dpMonthlyMatch[1]) : 64.95;
  const dpTotalCost = dpMonthlyFee + fees.statementFee + fees.pciNonCompliance;
  const dpMonthlySavings = totalMonthlyCost - dpTotalCost;
  const dpSavingsPercent = totalMonthlyCost > 0 ? (dpMonthlySavings / totalMonthlyCost) * 100 : 0;
  
  result.optionDualPricing = {
    merchantDiscountRate: 0,
    perTransactionFee: 0,
    monthlyProgramFee: dpMonthlyFee,
    projectedCosts: {
      processingCost: 0,
      dualPricingMonthly: dpMonthlyFee,
      creditPassthrough: fees.creditPassthrough,
      otherFees: fees.statementFee + fees.pciNonCompliance,
    },
    totalMonthlyCost: dpTotalCost,
    monthlySavings: dpMonthlySavings > 0 ? dpMonthlySavings : savings.monthly,
    savingsPercent: dpSavingsPercent > 0 ? dpSavingsPercent : savings.percent,
    annualSavings: dpMonthlySavings > 0 ? dpMonthlySavings * 12 : savings.yearly,
  };
  
  // Interchange Plus Option
  const proposedRateMatch = text.match(/(?:Proposed|New)\s+(?:Discount\s+)?Rate[:\s]+(\d+\.?\d*)%/i);
  const proposedFeeMatch = text.match(/(?:Proposed|New)\s+(?:Per\s+)?(?:Transaction|Auth)\s+Fee[:\s]+\$?(\d+\.?\d*)/i);
  const proposedTotalMatch = text.match(/(?:Projected|Proposed|New)\s+(?:Total|Monthly)\s+(?:Cost)?[:\s]+\$?([\d,]+\.?\d*)/i);
  
  const proposedRate = proposedRateMatch ? parseFloat(proposedRateMatch[1]) : 0.25;
  const proposedFee = proposedFeeMatch ? parseFloat(proposedFeeMatch[1]) : 0.10;
  const proposedTotal = proposedTotalMatch ? parseNumber(proposedTotalMatch[1]) : 0;
  
  const onFileMatch = text.match(/On\s+File\s+Fee\s+\$?([\d,]+\.?\d*)/i);
  const onFileFee = onFileMatch ? parseNumber(onFileMatch[1]) : 9.95;
  
  // Calculate IC+ costs
  const icVisaCost = currentVisa.volume * (proposedRate / 100) + currentVisa.transactions * proposedFee;
  const icMCCost = currentMC.volume * (proposedRate / 100) + currentMC.transactions * proposedFee;
  const icDiscoverCost = currentDiscover.volume * (proposedRate / 100) + currentDiscover.transactions * proposedFee;
  const icAmexCost = currentAmex.volume * (proposedRate / 100) + currentAmex.transactions * proposedFee;
  const icTransactionFees = totalTransactions * proposedFee;
  const icTotalCost = proposedTotal > 0 
    ? proposedTotal + onFileFee + fees.creditPassthrough 
    : icVisaCost + icMCCost + icDiscoverCost + icAmexCost + onFileFee + fees.creditPassthrough;
  const icMonthlySavings = totalMonthlyCost - icTotalCost;
  const icSavingsPercent = totalMonthlyCost > 0 ? (icMonthlySavings / totalMonthlyCost) * 100 : 0;
  
  result.optionInterchangePlus = {
    discountRatePercent: proposedRate,
    perTransactionFee: proposedFee,
    projectedCosts: {
      visaCost: icVisaCost,
      mastercardCost: icMCCost,
      discoverCost: icDiscoverCost,
      amexCost: icAmexCost,
      transactionFees: icTransactionFees,
      onFileFee: onFileFee,
      creditPassthrough: fees.creditPassthrough,
      otherFees: 0,
    },
    totalMonthlyCost: icTotalCost,
    monthlySavings: icMonthlySavings > 0 ? icMonthlySavings : savings.monthly,
    savingsPercent: icSavingsPercent > 0 ? icSavingsPercent : savings.percent,
    annualSavings: icMonthlySavings > 0 ? icMonthlySavings * 12 : savings.yearly,
  };
  
  const validation = validateExtractedData(result);
  result.extractionWarnings = validation.warnings;
  result.extractionStatus = validation.status;
  
  return result;
}

export interface ImplementationStep {
  step: number;
  title: string;
  description: string;
  timeline: string;
}

export interface ProposalBlueprint {
  cover: {
    headline: string;
    subheadline: string;
    merchantName: string;
    preparedDate: string;
    agentName: string;
    agentTitle: string;
    agentEmail?: string;
    agentPhone?: string;
  };
  executiveSummary: {
    intro: string;
    currentSituation: string;
    recommendation: string;
  };
  currentSnapshot: {
    monthlyVolume: number;
    monthlyTransactions: number;
    avgTicket: number;
    currentMonthlyFees: number;
    effectiveRate: number;
    annualCost: number;
  };
  savingsComparison: {
    currentCost: number;
    dualPricingCost?: number;
    dualPricingSavings?: number;
    interchangePlusCost?: number;
    interchangePlusSavings?: number;
    recommendedOption: "dual_pricing" | "interchange_plus";
  };
  recommendationReasons: string[];
  equipment?: {
    terminalName: string;
    terminalFeatures: string[];
    whyRecommended: string;
  };
  dualPricingExplanation?: string;
  interchangePlusExplanation?: string;
  whyPCBancard?: string;
  implementationPlan: ImplementationStep[];
  riskReversal: string;
  callToAction: string;
  complianceDisclosure: string;
  images?: {
    heroBanner?: string;
    comparisonBackground?: string;
    trustVisual?: string;
  };
}

export async function generateProposalBlueprint(
  parsedData: ParsedProposal,
  equipment?: { name: string; features: string[]; whySelected: string },
  aiContent?: {
    executiveSummaryIntro?: string;
    executiveSummaryCurrentSituation?: string;
    executiveSummaryRecommendation?: string;
    callToAction?: string;
    dualPricingExplanation?: string;
    interchangePlusExplanation?: string;
    whyPCBancard?: string;
    implementationPlan?: ImplementationStep[];
    complianceDisclosure?: string;
    images?: {
      heroBanner?: string;
      comparisonBackground?: string;
      trustVisual?: string;
    };
  }
): Promise<ProposalBlueprint> {
  const dpSavings = parsedData.optionDualPricing?.monthlySavings || 0;
  const icSavings = parsedData.optionInterchangePlus?.monthlySavings || 0;
  
  const recommendedOption = dpSavings >= icSavings ? "dual_pricing" : "interchange_plus";
  const maxSavings = Math.max(dpSavings, icSavings);
  const annualSavings = maxSavings * 12;
  const monthlyVolume = parsedData.currentState?.totalVolume || 0;
  const monthlyFees = parsedData.currentState?.totalMonthlyCost || 0;
  const effectiveRate = parsedData.currentState?.effectiveRatePercent || 0;
  
  const defaultImplementationPlan: ImplementationStep[] = [
    { step: 1, title: "Application Review", description: "We review your application and verify business information", timeline: "Day 1" },
    { step: 2, title: "Underwriting Approval", description: "Fast-track approval process with our underwriting team", timeline: "Days 2-3" },
    { step: 3, title: "Equipment Deployment", description: "Your new terminal is shipped and configured", timeline: "Days 4-5" },
    { step: 4, title: "Installation & Training", description: "On-site or remote setup with comprehensive staff training", timeline: "Day 6" },
    { step: 5, title: "Go Live & Support", description: "Begin processing with 24/7 dedicated support", timeline: "Day 7" },
  ];

  const defaultComplianceDisclosure = `This proposal is provided for informational purposes and contains estimates based on the processing data provided. Actual rates and fees may vary based on card mix, average ticket size, and other factors. PCBancard is a registered ISO/MSP of various acquiring banks. All accounts are subject to credit approval. Processing rates are subject to interchange fees set by card networks. Equipment pricing and availability may vary. This proposal is valid for 30 days from the date of preparation. PCBancard reserves the right to modify terms and conditions. For complete terms, please refer to the Merchant Processing Agreement.`;

  const defaultRiskReversal = `We stand behind our service with a 90-Day Risk-Free Guarantee. If you're not completely satisfied with your processing solution within the first 90 days, we'll work with you to make it right or help you transition back to your previous processor at no cost. Our dedicated support team is available 24/7 to assist with any questions or concerns. You'll have a dedicated account manager who knows your business and is just a phone call away.`;

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
      intro: aiContent?.executiveSummaryIntro || `Thank you for the opportunity to review your current payment processing arrangements. After a comprehensive analysis of your monthly processing volume of $${monthlyVolume.toLocaleString()} across ${parsedData.currentState?.totalTransactions.toLocaleString() || 0} transactions, we have identified significant opportunities to reduce your costs while improving your payment processing experience. Our team has carefully evaluated your current statement and developed a customized solution tailored specifically to your business needs and transaction patterns.`,
      currentSituation: aiContent?.executiveSummaryCurrentSituation || `Currently, your business is paying approximately $${monthlyFees.toLocaleString()} per month in processing fees, resulting in an effective rate of ${effectiveRate.toFixed(2)}%. This translates to an annual processing cost of $${(monthlyFees * 12).toLocaleString()}. Based on our analysis of your card mix and transaction patterns, we believe there is substantial room for improvement. Many businesses in your industry are achieving effective rates well below yours, and we're confident we can deliver similar results for your operation.`,
      recommendation: aiContent?.executiveSummaryRecommendation || (recommendedOption === "dual_pricing"
        ? `Based on our analysis, we strongly recommend our Dual Pricing program for your business. This innovative solution can save you up to $${maxSavings.toLocaleString()} per month, translating to $${annualSavings.toLocaleString()} in annual savings. Dual Pricing allows your customers to choose between cash and credit pricing, effectively eliminating your credit card processing fees while remaining fully compliant with card network rules. This is the fastest-growing pricing model in the industry and has been embraced by businesses across all sectors.`
        : `Based on our comprehensive analysis, we recommend our Interchange Plus pricing model for your business. This transparent pricing structure will save you $${maxSavings.toLocaleString()} per month, resulting in $${annualSavings.toLocaleString()} in annual savings. Unlike tiered pricing, Interchange Plus provides complete visibility into your processing costs, showing you exactly what you pay to the card networks plus a small, fixed markup. This is the same pricing model used by the largest retailers in the country.`),
    },
    currentSnapshot: {
      monthlyVolume,
      monthlyTransactions: parsedData.currentState?.totalTransactions || 0,
      avgTicket: parsedData.currentState?.avgTicket || 0,
      currentMonthlyFees: monthlyFees,
      effectiveRate,
      annualCost: monthlyFees * 12,
    },
    savingsComparison: {
      currentCost: monthlyFees,
      dualPricingCost: parsedData.optionDualPricing?.totalMonthlyCost,
      dualPricingSavings: parsedData.optionDualPricing?.monthlySavings,
      interchangePlusCost: parsedData.optionInterchangePlus?.totalMonthlyCost,
      interchangePlusSavings: parsedData.optionInterchangePlus?.monthlySavings,
      recommendedOption,
    },
    recommendationReasons: recommendedOption === "dual_pricing" 
      ? [
          `Maximum Savings: Dual Pricing can reduce your monthly processing costs by up to $${maxSavings.toLocaleString()}, representing a ${((maxSavings / monthlyFees) * 100).toFixed(0)}% reduction in fees.`,
          "Customer Choice: Customers appreciate transparency and the option to pay less with cash, leading to increased customer satisfaction and loyalty.",
          "Competitive Advantage: Join thousands of businesses that have already adopted this proven pricing model to boost their bottom line."
        ]
      : [
          `Significant Savings: Interchange Plus pricing will save you $${maxSavings.toLocaleString()} per month through our competitive rates and transparent pricing.`,
          "Complete Transparency: See exactly what you're paying with itemized statements that show interchange costs separately from your markup.",
          "Predictable Costs: With a fixed markup over interchange, your processing costs become more predictable and easier to budget."
        ],
    equipment: equipment ? {
      terminalName: equipment.name,
      terminalFeatures: equipment.features,
      whyRecommended: equipment.whySelected,
    } : undefined,
    dualPricingExplanation: aiContent?.dualPricingExplanation || "Dual Pricing is a compliant pricing model that allows merchants to offer two prices: one for cash payments and one for card payments. This approach is fully compliant with card network rules and has been adopted by businesses across all industries. With Dual Pricing, your customers have the choice to save money by paying with cash, while those who prefer the convenience of cards pay a small service fee.",
    interchangePlusExplanation: aiContent?.interchangePlusExplanation || "Interchange Plus pricing is the most transparent pricing model available. You pay the actual interchange rate set by the card networks (Visa, Mastercard, etc.) plus a small, fixed markup. This means you always know exactly what you're paying and why. Large retailers have used this pricing model for years, and now it's available to businesses of all sizes.",
    whyPCBancard: aiContent?.whyPCBancard || "PCBancard is a leading payment processing partner trusted by thousands of businesses nationwide. We combine cutting-edge technology with personalized service to deliver the best possible processing experience. Our dedicated account managers provide hands-on support, while our 24/7 technical team ensures your business never misses a sale.",
    implementationPlan: aiContent?.implementationPlan || defaultImplementationPlan,
    riskReversal: defaultRiskReversal,
    callToAction: aiContent?.callToAction || `Ready to start saving $${maxSavings.toLocaleString()} per month? Contact ${parsedData.agentName || "your PCBancard representative"} today to get started. There's no cost to switch, no equipment charges, and we handle all the paperwork. Your first step toward significant savings is just a phone call away.`,
    complianceDisclosure: aiContent?.complianceDisclosure || defaultComplianceDisclosure,
    images: aiContent?.images,
  };
}

export async function generateProposalDOCX(
  blueprint: ProposalBlueprint,
  parsedData: ParsedProposal
): Promise<Buffer> {
  const primaryColor = "7C5CFC";
  const lightPurple = "E8E4FC";
  const white = "FFFFFF";
  
  const createHeaderCell = (text: string) => new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 22 })],
      alignment: AlignmentType.CENTER,
    })],
    shading: { type: ShadingType.SOLID, fill: primaryColor, color: primaryColor },
  });
  
  const createDataCell = (text: string, isAlt: boolean = false) => new TableCell({
    children: [new Paragraph({ 
      children: [new TextRun({ text, size: 22 })],
      alignment: AlignmentType.CENTER,
    })],
    shading: isAlt ? { type: ShadingType.SOLID, fill: lightPurple, color: lightPurple } : undefined,
  });

  const coverPageChildren: (Paragraph | Table)[] = [];
  
  try {
    const logoPath = path.join(process.cwd(), "server/assets/logos/pcb_logo_fullcolor.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      coverPageChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBytes,
              transformation: { width: 250, height: 47 },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        })
      );
    }
  } catch (logoError) {
    console.log("Could not add logo to DOCX:", logoError);
  }

  coverPageChildren.push(
    new Paragraph({
      children: [new TextRun({ text: blueprint.cover.headline, bold: true, size: 56, color: primaryColor })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: blueprint.cover.subheadline, size: 32, color: "666666" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Prepared For:`, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: blueprint.cover.merchantName, size: 36, bold: true, color: primaryColor })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Date: ${blueprint.cover.preparedDate}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Prepared By: ${blueprint.cover.agentName}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: blueprint.cover.agentTitle, size: 22, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "PCBancard", size: 22, color: primaryColor })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  const executiveSummaryChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.executiveSummary.intro, size: 24 })], spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.executiveSummary.currentSituation, size: 24 })], spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.executiveSummary.recommendation, bold: true, size: 24 })], spacing: { after: 400 } }),
  ];

  const snapshotChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Current Processing Snapshot", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [createHeaderCell("Metric"), createHeaderCell("Value")] }),
        new TableRow({ children: [createDataCell("Monthly Processing Volume"), createDataCell(`$${blueprint.currentSnapshot.monthlyVolume.toLocaleString()}`)] }),
        new TableRow({ children: [createDataCell("Monthly Transactions", true), createDataCell(blueprint.currentSnapshot.monthlyTransactions.toLocaleString(), true)] }),
        new TableRow({ children: [createDataCell("Average Ticket Size"), createDataCell(`$${blueprint.currentSnapshot.avgTicket.toFixed(2)}`)] }),
        new TableRow({ children: [createDataCell("Current Monthly Fees", true), createDataCell(`$${blueprint.currentSnapshot.currentMonthlyFees.toLocaleString()}`, true)] }),
        new TableRow({ children: [createDataCell("Effective Rate"), createDataCell(`${blueprint.currentSnapshot.effectiveRate.toFixed(2)}%`)] }),
        new TableRow({ children: [createDataCell("Annual Processing Cost", true), createDataCell(`$${blueprint.currentSnapshot.annualCost.toLocaleString()}`, true)] }),
      ],
    }),
  ];

  const comparisonRows = [
    new TableRow({ children: [createHeaderCell("Option"), createHeaderCell("Monthly Cost"), createHeaderCell("Monthly Savings"), createHeaderCell("Annual Savings")] }),
    new TableRow({ children: [createDataCell("Current Processor"), createDataCell(`$${blueprint.savingsComparison.currentCost.toLocaleString()}`), createDataCell("-"), createDataCell("-")] }),
  ];
  
  if (blueprint.savingsComparison.dualPricingCost !== undefined) {
    const isRecommended = blueprint.savingsComparison.recommendedOption === "dual_pricing";
    comparisonRows.push(new TableRow({
      children: [
        createDataCell(isRecommended ? "Dual Pricing ★ RECOMMENDED" : "Dual Pricing", true),
        createDataCell(`$${blueprint.savingsComparison.dualPricingCost.toLocaleString()}`, true),
        createDataCell(`$${blueprint.savingsComparison.dualPricingSavings!.toLocaleString()}`, true),
        createDataCell(`$${(blueprint.savingsComparison.dualPricingSavings! * 12).toLocaleString()}`, true),
      ],
    }));
  }
  
  if (blueprint.savingsComparison.interchangePlusCost !== undefined) {
    const isRecommended = blueprint.savingsComparison.recommendedOption === "interchange_plus";
    comparisonRows.push(new TableRow({
      children: [
        createDataCell(isRecommended ? "Interchange Plus ★ RECOMMENDED" : "Interchange Plus"),
        createDataCell(`$${blueprint.savingsComparison.interchangePlusCost.toLocaleString()}`),
        createDataCell(`$${blueprint.savingsComparison.interchangePlusSavings!.toLocaleString()}`),
        createDataCell(`$${(blueprint.savingsComparison.interchangePlusSavings! * 12).toLocaleString()}`),
      ],
    }));
  }

  const comparisonChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Options Comparison", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: comparisonRows }),
  ];

  const recommendationChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Our Recommendation", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Paragraph({
      children: [new TextRun({ 
        text: blueprint.savingsComparison.recommendedOption === "dual_pricing" 
          ? (blueprint.dualPricingExplanation || "") 
          : (blueprint.interchangePlusExplanation || ""),
        size: 24 
      })],
      spacing: { after: 300 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Why This Solution:", bold: true, size: 26 })], spacing: { after: 200 } }),
    ...blueprint.recommendationReasons.map((reason, i) => 
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${reason}`, size: 24 })],
        spacing: { after: 150 },
      })
    ),
  ];

  const equipmentChildren: (Paragraph | Table)[] = blueprint.equipment ? [
    new Paragraph({ text: "Equipment Recommendation", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.equipment.terminalName, bold: true, size: 32, color: primaryColor })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.equipment.whyRecommended, size: 24 })], spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: "Key Features:", bold: true, size: 26 })], spacing: { after: 150 } }),
    ...blueprint.equipment.terminalFeatures.map(feature => 
      new Paragraph({ children: [new TextRun({ text: `• ${feature}`, size: 24 })], spacing: { after: 100 } })
    ),
  ] : [];

  const implementationChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Implementation Plan", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [createHeaderCell("Step"), createHeaderCell("Phase"), createHeaderCell("Description"), createHeaderCell("Timeline")] }),
        ...blueprint.implementationPlan.map((step, i) => 
          new TableRow({
            children: [
              createDataCell(step.step.toString(), i % 2 === 1),
              createDataCell(step.title, i % 2 === 1),
              createDataCell(step.description, i % 2 === 1),
              createDataCell(step.timeline, i % 2 === 1),
            ],
          })
        ),
      ],
    }),
  ];

  const riskReversalChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Risk Reversal & Support", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: "90-Day Risk-Free Guarantee", bold: true, size: 28, color: primaryColor })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.riskReversal, size: 24 })], spacing: { after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.whyPCBancard || "", size: 24 })], spacing: { after: 300 } }),
  ];

  const ctaChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Next Steps", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 300 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.callToAction, size: 24, bold: true })], spacing: { after: 400 } }),
    new Paragraph({ children: [new TextRun({ text: `Contact: ${blueprint.cover.agentName}`, size: 24 })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.cover.agentTitle, size: 22, italics: true })], spacing: { after: 100 } }),
    new Paragraph({ children: [new TextRun({ text: "PCBancard", size: 22, color: primaryColor })], spacing: { after: 400 } }),
  ];

  const complianceChildren: (Paragraph | Table)[] = [
    new Paragraph({ text: "Compliance & Disclosures", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: blueprint.complianceDisclosure, size: 18, color: "666666", italics: true })], spacing: { after: 200 } }),
  ];

  const doc = new Document({
    sections: [
      { properties: {}, children: coverPageChildren },
      { properties: {}, children: [...executiveSummaryChildren, ...snapshotChildren] },
      { properties: {}, children: [...comparisonChildren, ...recommendationChildren] },
      { properties: {}, children: [...equipmentChildren, ...implementationChildren, ...riskReversalChildren] },
      { properties: {}, children: [...ctaChildren, ...complianceChildren] },
    ],
  });
  
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export async function generateProposalPDF(
  blueprint: ProposalBlueprint,
  parsedData: ParsedProposal
): Promise<Buffer> {
  const fsModule = await import("fs");
  const pathModule = await import("path");
  
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const primaryColor = rgb(124 / 255, 92 / 255, 252 / 255);
  const lightPurple = rgb(232 / 255, 228 / 255, 252 / 255);
  const textColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.5, 0.5, 0.5);
  const whiteColor = rgb(1, 1, 1);
  
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  let logoImage: any = null;
  try {
    const logoPath = pathModule.join(process.cwd(), "server/assets/logos/pcb_logo_fullcolor.png");
    if (fsModule.existsSync(logoPath)) {
      const logoBytes = fsModule.readFileSync(logoPath);
      logoImage = await pdfDoc.embedPng(logoBytes);
    }
  } catch (logoError) {
    console.log("Could not load logo:", logoError);
  }
  
  // Helper to embed base64 images
  const embedBase64Image = async (base64Url: string | undefined) => {
    if (!base64Url) return null;
    try {
      const matches = base64Url.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!matches) return null;
      const [, format, data] = matches;
      const imageBytes = Buffer.from(data, 'base64');
      if (format === 'png') {
        return await pdfDoc.embedPng(imageBytes);
      } else {
        return await pdfDoc.embedJpg(imageBytes);
      }
    } catch (err) {
      console.log("Could not embed base64 image:", err);
      return null;
    }
  };
  
  // Embed proposal images
  let heroBannerImage: any = null;
  let comparisonBgImage: any = null;
  let trustImage: any = null;
  if (blueprint.images) {
    [heroBannerImage, comparisonBgImage, trustImage] = await Promise.all([
      embedBase64Image(blueprint.images.heroBanner),
      embedBase64Image(blueprint.images.comparisonBackground),
      embedBase64Image(blueprint.images.trustVisual),
    ]);
  }
  
  const wrapText = (text: string, maxWidth: number, fontSize: number, usedFont = font): string[] => {
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
  
  const addPageFooter = (page: any) => {
    if (logoImage) {
      const footerLogoWidth = 80;
      const footerLogoHeight = (logoImage.height / logoImage.width) * footerLogoWidth;
      page.drawImage(logoImage, {
        x: margin,
        y: 25,
        width: footerLogoWidth,
        height: footerLogoHeight,
      });
    }
    page.drawText("Confidential Proposal", {
      x: pageWidth - margin - 100,
      y: 30,
      size: 8,
      font,
      color: grayColor,
    });
  };

  // PAGE 1: COVER PAGE
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 80;
  
  if (logoImage) {
    const logoWidth = 200;
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
    page1.drawImage(logoImage, {
      x: (pageWidth - logoWidth) / 2,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    y -= logoHeight + 40;
  }
  
  // Add hero banner image if available
  if (heroBannerImage) {
    const bannerWidth = contentWidth;
    const bannerHeight = Math.min((heroBannerImage.height / heroBannerImage.width) * bannerWidth, 150);
    page1.drawImage(heroBannerImage, {
      x: margin,
      y: y - bannerHeight,
      width: bannerWidth,
      height: bannerHeight,
    });
    y -= bannerHeight + 30;
  }
  
  page1.drawText(blueprint.cover.headline, {
    x: margin,
    y,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });
  y -= 40;
  
  page1.drawText(blueprint.cover.subheadline, {
    x: margin,
    y,
    size: 16,
    font,
    color: grayColor,
  });
  y -= 60;
  
  page1.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 2, color: primaryColor });
  y -= 40;
  
  page1.drawText("Prepared For:", { x: margin, y, size: 12, font, color: grayColor });
  y -= 25;
  page1.drawText(blueprint.cover.merchantName, { x: margin, y, size: 22, font: boldFont, color: textColor });
  y -= 50;
  
  page1.drawText("Date:", { x: margin, y, size: 12, font, color: grayColor });
  y -= 20;
  page1.drawText(blueprint.cover.preparedDate, { x: margin, y, size: 14, font, color: textColor });
  y -= 40;
  
  page1.drawText("Prepared By:", { x: margin, y, size: 12, font, color: grayColor });
  y -= 20;
  page1.drawText(blueprint.cover.agentName, { x: margin, y, size: 14, font: boldFont, color: textColor });
  y -= 18;
  page1.drawText(blueprint.cover.agentTitle, { x: margin, y, size: 12, font, color: grayColor });
  y -= 18;
  page1.drawText("PCBancard", { x: margin, y, size: 12, font, color: primaryColor });
  
  addPageFooter(page1);

  // PAGE 2: EXECUTIVE SUMMARY + CURRENT SNAPSHOT
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
  
  page2.drawText("Executive Summary", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 30;
  
  const introLines = wrapText(blueprint.executiveSummary.intro, contentWidth, 11);
  for (const line of introLines) {
    page2.drawText(line, { x: margin, y, size: 11, font, color: textColor });
    y -= 15;
  }
  y -= 10;
  
  const situationLines = wrapText(blueprint.executiveSummary.currentSituation, contentWidth, 11);
  for (const line of situationLines) {
    page2.drawText(line, { x: margin, y, size: 11, font, color: textColor });
    y -= 15;
  }
  y -= 10;
  
  const recommendationLines = wrapText(blueprint.executiveSummary.recommendation, contentWidth, 11, boldFont);
  for (const line of recommendationLines) {
    page2.drawText(line, { x: margin, y, size: 11, font: boldFont, color: textColor });
    y -= 15;
  }
  y -= 30;
  
  page2.drawText("Current Processing Snapshot", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 25;
  
  const snapshotData = [
    ["Monthly Processing Volume", `$${blueprint.currentSnapshot.monthlyVolume.toLocaleString()}`],
    ["Monthly Transactions", blueprint.currentSnapshot.monthlyTransactions.toLocaleString()],
    ["Average Ticket Size", `$${blueprint.currentSnapshot.avgTicket.toFixed(2)}`],
    ["Current Monthly Fees", `$${blueprint.currentSnapshot.currentMonthlyFees.toLocaleString()}`],
    ["Effective Rate", `${blueprint.currentSnapshot.effectiveRate.toFixed(2)}%`],
    ["Annual Processing Cost", `$${blueprint.currentSnapshot.annualCost.toLocaleString()}`],
  ];
  
  page2.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 22, color: primaryColor });
  page2.drawText("Metric", { x: margin + 10, y: y, size: 11, font: boldFont, color: whiteColor });
  page2.drawText("Value", { x: margin + 300, y: y, size: 11, font: boldFont, color: whiteColor });
  y -= 25;
  
  snapshotData.forEach((row, i) => {
    if (i % 2 === 1) {
      page2.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: lightPurple });
    }
    page2.drawText(row[0], { x: margin + 10, y, size: 10, font, color: textColor });
    page2.drawText(row[1], { x: margin + 300, y, size: 10, font: boldFont, color: textColor });
    y -= 20;
  });
  
  addPageFooter(page2);

  // PAGE 3: OPTIONS COMPARISON + RECOMMENDATION
  const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
  
  page3.drawText("Options Comparison", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 25;
  
  const comparisonHeaders = ["Option", "Monthly Cost", "Monthly Savings", "Annual Savings"];
  const colWidths = [140, 110, 120, 120];
  
  page3.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 22, color: primaryColor });
  let xPos = margin;
  comparisonHeaders.forEach((header, i) => {
    page3.drawText(header, { x: xPos + 5, y, size: 10, font: boldFont, color: whiteColor });
    xPos += colWidths[i];
  });
  y -= 25;
  
  const comparisonData: string[][] = [
    ["Current Processor", `$${blueprint.savingsComparison.currentCost.toLocaleString()}`, "-", "-"],
  ];
  
  if (blueprint.savingsComparison.dualPricingCost !== undefined) {
    const label = blueprint.savingsComparison.recommendedOption === "dual_pricing" ? "Dual Pricing (Recommended)" : "Dual Pricing";
    comparisonData.push([
      label,
      `$${blueprint.savingsComparison.dualPricingCost.toLocaleString()}`,
      `$${blueprint.savingsComparison.dualPricingSavings!.toLocaleString()}`,
      `$${(blueprint.savingsComparison.dualPricingSavings! * 12).toLocaleString()}`,
    ]);
  }
  
  if (blueprint.savingsComparison.interchangePlusCost !== undefined) {
    const label = blueprint.savingsComparison.recommendedOption === "interchange_plus" ? "Interchange Plus (Recommended)" : "Interchange Plus";
    comparisonData.push([
      label,
      `$${blueprint.savingsComparison.interchangePlusCost.toLocaleString()}`,
      `$${blueprint.savingsComparison.interchangePlusSavings!.toLocaleString()}`,
      `$${(blueprint.savingsComparison.interchangePlusSavings! * 12).toLocaleString()}`,
    ]);
  }
  
  comparisonData.forEach((row, rowIdx) => {
    if (rowIdx % 2 === 1) {
      page3.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: lightPurple });
    }
    xPos = margin;
    row.forEach((cell, i) => {
      page3.drawText(cell, { x: xPos + 5, y, size: 10, font, color: textColor });
      xPos += colWidths[i];
    });
    y -= 20;
  });
  y -= 30;
  
  page3.drawText("Our Recommendation", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 25;
  
  const explanationText = blueprint.savingsComparison.recommendedOption === "dual_pricing"
    ? (blueprint.dualPricingExplanation || "")
    : (blueprint.interchangePlusExplanation || "");
  
  const explanationLines = wrapText(explanationText, contentWidth, 11);
  for (const line of explanationLines) {
    page3.drawText(line, { x: margin, y, size: 11, font, color: textColor });
    y -= 15;
  }
  y -= 20;
  
  page3.drawText("Why This Solution:", { x: margin, y, size: 14, font: boldFont, color: primaryColor });
  y -= 22;
  
  blueprint.recommendationReasons.forEach((reason, i) => {
    const reasonLines = wrapText(`${i + 1}. ${reason}`, contentWidth - 20, 11);
    for (const line of reasonLines) {
      page3.drawText(line, { x: margin + 10, y, size: 11, font, color: textColor });
      y -= 15;
    }
    y -= 5;
  });
  
  addPageFooter(page3);

  // PAGE 4: EQUIPMENT + IMPLEMENTATION + RISK REVERSAL + CTA + COMPLIANCE
  const page4 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;
  
  if (blueprint.equipment) {
    page4.drawText("Equipment Recommendation", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
    y -= 25;
    page4.drawText(blueprint.equipment.terminalName, { x: margin, y, size: 14, font: boldFont, color: textColor });
    y -= 20;
    
    const equipmentLines = wrapText(blueprint.equipment.whyRecommended, contentWidth, 11);
    for (const line of equipmentLines) {
      page4.drawText(line, { x: margin, y, size: 11, font, color: textColor });
      y -= 15;
    }
    y -= 10;
    
    page4.drawText("Key Features:", { x: margin, y, size: 12, font: boldFont, color: textColor });
    y -= 18;
    
    blueprint.equipment.terminalFeatures.slice(0, 5).forEach(feature => {
      page4.drawText(`• ${feature}`, { x: margin + 15, y, size: 10, font, color: textColor });
      y -= 14;
    });
    y -= 20;
  }
  
  page4.drawText("Implementation Plan", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 25;
  
  const implHeaders = ["Step", "Phase", "Description", "Timeline"];
  const implWidths = [40, 100, 250, 100];
  
  page4.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 20, color: primaryColor });
  xPos = margin;
  implHeaders.forEach((header, i) => {
    page4.drawText(header, { x: xPos + 3, y, size: 9, font: boldFont, color: whiteColor });
    xPos += implWidths[i];
  });
  y -= 22;
  
  blueprint.implementationPlan.forEach((step, i) => {
    if (i % 2 === 1) {
      page4.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 18, color: lightPurple });
    }
    xPos = margin;
    page4.drawText(step.step.toString(), { x: xPos + 3, y, size: 9, font, color: textColor });
    xPos += implWidths[0];
    page4.drawText(step.title.substring(0, 18), { x: xPos + 3, y, size: 9, font, color: textColor });
    xPos += implWidths[1];
    page4.drawText(step.description.substring(0, 50), { x: xPos + 3, y, size: 9, font, color: textColor });
    xPos += implWidths[2];
    page4.drawText(step.timeline, { x: xPos + 3, y, size: 9, font, color: textColor });
    y -= 18;
  });
  y -= 25;
  
  page4.drawText("Risk Reversal & Support", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 22;
  page4.drawText("90-Day Risk-Free Guarantee", { x: margin, y, size: 14, font: boldFont, color: textColor });
  y -= 18;
  
  const riskLines = wrapText(blueprint.riskReversal, contentWidth, 10);
  for (const line of riskLines.slice(0, 6)) {
    page4.drawText(line, { x: margin, y, size: 10, font, color: textColor });
    y -= 13;
  }
  y -= 20;
  
  page4.drawText("Next Steps", { x: margin, y, size: 18, font: boldFont, color: primaryColor });
  y -= 22;
  
  const ctaLines = wrapText(blueprint.callToAction, contentWidth, 11, boldFont);
  for (const line of ctaLines.slice(0, 4)) {
    page4.drawText(line, { x: margin, y, size: 11, font: boldFont, color: textColor });
    y -= 15;
  }
  y -= 10;
  
  page4.drawText(`Contact: ${blueprint.cover.agentName}`, { x: margin, y, size: 11, font, color: textColor });
  y -= 15;
  page4.drawText(`${blueprint.cover.agentTitle} | PCBancard`, { x: margin, y, size: 10, font, color: primaryColor });
  y -= 30;
  
  page4.drawRectangle({ x: margin, y: y + 5, width: contentWidth, height: 1, color: grayColor });
  y -= 10;
  page4.drawText("Compliance & Disclosures", { x: margin, y, size: 12, font: boldFont, color: grayColor });
  y -= 15;
  
  const complianceLines = wrapText(blueprint.complianceDisclosure, contentWidth, 8);
  for (const line of complianceLines.slice(0, 6)) {
    page4.drawText(line, { x: margin, y, size: 8, font, color: grayColor });
    y -= 10;
  }
  
  addPageFooter(page4);
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
