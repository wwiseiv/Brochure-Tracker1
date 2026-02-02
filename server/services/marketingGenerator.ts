import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { marketingApprovedClaims, marketingGenerationJobs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { buildFlyerPDF, FlyerContent as PDFFlyerContent, RepInfo } from './pdfFlyerBuilder';

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error('Anthropic AI Integration not configured');
    }
    anthropicClient = new Anthropic({ baseURL, apiKey });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error('OpenAI AI Integration not configured');
    }
    openaiClient = new OpenAI({ baseURL, apiKey });
  }
  return openaiClient;
}

export interface FlyerContent {
  headline: string;
  subhead: string;
  bullets: string[];
  ctaText: string;
  ctaSubtext?: string;
}

export interface FlyerGenerationInput {
  userId: string;
  prompt: string;
  industry?: string;
  repName?: string;
  repPhone?: string;
  repEmail?: string;
}

export interface FlyerGenerationResult {
  jobId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: FlyerContent;
  heroImageUrl?: string;
  finalFlyerUrl?: string;
  errorMessage?: string;
  userId?: string;
  prompt?: string;
  industry?: string;
  savedToLibrary?: boolean;
  generatedContent?: FlyerContent | null;
  createdAt?: Date;
}

async function getApprovedClaims(): Promise<string[]> {
  try {
    const claims = await db.select().from(marketingApprovedClaims).where(eq(marketingApprovedClaims.isActive, true));
    return claims.map(c => c.claim);
  } catch (error) {
    console.error('[MarketingGenerator] Error fetching approved claims:', error);
    return [
      "Eliminate up to 100% of your credit card processing fees",
      "Dual pricing is legal and compliant in all 50 states",
      "No more losing 3-4% on every transaction",
      "Next-day funding on all transactions",
      "Free terminal with approved application",
      "24/7 US-based customer support",
    ];
  }
}

export async function generateFlyerContent(prompt: string, industry?: string): Promise<FlyerContent> {
  const approvedClaims = await getApprovedClaims();
  
  const systemPrompt = `You are an expert marketing copywriter for PCBancard, a payment processing company specializing in dual pricing solutions. Create compelling flyer content that resonates with business owners.

APPROVED CLAIMS YOU CAN USE (must stay compliant):
${approvedClaims.map(c => `- ${c}`).join('\n')}

BRAND GUIDELINES:
- Professional but approachable tone
- Focus on savings and simplicity
- Avoid aggressive sales language
- Highlight transparency and compliance
- Use action-oriented CTAs

You must respond with valid JSON in this exact format:
{
  "headline": "A powerful, attention-grabbing headline (5-8 words max)",
  "subhead": "A supporting statement that elaborates on the benefit (10-15 words)",
  "bullets": ["4-6 benefit bullets", "each one concise", "action-focused", "from approved claims"],
  "ctaText": "Primary call to action (3-5 words)",
  "ctaSubtext": "Optional supporting text for CTA"
}

Return ONLY valid JSON, no markdown or explanation.`;

  const userPrompt = `Create flyer marketing content for: ${prompt}${industry ? `\nTarget Industry: ${industry}` : ''}

Make the content specific to this business type while staying compliant with approved claims.`;

  try {
    const client = getAnthropicClient();
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const textBlock = response.content[0];
    if (textBlock.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    const cleanedContent = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedContent) as FlyerContent;
    
    console.log('[MarketingGenerator] Generated flyer content for:', prompt.substring(0, 50));
    return parsed;
  } catch (error) {
    console.error('[MarketingGenerator] Error generating flyer content:', error);
    return {
      headline: "Stop Losing Money on Processing Fees",
      subhead: "Dual pricing lets you eliminate up to 100% of credit card fees—legally and compliantly.",
      bullets: [
        "Eliminate up to 100% of your credit card processing fees",
        "Legal and compliant in all 50 states",
        "Free terminal with approved application",
        "Next-day funding on all transactions",
        "24/7 US-based customer support"
      ],
      ctaText: "Get Started Today",
      ctaSubtext: "Free consultation with a local representative"
    };
  }
}

