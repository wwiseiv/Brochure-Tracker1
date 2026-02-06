import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "one-page-templates");

const NAVY = { r: 0x1a / 255, g: 0x36 / 255, b: 0x5d / 255 };
const GOLD = { r: 0xd6 / 255, g: 0x9e / 255, b: 0x2e / 255 };
const LIGHT_BLUE = { r: 0x2b / 255, g: 0x6c / 255, b: 0xb0 / 255 };
const WHITE = { r: 1, g: 1, b: 1 };
const LIGHT_GRAY = { r: 0xf7 / 255, g: 0xfa / 255, b: 0xfc / 255 };
const DARK_GRAY = { r: 0.3, g: 0.3, b: 0.35 };
const MID_GRAY = { r: 0.5, g: 0.5, b: 0.55 };

const PAGE_W = 612;
const PAGE_H = 792;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function extractTemplate1() {
  const srcPath = path.join(
    process.cwd(),
    "attached_assets",
    "bobs-Marine-Offering-Package_Brian-Blanco_1770398040814.pdf"
  );
  const srcBytes = fs.readFileSync(srcPath);
  const srcDoc = await PDFDocument.load(srcBytes);
  const newDoc = await PDFDocument.create();
  const [page] = await newDoc.copyPages(srcDoc, [0]);
  newDoc.addPage(page);
  const pdfBytes = await newDoc.save();
  const outPath = path.join(OUTPUT_DIR, "template-1-exclusive-offer-standard.pdf");
  fs.writeFileSync(outPath, pdfBytes);
  console.log("Created:", outPath);
}

