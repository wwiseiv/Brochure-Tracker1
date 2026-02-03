import Anthropic from '@anthropic-ai/sdk';
import type { MerchantIntelligence, MeetingRecording, Deal, Merchant, Drop } from '@shared/schema';

let anthropicClient: Anthropic | null = null;

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

export interface WebsiteIntelligence {
  businessName?: string;
  description?: string;
  industry?: string;
  services?: string[];
  hours?: string;
  ownerName?: string;
  menuItems?: string[];
  pricingIndicators?: string;
  uniqueSellingPoints?: string[];
  recentNews?: string;
  establishedYear?: string;
}

export interface TranscriptIntelligence {
  communicationStyle?: 'formal' | 'casual' | 'direct' | 'analytical';
  decisionMakingStyle?: 'quick' | 'deliberate' | 'consensus_needed' | 'price_focused';
  keyStakeholders?: string[];
  knownObjections?: string[];
  knownConcerns?: string[];
  questionsAsked?: string[];
  interestsExpressed?: string[];
  painPoints?: string[];
}

// URL validation to prevent SSRF attacks
function isValidScrapeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow http/https schemes
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.log('[MerchantIntelligence] Invalid protocol:', url.protocol);
      return false;
    }
    
    // Block private/loopback IPs
    const hostname = url.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/,
      /^10\.\d+\.\d+\.\d+$/,
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
      /^192\.168\.\d+\.\d+$/,
      /^0\.0\.0\.0$/,
      /^\[::1\]$/,
      /^::1$/,
      /^fc00:/i,
      /^fd00:/i,
      /^169\.254\.\d+\.\d+$/,
      /\.local$/i,
      /\.internal$/i,
      /\.corp$/i,
    ];
    
    if (privatePatterns.some(pattern => pattern.test(hostname))) {
      console.log('[MerchantIntelligence] Blocked private IP/hostname:', hostname);
      return false;
    }
    
    return true;
  } catch (e) {
    console.log('[MerchantIntelligence] Invalid URL:', urlString);
    return false;
  }
}

export async function scrapeWebsiteIntelligence(websiteUrl: string): Promise<WebsiteIntelligence | null> {
  console.log('[MerchantIntelligence] Scraping website:', websiteUrl);
  
  // Validate URL to prevent SSRF
  if (!isValidScrapeUrl(websiteUrl)) {
    console.log('[MerchantIntelligence] URL validation failed:', websiteUrl);
    return null;
  }
  
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PCBancard/1.0; +https://pcbancard.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log('[MerchantIntelligence] Failed to fetch website:', response.status);
      return null;
    }

    const html = await response.text();
    const textContent = extractTextFromHtml(html);
    const metaInfo = extractMetaTags(html);

    const client = getAnthropicClient();
    
    const analysisPrompt = `Analyze this business website and extract detailed intelligence for sales role-play training.

WEBSITE URL: ${websiteUrl}

META INFORMATION:
Title: ${metaInfo.title || 'Not found'}
Description: ${metaInfo.description || 'Not found'}

WEBSITE TEXT CONTENT (excerpt):
${textContent.substring(0, 5000)}

---

Extract the following information for creating a realistic business owner persona for sales training:

1. Business name (exact name from website)
2. What they do/their main business (1-2 sentences)
3. Industry/sector
4. Key services or products (list up to 8)
5. Business hours if mentioned
6. Owner/manager name if mentioned
7. For restaurants: menu items or cuisine specialties
8. Pricing indicators (budget, mid-range, upscale, luxury)
9. Unique selling points (what makes them special - up to 5)
10. Any recent news, promotions, or updates
11. Year established or how long they've been in business

Respond ONLY with valid JSON:
{
  "businessName": "Name or null",
  "description": "What they do",
  "industry": "Industry/sector",
  "services": ["Service 1", "Service 2"],
  "hours": "Hours string or null",
  "ownerName": "Name or null",
  "menuItems": ["Item 1", "Item 2"] or null,
  "pricingIndicators": "budget/mid-range/upscale/luxury",
  "uniqueSellingPoints": ["USP 1", "USP 2"],
  "recentNews": "Recent news or null",
  "establishedYear": "Year or null"
}`;

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: analysisPrompt }]
    });

    const textBlock = aiResponse.content[0];
    if (textBlock.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    const cleanedContent = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const intelligence = JSON.parse(cleanedContent) as WebsiteIntelligence;
    
    console.log('[MerchantIntelligence] Website intelligence extracted for:', intelligence.businessName);
    return intelligence;
  } catch (error) {
    console.error('[MerchantIntelligence] Error scraping website:', error);
    return null;
  }
}

