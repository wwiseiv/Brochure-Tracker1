import Anthropic from '@anthropic-ai/sdk';

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

export interface BusinessInfo {
  businessName: string;
  description: string;
  industry?: string;
  services?: string[];
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  tagline?: string;
  uniqueSellingPoints?: string[];
}

export async function analyzeBusinessWebsite(websiteUrl: string): Promise<BusinessInfo | null> {
  console.log('[WebsiteAnalyzer] Analyzing website:', websiteUrl);
  
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PCBancard/1.0; +https://pcbancard.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log('[WebsiteAnalyzer] Failed to fetch website:', response.status);
      return null;
    }

    const html = await response.text();
    
    const textContent = extractTextFromHtml(html);
    const metaInfo = extractMetaTags(html);
    const colorInfo = extractColors(html);

    const client = getAnthropicClient();
    
    const analysisPrompt = `Analyze this business website content and extract key information for creating a personalized marketing flyer.

WEBSITE URL: ${websiteUrl}

META INFORMATION:
Title: ${metaInfo.title || 'Not found'}
Description: ${metaInfo.description || 'Not found'}

DETECTED COLORS FROM CSS:
${colorInfo.length > 0 ? colorInfo.slice(0, 10).join(', ') : 'None detected'}

WEBSITE TEXT CONTENT (excerpt):
${textContent.substring(0, 3000)}

---

Based on this information, extract:
1. Business name
2. Brief description of what they do (1-2 sentences)
3. Industry/sector
4. Key services or products they offer (list up to 5)
5. Their unique selling points or value propositions (list up to 3)
6. A suggested tagline that captures their essence
7. Brand colors (if detectable from the content - use hex codes if possible)

Respond ONLY with valid JSON in this exact format:
{
  "businessName": "Name of the business",
  "description": "Brief description of the business",
  "industry": "Industry/sector",
  "services": ["Service 1", "Service 2"],
  "uniqueSellingPoints": ["USP 1", "USP 2"],
  "tagline": "A catchy tagline for them",
  "colors": {
    "primary": "#hexcode or null",
    "secondary": "#hexcode or null",
    "accent": "#hexcode or null"
  }
}

Return ONLY valid JSON, no markdown or explanation.`;

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: analysisPrompt }]
    });

    const textBlock = aiResponse.content[0];
    if (textBlock.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    const cleanedContent = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const businessInfo = JSON.parse(cleanedContent) as BusinessInfo;
    
    console.log('[WebsiteAnalyzer] Extracted business info:', businessInfo.businessName);
    return businessInfo;
  } catch (error) {
    console.error('[WebsiteAnalyzer] Error analyzing website:', error);
    return null;
  }
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

function extractColors(html: string): string[] {
  const colors: Set<string> = new Set();
  
  const hexMatches = html.match(/#[0-9a-fA-F]{6}\b/g);
  if (hexMatches) {
    hexMatches.forEach(c => colors.add(c.toLowerCase()));
  }
  
  const rgbMatches = html.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi);
  if (rgbMatches) {
    rgbMatches.forEach(rgb => {
      const nums = rgb.match(/\d+/g);
      if (nums && nums.length >= 3) {
        const hex = '#' + nums.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
        colors.add(hex.toLowerCase());
      }
    });
  }
  
  const filteredColors = Array.from(colors).filter(c => {
    return c !== '#000000' && c !== '#ffffff' && c !== '#fff' && c !== '#000';
  });
  
  return filteredColors;
}
