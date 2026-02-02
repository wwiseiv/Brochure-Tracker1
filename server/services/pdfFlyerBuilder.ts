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
  name?: string;
  phone?: string;
  email?: string;
}

export interface FlyerBuildOptions {
  content: FlyerContent;
  heroImageUrl?: string;
  repInfo?: RepInfo;
  industry?: string;
  templateStyle?: 'dual_pricing' | 'traditional' | 'general';
}

const BRAND_COLORS = {
  primary: '#6366F1',
  secondary: '#F59E0B',
  dark: '#1E1B4B',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
};

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      if (!url) {
        resolve(null);
        return;
      }

      if (url.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'client', 'public', url);
        if (fs.existsSync(localPath)) {
          resolve(fs.readFileSync(localPath));
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
          Title: 'PCBancard Marketing Flyer',
          Author: 'PCBancard',
        }
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      const pageWidth = 612;
      const pageHeight = 792;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      doc.rect(0, 0, pageWidth, 280)
         .fill(BRAND_COLORS.primary);

      let heroImage: Buffer | null = null;
      if (heroImageUrl) {
        heroImage = await downloadImage(heroImageUrl);
      }

      if (heroImage) {
        try {
          doc.image(heroImage, 0, 0, {
            width: pageWidth,
            height: 280,
            cover: [pageWidth, 280],
          });
          
          doc.save();
          doc.rect(0, 0, pageWidth, 280)
             .fillOpacity(0.5)
             .fill(BRAND_COLORS.primary);
          doc.restore();
          doc.fillOpacity(1);
        } catch (e) {
          console.log('[PDFBuilder] Hero image insert failed, using solid color');
        }
      }

      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(BRAND_COLORS.white)
         .text('PCBancard', margin, 20);

      doc.font('Helvetica-Bold')
         .fontSize(32)
         .fillColor(BRAND_COLORS.white)
         .text(content.headline, margin, 160, {
           width: contentWidth,
           align: 'left',
           lineGap: 4,
         });

      doc.font('Helvetica')
         .fontSize(14)
         .fillColor(BRAND_COLORS.white)
         .text(content.subhead, margin, 220, {
           width: contentWidth - 100,
           align: 'left',
         });

      const benefitsY = 310;
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(BRAND_COLORS.primary)
         .text('WHY CHOOSE PCBANCARD?', margin, benefitsY);

      let bulletY = benefitsY + 30;
      const bulletSpacing = 36;
      
      content.bullets.slice(0, 6).forEach((bullet, index) => {
        doc.save();
        doc.circle(margin + 10, bulletY + 7, 10)
           .fill(BRAND_COLORS.primary);
        doc.font('Helvetica-Bold')
           .fontSize(12)
           .fillColor(BRAND_COLORS.white)
           .text('✓', margin + 5, bulletY + 2);
        doc.restore();

        doc.font('Helvetica')
           .fontSize(11)
           .fillColor(BRAND_COLORS.dark)
           .text(bullet, margin + 30, bulletY, {
             width: contentWidth - 40,
           });

        bulletY += bulletSpacing;
      });

      const ctaY = 580;
      doc.rect(margin - 10, ctaY, contentWidth + 20, 90)
         .fill(BRAND_COLORS.primary);

      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor(BRAND_COLORS.white)
         .text(content.ctaText, margin + 10, ctaY + 20, {
           width: contentWidth / 2,
         });

      if (content.ctaSubtext) {
        doc.font('Helvetica')
           .fontSize(12)
           .fillColor(BRAND_COLORS.white)
           .text(content.ctaSubtext, margin + 10, ctaY + 55, {
             width: contentWidth / 2,
           });
      }

      if (repInfo?.name) {
        const contactX = pageWidth / 2 + 20;
        doc.font('Helvetica-Bold')
           .fontSize(14)
           .fillColor(BRAND_COLORS.white)
           .text(repInfo.name, contactX, ctaY + 20, {
             width: contentWidth / 2 - 40,
             align: 'right',
           });

        let contactY = ctaY + 40;
        if (repInfo.phone) {
          doc.font('Helvetica')
             .fontSize(11)
             .text(repInfo.phone, contactX, contactY, {
               width: contentWidth / 2 - 40,
               align: 'right',
             });
          contactY += 15;
        }
        if (repInfo.email) {
          doc.font('Helvetica')
             .fontSize(11)
             .text(repInfo.email, contactX, contactY, {
               width: contentWidth / 2 - 40,
               align: 'right',
             });
        }
      }

      const footerY = 720;
      doc.rect(0, footerY, pageWidth, pageHeight - footerY)
         .fill(BRAND_COLORS.lightGray);

      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor(BRAND_COLORS.primary)
         .text('PCBancard', margin, footerY + 20);

      doc.font('Helvetica')
         .fontSize(9)
         .fillColor(BRAND_COLORS.gray)
         .text(`© ${new Date().getFullYear()} PCBancard. All rights reserved.`, margin, footerY + 40);

      if (industry) {
        const industryLabel = industry.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor(BRAND_COLORS.gray)
           .text(`Industry: ${industryLabel}`, pageWidth - margin - 150, footerY + 40, {
             width: 150,
             align: 'right',
           });
      }

      doc.end();

      writeStream.on('finish', () => {
        console.log('[PDFBuilder] Flyer PDF created:', filename);
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
