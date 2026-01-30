import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

interface ProductImageConfig {
  id: string;
  name: string;
  type: "hardware" | "software";
  category: string;
  description: string;
  vendor: string;
}

const PRODUCTS: ProductImageConfig[] = [
  // SwipeSimple
  { id: "swipesimple-terminal", name: "SwipeSimple Terminal", type: "hardware", category: "all-in-one", description: "Handheld payment terminal with touchscreen and built-in thermal printer", vendor: "SwipeSimple" },
  { id: "swipesimple-register", name: "SwipeSimple Register", type: "hardware", category: "pos-system", description: "Tablet-based POS system with customer display stand", vendor: "SwipeSimple" },
  { id: "swipesimple-card-readers", name: "SwipeSimple Card Readers", type: "hardware", category: "mobile-reader", description: "Compact Bluetooth chip card reader for mobile payments", vendor: "SwipeSimple" },
  { id: "tap-to-pay-iphone", name: "Tap to Pay on iPhone", type: "software", category: "mobile-app", description: "iPhone contactless payment app interface", vendor: "SwipeSimple" },
  { id: "swipesimple-virtual-terminal", name: "SwipeSimple Virtual Terminal", type: "software", category: "virtual-terminal", description: "Web-based payment terminal dashboard", vendor: "SwipeSimple" },
  { id: "swipesimple-invoicing", name: "SwipeSimple Invoicing", type: "software", category: "feature", description: "Digital invoicing software interface", vendor: "SwipeSimple" },
  { id: "swipesimple-text-to-pay", name: "SwipeSimple Text to Pay", type: "software", category: "feature", description: "SMS payment collection interface", vendor: "SwipeSimple" },
  { id: "swipesimple-appointments", name: "SwipeSimple Appointments", type: "software", category: "feature", description: "Appointment scheduling calendar interface", vendor: "SwipeSimple" },
  
  // Dejavoo
  { id: "dejavoo-p1", name: "Dejavoo P1", type: "hardware", category: "countertop", description: "Large 7-inch touchscreen countertop terminal with built-in printer, black finish", vendor: "Dejavoo" },
  { id: "dejavoo-p3", name: "Dejavoo P3", type: "hardware", category: "wireless", description: "Wireless portable terminal with keyboard, screen and printer, black finish", vendor: "Dejavoo" },
  { id: "dejavoo-p5", name: "Dejavoo P5", type: "hardware", category: "pin-pad", description: "Compact customer-facing PIN pad with touchscreen, black finish", vendor: "Dejavoo" },
  { id: "dejavoo-p8", name: "Dejavoo P8", type: "hardware", category: "wireless", description: "Android wireless payment terminal with touchscreen, black finish", vendor: "Dejavoo" },
  { id: "dejavoo-p12", name: "Dejavoo P12", type: "hardware", category: "mobile", description: "Ultra-compact handheld mobile payment device with small screen", vendor: "Dejavoo" },
  { id: "dejavoo-p17", name: "Dejavoo P17", type: "hardware", category: "pin-pad", description: "ADA-compliant PIN pad terminal with tactile keys", vendor: "Dejavoo" },
  { id: "dejavoo-p18", name: "Dejavoo P18", type: "hardware", category: "wireless", description: "Terminal with flip-up customer display screen", vendor: "Dejavoo" },
  { id: "ipospays-gateway", name: "iPOSpays Gateway", type: "software", category: "gateway", description: "Payment gateway cloud platform dashboard", vendor: "Dejavoo" },
  { id: "dejapaypro", name: "DejaPayPro Cloud Register", type: "software", category: "pos-software", description: "Cloud POS register software interface for restaurants", vendor: "Dejavoo" },
  { id: "spin", name: "SPIn API", type: "software", category: "integration", description: "API integration developer portal interface", vendor: "Dejavoo" },
  { id: "dejavoo-extra", name: "Dejavoo Extra", type: "software", category: "loyalty", description: "Customer loyalty rewards program app interface", vendor: "Dejavoo" },
  
  // MX POS
  { id: "mx-pos-all-in-one", name: "MX POS All-in-One", type: "hardware", category: "pos-system", description: "15.6-inch touchscreen POS terminal with built-in printer on stand", vendor: "MX POS" },
  { id: "pax-a920-pro", name: "PAX A920 Pro", type: "hardware", category: "mobile", description: "Android mobile payment terminal with 5-inch screen and printer", vendor: "MX POS" },
  { id: "mx-pos-kiosk", name: "MX POS Kiosk", type: "hardware", category: "kiosk", description: "Tall vertical 21-inch self-service kiosk with card reader", vendor: "MX POS" },
  { id: "mx-pos-restaurant", name: "MX POS Restaurant", type: "software", category: "pos-software", description: "Restaurant table management and order software interface", vendor: "MX POS" },
  { id: "mx-pos-retail", name: "MX POS Retail", type: "software", category: "pos-software", description: "Retail inventory and checkout software interface", vendor: "MX POS" },
  { id: "mx-pos-salon", name: "MX POS Salon", type: "software", category: "pos-software", description: "Salon appointment booking and checkout interface", vendor: "MX POS" },
  
  // Hot Sauce POS
  { id: "hot-sauce-table-service", name: "Hot Sauce Table Service", type: "software", category: "pos-software", description: "Full-service restaurant POS with table layout view", vendor: "Hot Sauce POS" },
  { id: "hot-sauce-quick-service", name: "Hot Sauce Quick Service", type: "software", category: "pos-software", description: "Fast food order entry terminal interface", vendor: "Hot Sauce POS" },
  { id: "hot-sauce-fast-bar", name: "Hot Sauce Fast Bar", type: "software", category: "pos-software", description: "Bar and nightclub drink order POS interface", vendor: "Hot Sauce POS" },
  { id: "hot-sauce-delivery", name: "Hot Sauce Delivery Express", type: "software", category: "pos-software", description: "Delivery driver dispatch and tracking interface", vendor: "Hot Sauce POS" },
  { id: "hot-sauce-workstation", name: "Hot Sauce Workstation", type: "hardware", category: "pos-system", description: "Compact 10-inch POS workstation terminal", vendor: "Hot Sauce POS" },
  { id: "hot-sauce-kitchen-printer", name: "Hot Sauce Kitchen Printer", type: "hardware", category: "printer", description: "Thermal receipt and kitchen order printer", vendor: "Hot Sauce POS" },
  
  // Valor
  { id: "valor-vl100-pro", name: "Valor VL100 Pro", type: "hardware", category: "countertop", description: "Budget countertop payment terminal with small screen", vendor: "Valor" },
  { id: "valor-vp100", name: "Valor VP100", type: "hardware", category: "countertop", description: "Countertop terminal with marketing display screen", vendor: "Valor" },
  { id: "valor-vl500", name: "Valor VL500", type: "hardware", category: "wireless", description: "Portable wireless payment terminal", vendor: "Valor" },
  { id: "valor-paypad", name: "Valor PayPad", type: "hardware", category: "pin-pad", description: "Customer-facing PIN entry pad with screen", vendor: "Valor" },
  { id: "valor-virtual-terminal", name: "Valor Virtual Terminal", type: "software", category: "virtual-terminal", description: "Online payment processing dashboard", vendor: "Valor" },
  { id: "valor-invoicing", name: "Valor Invoicing", type: "software", category: "feature", description: "Invoice creation and management interface", vendor: "Valor" },
  { id: "valor-recurring-payments", name: "Valor Recurring Payments", type: "software", category: "feature", description: "Subscription billing management interface", vendor: "Valor" },
  { id: "valor-reporting", name: "Valor Reporting", type: "software", category: "feature", description: "Sales analytics and reporting dashboard", vendor: "Valor" },
  
  // PAX (standalone)
  { id: "pax-a35", name: "PAX A35", type: "hardware", category: "pin-pad", description: "Compact customer-facing payment PIN pad", vendor: "PAX" },
  { id: "pax-a60", name: "PAX A60", type: "hardware", category: "mobile", description: "Small handheld mobile payment device", vendor: "PAX" },
  { id: "pax-a77", name: "PAX A77", type: "hardware", category: "countertop", description: "Android countertop terminal with touchscreen", vendor: "PAX" },
  { id: "pax-a80", name: "PAX A80", type: "hardware", category: "countertop", description: "Android countertop terminal with larger screen", vendor: "PAX" },
  { id: "pax-a920", name: "PAX A920", type: "hardware", category: "mobile", description: "Portable Android terminal with 5-inch touchscreen and printer", vendor: "PAX" },
  { id: "pax-e600", name: "PAX E600", type: "hardware", category: "pos-system", description: "Full POS system with 15.6-inch touchscreen", vendor: "PAX" },
  { id: "pax-e700", name: "PAX E700", type: "hardware", category: "pos-system", description: "Dual-screen POS system with customer display", vendor: "PAX" },
  { id: "pax-e800", name: "PAX E800", type: "hardware", category: "pos-system", description: "Large touchscreen POS with integrated peripherals", vendor: "PAX" },
  { id: "pax-im30", name: "PAX IM30", type: "hardware", category: "pin-pad", description: "Integrated mobile PIN pad device", vendor: "PAX" },
  { id: "pax-d135", name: "PAX D135", type: "hardware", category: "countertop", description: "Cost-effective countertop payment terminal", vendor: "PAX" },
  { id: "pax-d180", name: "PAX D180", type: "hardware", category: "pin-pad", description: "Mobile bluetooth PIN pad", vendor: "PAX" },
  { id: "pax-d200", name: "PAX D200", type: "hardware", category: "countertop", description: "Compact countertop terminal with printer", vendor: "PAX" },
  { id: "pax-d210", name: "PAX D210", type: "hardware", category: "wireless", description: "Wireless countertop terminal with GPRS", vendor: "PAX" },
  { id: "pax-s300", name: "PAX S300", type: "hardware", category: "pin-pad", description: "Retail integrated PIN pad with screen", vendor: "PAX" },
  { id: "pax-s800", name: "PAX S800", type: "hardware", category: "countertop", description: "Feature-rich countertop terminal", vendor: "PAX" },
  { id: "pax-s920", name: "PAX S920", type: "hardware", category: "wireless", description: "Portable wireless terminal with printer", vendor: "PAX" },
  
  // Clover
  { id: "clover-station-solo", name: "Clover Station Solo", type: "hardware", category: "pos-system", description: "14-inch all-in-one POS system with printer", vendor: "Clover" },
  { id: "clover-station-duo", name: "Clover Station Duo", type: "hardware", category: "pos-system", description: "Dual screen POS with customer-facing display", vendor: "Clover" },
  { id: "clover-mini", name: "Clover Mini", type: "hardware", category: "countertop", description: "Compact countertop POS terminal", vendor: "Clover" },
  { id: "clover-flex", name: "Clover Flex", type: "hardware", category: "mobile", description: "Handheld wireless payment terminal with printer", vendor: "Clover" },
  { id: "clover-go", name: "Clover Go", type: "hardware", category: "mobile-reader", description: "Compact mobile card reader for smartphones", vendor: "Clover" },
];

