import { db } from "../db";
import { prospects } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  email: string | null;
  businessType: string;
  mccCode: string;
  confidence: number;
  hoursOfOperation: string | null;
  ownerName: string | null;
  yearEstablished: string | null;
  description: string | null;
}

export interface SearchResult {
  businesses: DiscoveredBusiness[];
  totalFound: number;
  duplicatesSkipped: number;
  searchId: string;
}

export async function searchLocalBusinesses(
  params: ProspectSearchParams
): Promise<SearchResult> {
  const { zipCode, businessTypes, radius, maxResults, agentId } = params;

  const grokApiKey = process.env.GROK_API_KEY;

  if (!grokApiKey) {
    throw new Error("Grok API not configured");
  }

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const allSearchTerms = businessTypes.flatMap((bt) => [
    bt.name,
    ...bt.searchTerms,
  ]);

  const searchPrompt = `Search the web to find real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Search Terms: ${allSearchTerms.slice(0, 10).join(", ")}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Find REAL businesses that currently exist and are operating
2. Include COMPLETE address information (street address, city, state, zip)
3. Prioritize independent local businesses over national chains
4. Include phone numbers, websites, and hours when available

Return the results as a JSON array with this exact format:
[
  {
    "name": "Business Name",
    "address": "123 Main Street",
    "city": "City Name",
    "state": "IN",
    "zipCode": "46032",
    "phone": "(555) 123-4567",
    "website": "https://example.com",
    "email": null,
    "hoursOfOperation": "Mon-Fri 9am-5pm",
    "ownerName": null,
    "yearEstablished": null,
    "description": "Brief description",
    "businessType": "${businessTypes[0]?.name || 'Business'}",
    "mccCode": "${businessTypes[0]?.code || '0000'}",
    "confidence": 0.9
  }
]

Return ONLY a valid JSON array. Start with [ and end with ]. No markdown, no explanation.`;

  try {
    console.log("[ProspectSearch] Searching with Grok for businesses near", zipCode);
    
    // Use Grok API with search tool
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${grokApiKey}`
      },
      body: JSON.stringify({
        model: "grok-3-fast",
        messages: [
          {
            role: "system",
            content: "You are a business research assistant that searches the web for real local business information. Always return results as valid JSON arrays."
          },
          {
            role: "user",
            content: searchPrompt
          }
        ],
        search_parameters: {
          mode: "auto",
          return_citations: false
        },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ProspectSearch] Grok API error:", response.status, errorText);
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log("[ProspectSearch] Grok response received");
    
    // Extract text from response
    const textContent = data.choices?.[0]?.message?.content || "";
    console.log("[ProspectSearch] Response length:", textContent.length);

    if (!textContent) {
      console.error("[ProspectSearch] No content in response");
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    // Extract JSON array from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[ProspectSearch] No valid JSON found:", textContent.substring(0, 500));
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    let businesses: DiscoveredBusiness[];
    try {
      let jsonStr = jsonMatch[0];
      // Remove trailing commas
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");
      businesses = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[ProspectSearch] JSON parse error:", parseError);
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    // Validate and normalize businesses
    businesses = businesses
      .filter((b) => b.name && b.address && b.city && b.state)
      .map((b) => ({
        name: b.name,
        address: b.address,
        city: b.city,
        state: b.state,
        zipCode: b.zipCode || zipCode,
        phone: b.phone || null,
        website: b.website || null,
        email: b.email || null,
        hoursOfOperation: b.hoursOfOperation || null,
        ownerName: b.ownerName || null,
        yearEstablished: b.yearEstablished || null,
        description: b.description || null,
        businessType: b.businessType || businessTypes[0]?.name || "Unknown",
        mccCode: b.mccCode || businessTypes[0]?.code || "0000",
        confidence: typeof b.confidence === "number" ? b.confidence : 0.8,
      }));

    console.log("[ProspectSearch] Found", businesses.length, "businesses");

    const { deduplicatedBusinesses, duplicatesSkipped } =
      await deduplicateResults(businesses, agentId);

    return {
      businesses: deduplicatedBusinesses,
      totalFound: businesses.length,
      duplicatesSkipped,
      searchId: generateSearchId(),
    };
  } catch (error: any) {
    console.error("[ProspectSearch] Search error:", error.message || error);
    throw new Error("Failed to search for businesses. Please try again.");
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