function drawHeaderBand(
  page: any,
  fonts: { bold: any; regular: any },
  headline: string,
  subheadline?: string
) {
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 120,
    width: PAGE_W,
    height: 120,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 124,
    width: PAGE_W,
    height: 4,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("PCBancard", {
    x: 40,
    y: PAGE_H - 40,
    size: 14,
    font: fonts.bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText(headline, {
    x: 40,
    y: PAGE_H - 75,
    size: 22,
    font: fonts.bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });

  if (subheadline) {
    page.drawText(subheadline, {
      x: 40,
      y: PAGE_H - 100,
      size: 11,
      font: fonts.regular,
      color: rgb(0.8, 0.85, 0.9),
    });
  }
}

function drawFooter(page: any, fonts: { bold: any; regular: any }) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: 60,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  page.drawRectangle({
    x: 0,
    y: 60,
    width: PAGE_W,
    height: 3,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("[Agent Name]  |  [Phone]  |  [Email]", {
    x: 40,
    y: 35,
    size: 9,
    font: fonts.regular,
    color: rgb(0.8, 0.85, 0.9),
  });

  page.drawText("www.pcbancard.com", {
    x: 40,
    y: 18,
    size: 8,
    font: fonts.regular,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("PCBancard LLC", {
    x: PAGE_W - 130,
    y: 18,
    size: 8,
    font: fonts.regular,
    color: rgb(0.6, 0.65, 0.7),
  });
}

function drawSectionTitle(
  page: any,
  fonts: { bold: any; regular: any },
  text: string,
  y: number
) {
  page.drawRectangle({
    x: 40,
    y: y - 2,
    width: 4,
    height: 16,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText(text, {
    x: 52,
    y,
    size: 13,
    font: fonts.bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
}

function drawBulletPoints(
  page: any,
  fonts: { bold: any; regular: any },
  items: string[],
  startY: number,
  x: number = 55
) {
  let y = startY;
  for (const item of items) {
    page.drawText("\u2022", {
      x: x,
      y,
      size: 10,
      font: fonts.regular,
      color: rgb(GOLD.r, GOLD.g, GOLD.b),
    });
    page.drawText(item, {
      x: x + 14,
      y,
      size: 10,
      font: fonts.regular,
      color: rgb(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b),
    });
    y -= 18;
  }
  return y;
}

async function createTemplate2() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  drawHeaderBand(page, fonts, "Exclusive Offer", "Customized savings proposal for your business");
  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: PAGE_H - 124, width: PAGE_W, height: PAGE_H - 184, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  drawSectionTitle(page, fonts, "Breakdown of Savings", PAGE_H - 155);

  drawBulletPoints(page, fonts, [
    "Surcharge Program: [savings] in annual savings",
    "Dual Pricing Program: [savings] in annual savings",
    "Traditional Program: [savings] in annual savings",
  ], PAGE_H - 185);

  drawSectionTitle(page, fonts, "Equipment Recommendations", PAGE_H - 260);

  drawBulletPoints(page, fonts, [
    "Dejavoo P1 Terminal: Pay $295 upfront or free terminal program",
    "Cloud POS Gateway: $15/month for backend processing",
  ], PAGE_H - 290);

  drawSectionTitle(page, fonts, "Features of Processing with PCBancard", PAGE_H - 345);

  drawBulletPoints(page, fonts, [
    "Next-day or instant funding options",
    "Full PCI compliance handled for you",
    "Donate to a local charity via your processing",
    "Free marketing audit",
    "Quick access to capital advances when needed",
    "Free Payroll for your business",
  ], PAGE_H - 375);

  const qrX = PAGE_W - 160;
  const qrY = 100;
  const qrSize = 120;
  page.drawRectangle({
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
    borderColor: rgb(NAVY.r, NAVY.g, NAVY.b),
    borderWidth: 2,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });
  page.drawText("QR", {
    x: qrX + 42,
    y: qrY + 50,
    size: 24,
    font: bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawText("Scan to Watch Your", {
    x: qrX - 10,
    y: qrY - 15,
    size: 8,
    font: regular,
    color: rgb(MID_GRAY.r, MID_GRAY.g, MID_GRAY.b),
  });
  page.drawText("Custom Offer Video!", {
    x: qrX - 5,
    y: qrY - 27,
    size: 8,
    font: regular,
    color: rgb(MID_GRAY.r, MID_GRAY.g, MID_GRAY.b),
  });

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-2-exclusive-offer-qr.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

async function createTemplate3() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  drawHeaderBand(page, fonts, "Partner Referral Program", "Earn rewards by referring businesses to PCBancard");
  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: 63, width: PAGE_W, height: PAGE_H - 187, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  drawSectionTitle(page, fonts, "How It Works", PAGE_H - 155);
  drawBulletPoints(page, fonts, [
    "Step 1: Refer a business owner to your PCBancard agent",
    "Step 2: Your referral receives a customized savings proposal",
    "Step 3: When they sign up, you both earn rewards",
  ], PAGE_H - 185);

  drawSectionTitle(page, fonts, "Your Referral Benefits", PAGE_H - 260);
  drawBulletPoints(page, fonts, [
    "Cash bonus for every successful referral",
    "Ongoing residual rewards for active accounts",
    "Priority support for your own account",
    "Exclusive access to new PCBancard programs",
  ], PAGE_H - 290);

  drawSectionTitle(page, fonts, "Why Businesses Choose PCBancard", PAGE_H - 375);
  drawBulletPoints(page, fonts, [
    "Industry-leading savings on processing fees",
    "Next-day and instant funding options",
    "Free PCI compliance and marketing audit",
    "Dedicated local payment expert",
  ], PAGE_H - 405);

  page.drawRectangle({
    x: 40,
    y: 85,
    width: PAGE_W - 80,
    height: 45,
    color: rgb(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b),
    borderColor: rgb(NAVY.r, NAVY.g, NAVY.b),
    borderWidth: 0,
  });
  page.drawText("Ready to refer? Contact your PCBancard agent today!", {
    x: 100,
    y: 102,
    size: 13,
    font: bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-3-referral-program-client.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

async function createTemplate4() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 200,
    width: PAGE_W,
    height: 200,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 204,
    width: PAGE_W,
    height: 4,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("PCBancard", {
    x: 40,
    y: PAGE_H - 40,
    size: 14,
    font: bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("Agent Referral", {
    x: 40,
    y: PAGE_H - 90,
    size: 36,
    font: bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });
  page.drawText("Opportunity", {
    x: 40,
    y: PAGE_H - 130,
    size: 36,
    font: bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("Build your network. Grow your income.", {
    x: 40,
    y: PAGE_H - 170,
    size: 13,
    font: regular,
    color: rgb(0.8, 0.85, 0.9),
  });

  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: 63, width: PAGE_W, height: PAGE_H - 267, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  drawSectionTitle(page, fonts, "Why Partner With PCBancard?", PAGE_H - 235);
  drawBulletPoints(page, fonts, [
    "Competitive commission structure",
    "Ongoing residual income from every referral",
    "Full training and marketing support provided",
    "Dedicated partner success manager",
  ], PAGE_H - 265);

  drawSectionTitle(page, fonts, "What You'll Receive", PAGE_H - 360);
  drawBulletPoints(page, fonts, [
    "Branded marketing materials and collateral",
    "Real-time tracking dashboard for referrals",
    "Priority processing for your referred merchants",
  ], PAGE_H - 390);

  page.drawRectangle({
    x: 40,
    y: 85,
    width: PAGE_W - 80,
    height: 50,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText("Start Earning Today - Contact Us", {
    x: 150,
    y: 105,
    size: 16,
    font: bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-4-enrolled-agent-referral.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

async function createTemplate5() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  drawHeaderBand(page, fonts, "Free Payroll for 12 Months", "An exclusive offer for PCBancard merchants");
  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: 63, width: PAGE_W, height: PAGE_H - 187, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  page.drawRectangle({
    x: 140,
    y: PAGE_H - 215,
    width: PAGE_W - 280,
    height: 65,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText("12 MONTHS FREE", {
    x: 195,
    y: PAGE_H - 185,
    size: 28,
    font: bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawText("No setup fees. No contracts.", {
    x: 215,
    y: PAGE_H - 205,
    size: 11,
    font: regular,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  drawSectionTitle(page, fonts, "What's Included", PAGE_H - 250);
  drawBulletPoints(page, fonts, [
    "Full-service payroll processing",
    "Direct deposit for all employees",
    "Tax filing and compliance (federal, state, local)",
    "Employee self-service portal",
    "New hire reporting and onboarding",
    "Dedicated payroll support specialist",
  ], PAGE_H - 280);

  drawSectionTitle(page, fonts, "Why PCBancard Payroll?", PAGE_H - 400);
  drawBulletPoints(page, fonts, [
    "Save $3,000+ annually on payroll costs",
    "Seamless integration with your payment processing",
    "Trusted by thousands of small businesses",
  ], PAGE_H - 430);

  page.drawRectangle({
    x: 40,
    y: 85,
    width: PAGE_W - 80,
    height: 45,
    color: rgb(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b),
  });
  page.drawText("Claim Your Free Payroll - Ask Your Agent Today!", {
    x: 110,
    y: 102,
    size: 13,
    font: bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-5-free-payroll.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

async function createTemplate6() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  drawHeaderBand(page, fonts, "What's Your Business Grade?", "A complimentary marketing audit from PCBancard");
  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: 63, width: PAGE_W, height: PAGE_H - 187, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  const grades = ["A+", "A", "B", "C", "D"];
  const gradeColors = [
    { r: 0.13, g: 0.55, b: 0.13 },
    { r: 0.2, g: 0.6, b: 0.2 },
    { r: 0.85, g: 0.65, b: 0.13 },
    { r: 0.9, g: 0.45, b: 0.1 },
    { r: 0.8, g: 0.2, b: 0.2 },
  ];
  let gx = 80;
  for (let i = 0; i < grades.length; i++) {
    page.drawRectangle({
      x: gx,
      y: PAGE_H - 195,
      width: 80,
      height: 45,
      color: rgb(gradeColors[i].r, gradeColors[i].g, gradeColors[i].b),
    });
    page.drawText(grades[i], {
      x: gx + (grades[i].length > 1 ? 22 : 30),
      y: PAGE_H - 180,
      size: 22,
      font: bold,
      color: rgb(WHITE.r, WHITE.g, WHITE.b),
    });
    gx += 95;
  }

  drawSectionTitle(page, fonts, "We'll Evaluate Your Business On:", PAGE_H - 230);
  drawBulletPoints(page, fonts, [
    "Online visibility and search engine presence",
    "Website performance and mobile optimization",
    "Social media engagement and strategy",
    "Customer review management",
    "Local directory listings accuracy",
    "Competitive positioning in your market",
  ], PAGE_H - 260);

  drawSectionTitle(page, fonts, "What You'll Receive", PAGE_H - 380);
  drawBulletPoints(page, fonts, [
    "Detailed marketing scorecard for your business",
    "Personalized action plan to improve your grade",
    "Competitive analysis vs. local competitors",
    "Priority recommendations for quick wins",
  ], PAGE_H - 410);

  page.drawRectangle({
    x: 40,
    y: 85,
    width: PAGE_W - 80,
    height: 45,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });
  page.drawText("Request Your Free Audit Today!", {
    x: 155,
    y: 102,
    size: 15,
    font: bold,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-6-business-grade-audit.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

async function createTemplate7() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const fonts = { bold, regular };

  page.drawRectangle({
    x: 0,
    y: PAGE_H - 180,
    width: PAGE_W,
    height: 180,
    color: rgb(NAVY.r, NAVY.g, NAVY.b),
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 184,
    width: PAGE_W,
    height: 4,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("PCBancard", {
    x: 40,
    y: PAGE_H - 40,
    size: 14,
    font: bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("The Best 5 Minutes", {
    x: 40,
    y: PAGE_H - 85,
    size: 30,
    font: bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });
  page.drawText("You'll Spend Today", {
    x: 40,
    y: PAGE_H - 120,
    size: 30,
    font: bold,
    color: rgb(GOLD.r, GOLD.g, GOLD.b),
  });

  page.drawText("Watch our personalized video to discover how much you could save.", {
    x: 40,
    y: PAGE_H - 155,
    size: 11,
    font: regular,
    color: rgb(0.8, 0.85, 0.9),
  });

  drawFooter(page, fonts);

  page.drawRectangle({ x: 0, y: 63, width: PAGE_W, height: PAGE_H - 247, color: rgb(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b) });

  page.drawRectangle({
    x: 160,
    y: PAGE_H - 340,
    width: 290,
    height: 120,
    borderColor: rgb(NAVY.r, NAVY.g, NAVY.b),
    borderWidth: 2,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });

  page.drawRectangle({
    x: 280,
    y: PAGE_H - 300,
    width: 0,
    height: 0,
    color: rgb(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b),
  });
  const triCx = 305;
  const triCy = PAGE_H - 285;
  const triR = 20;
  page.drawCircle({
    x: triCx,
    y: triCy,
    size: triR,
    color: rgb(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b),
  });
  page.drawText("PLAY", {
    x: triCx - 14,
    y: triCy - 5,
    size: 10,
    font: bold,
    color: rgb(WHITE.r, WHITE.g, WHITE.b),
  });
  page.drawText("Your Custom Video", {
    x: 240,
    y: PAGE_H - 325,
    size: 12,
    font: regular,
    color: rgb(MID_GRAY.r, MID_GRAY.g, MID_GRAY.b),
  });

  drawSectionTitle(page, fonts, "In Just 5 Minutes, You'll Discover:", PAGE_H - 375);
  drawBulletPoints(page, fonts, [
    "Exactly how much you're overpaying on processing fees",
    "Your personalized savings with PCBancard programs",
    "Equipment upgrades that pay for themselves",
    "Value-added services included at no extra cost",
  ], PAGE_H - 405);

  drawSectionTitle(page, fonts, "Why Business Owners Love This", PAGE_H - 490);
  drawBulletPoints(page, fonts, [
    "No pressure, no obligations -- just real numbers",
    "Custom analysis based on your actual statements",
    "See results before making any decisions",
  ], PAGE_H - 520);

  const bytes = await doc.save();
  const outPath = path.join(OUTPUT_DIR, "template-7-video-brochure-5min.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log("Created:", outPath);
}

interface ThumbDef {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
}

const thumbDefs: ThumbDef[] = [
  { id: "exclusive-offer-standard", title: "Exclusive Offer", subtitle: "Standard", accentColor: "#d69e2e" },
  { id: "exclusive-offer-qr", title: "Exclusive Offer", subtitle: "QR Code", accentColor: "#d69e2e" },
  { id: "referral-program-client", title: "Partner Referral", subtitle: "Program", accentColor: "#2b6cb0" },
  { id: "enrolled-agent-referral", title: "Agent Referral", subtitle: "Opportunity", accentColor: "#d69e2e" },
  { id: "free-payroll", title: "Free Payroll", subtitle: "12 Months", accentColor: "#2b6cb0" },
  { id: "business-grade-audit", title: "Business Grade", subtitle: "Marketing Audit", accentColor: "#d69e2e" },
  { id: "video-brochure-5min", title: "Best 5 Minutes", subtitle: "Video Brochure", accentColor: "#d69e2e" },
];

async function generateThumbnails() {
  for (const t of thumbDefs) {
    const w = 400;
    const h = 518;
    const headerH = 100;
    const accentH = 4;
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f7fafc"/>
      <rect width="${w}" height="${headerH}" fill="#1a365d"/>
      <rect y="${headerH}" width="${w}" height="${accentH}" fill="${t.accentColor}"/>
      <text x="24" y="32" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="bold" fill="${t.accentColor}">PCBancard</text>
      <text x="24" y="60" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="white">${escapeXml(t.title)}</text>
      <text x="24" y="82" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#cbd5e0">${escapeXml(t.subtitle)}</text>
      <rect x="24" y="130" width="140" height="8" rx="2" fill="#cbd5e0"/>
      <rect x="24" y="148" width="200" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="162" width="180" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="176" width="160" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="210" width="120" height="8" rx="2" fill="#cbd5e0"/>
      <rect x="24" y="228" width="200" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="242" width="190" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="256" width="170" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="270" width="180" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="304" width="130" height="8" rx="2" fill="#cbd5e0"/>
      <rect x="24" y="322" width="195" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="336" width="175" height="6" rx="2" fill="#e2e8f0"/>
      <rect x="24" y="350" width="185" height="6" rx="2" fill="#e2e8f0"/>
      <rect width="${w}" height="46" y="${h - 46}" fill="#1a365d"/>
      <rect y="${h - 49}" width="${w}" height="3" fill="${t.accentColor}"/>
      <text x="24" y="${h - 22}" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="#cbd5e0">www.pcbancard.com</text>
    </svg>`;

    const outPath = path.join(OUTPUT_DIR, `thumb-${t.id}.png`);
    await sharp(Buffer.from(svg))
      .resize(w, h)
      .png()
      .toFile(outPath);
    console.log("Created:", outPath);
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function main() {
  console.log("Generating One-Page Proposal templates...\n");

  await extractTemplate1();
  await createTemplate2();
  await createTemplate3();
  await createTemplate4();
  await createTemplate5();
  await createTemplate6();
  await createTemplate7();
  await generateThumbnails();

  console.log("\nDone! Verifying files...");
  const files = fs.readdirSync(OUTPUT_DIR);
  console.log(`\nFiles in ${OUTPUT_DIR}:`);
  files.forEach((f) => console.log(`  ${f}`));
  console.log(`\nTotal: ${files.length} files`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