export async function generateHeroImage(prompt: string, industry?: string): Promise<string | null> {
  const imagePrompt = `Professional business marketing image for ${industry || 'small business'}. ${prompt}. 
Style: Clean, modern, professional photography style. Bright, optimistic lighting. 
Subject: A successful ${industry || 'business'} scene showing happy customers or efficient operations.
Do NOT include any text, logos, or watermarks in the image.
Photorealistic, high quality, suitable for a marketing flyer.`;

  try {
    const client = getOpenAIClient();
    
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
    });

    if (!response.data || response.data.length === 0) {
      console.error('[MarketingGenerator] No image data in response');
      return null;
    }
    
    const imageData = response.data[0];
    if (!imageData) {
      console.error('[MarketingGenerator] No image data in response');
      return null;
    }

    if ('b64_json' in imageData && imageData.b64_json) {
      const base64Data = imageData.b64_json;
      const filename = `hero_${Date.now()}.png`;
      const publicDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'generated');
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      const filePath = path.join(publicDir, filename);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      
      console.log('[MarketingGenerator] Generated hero image:', filename);
      return `/marketing/generated/${filename}`;
    }
    
    if ('url' in imageData && imageData.url) {
      return imageData.url;
    }

    return null;
  } catch (error) {
    console.error('[MarketingGenerator] Error generating hero image:', error);
    return null;
  }
}

