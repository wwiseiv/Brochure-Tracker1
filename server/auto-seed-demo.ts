import { db } from "./db";
import { autoCustomers, autoVehicles, autoRepairOrders, autoLineItems, autoPayments, autoDviInspections, autoDviItems, autoAppointments, autoActivityLog, autoBays } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number, hour: number = 0, minute: number = 0): Date {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export async function seedDemoData(shopId: number, ownerId: number): Promise<void> {
  try {
    const existingCustomers = await db.select().from(autoCustomers).where(eq(autoCustomers.shopId, shopId)).limit(1);
    if (existingCustomers.length) {
      console.log("[AutoInit] Demo data already exists, skipping seed");
      return;
    }

    console.log("[AutoInit] Seeding demo data for shop", shopId);

    const bays = await db.select().from(autoBays).where(eq(autoBays.shopId, shopId)).orderBy(autoBays.sortOrder);
    const bayId1 = bays[0]?.id || null;
    const bayId2 = bays[1]?.id || null;
    const bayId3 = bays[2]?.id || null;

    const [maria] = await db.insert(autoCustomers).values({
      shopId, firstName: "Maria", lastName: "Garcia", phone: "(469) 555-2341",
      email: "maria.garcia@email.com", address: "456 Oak Ave", city: "Dallas", state: "TX", zip: "75201",
      tags: ["loyal", "fleet"],
    }).returning();

    const [robert] = await db.insert(autoCustomers).values({
      shopId, firstName: "Robert", lastName: "Johnson", phone: "(214) 555-8872",
      email: "robert.j@email.com", address: "789 Elm St", city: "Plano", state: "TX", zip: "75023",
      tags: ["new"],
    }).returning();

    const [sarah] = await db.insert(autoCustomers).values({
      shopId, firstName: "Sarah", lastName: "Chen", phone: "(972) 555-4456",
      email: "sarah.chen@email.com", address: "321 Maple Dr", city: "Frisco", state: "TX", zip: "75034",
      tags: ["loyal"],
    }).returning();

    const [james] = await db.insert(autoCustomers).values({
      shopId, firstName: "James", lastName: "Williams", phone: "(817) 555-9901",
      email: "james.w@email.com", address: "654 Pine Ln", city: "Arlington", state: "TX", zip: "76011",
      tags: ["fleet"],
    }).returning();

    const [lisa] = await db.insert(autoCustomers).values({
      shopId, firstName: "Lisa", lastName: "Thompson", phone: "(469) 555-3378",
      email: "lisa.t@email.com", address: "987 Cedar Blvd", city: "McKinney", state: "TX", zip: "75070",
    }).returning();

    console.log("[AutoInit] Created 5 customers");

    const [camry] = await db.insert(autoVehicles).values({
      shopId, customerId: maria.id, year: 2022, make: "Toyota", model: "Camry", trim: "SE",
      vin: "4T1BF1FK5NU123456", color: "Silver", mileage: 45200, licensePlate: "ABC-1234",
    }).returning();

    const [f150] = await db.insert(autoVehicles).values({
      shopId, customerId: maria.id, year: 2020, make: "Ford", model: "F-150", trim: "XLT",
      vin: "1FTEW1EP5LFA12345", color: "White", mileage: 68000, licensePlate: "DEF-5678",
    }).returning();

    const [civic] = await db.insert(autoVehicles).values({
      shopId, customerId: robert.id, year: 2021, make: "Honda", model: "Civic", trim: "EX",
      vin: "2HGFC2F64MH123456", color: "Blue", mileage: 32100, licensePlate: "GHI-9012",
    }).returning();

    const [bmwX3] = await db.insert(autoVehicles).values({
      shopId, customerId: sarah.id, year: 2023, make: "BMW", model: "X3", trim: "xDrive30i",
      vin: "5UXTY5C09P9A12345", color: "Black", mileage: 12500, licensePlate: "JKL-3456",
    }).returning();

    const [silverado] = await db.insert(autoVehicles).values({
      shopId, customerId: james.id, year: 2019, make: "Chevrolet", model: "Silverado", trim: "LT",
      vin: "3GCUYDED6KG123456", color: "Red", mileage: 87000, licensePlate: "MNO-7890",
    }).returning();

    const [sierra] = await db.insert(autoVehicles).values({
      shopId, customerId: james.id, year: 2021, make: "GMC", model: "Sierra", trim: "Denali",
      vin: "1GTU9DED3MZ123456", color: "Gray", mileage: 42000, licensePlate: "PQR-1234",
    }).returning();

    const [tesla] = await db.insert(autoVehicles).values({
      shopId, customerId: lisa.id, year: 2024, make: "Tesla", model: "Model Y", trim: "Long Range",
      vin: "7SAYGDEE5PA123456", color: "White", mileage: 8500, licensePlate: "STU-5678",
    }).returning();

    console.log("[AutoInit] Created 7 vehicles");

    // RO-1001: Maria's Camry - paid
    const ro1001SubCash = "175.98";
    const ro1001SubCard = "183.02";
    const [ro1001] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1001", customerId: maria.id, vehicleId: camry.id,
      status: "paid", serviceAdvisorId: ownerId, technicianId: ownerId,
      customerConcern: "Oil change and brake inspection",
      mileageIn: 45200, mileageOut: 45210,
      subtotalCash: ro1001SubCash, subtotalCard: ro1001SubCard,
      taxAmount: "0.00", totalCash: ro1001SubCash, totalCard: ro1001SubCard,
      paidAt: daysAgo(28), completedAt: daysAgo(28),
      createdAt: daysAgo(30), updatedAt: daysAgo(28),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1001.id, type: "labor", description: "Oil Change Service", laborHours: "0.5", laborRate: "120.00", unitPriceCash: "60.00", unitPriceCard: "62.40", totalCash: "60.00", totalCard: "62.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1001.id, type: "parts", description: "Synthetic Motor Oil 5W-30 (5qt)", partNumber: "MOB-124Q", quantity: "1", unitPriceCash: "42.99", unitPriceCard: "44.71", totalCash: "42.99", totalCard: "44.71", costPrice: "28.50", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1001.id, type: "parts", description: "Oil Filter", partNumber: "WIX-57002", quantity: "1", unitPriceCash: "12.99", unitPriceCard: "13.51", totalCash: "12.99", totalCard: "13.51", costPrice: "7.25", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1001.id, type: "labor", description: "Brake Inspection", laborHours: "0.5", laborRate: "120.00", unitPriceCash: "60.00", unitPriceCard: "62.40", totalCash: "60.00", totalCard: "62.40", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    await db.insert(autoPayments).values({
      repairOrderId: ro1001.id, shopId, amount: "175.98", method: "credit_card",
      status: "completed", cardBrand: "visa", cardLast4: "4242",
      createdAt: daysAgo(28),
    });

    // RO-1002: Robert's Civic - completed (no payment)
    const ro1002SubCash = "512.95";
    const ro1002SubCard = "533.47";
    const [ro1002] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1002", customerId: robert.id, vehicleId: civic.id,
      status: "completed", serviceAdvisorId: ownerId, technicianId: ownerId,
      customerConcern: "Check engine light on, rough idle",
      mileageIn: 32100,
      subtotalCash: ro1002SubCash, subtotalCard: ro1002SubCard,
      taxAmount: "0.00", totalCash: ro1002SubCash, totalCard: ro1002SubCard,
      completedAt: daysAgo(12),
      createdAt: daysAgo(14), updatedAt: daysAgo(12),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1002.id, type: "labor", description: "Diagnostic - Check Engine Light", laborHours: "1.0", laborRate: "150.00", unitPriceCash: "150.00", unitPriceCard: "156.00", totalCash: "150.00", totalCard: "156.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1002.id, type: "parts", description: "Ignition Coil Pack", partNumber: "DEN-673-2301", quantity: "1", unitPriceCash: "89.99", unitPriceCard: "93.59", totalCash: "89.99", totalCard: "93.59", costPrice: "52.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1002.id, type: "parts", description: "Spark Plugs (Set of 4)", partNumber: "NGK-ILZKR7B", quantity: "1", unitPriceCash: "47.96", unitPriceCard: "49.88", totalCash: "47.96", totalCard: "49.88", costPrice: "24.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1002.id, type: "labor", description: "Ignition Coil & Spark Plug Replacement", laborHours: "1.5", laborRate: "150.00", unitPriceCash: "225.00", unitPriceCard: "234.00", totalCash: "225.00", totalCard: "234.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    // RO-1003: Sarah's BMW - in_progress
    const ro1003SubCash = "1249.98";
    const ro1003SubCard = "1300.38";
    const [ro1003] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1003", customerId: sarah.id, vehicleId: bmwX3.id,
      status: "in_progress", serviceAdvisorId: ownerId, technicianId: ownerId,
      bayId: bayId1,
      customerConcern: "AC not blowing cold, annual service due",
      mileageIn: 12500,
      subtotalCash: ro1003SubCash, subtotalCard: ro1003SubCard,
      taxAmount: "0.00", totalCash: ro1003SubCash, totalCard: ro1003SubCard,
      createdAt: daysAgo(3), updatedAt: daysAgo(3),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1003.id, type: "labor", description: "AC System Diagnosis", laborHours: "1.0", laborRate: "175.00", unitPriceCash: "175.00", unitPriceCard: "182.00", totalCash: "175.00", totalCard: "182.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1003.id, type: "parts", description: "AC Compressor", partNumber: "DEN-471-1401", quantity: "1", unitPriceCash: "485.00", unitPriceCard: "504.40", totalCash: "485.00", totalCard: "504.40", costPrice: "310.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1003.id, type: "parts", description: "Refrigerant R-134a (2 cans)", partNumber: "IDQ-301", quantity: "2", unitPriceCash: "24.99", unitPriceCard: "25.99", totalCash: "49.98", totalCard: "51.98", costPrice: "14.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1003.id, type: "labor", description: "AC Compressor Replacement", laborHours: "3.0", laborRate: "175.00", unitPriceCash: "525.00", unitPriceCard: "546.00", totalCash: "525.00", totalCard: "546.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro1003.id, type: "fee", description: "Shop Supplies", quantity: "1", unitPriceCash: "15.00", unitPriceCard: "15.00", totalCash: "15.00", totalCard: "15.00", isTaxable: false, isAdjustable: false, isNtnf: true, sortOrder: 5 },
    ]);

    // RO-1004: James's Silverado - approved
    const ro1004SubCash = "1339.98";
    const ro1004SubCard = "1393.58";
    const [ro1004] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1004", customerId: james.id, vehicleId: silverado.id,
      status: "approved", serviceAdvisorId: ownerId, technicianId: ownerId,
      customerConcern: "Transmission fluid leak, 4WD not engaging",
      mileageIn: 87000,
      subtotalCash: ro1004SubCash, subtotalCard: ro1004SubCard,
      taxAmount: "0.00", totalCash: ro1004SubCash, totalCard: ro1004SubCard,
      approvalToken: crypto.randomBytes(32).toString("hex"),
      approvedAt: daysAgo(4),
      createdAt: daysAgo(5), updatedAt: daysAgo(4),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1004.id, type: "labor", description: "Transmission Leak Diagnosis", laborHours: "1.5", laborRate: "150.00", unitPriceCash: "225.00", unitPriceCard: "234.00", totalCash: "225.00", totalCard: "234.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1004.id, type: "parts", description: "Transmission Pan Gasket Kit", partNumber: "ATP-B-188", quantity: "1", unitPriceCash: "34.99", unitPriceCard: "36.39", totalCash: "34.99", totalCard: "36.39", costPrice: "18.50", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1004.id, type: "parts", description: "Transmission Fluid ATF (6qt)", partNumber: "VAL-822405", quantity: "1", unitPriceCash: "54.99", unitPriceCard: "57.19", totalCash: "54.99", totalCard: "57.19", costPrice: "32.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1004.id, type: "labor", description: "Transmission Pan Reseal & Fluid Service", laborHours: "2.5", laborRate: "150.00", unitPriceCash: "375.00", unitPriceCard: "390.00", totalCash: "375.00", totalCard: "390.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro1004.id, type: "sublet", description: "Transfer Case 4WD Actuator Repair (Sublet)", quantity: "1", unitPriceCash: "650.00", unitPriceCard: "676.00", totalCash: "650.00", totalCard: "676.00", isTaxable: false, isAdjustable: true, sortOrder: 5 },
    ]);

    // RO-1005: Maria's F-150 - estimate
    const ro1005SubCash = "180.00";
    const ro1005SubCard = "187.20";
    const [ro1005] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1005", customerId: maria.id, vehicleId: f150.id,
      status: "estimate", serviceAdvisorId: ownerId, technicianId: ownerId,
      customerConcern: "Tire rotation and alignment check",
      mileageIn: 68000,
      subtotalCash: ro1005SubCash, subtotalCard: ro1005SubCard,
      taxAmount: "0.00", totalCash: ro1005SubCash, totalCard: ro1005SubCard,
      approvalToken: crypto.randomBytes(32).toString("hex"),
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1005.id, type: "labor", description: "Tire Rotation", laborHours: "0.5", laborRate: "120.00", unitPriceCash: "60.00", unitPriceCard: "62.40", totalCash: "60.00", totalCard: "62.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1005.id, type: "labor", description: "Four-Wheel Alignment", laborHours: "1.0", laborRate: "120.00", unitPriceCash: "120.00", unitPriceCard: "124.80", totalCash: "120.00", totalCard: "124.80", isTaxable: true, isAdjustable: true, sortOrder: 2 },
    ]);

    // RO-1006: Lisa's Tesla - invoiced
    const ro1006SubCash = "757.48";
    const ro1006SubCard = "787.78";
    const [ro1006] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1006", customerId: lisa.id, vehicleId: tesla.id,
      status: "invoiced", serviceAdvisorId: ownerId, technicianId: ownerId,
      customerConcern: "Squeaking noise from front brakes",
      mileageIn: 8500, mileageOut: 8510,
      subtotalCash: ro1006SubCash, subtotalCard: ro1006SubCard,
      taxAmount: "0.00", totalCash: ro1006SubCash, totalCard: ro1006SubCard,
      completedAt: daysAgo(5),
      invoicedAt: daysAgo(5),
      createdAt: daysAgo(7), updatedAt: daysAgo(5),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1006.id, type: "labor", description: "Brake Inspection & Diagnosis", laborHours: "0.5", laborRate: "175.00", unitPriceCash: "87.50", unitPriceCard: "91.00", totalCash: "87.50", totalCard: "91.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1006.id, type: "parts", description: "Front Brake Pads (Ceramic)", partNumber: "BOC-BC1894", quantity: "1", unitPriceCash: "129.99", unitPriceCard: "135.19", totalCash: "129.99", totalCard: "135.19", costPrice: "72.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1006.id, type: "parts", description: "Front Brake Rotors (Pair)", partNumber: "ROT-EBR1234", quantity: "1", unitPriceCash: "189.99", unitPriceCard: "197.59", totalCash: "189.99", totalCard: "197.59", costPrice: "115.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1006.id, type: "labor", description: "Front Brake Pad & Rotor Replacement", laborHours: "2.0", laborRate: "175.00", unitPriceCash: "350.00", unitPriceCard: "364.00", totalCash: "350.00", totalCard: "364.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    console.log("[AutoInit] Created 6 repair orders with line items");

    // DVI Inspection for Sarah's BMW (RO-1003)
    const [dvi] = await db.insert(autoDviInspections).values({
      repairOrderId: ro1003.id, shopId, technicianId: ownerId,
      vehicleMileage: 12500, status: "completed",
      publicToken: crypto.randomBytes(32).toString("hex"),
      completedAt: daysAgo(2),
    }).returning();

    await db.insert(autoDviItems).values([
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Windshield", condition: "good", sortOrder: 1 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Wiper Blades", condition: "fair", notes: "Minor streaking, recommend replacement soon", sortOrder: 2 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Headlights", condition: "good", sortOrder: 3 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Taillights", condition: "good", sortOrder: 4 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Engine Oil Level", condition: "good", sortOrder: 5 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Coolant Level", condition: "good", sortOrder: 6 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Brake Fluid", condition: "fair", notes: "Slightly dark, recommend flush at next service", sortOrder: 7 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Air Filter", condition: "poor", notes: "Dirty, needs replacement", sortOrder: 8 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Serpentine Belt", condition: "good", sortOrder: 9 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Front Tires (Tread Depth)", condition: "good", notes: "7/32 remaining", sortOrder: 10 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Rear Tires (Tread Depth)", condition: "fair", notes: "5/32 remaining", sortOrder: 11 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Front Brake Pads", condition: "good", notes: "6mm remaining", sortOrder: 12 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Rear Brake Pads", condition: "fair", notes: "4mm remaining", sortOrder: 13 },
      { inspectionId: dvi.id, categoryName: "Undercarriage", itemName: "Exhaust System", condition: "good", sortOrder: 14 },
      { inspectionId: dvi.id, categoryName: "Undercarriage", itemName: "Suspension Components", condition: "good", sortOrder: 15 },
    ]);

    console.log("[AutoInit] Created DVI inspection with 15 items");

    // Appointments
    const tomorrow9am = daysFromNow(1, 9, 0);
    const tomorrow10am = new Date(tomorrow9am.getTime() + 60 * 60 * 1000);
    const tomorrow11am = daysFromNow(1, 11, 0);
    const tomorrow1pm = new Date(tomorrow11am.getTime() + 2 * 60 * 60 * 1000);
    const dayAfter10am = daysFromNow(2, 10, 0);
    const dayAfter1130am = new Date(dayAfter10am.getTime() + 90 * 60 * 1000);

    await db.insert(autoAppointments).values([
      {
        shopId, customerId: maria.id, vehicleId: camry.id, technicianId: ownerId,
        bayId: bayId1, title: "Oil Change - Garcia", status: "scheduled",
        startTime: tomorrow9am, endTime: tomorrow10am, estimatedDuration: 60, color: "#4CAF50",
      },
      {
        shopId, customerId: james.id, vehicleId: silverado.id, technicianId: ownerId,
        bayId: bayId2, title: "Transmission Follow-up - Williams", status: "scheduled",
        startTime: tomorrow11am, endTime: tomorrow1pm, estimatedDuration: 120, color: "#2196F3",
      },
      {
        shopId, customerId: lisa.id, vehicleId: tesla.id, technicianId: ownerId,
        bayId: bayId3, title: "Annual Service - Thompson", status: "scheduled",
        startTime: dayAfter10am, endTime: dayAfter1130am, estimatedDuration: 90, color: "#FF9800",
      },
    ]);

    console.log("[AutoInit] Created 3 appointments");
    console.log("[AutoInit] Demo data seeding complete");
  } catch (error) {
    console.error("[AutoInit] Error seeding demo data:", error);
  }
}
