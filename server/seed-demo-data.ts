import { db } from "./db";
import { deals, dealActivities, PIPELINE_STAGES, type InsertDeal, type InsertDealActivity } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const DEMO_DATA_TAG = "demo-data";

interface AustinBusiness {
  businessName: string;
  businessType: string;
  contactName: string;
  contactTitle: string;
  contactPhone: string;
  contactEmail: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  estimatedMonthlyVolume: string;
  estimatedCommission: string;
  notes: string;
}

const austinBusinesses: AustinBusiness[] = [
  {
    businessName: "Capitol City Coffee",
    businessType: "restaurant",
    contactName: "Maria Santos",
    contactTitle: "Owner",
    contactPhone: "512-555-0101",
    contactEmail: "maria@capitolcitycoffee.com",
    businessAddress: "1401 Congress Ave",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78701",
    businessPhone: "512-555-0100",
    estimatedMonthlyVolume: "45000",
    estimatedCommission: "675",
    notes: "[DEMO DATA] Popular downtown coffee shop, high foot traffic",
  },
  {
    businessName: "Barton Springs Deli",
    businessType: "restaurant",
    contactName: "Tom Mitchell",
    contactTitle: "Manager",
    contactPhone: "512-555-0102",
    contactEmail: "tom@bartonspringsdeli.com",
    businessAddress: "2201 Barton Springs Rd",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78704",
    businessPhone: "512-555-0103",
    estimatedMonthlyVolume: "38000",
    estimatedCommission: "570",
    notes: "[DEMO DATA] Near Zilker Park, busy during lunch",
  },
  {
    businessName: "South Congress Pizzeria",
    businessType: "restaurant",
    contactName: "Angela Romano",
    contactTitle: "Owner",
    contactPhone: "512-555-0104",
    contactEmail: "angela@socopizza.com",
    businessAddress: "1600 S Congress Ave",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78704",
    businessPhone: "512-555-0105",
    estimatedMonthlyVolume: "52000",
    estimatedCommission: "780",
    notes: "[DEMO DATA] Tourist hotspot on SoCo, cash heavy",
  },
  {
    businessName: "Sixth Street Auto Repair",
    businessType: "auto",
    contactName: "James Wilson",
    contactTitle: "Owner",
    contactPhone: "512-555-0106",
    contactEmail: "james@sixthstreetauto.com",
    businessAddress: "310 E 6th St",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78701",
    businessPhone: "512-555-0107",
    estimatedMonthlyVolume: "65000",
    estimatedCommission: "975",
    notes: "[DEMO DATA] Full service auto shop, high ticket transactions",
  },
  {
    businessName: "Lake Travis Marina",
    businessType: "service",
    contactName: "Robert Lake",
    contactTitle: "General Manager",
    contactPhone: "512-555-0108",
    contactEmail: "robert@laketravismarina.com",
    businessAddress: "5973 Hiline Rd",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78734",
    businessPhone: "512-555-0109",
    estimatedMonthlyVolume: "125000",
    estimatedCommission: "1875",
    notes: "[DEMO DATA] Boat rentals and marina services, seasonal peaks",
  },
  {
    businessName: "Mueller Neighborhood Salon",
    businessType: "salon",
    contactName: "Lisa Chen",
    contactTitle: "Owner/Stylist",
    contactPhone: "512-555-0110",
    contactEmail: "lisa@muellersalon.com",
    businessAddress: "1201 Barbara Jordan Blvd",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78723",
    businessPhone: "512-555-0111",
    estimatedMonthlyVolume: "28000",
    estimatedCommission: "420",
    notes: "[DEMO DATA] Upscale salon in Mueller development",
  },
  {
    businessName: "Domain Pet Supplies",
    businessType: "retail",
    contactName: "Sarah Johnson",
    contactTitle: "Store Manager",
    contactPhone: "512-555-0112",
    contactEmail: "sarah@domainpets.com",
    businessAddress: "11600 Century Oaks Ter",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78758",
    businessPhone: "512-555-0113",
    estimatedMonthlyVolume: "42000",
    estimatedCommission: "630",
    notes: "[DEMO DATA] Pet store in The Domain shopping center",
  },
  {
    businessName: "East Austin Tacos",
    businessType: "restaurant",
    contactName: "Carlos Mendez",
    contactTitle: "Owner",
    contactPhone: "512-555-0114",
    contactEmail: "carlos@eastaustintacos.com",
    businessAddress: "2330 E Cesar Chavez St",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78702",
    businessPhone: "512-555-0115",
    estimatedMonthlyVolume: "35000",
    estimatedCommission: "525",
    notes: "[DEMO DATA] Authentic tacos, heavy cash and card mix",
  },
  {
    businessName: "Round Rock Family Dentistry",
    businessType: "medical",
    contactName: "Dr. Emily Park",
    contactTitle: "Owner/Dentist",
    contactPhone: "512-555-0116",
    contactEmail: "emily@rrfamilydentist.com",
    businessAddress: "200 E Main St",
    businessCity: "Round Rock",
    businessState: "TX",
    businessZip: "78664",
    businessPhone: "512-555-0117",
    estimatedMonthlyVolume: "85000",
    estimatedCommission: "1275",
    notes: "[DEMO DATA] Dental practice, high average tickets",
  },
  {
    businessName: "Bee Cave Wellness Spa",
    businessType: "salon",
    contactName: "Jennifer Martinez",
    contactTitle: "Spa Director",
    contactPhone: "512-555-0118",
    contactEmail: "jennifer@beecavewellness.com",
    businessAddress: "12801 Shops Pkwy",
    businessCity: "Bee Cave",
    businessState: "TX",
    businessZip: "78738",
    businessPhone: "512-555-0119",
    estimatedMonthlyVolume: "55000",
    estimatedCommission: "825",
    notes: "[DEMO DATA] Luxury spa, high-end clientele",
  },
  {
    businessName: "Pflugerville Hardware",
    businessType: "retail",
    contactName: "Mike Thompson",
    contactTitle: "Owner",
    contactPhone: "512-555-0120",
    contactEmail: "mike@pflugervillehardware.com",
    businessAddress: "100 E Main St",
    businessCity: "Pflugerville",
    businessState: "TX",
    businessZip: "78660",
    businessPhone: "512-555-0121",
    estimatedMonthlyVolume: "48000",
    estimatedCommission: "720",
    notes: "[DEMO DATA] Local hardware store, contractor accounts",
  },
  {
    businessName: "Cedar Park Gaming Lounge",
    businessType: "service",
    contactName: "Derek Chang",
    contactTitle: "Manager",
    contactPhone: "512-555-0122",
    contactEmail: "derek@cpgaminglounge.com",
    businessAddress: "1890 Ranch Rd",
    businessCity: "Cedar Park",
    businessState: "TX",
    businessZip: "78613",
    businessPhone: "512-555-0123",
    estimatedMonthlyVolume: "22000",
    estimatedCommission: "330",
    notes: "[DEMO DATA] Esports and gaming cafe, young demographic",
  },
  {
    businessName: "Westlake Wine & Spirits",
    businessType: "retail",
    contactName: "Patricia Adams",
    contactTitle: "Owner",
    contactPhone: "512-555-0124",
    contactEmail: "patricia@westlakewine.com",
    businessAddress: "3663 Bee Caves Rd",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78746",
    businessPhone: "512-555-0125",
    estimatedMonthlyVolume: "95000",
    estimatedCommission: "1425",
    notes: "[DEMO DATA] Upscale wine shop, high average tickets",
  },
  {
    businessName: "North Loop Vinyl Records",
    businessType: "retail",
    contactName: "Jason Reed",
    contactTitle: "Owner",
    contactPhone: "512-555-0126",
    contactEmail: "jason@northloopvinyl.com",
    businessAddress: "5420 North Loop Blvd E",
    businessCity: "Austin",
    businessState: "TX",
    businessZip: "78756",
    businessPhone: "512-555-0127",
    estimatedMonthlyVolume: "18000",
    estimatedCommission: "270",
    notes: "[DEMO DATA] Vintage vinyl shop, unique inventory",
  },
  {
    businessName: "Dripping Springs BBQ",
    businessType: "restaurant",
    contactName: "Billy Ray Tucker",
    contactTitle: "Pitmaster/Owner",
    contactPhone: "512-555-0128",
    contactEmail: "billy@dripspringsbbq.com",
    businessAddress: "500 Old Fitzhugh Rd",
    businessCity: "Dripping Springs",
    businessState: "TX",
    businessZip: "78620",
    businessPhone: "512-555-0129",
    estimatedMonthlyVolume: "72000",
    estimatedCommission: "1080",
    notes: "[DEMO DATA] Hill Country BBQ joint, weekend crowds",
  },
  {
    businessName: "Lakeway Golf Pro Shop",
    businessType: "retail",
    contactName: "Steve Palmer",
    contactTitle: "Pro Shop Manager",
    contactPhone: "512-555-0130",
    contactEmail: "steve@lakewaygolf.com",
    businessAddress: "100 World of Tennis Sq",
    businessCity: "Lakeway",
    businessState: "TX",
    businessZip: "78734",
    businessPhone: "512-555-0131",
    estimatedMonthlyVolume: "68000",
    estimatedCommission: "1020",
    notes: "[DEMO DATA] Country club pro shop, affluent members",
  },
  {
    businessName: "Buda Quick Lube",
    businessType: "auto",
    contactName: "Tony Hernandez",
    contactTitle: "Owner",
    contactPhone: "512-555-0132",
    contactEmail: "tony@budaquicklube.com",
    businessAddress: "204 N Main St",
    businessCity: "Buda",
    businessState: "TX",
    businessZip: "78610",
    businessPhone: "512-555-0133",
    estimatedMonthlyVolume: "32000",
    estimatedCommission: "480",
    notes: "[DEMO DATA] Fast oil change, high volume",
  },
  {
    businessName: "Kyle Family Pharmacy",
    businessType: "medical",
    contactName: "Dr. Susan Kim",
    contactTitle: "Pharmacist/Owner",
    contactPhone: "512-555-0134",
    contactEmail: "susan@kylefamilypharmacy.com",
    businessAddress: "400 Center St",
    businessCity: "Kyle",
    businessState: "TX",
    businessZip: "78640",
    businessPhone: "512-555-0135",
    estimatedMonthlyVolume: "78000",
    estimatedCommission: "1170",
    notes: "[DEMO DATA] Independent pharmacy, prescription focus",
  },
  {
    businessName: "Manor Feed & Supply",
    businessType: "retail",
    contactName: "Howard Bell",
    contactTitle: "Owner",
    contactPhone: "512-555-0136",
    contactEmail: "howard@manorfeedsupply.com",
    businessAddress: "108 N Lexington St",
    businessCity: "Manor",
    businessState: "TX",
    businessZip: "78653",
    businessPhone: "512-555-0137",
    estimatedMonthlyVolume: "41000",
    estimatedCommission: "615",
    notes: "[DEMO DATA] Farm supply store, rural customer base",
  },
  {
    businessName: "Leander Craft Brewery",
    businessType: "restaurant",
    contactName: "Chris Morgan",
    contactTitle: "Taproom Manager",
    contactPhone: "512-555-0138",
    contactEmail: "chris@leanderbrewery.com",
    businessAddress: "3301 S US Hwy 183",
    businessCity: "Leander",
    businessState: "TX",
    businessZip: "78641",
    businessPhone: "512-555-0139",
    estimatedMonthlyVolume: "58000",
    estimatedCommission: "870",
    notes: "[DEMO DATA] Craft beer taproom, growing suburb",
  },
  {
    businessName: "Georgetown Antique Mall",
    businessType: "retail",
    contactName: "Margaret White",
    contactTitle: "Owner",
    contactPhone: "512-555-0140",
    contactEmail: "margaret@gtownantiques.com",
    businessAddress: "110 E 8th St",
    businessCity: "Georgetown",
    businessState: "TX",
    businessZip: "78626",
    businessPhone: "512-555-0141",
    estimatedMonthlyVolume: "29000",
    estimatedCommission: "435",
    notes: "[DEMO DATA] Multi-vendor antique mall, tourist traffic",
  },
  {
    businessName: "Bastrop River Outfitters",
    businessType: "service",
    contactName: "Jake Rivers",
    contactTitle: "Owner",
    contactPhone: "512-555-0142",
    contactEmail: "jake@bastropriver.com",
    businessAddress: "702 Main St",
    businessCity: "Bastrop",
    businessState: "TX",
    businessZip: "78602",
    businessPhone: "512-555-0143",
    estimatedMonthlyVolume: "36000",
    estimatedCommission: "540",
    notes: "[DEMO DATA] Kayak and canoe rentals, seasonal peaks",
  },
  {
    businessName: "Elgin Sausage Company",
    businessType: "restaurant",
    contactName: "Frank Schmidt",
    contactTitle: "Owner",
    contactPhone: "512-555-0144",
    contactEmail: "frank@elginsausage.com",
    businessAddress: "188 US-290",
    businessCity: "Elgin",
    businessState: "TX",
    businessZip: "78621",
    businessPhone: "512-555-0145",
    estimatedMonthlyVolume: "47000",
    estimatedCommission: "705",
    notes: "[DEMO DATA] Famous sausage shop, retail and wholesale",
  },
  {
    businessName: "Taylor Auto Parts",
    businessType: "auto",
    contactName: "Bobby Taylor",
    contactTitle: "Store Manager",
    contactPhone: "512-555-0146",
    contactEmail: "bobby@taylorautoparts.com",
    businessAddress: "200 N Main St",
    businessCity: "Taylor",
    businessState: "TX",
    businessZip: "76574",
    businessPhone: "512-555-0147",
    estimatedMonthlyVolume: "53000",
    estimatedCommission: "795",
    notes: "[DEMO DATA] Auto parts retailer, B2B and retail mix",
  },
  {
    businessName: "Liberty Hill Veterinary",
    businessType: "medical",
    contactName: "Dr. Amanda Hayes",
    contactTitle: "Veterinarian/Owner",
    contactPhone: "512-555-0148",
    contactEmail: "amanda@lhveterinary.com",
    businessAddress: "13501 W SH-29",
    businessCity: "Liberty Hill",
    businessState: "TX",
    businessZip: "78642",
    businessPhone: "512-555-0149",
    estimatedMonthlyVolume: "62000",
    estimatedCommission: "930",
    notes: "[DEMO DATA] Full service vet clinic, growing area",
  },
  {
    businessName: "Wimberley Glass Studio",
    businessType: "retail",
    contactName: "David Glass",
    contactTitle: "Artist/Owner",
    contactPhone: "512-555-0150",
    contactEmail: "david@wimberleyglass.com",
    businessAddress: "14036 RR 12",
    businessCity: "Wimberley",
    businessState: "TX",
    businessZip: "78676",
    businessPhone: "512-555-0151",
    estimatedMonthlyVolume: "24000",
    estimatedCommission: "360",
    notes: "[DEMO DATA] Art glass gallery, weekend tourist traffic",
  },
  {
    businessName: "Marble Falls Florist",
    businessType: "retail",
    contactName: "Rose Petals",
    contactTitle: "Owner",
    contactPhone: "512-555-0152",
    contactEmail: "rose@mfflorist.com",
    businessAddress: "301 Main St",
    businessCity: "Marble Falls",
    businessState: "TX",
    businessZip: "78654",
    businessPhone: "512-555-0153",
    estimatedMonthlyVolume: "19000",
    estimatedCommission: "285",
    notes: "[DEMO DATA] Local florist, event and delivery business",
  },
  {
    businessName: "Spicewood Winery",
    businessType: "restaurant",
    contactName: "Victoria Vine",
    contactTitle: "Tasting Room Manager",
    contactPhone: "512-555-0154",
    contactEmail: "victoria@spicewoodwinery.com",
    businessAddress: "1419 Burnet County Rd 409",
    businessCity: "Spicewood",
    businessState: "TX",
    businessZip: "78669",
    businessPhone: "512-555-0155",
    estimatedMonthlyVolume: "44000",
    estimatedCommission: "660",
    notes: "[DEMO DATA] Hill Country winery, tasting room and events",
  },
];

