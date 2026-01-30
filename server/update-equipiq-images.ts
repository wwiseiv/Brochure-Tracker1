import { db } from "./db";
import { equipmentProducts } from "@shared/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

const imageMapping: Record<string, string> = {
  "SwipeSimple Terminal": "/images/equipiq/swipesimple-terminal.png",
  "SwipeSimple Register": "/images/equipiq/swipesimple-register.png",
  "SwipeSimple Card Readers": "/images/equipiq/swipesimple-card-readers.png",
  "Tap to Pay on iPhone": "/images/equipiq/tap-to-pay-iphone.png",
  "SwipeSimple Virtual Terminal": "/images/equipiq/swipesimple-virtual-terminal.png",
  "SwipeSimple Invoicing": "/images/equipiq/swipesimple-invoicing.png",
  "SwipeSimple Text to Pay": "/images/equipiq/swipesimple-text-to-pay.png",
  "SwipeSimple Appointments": "/images/equipiq/swipesimple-appointments.png",
  "Dejavoo P1": "/images/equipiq/dejavoo-p1.png",
  "Dejavoo P3": "/images/equipiq/dejavoo-p3.png",
  "Dejavoo P5": "/images/equipiq/dejavoo-p5.png",
  "Dejavoo P8": "/images/equipiq/dejavoo-p8.png",
  "Dejavoo P12": "/images/equipiq/dejavoo-p12.png",
  "Dejavoo P17": "/images/equipiq/dejavoo-p17.png",
  "Dejavoo P18": "/images/equipiq/dejavoo-p18.png",
  "iPOSpays Gateway": "/images/equipiq/ipospays-gateway.png",
  "DejaPayPro Cloud Register": "/images/equipiq/dejapaypro.png",
  "SPIn (Secure Payment Interface)": "/images/equipiq/spin.png",
  "Dejavoo Extra": "/images/equipiq/dejavoo-extra.png",
  "MX POS All-in-One": "/images/equipiq/mx-pos-all-in-one.png",
  "PAX A920 Pro (MX POS)": "/images/equipiq/pax-a920-pro.png",
  "MX POS Kiosk": "/images/equipiq/mx-pos-kiosk.png",
  "MX POS Restaurant": "/images/equipiq/mx-pos-restaurant.png",
  "MX POS Retail": "/images/equipiq/mx-pos-retail.png",
  "MX POS Salon": "/images/equipiq/mx-pos-salon.png",
  "Hot Sauce Table Service": "/images/equipiq/hot-sauce-table-service.png",
  "Hot Sauce Quick Service": "/images/equipiq/hot-sauce-quick-service.png",
  "Hot Sauce Fast Bar": "/images/equipiq/hot-sauce-fast-bar.png",
  "Hot Sauce Delivery Express": "/images/equipiq/hot-sauce-delivery.png",
  "Hot Sauce Workstation": "/images/equipiq/hot-sauce-workstation.png",
  "Valor VL100 Pro": "/images/equipiq/valor-vl100-pro.png",
  "Valor VP100": "/images/equipiq/valor-vp100.png",
  "Valor VL500": "/images/equipiq/valor-vl500.png",
  "Valor PayPad": "/images/equipiq/valor-paypad.png",
  "Valor Virtual Terminal": "/images/equipiq/valor-virtual-terminal.png",
  "Valor Invoicing": "/images/equipiq/valor-invoicing.png",
  "Valor Recurring Payments": "/images/equipiq/valor-recurring-payments.png",
  "Valor Reporting": "/images/equipiq/valor-reporting.png",
  "Clover Station Solo": "/images/equipiq/clover-station-solo.png",
  "Clover Station Duo": "/images/equipiq/clover-station-duo.png",
  "Clover Mini": "/images/equipiq/clover-mini.png",
  "Clover Flex": "/images/equipiq/clover-flex.png",
  "Clover Go": "/images/equipiq/clover-go.png",
  "PAX A35": "/images/equipiq/pax-a35.png",
  "PAX A60": "/images/equipiq/pax-a60.png",
  "PAX A77": "/images/equipiq/pax-a77.png",
  "PAX A80": "/images/equipiq/pax-a80.png",
  "PAX A920": "/images/equipiq/pax-a920.png",
  "PAX E600": "/images/equipiq/pax-e600.png",
  "PAX E700": "/images/equipiq/pax-e700.png",
  "PAX E800": "/images/equipiq/pax-e800.png",
  "PAX IM30": "/images/equipiq/pax-im30.png",
  "PAX D135": "/images/equipiq/pax-d135.png",
  "PAX D180": "/images/equipiq/pax-d180.png",
  "PAX D200": "/images/equipiq/pax-d200.png",
  "PAX D210": "/images/equipiq/pax-d210.png",
  "PAX S300": "/images/equipiq/pax-s300.png",
  "PAX S800": "/images/equipiq/pax-s800.png",
  "PAX S920": "/images/equipiq/pax-s920.png",
};

async function updateProductImages() {
  console.log("Updating EquipIQ product images...");
  
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const [productName, imageUrl] of Object.entries(imageMapping)) {
    try {
      const result = await db
        .update(equipmentProducts)
        .set({ imageUrl })
        .where(eq(equipmentProducts.name, productName))
        .returning({ id: equipmentProducts.id, name: equipmentProducts.name });
      
      if (result.length > 0) {
        console.log(`[OK] Updated: ${productName}`);
        updatedCount++;
      } else {
        console.log(`[NOT FOUND] ${productName}`);
        notFoundCount++;
      }
    } catch (error) {
      console.error(`[ERROR] ${productName}:`, error);
    }
  }
  
  console.log("\n=== Update Summary ===");
  console.log(`Updated: ${updatedCount}`);
  console.log(`Not Found: ${notFoundCount}`);
  
  process.exit(0);
}

updateProductImages().catch(console.error);
