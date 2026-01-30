import * as cheerio from "cheerio";

export interface MerchantInfo {
  logoUrl: string | null;
  businessName: string | null;
  businessDescription: string | null;
  address: string | null;
  phone: string | null;
  industry: string | null;
  scraped: boolean;
  scrapedAt: Date | null;
  errors: string[];
}

export interface ScrapedMerchant {
  success: boolean;
  data: MerchantInfo;
  rawHtml?: string;
}

function normalizeUrl(url: string, baseUrl: string): string | null {
  try {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("http")) return url;
    const base = new URL(baseUrl);
    if (url.startsWith("/")) {
      return `${base.protocol}//${base.host}${url}`;
    }
    return `${base.protocol}//${base.host}/${url}`;
  } catch {
    return null;
  }
}

function extractLogoUrl($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'img[class*="logo"]',
    'img[id*="logo"]',
    'img[alt*="logo" i]',
    'img[src*="logo"]',
    'a[class*="logo"] img',
    'header img:first-of-type',
    'nav img:first-of-type',
    '.logo img',
    '#logo img',
    '[class*="brand"] img',
    'a.navbar-brand img',
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const src = el.attr("href") || el.attr("content") || el.attr("src");
      const normalized = normalizeUrl(src || "", baseUrl);
      if (normalized && !normalized.includes("data:image/svg")) {
        return normalized;
      }
    }
  }
  return null;
}

function extractBusinessName($: cheerio.CheerioAPI, url: string): string | null {
  const ogTitle = $('meta[property="og:site_name"]').attr("content");
  if (ogTitle) return ogTitle.trim();

  const title = $("title").text();
  if (title) {
    const cleaned = title.split("|")[0].split("-")[0].split("–")[0].trim();
    if (cleaned && cleaned.length < 100) return cleaned;
  }

  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return null;
  }
}

function extractDescription($: cheerio.CheerioAPI): string | null {
  const ogDesc = $('meta[property="og:description"]').attr("content");
  if (ogDesc) return ogDesc.trim();

  const metaDesc = $('meta[name="description"]').attr("content");
  if (metaDesc) return metaDesc.trim();

  const h1 = $("h1").first().text();
  if (h1 && h1.length > 10 && h1.length < 200) return h1.trim();

  return null;
}

function extractPhone($: cheerio.CheerioAPI, html: string): string | null {
  const phonePatterns = [
    /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
    /\+1[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
  ];

  const telLink = $('a[href^="tel:"]').first().attr("href");
  if (telLink) {
    return telLink.replace("tel:", "").trim();
  }

  for (const pattern of phonePatterns) {
    const match = html.match(pattern);
    if (match && match[0]) return match[0];
  }

  return null;
}

function extractAddress($: cheerio.CheerioAPI): string | null {
  const addressEl = $("address").first().text();
  if (addressEl && addressEl.length > 10) return addressEl.trim().replace(/\s+/g, " ");

  const schemaAddress = $('[itemtype*="PostalAddress"]');
  if (schemaAddress.length) {
    const parts = [
      schemaAddress.find('[itemprop="streetAddress"]').text(),
      schemaAddress.find('[itemprop="addressLocality"]').text(),
      schemaAddress.find('[itemprop="addressRegion"]').text(),
      schemaAddress.find('[itemprop="postalCode"]').text(),
    ].filter(Boolean);
    if (parts.length > 1) return parts.join(", ").trim();
  }

  return null;
}

function detectIndustry($: cheerio.CheerioAPI, text: string): string | null {
  const industries: Record<string, string[]> = {
    restaurant: ["restaurant", "dining", "food", "menu", "cuisine", "chef", "bistro", "cafe", "pizza", "grill"],
    retail: ["shop", "store", "retail", "merchandise", "buy", "purchase", "products", "boutique"],
    "auto repair": ["auto", "car", "vehicle", "mechanic", "repair", "automotive", "tire", "oil change"],
    "healthcare": ["health", "medical", "doctor", "clinic", "dental", "therapy", "wellness"],
    "salon/spa": ["salon", "spa", "hair", "beauty", "nail", "massage", "barber"],
    "professional services": ["consulting", "attorney", "lawyer", "accountant", "tax", "financial"],
    "fitness": ["gym", "fitness", "workout", "training", "yoga", "crossfit"],
    "hotel/lodging": ["hotel", "motel", "lodging", "accommodation", "rooms", "booking"],
  };

  const lowerText = text.toLowerCase();
  
  for (const [industry, keywords] of Object.entries(industries)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return industry;
      }
    }
  }

  return "general business";
}

export async function scrapeMerchantWebsite(websiteUrl: string): Promise<ScrapedMerchant> {
  const result: ScrapedMerchant = {
    success: false,
    data: {
      logoUrl: null,
      businessName: null,
      businessDescription: null,
      address: null,
      phone: null,
      industry: null,
      scraped: false,
      scrapedAt: null,
      errors: [],
    },
  };

  if (!websiteUrl) {
    result.data.errors.push("No website URL provided");
    return result;
  }

  let url = websiteUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
  } catch {
    result.data.errors.push("Invalid URL format");
    return result;
  }

  try {
    console.log(`[MerchantScrape] Fetching: ${url}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      result.data.errors.push(`HTTP error: ${response.status}`);
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    result.data.logoUrl = extractLogoUrl($, url);
    result.data.businessName = extractBusinessName($, url);
    result.data.businessDescription = extractDescription($);
    result.data.phone = extractPhone($, html);
    result.data.address = extractAddress($);
    result.data.industry = detectIndustry($, html);
    result.data.scraped = true;
    result.data.scrapedAt = new Date();
    result.success = true;
    result.rawHtml = html.substring(0, 50000);

    console.log(`[MerchantScrape] Successfully scraped: ${result.data.businessName}`);
    console.log(`[MerchantScrape] Logo found: ${result.data.logoUrl ? "Yes" : "No"}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[MerchantScrape] Error scraping ${url}:`, message);
    
    if (message.includes("abort")) {
      result.data.errors.push("Request timed out (15s limit)");
    } else {
      result.data.errors.push(`Scraping failed: ${message}`);
    }
  }

  return result;
}

export async function fetchLogoAsBase64(logoUrl: string): Promise<string | null> {
  if (!logoUrl) return null;
  
  if (logoUrl.startsWith("data:image")) {
    return logoUrl;
  }

  try {
    console.log(`[MerchantScrape] Fetching logo: ${logoUrl}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(logoUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`[MerchantScrape] Logo fetch failed: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    
    const mimeType = contentType.includes("jpeg") || contentType.includes("jpg") 
      ? "image/jpeg" 
      : contentType.includes("png") 
        ? "image/png" 
        : contentType.includes("webp")
          ? "image/webp"
          : "image/png";

    console.log(`[MerchantScrape] Logo fetched successfully (${Math.round(buffer.byteLength / 1024)}KB)`);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`[MerchantScrape] Error fetching logo:`, error);
    return null;
  }
}
