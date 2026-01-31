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

  const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

  if (!geminiApiKey) {
    throw new Error("Gemini API not configured");
  }

  const businessTypeNames = businessTypes.map((bt) => bt.name).join(", ");
  const allSearchTerms = businessTypes.flatMap((bt) => [
    bt.name,
    ...bt.searchTerms,
  ]);

  const searchPrompt = `You are a business research assistant helping a sales representative find local businesses to visit in person. Search Google to find real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Search Terms to Use: ${allSearchTerms.slice(0, 15).join(", ")}
- Number of Results Needed: ${maxResults}

CRITICAL REQUIREMENTS:
1. Search for REAL, VERIFIED businesses that currently exist and are operating
2. Include COMPLETE address information (exact street address, city, state, zip)
3. Prioritize independent local businesses over national chains (better prospects for payment processing)
4. Focus on businesses likely to accept card payments
5. Exclude businesses that are permanently closed

SEARCH STRATEGY:
- Search for "${businessTypeNames} near ${zipCode}"
- Look for Google Business listings, Yelp results, Yellow Pages
- Verify addresses are complete and accurate

For each business, provide ALL available information in this exact JSON format:
[
  {
    "name": "Business Name",
    "address": "123 Main Street",
    "city": "City Name",
    "state": "IN",
    "zipCode": "46032",
    "phone": "(555) 123-4567",
    "website": "https://example.com",
    "email": "contact@example.com",
    "hoursOfOperation": "Mon-Fri 9am-5pm",
    "ownerName": "Owner Name",
    "yearEstablished": "2015",
    "description": "Brief business description",
    "businessType": "Restaurant",
    "mccCode": "5812",
    "confidence": 0.9
  }
]

Return ONLY a valid JSON array. Start with [ and end with ]. No additional text or explanation.`;

  try {
    console.log("[ProspectSearch] Searching with Gemini for businesses near", zipCode);
    
    // Use Gemini API with Google Search grounding
    const response = await fetch(`${geminiBaseUrl}/v1beta/models/gemini-2.0-flash:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: searchPrompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ProspectSearch] API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log("[ProspectSearch] API response received");
    
    // Extract text from Gemini response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[ProspectSearch] Response text length:", textContent.length);

    if (!textContent) {
      console.error("[ProspectSearch] No text content in response");
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
      console.error("[ProspectSearch] No valid JSON found in response:", textContent.substring(0, 500));
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    let businesses: DiscoveredBusiness[];
    try {
      // Clean up the JSON string
      let jsonStr = jsonMatch[0];
      // Remove any trailing commas before ] or }
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");
      // Parse the JSON
      businesses = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[ProspectSearch] Failed to parse JSON:", parseError);
      console.error("[ProspectSearch] Raw JSON:", jsonMatch[0].substring(0, 500));
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId(),
      };
    }

    // Ensure all businesses have required fields
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

    console.log("[ProspectSearch] Parsed", businesses.length, "businesses");

    const { deduplicatedBusinesses, duplicatesSkipped } =
      await deduplicateResults(businesses, agentId);

    return {
      businesses: deduplicatedBusinesses,
      totalFound: businesses.length,
      duplicatesSkipped,
      searchId: generateSearchId(),
    };
  } catch (error: any) {
    console.error("[ProspectSearch] AI search error:", error.message || error);
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
