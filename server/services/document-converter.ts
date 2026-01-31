import puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, convertInchesToTwip } from "docx";
import type { GeneratedDocument } from "./claude-document-generator";
import type { ParsedProposal } from "../proposal-generator";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2 
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export async function convertHtmlToPdf(html: string): Promise<Buffer> {
  console.log("[DocumentConverter] Starting HTML to PDF conversion with Puppeteer...");
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 0 0.5in; display: flex; justify-content: space-between; color: #94a3b8;">
          <span>Confidential Proposal</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    console.log("[DocumentConverter] PDF generated successfully, size:", pdfBuffer.length, "bytes");
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

interface DocxGenerationOptions {
  merchantName: string;
  businessAddress?: string;
  sections: GeneratedDocument["sections"];
  parsedData: ParsedProposal;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  agentPhone: string;
  date: string;
  equipmentList?: { name: string; description?: string; price?: string }[];
}

export async function generateDocx(opts: DocxGenerationOptions): Promise<Buffer> {
  console.log("[DocumentConverter] Generating DOCX document...");

  const { merchantName, businessAddress, sections, parsedData, agentName, agentTitle, agentEmail, agentPhone, date, equipmentList } = opts;

  const totalVolume = parsedData.currentState?.totalVolume || 0;
  const totalTransactions = parsedData.currentState?.totalTransactions || 0;
  const avgTicket = parsedData.currentState?.avgTicket || 0;
  const effectiveRate = parsedData.currentState?.effectiveRatePercent || 0;
  const currentMonthlyCost = parsedData.currentState?.totalMonthlyCost || 0;
  
  const dpSavingsMonthly = parsedData.optionDualPricing?.monthlySavings || 0;
  const dpSavingsAnnual = parsedData.optionDualPricing?.annualSavings || 0;
  const icpSavingsMonthly = parsedData.optionInterchangePlus?.monthlySavings || 0;
  const icpSavingsAnnual = parsedData.optionInterchangePlus?.annualSavings || 0;

  const purpleColor = "7C5CFC";
  const grayColor = "64748b";

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: "Calibri",
            size: 24,
          },
          paragraph: {
            spacing: { after: 120 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "PCBancard",
                bold: true,
                size: 72,
                color: purpleColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 200 },
            children: [
              new TextRun({
                text: "Payment Processing Proposal",
                bold: true,
                size: 56,
                color: purpleColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Customized savings analysis prepared exclusively for",
                size: 28,
                color: grayColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
            children: [
              new TextRun({
                text: merchantName,
                bold: true,
                size: 44,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
              new TextRun({ text: "Prepared For: ", bold: true, size: 24 }),
              new TextRun({ text: merchantName, size: 24 }),
            ],
          }),
          ...(businessAddress ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: businessAddress, size: 22, color: grayColor })],
            }),
          ] : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: "Prepared By: ", bold: true, size: 24 }),
              new TextRun({ text: agentName, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: agentTitle, size: 22, color: grayColor })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `${agentPhone} | ${agentEmail}`, size: 22, color: grayColor })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [new TextRun({ text: date, size: 22, color: grayColor })],
          }),

          new Paragraph({ children: [], pageBreakBefore: true }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "1. Executive Summary", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.executiveSummary.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "2. Current Processing Analysis", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.currentAnalysis.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    shading: { fill: purpleColor },
                    children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, color: "FFFFFF", size: 22 })] })],
                  }),
                  new TableCell({
                    shading: { fill: purpleColor },
                    children: [new Paragraph({ children: [new TextRun({ text: "Current Value", bold: true, color: "FFFFFF", size: 22 })] })],
                  }),
                ],
              }),
              createTableRow("Monthly Processing Volume", formatCurrency(totalVolume)),
              createTableRow("Monthly Transactions", totalTransactions.toLocaleString()),
              createTableRow("Average Ticket Size", formatCurrency(avgTicket)),
              createTableRow("Current Monthly Fees", formatCurrency(currentMonthlyCost)),
              createTableRow("Effective Rate", formatPercent(effectiveRate)),
            ],
          }),

          new Paragraph({ children: [], pageBreakBefore: true }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "3. Savings Comparison", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.savingsComparison.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),
          
          new Paragraph({
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({ text: "Dual Pricing Program: ", bold: true, size: 28, color: "059669" }),
              new TextRun({ text: `${formatCurrency(dpSavingsAnnual)} annual savings (${formatCurrency(dpSavingsMonthly)}/month)`, size: 28, color: "059669" }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "Interchange Plus: ", bold: true, size: 28, color: "2563eb" }),
              new TextRun({ text: `${formatCurrency(icpSavingsAnnual)} annual savings (${formatCurrency(icpSavingsMonthly)}/month)`, size: 28, color: "2563eb" }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "4. Our Recommendation", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.recommendation.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              spacing: { after: 200 },
              shading: { fill: "f5f3ff" },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),

          new Paragraph({ children: [], pageBreakBefore: true }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "5. Equipment Recommendation", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.equipmentRecommendation.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),
          ...(equipmentList || []).map(eq =>
            new Paragraph({
              spacing: { after: 150 },
              bullet: { level: 0 },
              children: [
                new TextRun({ text: `${eq.name}${eq.price ? ` (${eq.price})` : ''}: `, bold: true, size: 24 }),
                new TextRun({ text: eq.description || 'Professional equipment', size: 24 }),
              ],
            })
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({ text: "6. Next Steps", bold: true, size: 36, color: purpleColor }),
            ],
          }),
          ...sections.nextSteps.split('\n').filter(p => p.trim()).map((step, i) =>
            new Paragraph({
              spacing: { after: 150 },
              numbering: { reference: "default-numbering", level: 0 },
              children: [new TextRun({ text: step.replace(/^\d+\.\s*/, ''), size: 24 })],
            })
          ),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 },
            shading: { fill: purpleColor },
            children: [
              new TextRun({ text: "Ready to Start Saving?", bold: true, size: 36, color: "FFFFFF" }),
            ],
          }),
          ...sections.closingStatement.split('\n').filter(p => p.trim()).map(para =>
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: para, size: 24 })],
            })
          ),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 },
            children: [
              new TextRun({ text: agentName, bold: true, size: 28, color: purpleColor }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${agentPhone} | ${agentEmail}`, size: 24, color: grayColor }),
            ],
          }),
        ],
      },
    ],
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
  });

  const buffer = await Packer.toBuffer(doc);
  console.log("[DocumentConverter] DOCX generated successfully, size:", buffer.length, "bytes");
  return buffer;
}

function createTableRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
        },
        children: [new Paragraph({ children: [new TextRun({ text: label, size: 22 })] })],
      }),
      new TableCell({
        borders: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
        },
        children: [new Paragraph({ children: [new TextRun({ text: value, bold: true, size: 22 })] })],
      }),
    ],
  });
}