function getStageNotes(stage: string): string {
  const stageNoteMap: Record<string, string> = {
    prospect: "New lead identified, needs initial outreach",
    cold_call: "Cold call made, follow-up scheduled",
    appointment_set: "Meeting scheduled for next week",
    presentation_made: "Gave full presentation, merchant interested",
    proposal_sent: "Sent customized proposal with competitive rates",
    statement_analysis: "Analyzing current processor statement",
    negotiating: "Discussing terms and pricing",
    follow_up: "Following up on proposal",
    documents_sent: "Application sent for signature",
    documents_signed: "Application received, pending approval",
    sold: "Deal closed successfully!",
    dead: "Merchant decided to stay with current processor",
    installation_scheduled: "Terminal delivery scheduled",
    active_merchant: "Processing live, happy customer",
  };
  return stageNoteMap[stage] || "";
}

function getTemperatureForStage(stage: string): "hot" | "warm" | "cold" {
  const hotStages = ["negotiating", "documents_sent", "documents_signed", "sold"];
  const coldStages = ["prospect", "cold_call", "dead"];
  if (hotStages.includes(stage)) return "hot";
  if (coldStages.includes(stage)) return "cold";
  return "warm";
}

function getProbabilityForStage(stage: string): number {
  const probabilities: Record<string, number> = {
    prospect: 10,
    cold_call: 15,
    appointment_set: 25,
    presentation_made: 40,
    proposal_sent: 50,
    statement_analysis: 55,
    negotiating: 70,
    follow_up: 60,
    documents_sent: 80,
    documents_signed: 95,
    sold: 100,
    dead: 0,
    installation_scheduled: 100,
    active_merchant: 100,
  };
  return probabilities[stage] || 50;
}

