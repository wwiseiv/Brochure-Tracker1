import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { storage } from "./storage";

export interface CertificateData {
  recipientName: string;
  certificateType: string;
  title: string;
  description: string;
  issuedDate: string;
  verificationCode: string;
}

export const CERTIFICATE_TYPES = {
  presentation_mastery: {
    title: "Presentation Mastery Certificate",
    description: "Has demonstrated mastery of the PCBancard Dual Pricing Presentation through completion of all 8 training modules, 24 lessons, and achieving passing scores on all assessments.",
    requirement: "Complete all 24 presentation training lessons",
  },
  equipiq_expert: {
    title: "Equipment Expert Certificate",
    description: "Has demonstrated comprehensive knowledge of payment processing equipment through successful completion of EquipIQ assessment program.",
    requirement: "Complete 20+ EquipIQ quizzes with 80%+ average score",
  },
  roleplay_champion: {
    title: "Roleplay Champion Certificate",
    description: "Has demonstrated exceptional sales conversation skills through extensive practice in AI-powered roleplay sessions.",
    requirement: "Complete 30+ roleplay sessions with 75+ average performance score",
  },
  sales_excellence: {
    title: "Sales Excellence Certificate",
    description: "Has achieved the highest level of sales training proficiency across all PCBancard training programs, demonstrating mastery in presentations, equipment knowledge, and sales conversations.",
    requirement: "Earn Gold badge or higher in 3+ categories",
  },
};

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 612]);
  const { width, height } = page.getSize();

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: rgb(0.98, 0.97, 0.94),
  });

  const borderWidth = 3;
  const margin = 30;
  page.drawRectangle({
    x: margin, y: margin,
    width: width - 2 * margin,
    height: height - 2 * margin,
    borderColor: rgb(0.18, 0.33, 0.59),
    borderWidth,
  });

  page.drawRectangle({
    x: margin + 8, y: margin + 8,
    width: width - 2 * (margin + 8),
    height: height - 2 * (margin + 8),
    borderColor: rgb(0.72, 0.65, 0.45),
    borderWidth: 1.5,
  });

  const headerText = "PCBANCARD";
  const headerSize = 16;
  const headerWidth = helveticaBold.widthOfTextAtSize(headerText, headerSize);
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: height - 80,
    size: headerSize,
    font: helveticaBold,
    color: rgb(0.18, 0.33, 0.59),
  });

  const certTitle = "Certificate of Achievement";
  const certTitleSize = 28;
  const certTitleWidth = helveticaBold.widthOfTextAtSize(certTitle, certTitleSize);
  page.drawText(certTitle, {
    x: (width - certTitleWidth) / 2,
    y: height - 125,
    size: certTitleSize,
    font: helveticaBold,
    color: rgb(0.18, 0.33, 0.59),
  });

  page.drawLine({
    start: { x: 150, y: height - 140 },
    end: { x: width - 150, y: height - 140 },
    thickness: 1.5,
    color: rgb(0.72, 0.65, 0.45),
  });

  const certifiesText = "This certifies that";
  const certifiesSize = 14;
  const certifiesWidth = timesRomanItalic.widthOfTextAtSize(certifiesText, certifiesSize);
  page.drawText(certifiesText, {
    x: (width - certifiesWidth) / 2,
    y: height - 180,
    size: certifiesSize,
    font: timesRomanItalic,
    color: rgb(0.3, 0.3, 0.3),
  });

  const nameSize = 32;
  const nameWidth = helveticaBold.widthOfTextAtSize(data.recipientName, nameSize);
  page.drawText(data.recipientName, {
    x: (width - nameWidth) / 2,
    y: height - 225,
    size: nameSize,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawLine({
    start: { x: 150, y: height - 235 },
    end: { x: width - 150, y: height - 235 },
    thickness: 0.8,
    color: rgb(0.5, 0.5, 0.5),
  });

  const awardTitleSize = 20;
  const awardTitleWidth = helveticaBold.widthOfTextAtSize(data.title, awardTitleSize);
  page.drawText(data.title, {
    x: (width - awardTitleWidth) / 2,
    y: height - 280,
    size: awardTitleSize,
    font: helveticaBold,
    color: rgb(0.18, 0.33, 0.59),
  });

  const descSize = 11;
  const maxLineWidth = width - 200;
  const descWords = data.description.split(' ');
  let lines: string[] = [];
  let currentLine = '';

  for (const word of descWords) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = helvetica.widthOfTextAtSize(testLine, descSize);
    if (testWidth > maxLineWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  let yPos = height - 320;
  for (const line of lines) {
    const lineWidth = helvetica.widthOfTextAtSize(line, descSize);
    page.drawText(line, {
      x: (width - lineWidth) / 2,
      y: yPos,
      size: descSize,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPos -= 18;
  }

  const dateText = `Issued: ${data.issuedDate}`;
  const dateSize = 11;
  const dateWidth = helvetica.widthOfTextAtSize(dateText, dateSize);
  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: 100,
    size: dateSize,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  const verifyText = `Verification: ${data.verificationCode}`;
  const verifySize = 9;
  const verifyWidth = helvetica.widthOfTextAtSize(verifyText, verifySize);
  page.drawText(verifyText, {
    x: (width - verifyWidth) / 2,
    y: 70,
    size: verifySize,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function checkCertificateEligibility(userId: string): Promise<string[]> {
  const eligible: string[] = [];
  const existingCerts = await storage.getCertificatesForUser(userId);
  const existingTypes = new Set(existingCerts.map(c => c.certificateType));

  if (!existingTypes.has('presentation_mastery')) {
    try {
      const progress = await storage.getUserPresentationProgress(userId);
      const completedLessons = progress.filter((p: any) => p.completed).length;
      if (completedLessons >= 24) {
        eligible.push('presentation_mastery');
      }
    } catch (e) { /* ignore */ }
  }

  if (!existingTypes.has('equipiq_expert')) {
    try {
      const quizResults = await storage.getEquipmentQuizResults(userId);
      if (quizResults.length >= 20) {
        const avgScore = quizResults.reduce((sum: number, r: any) => sum + r.score, 0) / quizResults.length;
        if (avgScore >= 80) {
          eligible.push('equipiq_expert');
        }
      }
    } catch (e) { /* ignore */ }
  }

  if (!existingTypes.has('roleplay_champion')) {
    try {
      const sessions = await storage.getRoleplaySessionsByAgent(userId);
      const completedSessions = sessions.filter(s => s.status === 'completed' && s.performanceScore != null);
      if (completedSessions.length >= 30) {
        const avgScore = completedSessions.reduce((sum, s) => sum + (s.performanceScore || 0), 0) / completedSessions.length;
        if (avgScore >= 75) {
          eligible.push('roleplay_champion');
        }
      }
    } catch (e) { /* ignore */ }
  }

  if (!existingTypes.has('sales_excellence')) {
    try {
      const badges = await storage.getBadgesForUser(userId);
      const goldOrHigher = badges.filter(b => b.badgeLevel >= 3);
      const uniqueCategories = new Set(goldOrHigher.map(b => b.category));
      if (uniqueCategories.size >= 3) {
        eligible.push('sales_excellence');
      }
    } catch (e) { /* ignore */ }
  }

  return eligible;
}