export async function analyzeTranscripts(transcripts: string[]): Promise<TranscriptIntelligence | null> {
  if (!transcripts || transcripts.length === 0) {
    return null;
  }

  console.log('[MerchantIntelligence] Analyzing', transcripts.length, 'transcripts');
  
  try {
    const client = getAnthropicClient();
    const combinedTranscripts = transcripts.slice(0, 5).join('\n\n---TRANSCRIPT BREAK---\n\n');
    
    const analysisPrompt = `Analyze these sales meeting transcripts with a business owner. Extract patterns for creating a realistic role-play persona.

MEETING TRANSCRIPTS:
${combinedTranscripts.substring(0, 8000)}

---

Extract the following to understand how this business owner communicates and makes decisions:

1. Communication style: formal, casual, direct, or analytical
2. Decision-making style: quick (decides fast), deliberate (takes time), consensus_needed (involves others), price_focused (mainly about cost)
3. Key stakeholders mentioned (other people involved in decisions)
4. Specific objections they've raised (exact concerns they expressed)
5. General concerns or worries they've mentioned
6. Questions they asked about the service/product
7. Things they expressed interest in or liked
8. Pain points or problems they mentioned having

Be specific and quote actual phrases when possible. If information isn't available, use null.

Respond ONLY with valid JSON:
{
  "communicationStyle": "formal/casual/direct/analytical",
  "decisionMakingStyle": "quick/deliberate/consensus_needed/price_focused",
  "keyStakeholders": ["Name - Role", "Name - Role"],
  "knownObjections": ["We already have a processor", "My cousin does this"],
  "knownConcerns": ["Contract length", "Hidden fees"],
  "questionsAsked": ["How does dual pricing work?"],
  "interestsExpressed": ["Saving money", "Better customer service"],
  "painPoints": ["Current fees too high", "Poor support"]
}`;

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: analysisPrompt }]
    });

    const textBlock = aiResponse.content[0];
    if (textBlock.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    const cleanedContent = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const intelligence = JSON.parse(cleanedContent) as TranscriptIntelligence;
    
    console.log('[MerchantIntelligence] Transcript intelligence extracted');
    return intelligence;
  } catch (error) {
    console.error('[MerchantIntelligence] Error analyzing transcripts:', error);
    return null;
  }
}