export async function checkDemoDealsExist(organizationId: number): Promise<boolean> {
  const existingDemoDeals = await db
    .select({ id: deals.id })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),
        sql`${deals.tags}::jsonb ? ${DEMO_DATA_TAG}`
      )
    )
    .limit(1);
  
  return existingDemoDeals.length > 0;
}

export async function seedDemoDeals(organizationId: number, agentId: string): Promise<{ created: number; skipped: boolean }> {
  const alreadyExists = await checkDemoDealsExist(organizationId);
  
  if (alreadyExists) {
    return { created: 0, skipped: true };
  }
  
  let businessIndex = 0;
  const createdDeals: number[] = [];
  
  for (const stage of PIPELINE_STAGES) {
    const dealsToCreate = stage === "sold" || stage === "active_merchant" ? 2 : 1;
    
    for (let i = 0; i < dealsToCreate && businessIndex < austinBusinesses.length; i++) {
      const business = austinBusinesses[businessIndex];
      businessIndex++;
      
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 2);
      
      const dealData: InsertDeal = {
        organizationId,
        businessName: business.businessName,
        businessAddress: business.businessAddress,
        businessCity: business.businessCity,
        businessState: business.businessState,
        businessZip: business.businessZip,
        businessPhone: business.businessPhone,
        businessType: business.businessType,
        contactName: business.contactName,
        contactTitle: business.contactTitle,
        contactPhone: business.contactPhone,
        contactEmail: business.contactEmail,
        currentStage: stage,
        estimatedMonthlyVolume: business.estimatedMonthlyVolume,
        estimatedCommission: business.estimatedCommission,
        dealProbability: getProbabilityForStage(stage),
        temperature: getTemperatureForStage(stage),
        sourceType: "cold_call",
        assignedAgentId: agentId,
        notes: `${business.notes}\n\nStage Notes: ${getStageNotes(stage)}`,
        tags: [DEMO_DATA_TAG],
        closedAt: (stage === "sold" || stage === "active_merchant" || stage === "dead") ? now : undefined,
        wonAt: (stage === "sold" || stage === "active_merchant") ? now : undefined,
        closedReason: stage === "dead" ? "Merchant declined - staying with current processor" : undefined,
        installationScheduledAt: stage === "installation_scheduled" ? futureDate : undefined,
        installationCompletedAt: stage === "active_merchant" ? pastDate : undefined,
        goLiveAt: stage === "active_merchant" ? pastDate : undefined,
        appointmentDate: ["appointment_set", "presentation_made"].includes(stage) ? appointmentDate : undefined,
        appointmentNotes: ["appointment_set", "presentation_made"].includes(stage) ? "Initial meeting to discuss processing needs" : undefined,
      };
      
      const [newDeal] = await db.insert(deals).values(dealData as any).returning();
      createdDeals.push(newDeal.id);
      
      const activityData: InsertDealActivity = {
        dealId: newDeal.id,
        organizationId,
        activityType: "deal_created",
        agentId,
        agentName: "Demo Seeder",
        description: `Demo deal created in ${stage} stage`,
        notes: "This is demo data for testing and training purposes",
        isSystemGenerated: true,
      };
      
      await db.insert(dealActivities).values(activityData as any);
    }
  }
  
  return { created: createdDeals.length, skipped: false };
}

export async function deleteDemoDeals(organizationId: number): Promise<number> {
  const demoDealsToDelete = await db
    .select({ id: deals.id })
    .from(deals)
    .where(
      and(
        eq(deals.organizationId, organizationId),
        sql`${deals.tags}::jsonb ? ${DEMO_DATA_TAG}`
      )
    );
  
  if (demoDealsToDelete.length === 0) {
    return 0;
  }
  
  const dealIds = demoDealsToDelete.map(d => d.id);
  
  for (const dealId of dealIds) {
    await db.delete(dealActivities).where(eq(dealActivities.dealId, dealId));
  }
  
  await db.delete(deals).where(
    and(
      eq(deals.organizationId, organizationId),
      sql`${deals.tags}::jsonb ? ${DEMO_DATA_TAG}`
    )
  );
  
  return dealIds.length;
}
