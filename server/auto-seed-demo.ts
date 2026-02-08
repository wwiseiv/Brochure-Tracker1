import { db } from "./db";
import { autoUsers, autoCustomers, autoVehicles, autoRepairOrders, autoLineItems, autoPayments, autoDviInspections, autoDviItems, autoAppointments, autoActivityLog, autoBays } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function todayAt(hour: number, minute: number = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
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

    const passwordHash = await bcrypt.hash("password123", 10);

    const bays = await db.select().from(autoBays).where(eq(autoBays.shopId, shopId)).orderBy(autoBays.sortOrder);
    const bayId1 = bays[0]?.id || null;
    const bayId2 = bays[1]?.id || null;
    const bayId3 = bays[2]?.id || null;

    // ── Staff ──
    const [mike] = await db.insert(autoUsers).values({
      shopId, email: "mike@demo.com", passwordHash, firstName: "Mike", lastName: "Thompson",
      phone: "(317) 555-0901", role: "technician", pin: "1234", payType: "flat_rate", payRate: "30.00",
    }).returning();

    const [sarah] = await db.insert(autoUsers).values({
      shopId, email: "sarah@demo.com", passwordHash, firstName: "Sarah", lastName: "Kim",
      phone: "(317) 555-0902", role: "technician", pin: "5678", payType: "hourly", payRate: "27.00",
    }).returning();

    const [dave] = await db.insert(autoUsers).values({
      shopId, email: "dave@demo.com", passwordHash, firstName: "Dave", lastName: "Rodriguez",
      phone: "(317) 555-0903", role: "technician", pin: "9012", payType: "hourly", payRate: "25.00",
    }).returning();

    const [jessica] = await db.insert(autoUsers).values({
      shopId, email: "jessica@demo.com", passwordHash, firstName: "Jessica", lastName: "Adams",
      phone: "(317) 555-0904", role: "service_advisor", pin: "3456", payType: "salary", payRate: "52000.00",
    }).returning();

    console.log("[AutoInit] Created 4 staff members");

    // ── Customers ──
    const [robertSmith] = await db.insert(autoCustomers).values({
      shopId, firstName: "Robert", lastName: "Smith", phone: "(317) 555-0101",
      email: "rsmith@email.com", address: "142 Oak St", city: "Mountain Lakes", state: "NJ", zip: "07046",
      tags: ["loyal"],
    }).returning();

    const [mariaJohnson] = await db.insert(autoCustomers).values({
      shopId, firstName: "Maria", lastName: "Johnson", phone: "(317) 555-0202",
      email: "mjohnson@email.com", address: "89 Elm Ave", city: "Boonton", state: "NJ", zip: "07005",
      tags: ["loyal", "fleet"],
    }).returning();

    const [carlosGarcia] = await db.insert(autoCustomers).values({
      shopId, firstName: "Carlos", lastName: "Garcia", phone: "(317) 555-0303",
      email: "cgarcia@email.com", address: "501 Pine Rd", city: "Parsippany", state: "NJ", zip: "07054",
      tags: ["new"],
    }).returning();

    const [lisaChen] = await db.insert(autoCustomers).values({
      shopId, firstName: "Lisa", lastName: "Chen", phone: "(317) 555-0404",
      email: "lchen@email.com", address: "67 Maple Dr", city: "Denville", state: "NJ", zip: "07834",
      tags: ["loyal"],
    }).returning();

    const [jamesWilliams] = await db.insert(autoCustomers).values({
      shopId, firstName: "James", lastName: "Williams", phone: "(317) 555-0505",
      email: "jwilliams@email.com", address: "220 Cedar Ln", city: "Rockaway", state: "NJ", zip: "07866",
      tags: ["fleet"],
    }).returning();

    const [amyParker] = await db.insert(autoCustomers).values({
      shopId, firstName: "Amy", lastName: "Parker", phone: "(317) 555-0606",
      email: "aparker@email.com", address: "34 Birch St", city: "Dover", state: "NJ", zip: "07801",
      tags: [],
    }).returning();

    const [davidBrown] = await db.insert(autoCustomers).values({
      shopId, firstName: "David", lastName: "Brown", phone: "(317) 555-0707",
      email: "dbrown@email.com", address: "178 Walnut Ave", city: "Morristown", state: "NJ", zip: "07960",
      tags: ["loyal"],
    }).returning();

    const [michelleTorres] = await db.insert(autoCustomers).values({
      shopId, firstName: "Michelle", lastName: "Torres", phone: "(317) 555-0808",
      email: "mtorres@email.com", address: "92 Spruce Ct", city: "Randolph", state: "NJ", zip: "07869",
      tags: [],
    }).returning();

    console.log("[AutoInit] Created 8 customers");

    // ── Vehicles ──
    const [f150] = await db.insert(autoVehicles).values({
      shopId, customerId: robertSmith.id, year: 2019, make: "Ford", model: "F-150", trim: "XLT",
      vin: "1FTEW1EP5KFA12345", color: "White", mileage: 67800, licensePlate: "NJ-F150",
    }).returning();

    const [camry] = await db.insert(autoVehicles).values({
      shopId, customerId: mariaJohnson.id, year: 2021, make: "Toyota", model: "Camry", trim: "SE",
      vin: "4T1G11AK5MU123456", color: "Silver", mileage: 42300, licensePlate: "NJ-CAMRY",
    }).returning();

    const [civic] = await db.insert(autoVehicles).values({
      shopId, customerId: carlosGarcia.id, year: 2020, make: "Honda", model: "Civic", trim: "LX",
      vin: "2HGFC2F60LH567890", color: "Blue", mileage: 55200, licensePlate: "NJ-CIVIC",
    }).returning();

    const [bmwX3] = await db.insert(autoVehicles).values({
      shopId, customerId: lisaChen.id, year: 2022, make: "BMW", model: "X3", trim: "xDrive30i",
      vin: "5UXTY5C02N9A12345", color: "Black", mileage: 18900, licensePlate: "NJ-BMWX3",
    }).returning();

    const [silverado] = await db.insert(autoVehicles).values({
      shopId, customerId: jamesWilliams.id, year: 2018, make: "Chevrolet", model: "Silverado", trim: "1500 LT",
      vin: "1GCUYDED8JZ234567", color: "Red", mileage: 89200, licensePlate: "NJ-SILV",
    }).returning();

    const [tucson] = await db.insert(autoVehicles).values({
      shopId, customerId: amyParker.id, year: 2023, make: "Hyundai", model: "Tucson", trim: "SEL",
      vin: "5NMJFDAF7PH890123", color: "Gray", mileage: 12400, licensePlate: "NJ-TUCSN",
    }).returning();

    const [grandCherokee] = await db.insert(autoVehicles).values({
      shopId, customerId: davidBrown.id, year: 2017, make: "Jeep", model: "Grand Cherokee", trim: "Laredo",
      vin: "1C4RJFAG5HC345678", color: "Green", mileage: 102300, licensePlate: "NJ-JEEP",
    }).returning();

    const [rogue] = await db.insert(autoVehicles).values({
      shopId, customerId: michelleTorres.id, year: 2020, make: "Nissan", model: "Rogue", trim: "SV",
      vin: "5N1AT2MV0LC456789", color: "White", mileage: 48700, licensePlate: "NJ-ROGUE",
    }).returning();

    const [ram] = await db.insert(autoVehicles).values({
      shopId, customerId: robertSmith.id, year: 2022, make: "Ram", model: "1500", trim: "Big Horn",
      vin: "1C6SRFFT4NN234567", color: "Black", mileage: 28500, licensePlate: "NJ-RAM",
    }).returning();

    console.log("[AutoInit] Created 9 vehicles");

    // ── Completed/Paid ROs ──

    // RO-0998: Maria Johnson / Camry — Paid 3 days ago
    const [ro0998] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-0998", customerId: mariaJohnson.id, vehicleId: camry.id,
      status: "paid", serviceAdvisorId: jessica.id, technicianId: mike.id,
      customerConcern: "Oil change, cabin filter, and wiper blades",
      mileageIn: 42300, mileageOut: 42310,
      subtotalCash: "183.46", subtotalCard: "190.80",
      taxAmount: "0.00", totalCash: "183.46", totalCard: "190.80",
      paidAmount: "190.80", balanceDue: "0.00",
      paidAt: daysAgo(3), completedAt: daysAgo(3),
      createdAt: daysAgo(3), updatedAt: daysAgo(3),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro0998.id, type: "labor", description: "Oil Change Service", laborHours: "0.5", laborRate: "135.00", unitPriceCash: "67.50", unitPriceCard: "70.20", totalCash: "67.50", totalCard: "70.20", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro0998.id, type: "parts", description: "Synthetic Oil 5W-30", partNumber: "MOB-5W30-5Q", quantity: "1", unitPriceCash: "42.99", unitPriceCard: "44.71", totalCash: "42.99", totalCard: "44.71", costPrice: "28.50", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro0998.id, type: "parts", description: "Oil Filter", partNumber: "WIX-57002", quantity: "1", unitPriceCash: "12.99", unitPriceCard: "13.51", totalCash: "12.99", totalCard: "13.51", costPrice: "7.25", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro0998.id, type: "parts", description: "Cabin Air Filter", partNumber: "FRM-CF11920", quantity: "1", unitPriceCash: "24.99", unitPriceCard: "25.99", totalCash: "24.99", totalCard: "25.99", costPrice: "14.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro0998.id, type: "parts", description: "Wiper Blades", partNumber: "BOS-26A18A", quantity: "1", unitPriceCash: "34.99", unitPriceCard: "36.39", totalCash: "34.99", totalCard: "36.39", costPrice: "18.00", isTaxable: true, isAdjustable: true, sortOrder: 5 },
    ]);

    await db.insert(autoPayments).values({
      repairOrderId: ro0998.id, shopId, amount: "190.80", method: "credit_card",
      status: "completed", cardBrand: "visa", cardLast4: "4242",
      createdAt: daysAgo(3),
    });

    // RO-0999: Carlos Garcia / Civic — Paid 2 days ago
    const [ro0999] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-0999", customerId: carlosGarcia.id, vehicleId: civic.id,
      status: "paid", serviceAdvisorId: jessica.id, technicianId: sarah.id,
      customerConcern: "Tire rotation and alignment check",
      mileageIn: 55200, mileageOut: 55210,
      subtotalCash: "180.00", subtotalCard: "187.20",
      taxAmount: "0.00", totalCash: "180.00", totalCard: "187.20",
      paidAmount: "180.00", balanceDue: "0.00",
      paidAt: daysAgo(2), completedAt: daysAgo(2),
      createdAt: daysAgo(2), updatedAt: daysAgo(2),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro0999.id, type: "labor", description: "Tire Rotation", laborHours: "0.5", laborRate: "120.00", unitPriceCash: "60.00", unitPriceCard: "62.40", totalCash: "60.00", totalCard: "62.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro0999.id, type: "labor", description: "Four-Wheel Alignment", laborHours: "1.0", laborRate: "120.00", unitPriceCash: "120.00", unitPriceCard: "124.80", totalCash: "120.00", totalCard: "124.80", isTaxable: true, isAdjustable: true, sortOrder: 2 },
    ]);

    await db.insert(autoPayments).values({
      repairOrderId: ro0999.id, shopId, amount: "180.00", method: "cash",
      status: "completed",
      createdAt: daysAgo(2),
    });

    // RO-1000: James Williams / Silverado — Paid 1 day ago
    const [ro1000] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1000", customerId: jamesWilliams.id, vehicleId: silverado.id,
      status: "paid", serviceAdvisorId: jessica.id, technicianId: dave.id,
      customerConcern: "Water pump and thermostat replacement",
      mileageIn: 89200, mileageOut: 89210,
      subtotalCash: "779.97", subtotalCard: "811.17",
      taxAmount: "0.00", totalCash: "779.97", totalCard: "811.17",
      paidAmount: "811.17", balanceDue: "0.00",
      paidAt: daysAgo(1), completedAt: daysAgo(1),
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1000.id, type: "labor", description: "Diagnostic", laborHours: "0.5", laborRate: "150.00", unitPriceCash: "75.00", unitPriceCard: "78.00", totalCash: "75.00", totalCard: "78.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1000.id, type: "parts", description: "Water Pump", partNumber: "GMB-130-2080", quantity: "1", unitPriceCash: "189.99", unitPriceCard: "197.59", totalCash: "189.99", totalCard: "197.59", costPrice: "105.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1000.id, type: "parts", description: "Thermostat", partNumber: "STA-48708", quantity: "1", unitPriceCash: "34.99", unitPriceCard: "36.39", totalCash: "34.99", totalCard: "36.39", costPrice: "18.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1000.id, type: "parts", description: "Coolant 2gal", partNumber: "PRE-AF2100", quantity: "1", unitPriceCash: "29.99", unitPriceCard: "31.19", totalCash: "29.99", totalCard: "31.19", costPrice: "16.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro1000.id, type: "labor", description: "Water Pump + Thermostat Replacement", laborHours: "3.0", laborRate: "150.00", unitPriceCash: "450.00", unitPriceCard: "468.00", totalCash: "450.00", totalCard: "468.00", isTaxable: true, isAdjustable: true, sortOrder: 5 },
    ]);

    await db.insert(autoPayments).values({
      repairOrderId: ro1000.id, shopId, amount: "811.17", method: "credit_card",
      status: "completed", cardBrand: "mastercard", cardLast4: "8910",
      createdAt: daysAgo(1),
    });

    console.log("[AutoInit] Created 3 completed/paid ROs");

    // ── Active ROs (today) ──

    // RO-1001: Robert Smith / F-150 — In Progress
    const ro1001SubCash = (135 * 1.5 + 135 * 1.0 + 89.99 + 124.99 + 18.99).toFixed(2); // 202.50 + 135 + 89.99 + 124.99 + 18.99 = 571.47
    const ro1001SubCard = (140.40 * 1.5 + 140.40 * 1.0 + 93.59 + 129.99 + 19.75).toFixed(2);
    // labor cash: 1.5*135=202.50, 1.0*135=135.00; parts: 89.99+124.99+18.99=233.97; total cash = 571.47
    // labor card: 1.5*140.40=210.60, 1.0*140.40=140.40; parts: 93.59+129.99+19.75=243.33; total card = 594.33
    const [ro1001] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1001", customerId: robertSmith.id, vehicleId: f150.id,
      status: "in_progress", serviceAdvisorId: jessica.id, technicianId: mike.id,
      bayId: bayId1,
      customerConcern: "Front brake pads and rotors replacement",
      mileageIn: 67800,
      subtotalCash: "571.47", subtotalCard: "594.33",
      taxAmount: "0.00", totalCash: "571.47", totalCard: "594.33",
      createdAt: todayAt(7, 30), updatedAt: todayAt(8, 0),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1001.id, type: "labor", description: "Front Brake Pad Replacement", laborHours: "1.5", laborRate: "135.00", unitPriceCash: "202.50", unitPriceCard: "210.60", totalCash: "202.50", totalCard: "210.60", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1001.id, type: "labor", description: "Front Rotor Replacement", laborHours: "1.0", laborRate: "135.00", unitPriceCash: "135.00", unitPriceCard: "140.40", totalCash: "135.00", totalCard: "140.40", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1001.id, type: "parts", description: "Brake Pads Ceramic", partNumber: "WAG-QC1058", quantity: "1", unitPriceCash: "89.99", unitPriceCard: "93.59", totalCash: "89.99", totalCard: "93.59", costPrice: "48.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1001.id, type: "parts", description: "Rotors Front Pair", partNumber: "ACR-18A1705", quantity: "1", unitPriceCash: "124.99", unitPriceCard: "129.99", totalCash: "124.99", totalCard: "129.99", costPrice: "72.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro1001.id, type: "parts", description: "Brake Hardware Kit", partNumber: "CRL-H5655", quantity: "1", unitPriceCash: "18.99", unitPriceCard: "19.75", totalCash: "18.99", totalCard: "19.75", costPrice: "9.50", isTaxable: true, isAdjustable: true, sortOrder: 5 },
    ]);

    // RO-1002: Maria Johnson / Camry — In Progress
    // labor: 0.5*120=60 + 0.3*120=36 = 96 cash; card: 0.5*124.80... let's use 4% markup
    // 60*1.04=62.40, 36*1.04=37.44; parts: 42.99+12.99=55.98 cash, 44.71+13.51=58.22 card
    // total cash: 96+55.98=151.98; total card: 99.84+58.22=158.06
    const [ro1002] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1002", customerId: mariaJohnson.id, vehicleId: camry.id,
      status: "in_progress", serviceAdvisorId: jessica.id, technicianId: sarah.id,
      bayId: bayId2,
      customerConcern: "Oil change and tire rotation",
      mileageIn: 42310,
      subtotalCash: "151.98", subtotalCard: "158.06",
      taxAmount: "0.00", totalCash: "151.98", totalCard: "158.06",
      createdAt: todayAt(8, 0), updatedAt: todayAt(8, 30),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1002.id, type: "labor", description: "Oil Change", laborHours: "0.5", laborRate: "120.00", unitPriceCash: "60.00", unitPriceCard: "62.40", totalCash: "60.00", totalCard: "62.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1002.id, type: "labor", description: "Tire Rotation", laborHours: "0.3", laborRate: "120.00", unitPriceCash: "36.00", unitPriceCard: "37.44", totalCash: "36.00", totalCard: "37.44", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1002.id, type: "parts", description: "Synthetic Oil", partNumber: "MOB-5W30-5Q", quantity: "1", unitPriceCash: "42.99", unitPriceCard: "44.71", totalCash: "42.99", totalCard: "44.71", costPrice: "28.50", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1002.id, type: "parts", description: "Oil Filter", partNumber: "WIX-57002", quantity: "1", unitPriceCash: "12.99", unitPriceCard: "13.51", totalCash: "12.99", totalCard: "13.51", costPrice: "7.25", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    // RO-1003: Lisa Chen / BMW X3 — Estimate
    // labor: 1.0*175=175 + 0.5*175=87.50 = 262.50 cash; card: 175*1.04=182 + 87.50*1.04=91 = 273
    // parts: 64.99+18.99+29.99+34.99=148.96 cash; 67.59+19.75+31.19+36.39=154.92 card
    // total cash: 262.50+148.96=411.46; total card: 273+154.92=427.92
    const [ro1003] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1003", customerId: lisaChen.id, vehicleId: bmwX3.id,
      status: "estimate", serviceAdvisorId: jessica.id,
      customerConcern: "30K mile service",
      mileageIn: 18900,
      subtotalCash: "411.46", subtotalCard: "427.92",
      taxAmount: "0.00", totalCash: "411.46", totalCard: "427.92",
      approvalToken: crypto.randomBytes(32).toString("hex"),
      createdAt: todayAt(7, 0), updatedAt: todayAt(7, 0),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1003.id, type: "labor", description: "Comprehensive Inspection", laborHours: "1.0", laborRate: "175.00", unitPriceCash: "175.00", unitPriceCard: "182.00", totalCash: "175.00", totalCard: "182.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1003.id, type: "labor", description: "Synthetic Oil Change", laborHours: "0.5", laborRate: "175.00", unitPriceCash: "87.50", unitPriceCard: "91.00", totalCash: "87.50", totalCard: "91.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1003.id, type: "parts", description: "BMW Synthetic Oil", partNumber: "BMW-83212365946", quantity: "1", unitPriceCash: "64.99", unitPriceCard: "67.59", totalCash: "64.99", totalCard: "67.59", costPrice: "42.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1003.id, type: "parts", description: "Oil Filter BMW", partNumber: "BMW-11428507683", quantity: "1", unitPriceCash: "18.99", unitPriceCard: "19.75", totalCash: "18.99", totalCard: "19.75", costPrice: "12.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
      { repairOrderId: ro1003.id, type: "parts", description: "Air Filter", partNumber: "MAN-C30013", quantity: "1", unitPriceCash: "29.99", unitPriceCard: "31.19", totalCash: "29.99", totalCard: "31.19", costPrice: "16.00", isTaxable: true, isAdjustable: true, sortOrder: 5 },
      { repairOrderId: ro1003.id, type: "parts", description: "Cabin Filter", partNumber: "MAN-CUK25001", quantity: "1", unitPriceCash: "34.99", unitPriceCard: "36.39", totalCash: "34.99", totalCard: "36.39", costPrice: "19.00", isTaxable: true, isAdjustable: true, sortOrder: 6 },
    ]);

    // RO-1004: James Williams / Silverado — Approved
    // labor: 1.0*150=150 cash, 156 card; fee: 0 (OBD scan)
    // total cash: 150, card: 156
    const [ro1004] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1004", customerId: jamesWilliams.id, vehicleId: silverado.id,
      status: "approved", serviceAdvisorId: jessica.id,
      customerConcern: "Check engine light diagnostic",
      mileageIn: 89210,
      subtotalCash: "150.00", subtotalCard: "156.00",
      taxAmount: "0.00", totalCash: "150.00", totalCard: "156.00",
      approvalToken: crypto.randomBytes(32).toString("hex"),
      approvedAt: daysAgo(1),
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1004.id, type: "labor", description: "CEL Diagnostic", laborHours: "1.0", laborRate: "150.00", unitPriceCash: "150.00", unitPriceCard: "156.00", totalCash: "150.00", totalCard: "156.00", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1004.id, type: "fee", description: "OBD Scan Fee", quantity: "1", unitPriceCash: "0.00", unitPriceCard: "0.00", totalCash: "0.00", totalCard: "0.00", isTaxable: false, isAdjustable: false, sortOrder: 2 },
    ]);

    // RO-1005: Carlos Garcia / Civic — Estimate
    // labor: 1.0*135=135 + 2.5*135=337.50 = 472.50 cash; card: 140.40 + 351 = 491.40
    // parts: 385+49.98=434.98 cash; 400.40+51.98=452.38 card
    // total cash: 472.50+434.98=907.48; total card: 491.40+452.38=943.78
    const [ro1005] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1005", customerId: carlosGarcia.id, vehicleId: civic.id,
      status: "estimate", serviceAdvisorId: jessica.id,
      customerConcern: "AC compressor replacement",
      mileageIn: 55210,
      subtotalCash: "907.48", subtotalCard: "943.78",
      taxAmount: "0.00", totalCash: "907.48", totalCard: "943.78",
      approvalToken: crypto.randomBytes(32).toString("hex"),
      createdAt: todayAt(7, 0), updatedAt: todayAt(7, 0),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1005.id, type: "labor", description: "AC Diagnosis", laborHours: "1.0", laborRate: "135.00", unitPriceCash: "135.00", unitPriceCard: "140.40", totalCash: "135.00", totalCard: "140.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1005.id, type: "parts", description: "AC Compressor", partNumber: "DEN-471-1630", quantity: "1", unitPriceCash: "385.00", unitPriceCard: "400.40", totalCash: "385.00", totalCard: "400.40", costPrice: "240.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1005.id, type: "parts", description: "Refrigerant R-134a", partNumber: "IDQ-301", quantity: "2", unitPriceCash: "24.99", unitPriceCard: "25.99", totalCash: "49.98", totalCard: "51.98", costPrice: "14.00", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1005.id, type: "labor", description: "AC Compressor Replacement", laborHours: "2.5", laborRate: "135.00", unitPriceCash: "337.50", unitPriceCard: "351.00", totalCash: "337.50", totalCard: "351.00", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    // RO-1006: Amy Parker / Tucson — Estimate
    // labor: 1.0*120=120 + 1.0*120=120 + 0.3*120=36 = 276 cash; card: 124.80+124.80+37.44=287.04
    // parts: 599.96 cash, 623.96 card
    // total cash: 276+599.96=875.96; total card: 287.04+623.96=911.00
    const [ro1006] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1006", customerId: amyParker.id, vehicleId: tucson.id,
      status: "estimate", serviceAdvisorId: jessica.id,
      customerConcern: "Alignment and new tires",
      mileageIn: 12400,
      subtotalCash: "875.96", subtotalCard: "911.00",
      taxAmount: "0.00", totalCash: "875.96", totalCard: "911.00",
      approvalToken: crypto.randomBytes(32).toString("hex"),
      createdAt: todayAt(7, 0), updatedAt: todayAt(7, 0),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1006.id, type: "labor", description: "Alignment", laborHours: "1.0", laborRate: "120.00", unitPriceCash: "120.00", unitPriceCard: "124.80", totalCash: "120.00", totalCard: "124.80", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1006.id, type: "parts", description: "Tires 225/60R18 Set of 4", partNumber: "MIC-DEFENDER2", quantity: "4", unitPriceCash: "149.99", unitPriceCard: "155.99", totalCash: "599.96", totalCard: "623.96", costPrice: "92.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
      { repairOrderId: ro1006.id, type: "labor", description: "Tire Mount + Balance 4 Tires", laborHours: "1.0", laborRate: "120.00", unitPriceCash: "120.00", unitPriceCard: "124.80", totalCash: "120.00", totalCard: "124.80", isTaxable: true, isAdjustable: true, sortOrder: 3 },
      { repairOrderId: ro1006.id, type: "labor", description: "TPMS Reset", laborHours: "0.3", laborRate: "120.00", unitPriceCash: "36.00", unitPriceCard: "37.44", totalCash: "36.00", totalCard: "37.44", isTaxable: true, isAdjustable: true, sortOrder: 4 },
    ]);

    // RO-1007: David Brown / Grand Cherokee — Estimate
    // labor: 1.0*135=135 cash, 140.40 card; parts: 89.99 cash, 93.59 card
    // total cash: 224.99; total card: 233.99
    const [ro1007] = await db.insert(autoRepairOrders).values({
      shopId, roNumber: "RO-1007", customerId: davidBrown.id, vehicleId: grandCherokee.id,
      status: "estimate", serviceAdvisorId: jessica.id,
      customerConcern: "Transmission fluid flush",
      mileageIn: 102300,
      subtotalCash: "224.99", subtotalCard: "233.99",
      taxAmount: "0.00", totalCash: "224.99", totalCard: "233.99",
      approvalToken: crypto.randomBytes(32).toString("hex"),
      createdAt: todayAt(7, 0), updatedAt: todayAt(7, 0),
    }).returning();

    await db.insert(autoLineItems).values([
      { repairOrderId: ro1007.id, type: "labor", description: "Transmission Fluid Flush", laborHours: "1.0", laborRate: "135.00", unitPriceCash: "135.00", unitPriceCard: "140.40", totalCash: "135.00", totalCard: "140.40", isTaxable: true, isAdjustable: true, sortOrder: 1 },
      { repairOrderId: ro1007.id, type: "parts", description: "ATF Fluid 12qt", partNumber: "VAL-822405", quantity: "1", unitPriceCash: "89.99", unitPriceCard: "93.59", totalCash: "89.99", totalCard: "93.59", costPrice: "52.00", isTaxable: true, isAdjustable: true, sortOrder: 2 },
    ]);

    console.log("[AutoInit] Created 7 active ROs with line items");

    // ── DVI Inspection for RO-1001 (Robert Smith's brake job) ──
    const [dvi] = await db.insert(autoDviInspections).values({
      repairOrderId: ro1001.id, shopId, technicianId: mike.id,
      vehicleMileage: 67800, status: "completed",
      publicToken: crypto.randomBytes(32).toString("hex"),
      completedAt: todayAt(9, 0),
    }).returning();

    await db.insert(autoDviItems).values([
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Windshield", condition: "good", sortOrder: 1 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Wiper Blades", condition: "fair", notes: "Minor streaking", sortOrder: 2 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Headlights", condition: "good", sortOrder: 3 },
      { inspectionId: dvi.id, categoryName: "Exterior", itemName: "Taillights", condition: "good", sortOrder: 4 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Engine Oil Level", condition: "good", sortOrder: 5 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Coolant Level", condition: "good", sortOrder: 6 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Brake Fluid", condition: "fair", notes: "Slightly dark", sortOrder: 7 },
      { inspectionId: dvi.id, categoryName: "Under Hood", itemName: "Air Filter", condition: "good", sortOrder: 8 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Front Tires", condition: "good", notes: "6/32 remaining", sortOrder: 9 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Rear Tires", condition: "fair", notes: "4/32 remaining", sortOrder: 10 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Front Brake Pads", condition: "poor", notes: "1mm remaining - REPLACED", sortOrder: 11 },
      { inspectionId: dvi.id, categoryName: "Tires & Brakes", itemName: "Rear Brake Pads", condition: "fair", notes: "4mm remaining", sortOrder: 12 },
      { inspectionId: dvi.id, categoryName: "Undercarriage", itemName: "Exhaust System", condition: "good", sortOrder: 13 },
      { inspectionId: dvi.id, categoryName: "Undercarriage", itemName: "Suspension", condition: "good", sortOrder: 14 },
    ]);

    console.log("[AutoInit] Created DVI inspection #1 with 14 items");

    // ── DVI Inspection for RO-1002 (Maria Johnson / Camry — in_progress) ──
    const [dvi2] = await db.insert(autoDviInspections).values({
      repairOrderId: ro1002.id, shopId, technicianId: sarah.id,
      vehicleMileage: 42310, status: "in_progress",
      overallCondition: null,
      publicToken: crypto.randomBytes(32).toString("hex"),
    }).returning();

    await db.insert(autoDviItems).values([
      { inspectionId: dvi2.id, categoryName: "Under Hood", itemName: "Engine Oil Level", condition: "fair", notes: "Due for change", sortOrder: 1 },
      { inspectionId: dvi2.id, categoryName: "Under Hood", itemName: "Coolant Level", condition: "good", sortOrder: 2 },
      { inspectionId: dvi2.id, categoryName: "Under Hood", itemName: "Brake Fluid", condition: "good", sortOrder: 3 },
      { inspectionId: dvi2.id, categoryName: "Under Hood", itemName: "Air Filter", condition: "fair", notes: "Moderate dirt buildup", sortOrder: 4 },
      { inspectionId: dvi2.id, categoryName: "Under Hood", itemName: "Battery", condition: "good", notes: "Load test passed", sortOrder: 5 },
      { inspectionId: dvi2.id, categoryName: "Tires & Wheels", itemName: "LF Tire Tread", condition: "good", notes: "7/32 remaining", sortOrder: 6 },
      { inspectionId: dvi2.id, categoryName: "Tires & Wheels", itemName: "RF Tire Tread", condition: "good", notes: "7/32 remaining", sortOrder: 7 },
      { inspectionId: dvi2.id, categoryName: "Tires & Wheels", itemName: "LR Tire Tread", condition: "not_inspected", sortOrder: 8 },
      { inspectionId: dvi2.id, categoryName: "Tires & Wheels", itemName: "RR Tire Tread", condition: "not_inspected", sortOrder: 9 },
      { inspectionId: dvi2.id, categoryName: "Tires & Wheels", itemName: "Tire Pressure", condition: "not_inspected", sortOrder: 10 },
      { inspectionId: dvi2.id, categoryName: "Brakes", itemName: "Front Brake Pads", condition: "good", notes: "7mm remaining", sortOrder: 11 },
      { inspectionId: dvi2.id, categoryName: "Brakes", itemName: "Rear Brake Pads", condition: "not_inspected", sortOrder: 12 },
      { inspectionId: dvi2.id, categoryName: "Exterior", itemName: "Headlights", condition: "not_inspected", sortOrder: 13 },
      { inspectionId: dvi2.id, categoryName: "Exterior", itemName: "Tail Lights", condition: "not_inspected", sortOrder: 14 },
      { inspectionId: dvi2.id, categoryName: "Exterior", itemName: "Windshield", condition: "not_inspected", sortOrder: 15 },
    ]);

    // ── DVI Inspection for RO-1004 (James Williams / Silverado — completed, sent to customer) ──
    const dvi3Token = crypto.randomBytes(32).toString("hex");
    const [dvi3] = await db.insert(autoDviInspections).values({
      repairOrderId: ro1004.id, shopId, technicianId: dave.id,
      vehicleMileage: 89210, status: "sent",
      overallCondition: "fair",
      publicToken: dvi3Token,
      completedAt: daysAgo(1),
      sentToCustomerAt: daysAgo(1),
      notes: "CEL diagnostic found P0300 random misfire. Recommend spark plugs and ignition coil pack inspection.",
    }).returning();

    await db.insert(autoDviItems).values([
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Engine Oil Level", condition: "good", sortOrder: 1 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Coolant Level", condition: "good", sortOrder: 2 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Brake Fluid", condition: "good", sortOrder: 3 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Air Filter", condition: "poor", notes: "Very dirty - recommend replacement", sortOrder: 4 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Battery", condition: "fair", notes: "483 CCA - marginal, OEM spec is 650 CCA", sortOrder: 5 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Belts", condition: "fair", notes: "Cracking visible on serpentine belt", sortOrder: 6 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Spark Plugs", condition: "poor", notes: "Worn electrodes, 80K+ miles - causing misfire", sortOrder: 7 },
      { inspectionId: dvi3.id, categoryName: "Under Hood", itemName: "Ignition Coils", condition: "fair", notes: "#3 coil weak - intermittent misfire", sortOrder: 8 },
      { inspectionId: dvi3.id, categoryName: "Brakes", itemName: "Front Brake Pads", condition: "fair", notes: "4mm remaining", sortOrder: 9 },
      { inspectionId: dvi3.id, categoryName: "Brakes", itemName: "Rear Brake Pads", condition: "good", notes: "6mm remaining", sortOrder: 10 },
      { inspectionId: dvi3.id, categoryName: "Brakes", itemName: "Front Rotors", condition: "fair", notes: "Light scoring", sortOrder: 11 },
      { inspectionId: dvi3.id, categoryName: "Brakes", itemName: "Rear Rotors", condition: "good", sortOrder: 12 },
      { inspectionId: dvi3.id, categoryName: "Tires & Wheels", itemName: "LF Tire Tread", condition: "fair", notes: "4/32 remaining", sortOrder: 13 },
      { inspectionId: dvi3.id, categoryName: "Tires & Wheels", itemName: "RF Tire Tread", condition: "fair", notes: "4/32 remaining", sortOrder: 14 },
      { inspectionId: dvi3.id, categoryName: "Tires & Wheels", itemName: "LR Tire Tread", condition: "poor", notes: "2/32 remaining - replace soon", sortOrder: 15 },
      { inspectionId: dvi3.id, categoryName: "Tires & Wheels", itemName: "RR Tire Tread", condition: "poor", notes: "2/32 remaining - replace soon", sortOrder: 16 },
      { inspectionId: dvi3.id, categoryName: "Tires & Wheels", itemName: "Tire Pressure", condition: "good", notes: "All 35 PSI", sortOrder: 17 },
      { inspectionId: dvi3.id, categoryName: "Under Vehicle", itemName: "Exhaust System", condition: "fair", notes: "Surface rust on muffler", sortOrder: 18 },
      { inspectionId: dvi3.id, categoryName: "Under Vehicle", itemName: "Suspension", condition: "good", sortOrder: 19 },
      { inspectionId: dvi3.id, categoryName: "Under Vehicle", itemName: "CV Boots/Axles", condition: "good", sortOrder: 20 },
      { inspectionId: dvi3.id, categoryName: "Exterior", itemName: "Headlights", condition: "good", sortOrder: 21 },
      { inspectionId: dvi3.id, categoryName: "Exterior", itemName: "Tail Lights", condition: "good", sortOrder: 22 },
      { inspectionId: dvi3.id, categoryName: "Exterior", itemName: "Windshield", condition: "good", sortOrder: 23 },
      { inspectionId: dvi3.id, categoryName: "Exterior", itemName: "Wiper Blades", condition: "fair", notes: "Streaking slightly", sortOrder: 24 },
    ]);

    // ── DVI Inspection for RO-1006 (Amy Parker / Tucson — completed) ──
    const [dvi4] = await db.insert(autoDviInspections).values({
      repairOrderId: ro1006.id, shopId, technicianId: sarah.id,
      vehicleMileage: 12400, status: "completed",
      overallCondition: "good",
      publicToken: crypto.randomBytes(32).toString("hex"),
      completedAt: todayAt(10, 0),
      notes: "Nearly new vehicle in excellent condition. Only concern is uneven tire wear suggesting alignment needed.",
    }).returning();

    await db.insert(autoDviItems).values([
      { inspectionId: dvi4.id, categoryName: "Under Hood", itemName: "Engine Oil Level", condition: "good", sortOrder: 1 },
      { inspectionId: dvi4.id, categoryName: "Under Hood", itemName: "Coolant Level", condition: "good", sortOrder: 2 },
      { inspectionId: dvi4.id, categoryName: "Under Hood", itemName: "Brake Fluid", condition: "good", sortOrder: 3 },
      { inspectionId: dvi4.id, categoryName: "Under Hood", itemName: "Air Filter", condition: "good", sortOrder: 4 },
      { inspectionId: dvi4.id, categoryName: "Under Hood", itemName: "Battery", condition: "good", notes: "Factory battery, strong charge", sortOrder: 5 },
      { inspectionId: dvi4.id, categoryName: "Brakes", itemName: "Front Brake Pads", condition: "good", notes: "9mm remaining", sortOrder: 6 },
      { inspectionId: dvi4.id, categoryName: "Brakes", itemName: "Rear Brake Pads", condition: "good", notes: "8mm remaining", sortOrder: 7 },
      { inspectionId: dvi4.id, categoryName: "Brakes", itemName: "Front Rotors", condition: "good", sortOrder: 8 },
      { inspectionId: dvi4.id, categoryName: "Brakes", itemName: "Rear Rotors", condition: "good", sortOrder: 9 },
      { inspectionId: dvi4.id, categoryName: "Tires & Wheels", itemName: "LF Tire Tread", condition: "fair", notes: "6/32 - slight inner edge wear", sortOrder: 10 },
      { inspectionId: dvi4.id, categoryName: "Tires & Wheels", itemName: "RF Tire Tread", condition: "fair", notes: "6/32 - slight inner edge wear", sortOrder: 11 },
      { inspectionId: dvi4.id, categoryName: "Tires & Wheels", itemName: "LR Tire Tread", condition: "good", notes: "8/32 remaining", sortOrder: 12 },
      { inspectionId: dvi4.id, categoryName: "Tires & Wheels", itemName: "RR Tire Tread", condition: "good", notes: "8/32 remaining", sortOrder: 13 },
      { inspectionId: dvi4.id, categoryName: "Tires & Wheels", itemName: "Tire Pressure", condition: "good", notes: "All 33 PSI", sortOrder: 14 },
      { inspectionId: dvi4.id, categoryName: "Exterior", itemName: "Headlights", condition: "good", sortOrder: 15 },
      { inspectionId: dvi4.id, categoryName: "Exterior", itemName: "Tail Lights", condition: "good", sortOrder: 16 },
      { inspectionId: dvi4.id, categoryName: "Exterior", itemName: "Windshield", condition: "good", sortOrder: 17 },
      { inspectionId: dvi4.id, categoryName: "Under Vehicle", itemName: "Exhaust System", condition: "good", sortOrder: 18 },
      { inspectionId: dvi4.id, categoryName: "Under Vehicle", itemName: "Suspension", condition: "good", sortOrder: 19 },
    ]);

    console.log("[AutoInit] Created 4 DVI inspections total");

    // ── Appointments: TODAY ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: robertSmith.id, vehicleId: f150.id, repairOrderId: ro1001.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Brake Job - Smith", status: "in_progress",
        startTime: todayAt(8, 0), endTime: todayAt(10, 30),
        estimatedDuration: 150, color: "#4CAF50",
      },
      {
        shopId, customerId: mariaJohnson.id, vehicleId: camry.id, repairOrderId: ro1002.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Oil+Rotate - Johnson", status: "in_progress",
        startTime: todayAt(8, 30), endTime: todayAt(9, 30),
        estimatedDuration: 60, color: "#2196F3",
      },
      {
        shopId, customerId: lisaChen.id, vehicleId: bmwX3.id, repairOrderId: ro1003.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "30K Service - Chen", status: "scheduled",
        startTime: todayAt(10, 30), endTime: todayAt(12, 30),
        estimatedDuration: 120, color: "#FF9800",
      },
      {
        shopId, customerId: jamesWilliams.id, vehicleId: silverado.id, repairOrderId: ro1004.id,
        bayId: bayId3, technicianId: dave.id,
        title: "CEL Diagnostic - Williams", status: "scheduled",
        startTime: todayAt(11, 0), endTime: todayAt(12, 30),
        estimatedDuration: 90, color: "#9C27B0",
      },
      {
        shopId, customerId: carlosGarcia.id, vehicleId: civic.id, repairOrderId: ro1005.id,
        bayId: bayId1, technicianId: mike.id,
        title: "AC Compressor - Garcia", status: "scheduled",
        startTime: todayAt(13, 0), endTime: todayAt(16, 0),
        estimatedDuration: 180, color: "#E91E63",
      },
      {
        shopId, customerId: amyParker.id, vehicleId: tucson.id, repairOrderId: ro1006.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Alignment+Tires - Parker", status: "scheduled",
        startTime: todayAt(14, 0), endTime: todayAt(15, 30),
        estimatedDuration: 90, color: "#00BCD4",
      },
      {
        shopId, customerId: davidBrown.id, vehicleId: grandCherokee.id, repairOrderId: ro1007.id,
        bayId: bayId3, technicianId: dave.id,
        title: "Trans Flush - Brown", status: "scheduled",
        startTime: todayAt(15, 0), endTime: todayAt(16, 0),
        estimatedDuration: 60, color: "#FF5722",
      },
    ]);

    // ── Appointments: TOMORROW (day +1) ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: michelleTorres.id, vehicleId: rogue.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Timing Belt - Torres", status: "scheduled",
        startTime: daysFromNow(1, 8, 0), endTime: daysFromNow(1, 11, 0),
        estimatedDuration: 180, color: "#4CAF50",
      },
      {
        shopId, customerId: robertSmith.id, vehicleId: f150.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Rear Brakes - Smith", status: "scheduled",
        startTime: daysFromNow(1, 8, 0), endTime: daysFromNow(1, 10, 0),
        estimatedDuration: 120, color: "#2196F3",
      },
      {
        shopId, customerId: lisaChen.id, vehicleId: bmwX3.id,
        bayId: bayId3, technicianId: dave.id,
        title: "BMW Oil Change - Chen", status: "scheduled",
        startTime: daysFromNow(1, 9, 0), endTime: daysFromNow(1, 10, 30),
        estimatedDuration: 90, color: "#FF9800",
      },
      {
        shopId, customerId: amyParker.id, vehicleId: tucson.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Strut Replace - Parker", status: "scheduled",
        startTime: daysFromNow(1, 10, 30), endTime: daysFromNow(1, 13, 0),
        estimatedDuration: 150, color: "#E91E63",
      },
      {
        shopId, customerId: jamesWilliams.id, vehicleId: silverado.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Spark Plugs - Williams", status: "scheduled",
        startTime: daysFromNow(1, 13, 0), endTime: daysFromNow(1, 15, 0),
        estimatedDuration: 120, color: "#9C27B0",
      },
      {
        shopId, customerId: carlosGarcia.id, vehicleId: civic.id,
        bayId: bayId3, technicianId: dave.id,
        title: "State Inspection - Garcia", status: "scheduled",
        startTime: daysFromNow(1, 14, 0), endTime: daysFromNow(1, 15, 0),
        estimatedDuration: 60, color: "#00BCD4",
      },
    ]);

    // ── Appointments: DAY AFTER TOMORROW (day +2) ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: davidBrown.id, vehicleId: grandCherokee.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Transfer Case - Brown", status: "scheduled",
        startTime: daysFromNow(2, 8, 0), endTime: daysFromNow(2, 11, 0),
        estimatedDuration: 180, color: "#4CAF50",
      },
      {
        shopId, customerId: mariaJohnson.id, vehicleId: camry.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Brake Flush - Johnson", status: "scheduled",
        startTime: daysFromNow(2, 9, 0), endTime: daysFromNow(2, 10, 30),
        estimatedDuration: 90, color: "#2196F3",
      },
      {
        shopId, customerId: michelleTorres.id, vehicleId: rogue.id,
        bayId: bayId3, technicianId: dave.id,
        title: "Battery+Alt Test - Torres", status: "scheduled",
        startTime: daysFromNow(2, 10, 0), endTime: daysFromNow(2, 11, 30),
        estimatedDuration: 90, color: "#FF9800",
      },
      {
        shopId, customerId: lisaChen.id, vehicleId: bmwX3.id,
        bayId: bayId1, technicianId: mike.id,
        title: "BMW Rear Brakes - Chen", status: "scheduled",
        startTime: daysFromNow(2, 13, 0), endTime: daysFromNow(2, 15, 30),
        estimatedDuration: 150, color: "#E91E63",
      },
      {
        shopId, customerId: amyParker.id, vehicleId: tucson.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Air Filters - Parker", status: "scheduled",
        startTime: daysFromNow(2, 14, 30), endTime: daysFromNow(2, 15, 30),
        estimatedDuration: 60, color: "#00BCD4",
      },
    ]);

    // ── Appointments: WEDNESDAY (day +3) ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: robertSmith.id, vehicleId: f150.id,
        bayId: bayId1, technicianId: mike.id,
        title: "F-150 Oil Change - Smith", status: "scheduled",
        startTime: daysFromNow(3, 9, 0), endTime: daysFromNow(3, 11, 0),
        estimatedDuration: 120, color: "#4CAF50",
      },
      {
        shopId, customerId: carlosGarcia.id, vehicleId: civic.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Civic Tune-Up - Garcia", status: "scheduled",
        startTime: daysFromNow(3, 10, 0), endTime: daysFromNow(3, 12, 0),
        estimatedDuration: 120, color: "#2196F3",
      },
      {
        shopId, customerId: mariaJohnson.id, vehicleId: camry.id,
        bayId: bayId3, technicianId: dave.id,
        title: "Camry Inspection - Johnson", status: "scheduled",
        startTime: daysFromNow(3, 13, 0), endTime: daysFromNow(3, 14, 0),
        estimatedDuration: 60, color: "#FF9800",
      },
    ]);

    // ── Appointments: THURSDAY (day +4) ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: jamesWilliams.id, vehicleId: silverado.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Silverado Belt - Williams", status: "scheduled",
        startTime: daysFromNow(4, 8, 0), endTime: daysFromNow(4, 10, 0),
        estimatedDuration: 120, color: "#4CAF50",
      },
      {
        shopId, customerId: davidBrown.id, vehicleId: grandCherokee.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Jeep Oil Change - Brown", status: "scheduled",
        startTime: daysFromNow(4, 8, 0), endTime: daysFromNow(4, 9, 30),
        estimatedDuration: 90, color: "#2196F3",
      },
      {
        shopId, customerId: amyParker.id, vehicleId: tucson.id,
        bayId: bayId3, technicianId: dave.id,
        title: "Tucson Brake Pads - Parker", status: "scheduled",
        startTime: daysFromNow(4, 10, 0), endTime: daysFromNow(4, 12, 0),
        estimatedDuration: 120, color: "#FF9800",
      },
      {
        shopId, customerId: michelleTorres.id, vehicleId: rogue.id,
        bayId: bayId1, technicianId: mike.id,
        title: "Rogue Struts - Torres", status: "scheduled",
        startTime: daysFromNow(4, 13, 0), endTime: daysFromNow(4, 15, 0),
        estimatedDuration: 120, color: "#E91E63",
      },
    ]);

    // ── Appointments: FRIDAY (day +5) ──
    await db.insert(autoAppointments).values([
      {
        shopId, customerId: lisaChen.id, vehicleId: bmwX3.id,
        bayId: bayId1, technicianId: mike.id,
        title: "BMW Tire Rotation - Chen", status: "scheduled",
        startTime: daysFromNow(5, 8, 0), endTime: daysFromNow(5, 10, 0),
        estimatedDuration: 120, color: "#4CAF50",
      },
      {
        shopId, customerId: robertSmith.id, vehicleId: ram.id,
        bayId: bayId2, technicianId: sarah.id,
        title: "Ram Oil Change - Smith", status: "scheduled",
        startTime: daysFromNow(5, 9, 0), endTime: daysFromNow(5, 10, 0),
        estimatedDuration: 60, color: "#2196F3",
      },
    ]);

    console.log("[AutoInit] Created appointments for today through Friday");

    // ── Activity Log entries ──
    await db.insert(autoActivityLog).values([
      { shopId, userId: jessica.id, entityType: "repair_order", entityId: ro1001.id, action: "created", details: { roNumber: "RO-1001" }, createdAt: todayAt(7, 30) },
      { shopId, userId: mike.id, entityType: "repair_order", entityId: ro1001.id, action: "status_changed", details: { from: "estimate", to: "in_progress" }, createdAt: todayAt(8, 0) },
      { shopId, userId: jessica.id, entityType: "repair_order", entityId: ro1002.id, action: "created", details: { roNumber: "RO-1002" }, createdAt: todayAt(8, 0) },
      { shopId, userId: sarah.id, entityType: "repair_order", entityId: ro1002.id, action: "status_changed", details: { from: "estimate", to: "in_progress" }, createdAt: todayAt(8, 30) },
      { shopId, userId: mike.id, entityType: "dvi_inspection", entityId: dvi.id, action: "completed", details: { vehicleMileage: 67800 }, createdAt: todayAt(9, 0) },
      { shopId, userId: jessica.id, entityType: "repair_order", entityId: ro0998.id, action: "paid", details: { amount: "190.80", method: "credit_card" }, createdAt: daysAgo(3) },
      { shopId, userId: jessica.id, entityType: "repair_order", entityId: ro0999.id, action: "paid", details: { amount: "180.00", method: "cash" }, createdAt: daysAgo(2) },
      { shopId, userId: jessica.id, entityType: "repair_order", entityId: ro1000.id, action: "paid", details: { amount: "811.17", method: "credit_card" }, createdAt: daysAgo(1) },
    ]);

    console.log("[AutoInit] Created activity log entries");
    console.log("[AutoInit] Demo data seeding complete!");

  } catch (error) {
    console.error("[AutoInit] Error seeding demo data:", error);
    throw error;
  }
}
