import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { prospects } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";

export interface ProspectSearchParams {
  zipCode: string;
  businessTypes: { code: string; name: string; searchTerms: string[] }[];
  radius: number;
  maxResults: number;
  agentId: string;
  organizationId?: number;
}

export interface DiscoveredBusiness {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  website: string | null;
  businessType: string;
  mccCode: string;
  confidence: number;
}

export interface SearchResult {
  businesses: DiscoveredBusiness[];
  totalFound: number;
  duplicatesSkipped: number;
  searchId: string;
}

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

export async function searchLocalBusinesses(
  params: ProspectSearchParams
): Promise<SearchResult> {
  const { zipCode, businessTypes, radius, maxResults, agentId } = params;

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const allSearchTerms = businessTypes.flatMap((bt) => [
    bt.name,
    ...bt.searchTerms,
  ]);

  const searchPrompt = `You are a business research assistant helping a sales representative find local businesses to visit. Search for real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Search Terms to Use: ${allSearchTerms.slice(0, 20).join(", ")}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Only return REAL businesses that currently exist and are operating
2. Include complete address information (street, city, state, zip)
3. Prioritize independent local businesses over national chains
4. Focus on businesses likely to accept card payments
5. Exclude businesses that are permanently closed
6. Verify businesses exist by searching for them

For each business found, provide:
- Business Name (official name as it appears on their signage/listing)
- Full Street Address
- City, State, ZIP
- Phone Number (if available, format: (555) 123-4567)
- Website (if available)
- Primary Business Type from the categories I provided
- MCC Code (the 4-digit merchant category code that best matches)
- Confidence score (0.0-1.0) that this is a real, operating business

Return ONLY a valid JSON array with no additional text or explanation. Start with [ and end with ]:
[
  {
    "name": "Example Business Name",
    "address": "123 Main Street",
    "city": "Indianapolis",
    "state": "IN",
    "zipCode": "46032",
    "phone": "(317) 555-1234",
    "website": "https://example.com",
    "businessType": "Restaurant",
    "mccCode": "5812",
    "confidence": 0.95
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      tools: [
        {
          type: "web_search_20250305" as any,
          name: "web_search",
        },
      ],
      messages: [{ role: "user", content: searchPrompt }],
    });

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No valid JSON found in AI response:", textContent);
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    let businesses: DiscoveredBusiness[];
    try {
      businesses = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    businesses = businesses.map((b) => ({
      ...b,
      phone: b.phone || null,
      website: b.website || null,
      confidence: typeof b.confidence === "number" ? b.confidence : 0.8,
    }));

    const { deduplicatedBusinesses, duplicatesSkipped } =
      await deduplicateResults(businesses, agentId);

    return {
      businesses: deduplicatedBusinesses,
      totalFound: businesses.length,
      duplicatesSkipped,
      searchId: generateSearchId(),
    };
  } catch (error) {
    console.error("AI search error:", error);
    throw new Error("Failed to search for businesses");
  }
}

async function deduplicateResults(
  businesses: DiscoveredBusiness[],
  agentId: string
): Promise<{
  deduplicatedBusinesses: DiscoveredBusiness[];
  duplicatesSkipped: number;
}> {
  const existingProspects = await db
    .select({
      businessName: prospects.businessName,
      zipCode: prospects.zipCode,
    })
    .from(prospects)
    .where(eq(prospects.agentId, agentId));

  const existingSet = new Set(
    existingProspects.map(
      (p) => `${p.businessName.toLowerCase()}|${p.zipCode}`
    )
  );

  const deduplicatedBusinesses: DiscoveredBusiness[] = [];
  let duplicatesSkipped = 0;

  for (const business of businesses) {
    const key = `${business.name.toLowerCase()}|${business.zipCode}`;
    if (existingSet.has(key)) {
      duplicatesSkipped++;
    } else {
      deduplicatedBusinesses.push(business);
    }
  }

  return { deduplicatedBusinesses, duplicatesSkipped };
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