function generateFlyerHtml(content: FlyerContent, heroImageUrl: string | null, repInfo?: { name?: string; phone?: string; email?: string }): string {
  const bulletsHtml = content.bullets.map(b => `<li>${b}</li>`).join('\n              ');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PCBancard Marketing Flyer</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #1a1a2e;
    }
    .flyer {
      width: 8.5in;
      height: 11in;
      padding: 0;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #f8f9ff 0%, #ffffff 30%);
    }
    .hero-section {
      height: 40%;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #7C5CFC 0%, #5B3FD9 100%);
    }
    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.8;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(124, 92, 252, 0.3) 0%, rgba(26, 26, 46, 0.7) 100%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 40px;
    }
    .headline {
      font-size: 48px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.1;
      margin-bottom: 12px;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.3);
    }
    .subhead {
      font-size: 20px;
      font-weight: 500;
      color: rgba(255,255,255,0.95);
      max-width: 600px;
    }
    .content-section {
      flex: 1;
      padding: 40px 50px;
      display: flex;
      flex-direction: column;
    }
    .benefits-title {
      font-size: 14px;
      font-weight: 600;
      color: #7C5CFC;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }
    .benefits-list {
      list-style: none;
      margin-bottom: 32px;
    }
    .benefits-list li {
      font-size: 18px;
      font-weight: 500;
      color: #374151;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .benefits-list li::before {
      content: "✓";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #7C5CFC;
      color: white;
      border-radius: 50%;
      font-size: 14px;
      font-weight: 700;
    }
    .cta-section {
      margin-top: auto;
      background: linear-gradient(135deg, #7C5CFC 0%, #5B3FD9 100%);
      padding: 28px 32px;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cta-text {
      color: white;
    }
    .cta-text h3 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .cta-text p {
      font-size: 16px;
      opacity: 0.9;
    }
    .cta-contact {
      text-align: right;
      color: white;
    }
    .cta-contact .name {
      font-size: 18px;
      font-weight: 600;
    }
    .cta-contact .details {
      font-size: 14px;
      opacity: 0.9;
    }
    .footer {
      padding: 20px 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e5e7eb;
    }
    .logo-placeholder {
      font-size: 20px;
      font-weight: 700;
      color: #7C5CFC;
    }
    .footer-text {
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="flyer">
    <div class="hero-section">
      ${heroImageUrl ? `<img src="${heroImageUrl}" alt="Business" class="hero-image">` : ''}
      <div class="hero-overlay">
        <h1 class="headline">${content.headline}</h1>
        <p class="subhead">${content.subhead}</p>
      </div>
    </div>
    
    <div class="content-section">
      <div class="benefits-title">Why Choose PCBancard?</div>
      <ul class="benefits-list">
        ${bulletsHtml}
      </ul>
      
      <div class="cta-section">
        <div class="cta-text">
          <h3>${content.ctaText}</h3>
          ${content.ctaSubtext ? `<p>${content.ctaSubtext}</p>` : ''}
        </div>
        ${repInfo?.name ? `
        <div class="cta-contact">
          <div class="name">${repInfo.name}</div>
          <div class="details">
            ${repInfo.phone ? `${repInfo.phone}<br>` : ''}
            ${repInfo.email || ''}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="footer">
      <div class="logo-placeholder">PCBancard</div>
      <div class="footer-text">© ${new Date().getFullYear()} PCBancard. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

export async function assembleFlyer(
  content: FlyerContent,
  heroImageUrl: string | null,
  repInfo?: { name?: string; phone?: string; email?: string }
): Promise<{ htmlUrl: string; pdfUrl?: string }> {
  const html = generateFlyerHtml(content, heroImageUrl, repInfo);
  
  const timestamp = Date.now();
  const htmlFilename = `flyer_${timestamp}.html`;
  const publicDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'generated');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const htmlPath = path.join(publicDir, htmlFilename);
  fs.writeFileSync(htmlPath, html);
  
  const htmlUrl = `/marketing/generated/${htmlFilename}`;
  let pdfUrl: string | undefined;

  try {
    pdfUrl = await buildFlyerPDF({
      content,
      heroImageUrl: heroImageUrl || undefined,
      repInfo: repInfo as RepInfo,
    });
    console.log('[MarketingGenerator] Generated PDF flyer:', pdfUrl);
  } catch (error) {
    console.log('[MarketingGenerator] PDF generation failed:', error);
  }
  
  console.log('[MarketingGenerator] Assembled flyer HTML:', htmlFilename);
  return { htmlUrl, pdfUrl };
}

export async function createGenerationJob(input: FlyerGenerationInput): Promise<number> {
  const [job] = await db.insert(marketingGenerationJobs).values({
    userId: input.userId,
    prompt: input.prompt,
    industry: input.industry || null,
    status: 'pending',
    repName: input.repName || null,
    repPhone: input.repPhone || null,
    repEmail: input.repEmail || null,
  }).returning();
  
  return job.id;
}

export async function executeGenerationJob(jobId: number): Promise<FlyerGenerationResult> {
  try {
    await db.update(marketingGenerationJobs)
      .set({ status: 'processing' })
      .where(eq(marketingGenerationJobs.id, jobId));

    const [job] = await db.select().from(marketingGenerationJobs).where(eq(marketingGenerationJobs.id, jobId));
    
    if (!job) {
      throw new Error('Job not found');
    }

    const content = await generateFlyerContent(job.prompt, job.industry || undefined);
    
    const heroImageUrl = await generateHeroImage(job.prompt, job.industry || undefined);
    
    const repInfo = {
      name: job.repName || undefined,
      phone: job.repPhone || undefined,
      email: job.repEmail || undefined,
    };
    const { htmlUrl, pdfUrl } = await assembleFlyer(content, heroImageUrl, repInfo);
    
    await db.update(marketingGenerationJobs)
      .set({
        status: 'completed',
        generatedContent: content as any,
        heroImageUrl: heroImageUrl,
        finalFlyerUrl: pdfUrl || htmlUrl,
        completedAt: new Date(),
      })
      .where(eq(marketingGenerationJobs.id, jobId));

    console.log('[MarketingGenerator] Job completed:', jobId);
    
    return {
      jobId,
      status: 'completed',
      content,
      heroImageUrl: heroImageUrl || undefined,
      finalFlyerUrl: pngUrl || htmlUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MarketingGenerator] Job failed:', jobId, errorMessage);
    
    await db.update(marketingGenerationJobs)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(marketingGenerationJobs.id, jobId));

    return {
      jobId,
      status: 'failed',
      errorMessage,
    };
  }
}

export async function getGenerationJob(jobId: number): Promise<FlyerGenerationResult | null> {
  const [job] = await db.select().from(marketingGenerationJobs).where(eq(marketingGenerationJobs.id, jobId));
  
  if (!job) {
    return null;
  }

  return {
    jobId: job.id,
    status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
    content: job.generatedContent as FlyerContent | undefined,
    heroImageUrl: job.heroImageUrl || undefined,
    finalFlyerUrl: job.finalFlyerUrl || undefined,
    errorMessage: job.errorMessage || undefined,
    userId: job.userId,
    prompt: job.prompt,
    industry: job.industry || undefined,
    savedToLibrary: job.savedToLibrary || false,
    generatedContent: job.generatedContent as FlyerContent | null,
    createdAt: job.createdAt,
  };
}

export async function getUserGenerationJobs(userId: string): Promise<FlyerGenerationResult[]> {
  const jobs = await db.select()
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.userId, userId))
    .orderBy(marketingGenerationJobs.createdAt);
  
  return jobs.map(job => ({
    jobId: job.id,
    status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
    content: job.generatedContent as FlyerContent | undefined,
    heroImageUrl: job.heroImageUrl || undefined,
    finalFlyerUrl: job.finalFlyerUrl || undefined,
    errorMessage: job.errorMessage || undefined,
    userId: job.userId,
    prompt: job.prompt,
    industry: job.industry || undefined,
    savedToLibrary: job.savedToLibrary || false,
    generatedContent: job.generatedContent as FlyerContent | null,
    createdAt: job.createdAt,
  }));
}

export async function deleteGenerationJob(jobId: number): Promise<void> {
  await db.delete(marketingGenerationJobs).where(eq(marketingGenerationJobs.id, jobId));
}

// Personalize a static template with rep contact info
export async function personalizeStaticTemplate(
  templateUrl: string,
  repInfo: { name: string; phone: string; email: string }
): Promise<string> {
  const timestamp = Date.now();
  const publicDir = path.join(process.cwd(), 'client', 'public', 'marketing', 'personalized');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate HTML that overlays contact info on template
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Flyer</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
    }
    .container {
      position: relative;
      width: 816px;
      height: 1056px;
    }
    .template-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: white;
    }
    .contact-overlay {
      position: absolute;
      bottom: 80px;
      right: 40px;
      background: rgba(124, 92, 252, 0.95);
      padding: 16px 24px;
      border-radius: 12px;
      color: white;
      text-align: right;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .contact-name {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .contact-details {
      font-size: 14px;
      line-height: 1.5;
      opacity: 0.95;
    }
    .contact-badge {
      position: absolute;
      bottom: 80px;
      left: 40px;
      background: white;
      padding: 8px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .contact-badge img {
      height: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${templateUrl}" alt="Flyer Template" class="template-image">
    <div class="contact-overlay">
      <div class="contact-name">${repInfo.name}</div>
      <div class="contact-details">
        ${repInfo.phone}<br>
        ${repInfo.email}
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const { chromium } = await import('playwright');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setViewportSize({ width: 816, height: 1056 });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the template image to load
    await page.waitForTimeout(1000);
    
    const pngFilename = `personalized_${timestamp}.png`;
    const pngPath = path.join(publicDir, pngFilename);
    
    await page.screenshot({ path: pngPath, fullPage: true });
    await browser.close();
    
    console.log('[MarketingGenerator] Personalized template:', pngFilename);
    return `/marketing/personalized/${pngFilename}`;
  } catch (error) {
    console.error('[MarketingGenerator] Failed to personalize template:', error);
    throw new Error('Failed to personalize template. Please try again.');
  }
}