async function generateSingleImage(
  ai: GoogleGenAI,
  prompt: string,
  timeoutMs: number = 45000
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseModalities: ["image", "text"],
      },
    });

    clearTimeout(timeoutId);

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          return { success: true, data: buffer };
        }
      }
    }

    return { success: false, error: "No image data in response" };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { success: false, error: "Image generation timed out" };
    }
    return { success: false, error: error.message || "Unknown error" };
  }
}

function buildPrompt(product: ProductImageConfig): string {
  if (product.type === "hardware") {
    return `Professional product photography of a ${product.name} payment terminal device. ${product.description}. The device should be shown on a pure white background, photographed at a slight 3/4 angle to show depth. Professional studio lighting, clean shadows, high-quality product shot. Modern payment processing device. No text, no logos, no watermarks.`;
  } else {
    return `Clean modern software interface icon for "${product.name}" - ${product.description}. Show as a simplified app icon or small dashboard preview. Professional minimal design with PCBancard purple accent color (#7C5CFC). Pure white background, no text labels, flat design style.`;
  }
}

async function generateAllThumbnails() {
  console.log("Starting EquipIQ thumbnail generation...");
  console.log(`Total products: ${PRODUCTS.length}`);
  
  const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

  if (!geminiApiKey || !geminiBaseUrl) {
    console.error("Gemini AI not configured - missing AI_INTEGRATIONS_GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_BASE_URL");
    return {};
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl: geminiBaseUrl,
    },
  });
  
  const outputDir = path.join(process.cwd(), "client/public/images/equipiq");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const results: Record<string, string> = {};
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const product of PRODUCTS) {
    const filename = `${product.id}.png`;
    const filepath = path.join(outputDir, filename);
    
    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`[SKIP] ${product.id} - already exists`);
      results[product.id] = `/images/equipiq/${filename}`;
      skipCount++;
      continue;
    }
    
    const prompt = buildPrompt(product);
    console.log(`[GENERATE] ${product.name}...`);
    
    const result = await generateSingleImage(ai, prompt);
    
    if (result.success && result.data) {
      fs.writeFileSync(filepath, result.data);
      results[product.id] = `/images/equipiq/${filename}`;
      console.log(`  [OK] Saved ${filename}`);
      successCount++;
    } else {
      console.log(`  [FAIL] ${result.error}`);
      errorCount++;
    }
    
    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log("\n=== Generation Summary ===");
  console.log(`Generated: ${successCount}`);
  console.log(`Skipped (existing): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total images: ${Object.keys(results).length}`);
  
  // Save results mapping
  const outputPath = path.join(process.cwd(), "equipiq-image-urls.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nImage URLs saved to: ${outputPath}`);
  
  return results;
}

// Run when executed directly
generateAllThumbnails().catch(console.error);

export { generateSingleImage, generateAllThumbnails, PRODUCTS, buildPrompt };