export function buildRoleplayPersonaPrompt(
  baseInfo: { businessName?: string; businessType?: string; notes?: string; stage?: string; temperature?: string },
  websiteIntel: WebsiteIntelligence | null,
  transcriptIntel: TranscriptIntelligence | null
): string {
  let prompt = `MERCHANT CONTEXT:\n`;
  
  prompt += `Business Name: ${baseInfo.businessName || 'Unknown Business'}\n`;
  prompt += `Business Type: ${baseInfo.businessType || 'Unknown'}\n`;
  if (baseInfo.stage) prompt += `Pipeline Stage: ${baseInfo.stage}\n`;
  if (baseInfo.temperature) prompt += `Lead Temperature: ${baseInfo.temperature}\n`;
  if (baseInfo.notes) prompt += `Agent Notes: ${baseInfo.notes}\n`;
  
  if (websiteIntel) {
    prompt += `\nWEBSITE INTELLIGENCE:\n`;
    if (websiteIntel.description) prompt += `About the Business: ${websiteIntel.description}\n`;
    if (websiteIntel.industry) prompt += `Industry: ${websiteIntel.industry}\n`;
    if (websiteIntel.ownerName) prompt += `Owner Name: ${websiteIntel.ownerName} (use this name when playing the owner)\n`;
    if (websiteIntel.services?.length) prompt += `Services/Products: ${websiteIntel.services.join(', ')}\n`;
    if (websiteIntel.menuItems?.length) prompt += `Menu Items: ${websiteIntel.menuItems.slice(0, 10).join(', ')}\n`;
    if (websiteIntel.hours) prompt += `Business Hours: ${websiteIntel.hours}\n`;
    if (websiteIntel.pricingIndicators) prompt += `Pricing Level: ${websiteIntel.pricingIndicators}\n`;
    if (websiteIntel.uniqueSellingPoints?.length) prompt += `What Makes Them Special: ${websiteIntel.uniqueSellingPoints.join('; ')}\n`;
    if (websiteIntel.establishedYear) prompt += `Established: ${websiteIntel.establishedYear} (act like an experienced owner who's been around)\n`;
    if (websiteIntel.recentNews) prompt += `Recent News: ${websiteIntel.recentNews}\n`;
  }
  
  if (transcriptIntel) {
    prompt += `\nPRIOR CONVERSATION INTELLIGENCE (from actual meetings with this merchant):\n`;
    if (transcriptIntel.communicationStyle) prompt += `Communication Style: ${transcriptIntel.communicationStyle} - match this tone\n`;
    if (transcriptIntel.decisionMakingStyle) prompt += `Decision Style: ${transcriptIntel.decisionMakingStyle}\n`;
    if (transcriptIntel.keyStakeholders?.length) prompt += `Key Stakeholders: ${transcriptIntel.keyStakeholders.join(', ')} - mention these people when appropriate\n`;
    
    if (transcriptIntel.knownObjections?.length) {
      prompt += `\nACTUAL OBJECTIONS FROM PREVIOUS CONVERSATIONS (use these!):\n`;
      transcriptIntel.knownObjections.forEach((obj, i) => {
        prompt += `${i + 1}. "${obj}"\n`;
      });
    }
    
    if (transcriptIntel.knownConcerns?.length) {
      prompt += `\nKNOWN CONCERNS: ${transcriptIntel.knownConcerns.join('; ')}\n`;
    }
    
    if (transcriptIntel.questionsAsked?.length) {
      prompt += `\nQUESTIONS THEY'VE ASKED BEFORE: ${transcriptIntel.questionsAsked.join('; ')}\n`;
    }
    
    if (transcriptIntel.interestsExpressed?.length) {
      prompt += `\nTHINGS THEY'RE INTERESTED IN: ${transcriptIntel.interestsExpressed.join('; ')}\n`;
    }
    
    if (transcriptIntel.painPoints?.length) {
      prompt += `\nPAIN POINTS TO REFERENCE: ${transcriptIntel.painPoints.join('; ')}\n`;
    }
  }
  
  prompt += `\nIMPORTANT: You are role-playing as THIS SPECIFIC business owner. Use the details above to make the conversation realistic. If they have specific objections from past conversations, USE THEM. If you know the owner's name, BE that person. If they've been in business since 1985, ACT like an experienced owner who's seen sales reps come and go.`;
  
  return prompt;
}

export function buildCoachingContextSummary(
  baseInfo: { businessName?: string; businessType?: string; notes?: string; stage?: string },
  websiteIntel: WebsiteIntelligence | null,
  transcriptIntel: TranscriptIntelligence | null
): string {
  let summary = `COACHING CONTEXT FOR: ${baseInfo.businessName || 'Unknown Business'}\n\n`;
  
  if (websiteIntel) {
    summary += `BUSINESS PROFILE:\n`;
    if (websiteIntel.description) summary += `- ${websiteIntel.description}\n`;
    if (websiteIntel.ownerName) summary += `- Owner: ${websiteIntel.ownerName}\n`;
    if (websiteIntel.uniqueSellingPoints?.length) summary += `- Their differentiators: ${websiteIntel.uniqueSellingPoints.join('; ')}\n`;
    if (websiteIntel.establishedYear) summary += `- In business since: ${websiteIntel.establishedYear}\n`;
  }
  
  if (transcriptIntel) {
    summary += `\nWHAT WE KNOW FROM PRIOR MEETINGS:\n`;
    if (transcriptIntel.communicationStyle) summary += `- Communication style: ${transcriptIntel.communicationStyle}\n`;
    if (transcriptIntel.decisionMakingStyle) summary += `- Decision style: ${transcriptIntel.decisionMakingStyle}\n`;
    if (transcriptIntel.knownObjections?.length) summary += `- Objections raised: ${transcriptIntel.knownObjections.join('; ')}\n`;
    if (transcriptIntel.painPoints?.length) summary += `- Pain points: ${transcriptIntel.painPoints.join('; ')}\n`;
    if (transcriptIntel.interestsExpressed?.length) summary += `- Interested in: ${transcriptIntel.interestsExpressed.join('; ')}\n`;
  }
  
  summary += `\nCurrent stage: ${baseInfo.stage || 'Unknown'}\n`;
  if (baseInfo.notes) summary += `Agent notes: ${baseInfo.notes}\n`;
  
  return summary;
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

function extractMetaTags(html: string): { title?: string; description?: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  
  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}
