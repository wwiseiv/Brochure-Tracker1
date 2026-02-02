import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export interface FlyerContent {
  headline: string;
  subhead: string;
  bullets: string[];
  ctaText: string;
  ctaSubtext?: string;
}

export interface RepInfo {
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  email?: string;
  title?: string;
}

export interface FlyerBuildOptions {
  content: FlyerContent;
  heroImageUrl?: string;
  repInfo?: RepInfo;
  industry?: string;
  templateStyle?: 'dual_pricing' | 'traditional' | 'general';
}

const BRAND_COLORS = {
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  secondary: '#F59E0B',
  secondaryLight: '#FEF3C7',
  success: '#10B981',
  successLight: '#ECFDF5',
  dark: '#1F2937',
  gray: '#6B7280',
  light: '#F9FAFB',
  white: '#FFFFFF'
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function interpolateColor(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }, factor: number): string {
  const r = Math.round(color1.r + (color2.r - color1.r) * factor);
  const g = Math.round(color1.g + (color2.g - color1.g) * factor);
  const b = Math.round(color1.b + (color2.b - color1.b) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function drawGradientRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  colorStart: string,
  colorEnd: string,
  steps: number = 50,
  direction: 'horizontal' | 'vertical' = 'vertical'
): void {
  const startRgb = hexToRgb(colorStart);
  const endRgb = hexToRgb(colorEnd);
  
  if (direction === 'vertical') {
    const stepHeight = height / steps;
    for (let i = 0; i < steps; i++) {
      const factor = i / steps;
      const color = interpolateColor(startRgb, endRgb, factor);
      doc.rect(x, y + (i * stepHeight), width, stepHeight + 1).fill(color);
    }
  } else {
    const stepWidth = width / steps;
    for (let i = 0; i < steps; i++) {
      const factor = i / steps;
      const color = interpolateColor(startRgb, endRgb, factor);
      doc.rect(x + (i * stepWidth), y, stepWidth + 1, height).fill(color);
    }
  }
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function getRepFullName(repInfo?: RepInfo): string {
  if (!repInfo) return '';
  if (repInfo.firstName && repInfo.lastName) {
    return `${repInfo.firstName} ${repInfo.lastName}`;
  }
  return repInfo.name || '';
}

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      if (!url) {
        resolve(null);
        return;
      }

      if (url.startsWith('/')) {
        const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
        const localPath = path.join(process.cwd(), 'client', 'public', cleanUrl);
        console.log('[PDFBuilder] Attempting to load local image from:', localPath);
        if (fs.existsSync(localPath)) {
          resolve(fs.readFileSync(localPath));
          console.log('[PDFBuilder] Successfully loaded local image');
        } else {
          console.log('[PDFBuilder] Local image not found:', localPath);
          resolve(null);
        }
        return;
      }

      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', () => resolve(null));
      }).on('error', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

export async function buildFlyerPDF(options: FlyerBuildOptions): Promise<string> {
  const { content, heroImageUrl, repInfo, industry } = options;
  
  const timestamp = Date.now();
  const filename = `flyer_${timestamp}.pdf`;
  const outputDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'generated');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, filename);
  
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: 'PCBancard Dual Pricing Program',
          Author: 'PCBancard',
          Subject: 'Dual Pricing Program Benefits',
        }
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      doc.rect(0, 0, pageWidth, 6).fill(BRAND_COLORS.secondary);

      drawGradientRect(doc, 0, 6, pageWidth, 214, BRAND_COLORS.primary, '#312E81', 60);

      let heroImage: Buffer | null = null;
      if (heroImageUrl) {
        heroImage = await downloadImage(heroImageUrl);
      }

      if (heroImage) {
        try {
          doc.image(heroImage, 0, 6, {
            width: pageWidth,
            height: 214,
            cover: [pageWidth, 214],
          });
          
          doc.save();
          drawGradientRect(doc, 0, 100, pageWidth, 120, 'rgba(0,0,0,0)', BRAND_COLORS.dark, 40);
          doc.restore();
        } catch (e) {
          console.log('[PDFBuilder] Hero image insert failed, using gradient background');
        }
      }

      doc.save();
      doc.rect(0, 120, pageWidth, 100)
         .fillOpacity(0.6)
         .fill(BRAND_COLORS.dark);
      doc.restore();
      doc.fillOpacity(1);

      doc.font('Helvetica-Bold')
         .fontSize(38)
         .fillColor(BRAND_COLORS.white)
         .text(content.headline, margin, 135, {
           width: contentWidth,
           align: 'left',
           lineGap: 2,
         });

      doc.font('Helvetica')
         .fontSize(14)
         .fillColor('#E5E7EB')
         .text(content.subhead, margin, 185, {
           width: contentWidth - 60,
           align: 'left',
         });

      const benefitsY = 235;
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(BRAND_COLORS.dark)
         .text('WHY MERCHANTS CHOOSE US', margin, benefitsY);
      
      doc.rect(margin, benefitsY + 20, 80, 3).fill(BRAND_COLORS.secondary);

      const benefitsStartY = benefitsY + 40;
      const columnWidth = (contentWidth - 30) / 2;
      const benefitHeight = 45;
      
      content.bullets.slice(0, 6).forEach((bullet, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const xPos = margin + (column * (columnWidth + 30));
        const yPos = benefitsStartY + (row * benefitHeight);

        doc.circle(xPos + 12, yPos + 12, 12).fill(BRAND_COLORS.primary);
        
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(BRAND_COLORS.white)
           .text(String(index + 1), xPos + 8, yPos + 7);

        doc.font('Helvetica')
           .fontSize(11)
           .fillColor(BRAND_COLORS.dark)
           .text(bullet, xPos + 32, yPos + 5, {
             width: columnWidth - 40,
             lineGap: 2,
           });
      });

      const ctaY = 530;
      drawGradientRect(doc, 0, ctaY, pageWidth, 80, BRAND_COLORS.primary, '#3730A3', 40, 'horizontal');

      doc.font('Helvetica-Bold')
         .fontSize(22)
         .fillColor(BRAND_COLORS.white)
         .text(content.ctaText, margin, ctaY + 20, {
           width: contentWidth * 0.55,
         });

      if (content.ctaSubtext) {
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor('#C7D2FE')
           .text(content.ctaSubtext, margin, ctaY + 48, {
             width: contentWidth * 0.55,
           });
      }

      const repFullName = getRepFullName(repInfo);
      if (repFullName) {
        const cardWidth = 200;
        const cardHeight = 130;
        const cardX = pageWidth - margin - cardWidth;
        const cardY = 620;

        doc.save();
        doc.rect(cardX + 3, cardY + 3, cardWidth, cardHeight)
           .fillOpacity(0.15)
           .fill('#000000');
        doc.restore();
        doc.fillOpacity(1);

        doc.rect(cardX, cardY, cardWidth, cardHeight)
           .fill(BRAND_COLORS.white);
        doc.rect(cardX, cardY, cardWidth, cardHeight)
           .strokeColor('#E5E7EB')
           .lineWidth(1)
           .stroke();

        drawGradientRect(doc, cardX, cardY, cardWidth, 28, BRAND_COLORS.primary, '#3730A3', 30, 'horizontal');
        
        doc.font('Helvetica-Bold')
           .fontSize(11)
           .fillColor(BRAND_COLORS.white)
           .text('PCBancard', cardX + 12, cardY + 8);

        doc.font('Helvetica-Bold')
           .fontSize(16)
           .fillColor(BRAND_COLORS.dark)
           .text(repFullName, cardX + 12, cardY + 40, {
             width: cardWidth - 24,
           });

        const repTitle = repInfo?.title || 'Payment Consultant';
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(BRAND_COLORS.gray)
           .text(repTitle, cardX + 12, cardY + 60);

        doc.rect(cardX + 12, cardY + 75, cardWidth - 24, 1).fill('#E5E7EB');

        let contactY = cardY + 85;
        if (repInfo?.phone) {
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor(BRAND_COLORS.dark)
             .text(formatPhoneNumber(repInfo.phone), cardX + 12, contactY);
          contactY += 14;
        }
        if (repInfo?.email) {
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor(BRAND_COLORS.primary)
             .text(repInfo.email, cardX + 12, contactY);
        }
      }

      const footerY = 742;
      
      drawGradientRect(doc, 0, footerY, pageWidth, 3, BRAND_COLORS.secondary, BRAND_COLORS.primary, 60, 'horizontal');
      
      doc.rect(0, footerY + 3, pageWidth, pageHeight - footerY - 3)
         .fill(BRAND_COLORS.dark);

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(BRAND_COLORS.white)
         .text('PCBancard', margin, footerY + 18);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#9CA3AF')
         .text(`© ${new Date().getFullYear()} PCBancard. All rights reserved.`, 0, footerY + 20, {
           width: pageWidth,
           align: 'center',
         });

      if (industry) {
        const industryLabel = industry.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.font('Helvetica')
           .fontSize(8)
           .fillColor('#9CA3AF')
           .text(industryLabel, pageWidth - margin - 120, footerY + 20, {
             width: 120,
             align: 'right',
           });
      }

      doc.end();

      writeStream.on('finish', () => {
        console.log('[PDFBuilder] Professional flyer PDF created:', filename);
        resolve(`/marketing/generated/${filename}`);
      });

      writeStream.on('error', (err) => {
        console.error('[PDFBuilder] Write error:', err);
        reject(err);
      });

    } catch (error) {
      console.error('[PDFBuilder] Error building PDF:', error);
      reject(error);
    }
  });
}

export async function generateFlyerPreviewImage(pdfPath: string): Promise<string | null> {
  return null;
}
