import { Router, Request, Response } from "express";
import type { Express } from "express";
import { db } from "./db";
import { 
  autoShops, autoUsers, autoInvitations, autoCustomers, autoVehicles,
  autoRepairOrders, autoLineItems, autoPayments, autoDviTemplates,
  autoDviInspections, autoDviItems, autoBays, autoAppointments,
  autoIntegrationConfigs, autoSmsLog, autoActivityLog,
  autoCannedServices, autoCannedServiceItems, autoCommunicationLog,
} from "@shared/schema";
import { eq, and, desc, asc, or, sql, count, gte, lte, inArray, isNotNull } from "drizzle-orm";
import { autoAuth, autoRequireRole, hashPassword, comparePasswords, generateToken, type AutoAuthUser } from "./auto-auth";
import crypto from "crypto";
import { randomUUID } from "crypto";
import multer from "multer";
import { generateROPdf, generateDviPdf } from "./auto-pdf";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { sendAutoInvoiceEmail } from "./auto-email";

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

const router = Router();

// ============================================================================
// AUTH ROUTES (no auth required)
// ============================================================================

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password, shopSlug } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    let query;
    if (shopSlug) {
      const shop = await db.select().from(autoShops).where(eq(autoShops.slug, shopSlug)).limit(1);
      if (!shop.length) return res.status(404).json({ error: "Shop not found" });
      query = await db.select().from(autoUsers)
        .where(and(eq(autoUsers.email, email.toLowerCase()), eq(autoUsers.shopId, shop[0].id), eq(autoUsers.isActive, true)))
        .limit(1);
    } else {
      query = await db.select().from(autoUsers)
        .where(and(eq(autoUsers.email, email.toLowerCase()), eq(autoUsers.isActive, true)))
        .limit(1);
    }

    if (!query.length) {
      console.log("[AutoLogin] No user found for email:", email.toLowerCase());
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = query[0];
    console.log("[AutoLogin] Found user:", user.id, "hash length:", user.passwordHash?.length, "hash prefix:", user.passwordHash?.substring(0, 7));
    const valid = await comparePasswords(password, user.passwordHash);
    console.log("[AutoLogin] Password compare result:", valid);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await db.update(autoUsers).set({ lastLoginAt: new Date() }).where(eq(autoUsers.id, user.id));

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, user.shopId)).limit(1);

    const authUser: AutoAuthUser = {
      id: user.id, shopId: user.shopId, email: user.email,
      firstName: user.firstName, lastName: user.lastName, role: user.role,
    };

    const token = generateToken(authUser);
    res.json({ token, user: authUser, shop: shop[0] || null });
  } catch (err: any) {
    console.error("Auto login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { token, firstName, lastName, password, phone } = req.body;
    if (!token || !firstName || !lastName || !password) {
      return res.status(400).json({ error: "All fields required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const invitation = await db.select().from(autoInvitations)
      .where(and(eq(autoInvitations.token, token), eq(autoInvitations.status, "pending")))
      .limit(1);

    if (!invitation.length) {
      return res.status(400).json({ error: "Invalid or expired invitation" });
    }

    const inv = invitation[0];
    if (new Date() > inv.expiresAt) {
      await db.update(autoInvitations).set({ status: "expired" }).where(eq(autoInvitations.id, inv.id));
      return res.status(400).json({ error: "Invitation has expired" });
    }

    const existing = await db.select().from(autoUsers)
      .where(and(eq(autoUsers.email, inv.email.toLowerCase()), eq(autoUsers.shopId, inv.shopId)))
      .limit(1);
    if (existing.length) {
      return res.status(400).json({ error: "Account already exists for this email" });
    }

    const passwordHash = await hashPassword(password);
    const [newUser] = await db.insert(autoUsers).values({
      shopId: inv.shopId, email: inv.email.toLowerCase(), passwordHash,
      firstName, lastName, phone: phone || null, role: inv.role,
    }).returning();

    await db.update(autoInvitations).set({ status: "accepted", acceptedAt: new Date() }).where(eq(autoInvitations.id, inv.id));

    const authUser: AutoAuthUser = {
      id: newUser.id, shopId: newUser.shopId, email: newUser.email,
      firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role,
    };

    const jwtToken = generateToken(authUser);
    const shop = await db.select().from(autoShops).where(eq(autoShops.id, newUser.shopId)).limit(1);
    res.json({ token: jwtToken, user: authUser, shop: shop[0] || null });
  } catch (err: any) {
    console.error("Auto register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.get("/auth/invitation/:token", async (req: Request, res: Response) => {
  try {
    const inv = await db.select().from(autoInvitations)
      .where(and(eq(autoInvitations.token, req.params.token), eq(autoInvitations.status, "pending")))
      .limit(1);

    if (!inv.length) return res.status(404).json({ error: "Invalid or expired invitation" });
    if (new Date() > inv[0].expiresAt) return res.status(400).json({ error: "Invitation has expired" });

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, inv[0].shopId)).limit(1);
    res.json({ email: inv[0].email, role: inv[0].role, shopName: shop[0]?.name || "Unknown Shop" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to validate invitation" });
  }
});

router.get("/auth/me", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = await db.select().from(autoUsers).where(eq(autoUsers.id, req.autoUser!.id)).limit(1);
    if (!user.length) return res.status(404).json({ error: "User not found" });

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, user[0].shopId)).limit(1);
    res.json({
      user: {
        id: user[0].id, shopId: user[0].shopId, email: user[0].email,
        firstName: user[0].firstName, lastName: user[0].lastName,
        phone: user[0].phone, role: user[0].role,
      },
      shop: shop[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ============================================================================
// SHOP MANAGEMENT (admin routes for PCBISV admin)
// ============================================================================

router.post("/admin/shops", async (req: Request, res: Response) => {
  try {
    const { name, slug, address, city, state, zip, phone, email, website, timezone, taxRate, laborRate, cardFeePercent, ownerEmail, ownerFirstName, ownerLastName, ownerPassword } = req.body;

    if (!name || !slug || !ownerEmail || !ownerFirstName || !ownerLastName || !ownerPassword) {
      return res.status(400).json({ error: "Shop name, slug, owner details required" });
    }

    const existingSlug = await db.select().from(autoShops).where(eq(autoShops.slug, slug.toLowerCase())).limit(1);
    if (existingSlug.length) return res.status(400).json({ error: "Shop URL slug already taken" });

    const [shop] = await db.insert(autoShops).values({
      name, slug: slug.toLowerCase(), address: address || null,
      city: city || null, state: state || null, zip: zip || null,
      phone: phone || null, email: email || null, website: website || null,
      timezone: timezone || "America/New_York",
      taxRate: taxRate?.toString() || "0", laborRate: laborRate?.toString() || "0",
      cardFeePercent: cardFeePercent?.toString() || "0",
    }).returning();

    const passwordHash = await hashPassword(ownerPassword);
    const [owner] = await db.insert(autoUsers).values({
      shopId: shop.id, email: ownerEmail.toLowerCase(), passwordHash,
      firstName: ownerFirstName, lastName: ownerLastName, role: "owner",
    }).returning();

    for (let i = 1; i <= 4; i++) {
      await db.insert(autoBays).values({ shopId: shop.id, name: `Bay ${i}`, sortOrder: i });
    }

    await db.insert(autoDviTemplates).values({
      shopId: shop.id, name: "Standard Multi-Point Inspection", isDefault: true,
      categories: JSON.stringify([
        { name: "Under Hood", sortOrder: 1, items: [
          { name: "Engine Oil Level & Condition", description: "Check oil dipstick level and color", sortOrder: 1 },
          { name: "Transmission Fluid", description: "Check level and condition", sortOrder: 2 },
          { name: "Brake Fluid", description: "Check reservoir level", sortOrder: 3 },
          { name: "Power Steering Fluid", description: "Check level if applicable", sortOrder: 4 },
          { name: "Coolant Level & Condition", description: "Check reservoir and radiator", sortOrder: 5 },
          { name: "Windshield Washer Fluid", description: "Check and top off", sortOrder: 6 },
          { name: "Air Filter", description: "Inspect condition", sortOrder: 7 },
          { name: "Cabin Air Filter", description: "Inspect condition", sortOrder: 8 },
          { name: "Serpentine Belt", description: "Check for cracks and wear", sortOrder: 9 },
          { name: "Battery & Terminals", description: "Test voltage and inspect connections", sortOrder: 10 },
          { name: "Hoses & Clamps", description: "Check for leaks and wear", sortOrder: 11 },
        ]},
        { name: "Under Vehicle", sortOrder: 2, items: [
          { name: "Engine Oil Leaks", description: "Check for oil leaks", sortOrder: 1 },
          { name: "Transmission Leaks", description: "Check for fluid leaks", sortOrder: 2 },
          { name: "Exhaust System", description: "Inspect pipes, muffler, catalytic converter", sortOrder: 3 },
          { name: "CV Joints/Boots", description: "Check for damage and grease leaks", sortOrder: 4 },
          { name: "Suspension Components", description: "Inspect shocks, struts, bushings", sortOrder: 5 },
          { name: "Steering Linkage", description: "Check tie rods and ball joints", sortOrder: 6 },
          { name: "Differential Fluid", description: "Check level if applicable", sortOrder: 7 },
        ]},
        { name: "Brakes", sortOrder: 3, items: [
          { name: "Front Brake Pads", description: "Measure pad thickness", sortOrder: 1 },
          { name: "Rear Brake Pads/Shoes", description: "Measure pad/shoe thickness", sortOrder: 2 },
          { name: "Front Rotors", description: "Check for scoring and warping", sortOrder: 3 },
          { name: "Rear Rotors/Drums", description: "Check condition", sortOrder: 4 },
          { name: "Brake Lines & Hoses", description: "Inspect for leaks and damage", sortOrder: 5 },
          { name: "Parking Brake", description: "Test operation", sortOrder: 6 },
        ]},
        { name: "Tires & Wheels", sortOrder: 4, items: [
          { name: "Left Front Tire", description: "Check tread depth and condition", sortOrder: 1 },
          { name: "Right Front Tire", description: "Check tread depth and condition", sortOrder: 2 },
          { name: "Left Rear Tire", description: "Check tread depth and condition", sortOrder: 3 },
          { name: "Right Rear Tire", description: "Check tread depth and condition", sortOrder: 4 },
          { name: "Tire Pressure (all)", description: "Check and adjust to spec", sortOrder: 5 },
          { name: "Spare Tire", description: "Check pressure and condition", sortOrder: 6 },
          { name: "Wheel Alignment", description: "Visual check for uneven wear", sortOrder: 7 },
        ]},
        { name: "Exterior", sortOrder: 5, items: [
          { name: "Headlights", description: "Test operation and alignment", sortOrder: 1 },
          { name: "Tail Lights", description: "Test all bulbs", sortOrder: 2 },
          { name: "Brake Lights", description: "Test operation", sortOrder: 3 },
          { name: "Turn Signals", description: "Test front and rear", sortOrder: 4 },
          { name: "Windshield", description: "Check for chips and cracks", sortOrder: 5 },
          { name: "Wiper Blades", description: "Check condition and operation", sortOrder: 6 },
          { name: "Horn", description: "Test operation", sortOrder: 7 },
          { name: "Mirrors", description: "Check condition and operation", sortOrder: 8 },
        ]},
        { name: "Interior", sortOrder: 6, items: [
          { name: "Dashboard Warning Lights", description: "Note any warning indicators", sortOrder: 1 },
          { name: "HVAC System", description: "Test heat, A/C, and fan speeds", sortOrder: 2 },
          { name: "Seat Belts", description: "Test all belts", sortOrder: 3 },
          { name: "Power Windows", description: "Test operation if equipped", sortOrder: 4 },
          { name: "Door Locks", description: "Test all locks", sortOrder: 5 },
        ]},
      ]),
    });

    await db.insert(autoIntegrationConfigs).values({ shopId: shop.id });

    res.json({ shop, owner: { id: owner.id, email: owner.email, firstName: owner.firstName, lastName: owner.lastName, role: owner.role } });
  } catch (err: any) {
    console.error("Create shop error:", err);
    res.status(500).json({ error: "Failed to create shop" });
  }
});

router.get("/admin/shops", async (_req: Request, res: Response) => {
  try {
    const shops = await db.select().from(autoShops).orderBy(desc(autoShops.createdAt));
    res.json(shops);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch shops" });
  }
});

router.get("/admin/shops/:id", async (req: Request, res: Response) => {
  try {
    const shopId = parseInt(req.params.id);
    const shop = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
    if (!shop.length) return res.status(404).json({ error: "Shop not found" });

    const users = await db.select({
      id: autoUsers.id, email: autoUsers.email, firstName: autoUsers.firstName,
      lastName: autoUsers.lastName, role: autoUsers.role, isActive: autoUsers.isActive,
      lastLoginAt: autoUsers.lastLoginAt, createdAt: autoUsers.createdAt,
    }).from(autoUsers).where(eq(autoUsers.shopId, shopId));

    const bays = await db.select().from(autoBays).where(eq(autoBays.shopId, shopId)).orderBy(asc(autoBays.sortOrder));
    res.json({ shop: shop[0], users, bays });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch shop details" });
  }
});

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

router.post("/staff/invite", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ error: "Email and role required" });

    if (role === "manager" && req.autoUser!.role !== "owner") {
      return res.status(403).json({ error: "Only owners can invite managers" });
    }

    const existing = await db.select().from(autoUsers)
      .where(and(eq(autoUsers.email, email.toLowerCase()), eq(autoUsers.shopId, req.autoUser!.shopId)))
      .limit(1);
    if (existing.length) return res.status(400).json({ error: "User already exists in this shop" });

    const pendingInv = await db.select().from(autoInvitations)
      .where(and(eq(autoInvitations.email, email.toLowerCase()), eq(autoInvitations.shopId, req.autoUser!.shopId), eq(autoInvitations.status, "pending")))
      .limit(1);
    if (pendingInv.length) return res.status(400).json({ error: "Invitation already pending for this email" });

    const token = crypto.randomBytes(32).toString("hex");
    const [invitation] = await db.insert(autoInvitations).values({
      shopId: req.autoUser!.shopId, email: email.toLowerCase(), role,
      invitedById: req.autoUser!.id, token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).returning();

    res.json({ invitation, inviteUrl: `/auto/register?token=${token}` });
  } catch (err: any) {
    console.error("Staff invite error:", err);
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

router.get("/staff", autoAuth, async (req: Request, res: Response) => {
  try {
    const users = await db.select({
      id: autoUsers.id, email: autoUsers.email, firstName: autoUsers.firstName,
      lastName: autoUsers.lastName, phone: autoUsers.phone, role: autoUsers.role,
      isActive: autoUsers.isActive, lastLoginAt: autoUsers.lastLoginAt, createdAt: autoUsers.createdAt,
      payType: autoUsers.payType, payRate: autoUsers.payRate, pin: autoUsers.pin,
    }).from(autoUsers).where(eq(autoUsers.shopId, req.autoUser!.shopId)).orderBy(asc(autoUsers.firstName));

    const invitations = await db.select().from(autoInvitations)
      .where(and(eq(autoInvitations.shopId, req.autoUser!.shopId), eq(autoInvitations.status, "pending")));

    res.json({ users, invitations });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

router.patch("/staff/:id", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role, isActive, phone, pin, payType, payRate } = req.body;

    const user = await db.select().from(autoUsers).where(and(eq(autoUsers.id, userId), eq(autoUsers.shopId, req.autoUser!.shopId))).limit(1);
    if (!user.length) return res.status(404).json({ error: "User not found" });

    if (user[0].role === "owner" && req.autoUser!.role !== "owner") {
      return res.status(403).json({ error: "Cannot modify owner account" });
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (phone !== undefined) updates.phone = phone;
    if (pin !== undefined) updates.pin = pin;
    if (payType !== undefined) updates.payType = payType;
    if (payRate !== undefined) updates.payRate = payRate;
    updates.updatedAt = new Date();

    const [updated] = await db.update(autoUsers).set(updates).where(eq(autoUsers.id, userId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

// ============================================================================
// CUSTOMERS
// ============================================================================

router.get("/customers", autoAuth, async (req: Request, res: Response) => {
  try {
    const { search, page = "1", limit = "50" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const customers = await db.select().from(autoCustomers)
      .where(eq(autoCustomers.shopId, req.autoUser!.shopId))
      .orderBy(desc(autoCustomers.updatedAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(autoCustomers)
      .where(eq(autoCustomers.shopId, req.autoUser!.shopId));

    res.json({ customers, total: totalResult.count, page: parseInt(page as string) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.post("/customers", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [customer] = await db.insert(autoCustomers).values({
      shopId: req.autoUser!.shopId, firstName: data.firstName, lastName: data.lastName,
      email: data.email || null, phone: data.phone || null, address: data.address || null,
      city: data.city || null, state: data.state || null, zip: data.zip || null,
      notes: data.notes || null, tags: data.tags || null,
    }).returning();

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "customer", entityId: customer.id, action: "created",
      details: { customerName: `${customer.firstName} ${customer.lastName}` },
    });

    res.json(customer);
  } catch (err: any) {
    console.error("Create customer error:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const customer = await db.select().from(autoCustomers)
      .where(and(eq(autoCustomers.id, parseInt(req.params.id)), eq(autoCustomers.shopId, req.autoUser!.shopId)))
      .limit(1);
    if (!customer.length) return res.status(404).json({ error: "Customer not found" });

    const vehicles = await db.select().from(autoVehicles)
      .where(and(eq(autoVehicles.customerId, customer[0].id), eq(autoVehicles.shopId, req.autoUser!.shopId)));

    const repairOrders = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.customerId, customer[0].id), eq(autoRepairOrders.shopId, req.autoUser!.shopId)))
      .orderBy(desc(autoRepairOrders.createdAt));

    res.json({ customer: customer[0], vehicles, repairOrders });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.patch("/customers/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.shopId; delete updates.createdAt;

    const [customer] = await db.update(autoCustomers).set(updates)
      .where(and(eq(autoCustomers.id, parseInt(req.params.id)), eq(autoCustomers.shopId, req.autoUser!.shopId)))
      .returning();
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// ============================================================================
// VEHICLES
// ============================================================================

router.get("/vehicles", autoAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    const baseWhere = eq(autoVehicles.shopId, req.autoUser!.shopId);
    if (customerId) {
      const vehicles = await db.select().from(autoVehicles)
        .where(and(baseWhere, eq(autoVehicles.customerId, parseInt(customerId as string))));
      return res.json(vehicles);
    }
    const vehicles = await db.select().from(autoVehicles).where(baseWhere).orderBy(desc(autoVehicles.createdAt));
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

router.post("/vehicles", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [vehicle] = await db.insert(autoVehicles).values({
      shopId: req.autoUser!.shopId, customerId: data.customerId,
      year: data.year || null, make: data.make || null, model: data.model || null,
      trim: data.trim || null, vin: data.vin || null, licensePlate: data.licensePlate || null,
      color: data.color || null, engineSize: data.engineSize || null,
      transmission: data.transmission || null, mileage: data.mileage || null, notes: data.notes || null,
    }).returning();
    res.json(vehicle);
  } catch (err: any) {
    console.error("Create vehicle error:", err);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
});

router.patch("/vehicles/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.shopId; delete updates.createdAt;

    const [vehicle] = await db.update(autoVehicles).set(updates)
      .where(and(eq(autoVehicles.id, parseInt(req.params.id)), eq(autoVehicles.shopId, req.autoUser!.shopId)))
      .returning();
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    res.json(vehicle);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update vehicle" });
  }
});

router.get("/vehicles/vin-decode/:vin", autoAuth, async (req: Request, res: Response) => {
  try {
    const { vin } = req.params;
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
    const data = await response.json();

    const getValue = (variableId: number) => {
      const result = data.Results?.find((r: any) => r.VariableId === variableId);
      return result?.Value || null;
    };

    res.json({
      year: getValue(29), make: getValue(26), model: getValue(28), trim: getValue(38),
      engineSize: getValue(13),
      transmission: getValue(37)?.toLowerCase().includes("manual") ? "manual" : "automatic",
      bodyClass: getValue(5), driveType: getValue(15), fuelType: getValue(24),
    });
  } catch (err: any) {
    console.error("VIN decode error:", err);
    res.status(500).json({ error: "Failed to decode VIN" });
  }
});

// ============================================================================
// REPAIR ORDERS
// ============================================================================

async function generateRONumber(shopId: number): Promise<string> {
  const [result] = await db.select({ count: count() }).from(autoRepairOrders).where(eq(autoRepairOrders.shopId, shopId));
  const num = (result.count || 0) + 1;
  return `RO-${num.toString().padStart(5, "0")}`;
}

router.get("/repair-orders", autoAuth, async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "50" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let conditions = [eq(autoRepairOrders.shopId, req.autoUser!.shopId)];
    if (status) conditions.push(eq(autoRepairOrders.status, status as string));

    const ros = await db.select().from(autoRepairOrders)
      .where(and(...conditions))
      .orderBy(desc(autoRepairOrders.createdAt))
      .limit(parseInt(limit as string)).offset(offset);

    const enriched = await Promise.all(ros.map(async (ro) => {
      const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId)).limit(1);
      const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId)).limit(1);
      return { ...ro, customer, vehicle };
    }));

    const [totalResult] = await db.select({ count: count() }).from(autoRepairOrders).where(and(...conditions));
    res.json({ repairOrders: enriched, total: totalResult.count, page: parseInt(page as string) });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch repair orders" });
  }
});

router.post("/repair-orders", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const roNumber = await generateRONumber(req.autoUser!.shopId);
    const approvalToken = crypto.randomBytes(32).toString("hex");

    const [ro] = await db.insert(autoRepairOrders).values({
      shopId: req.autoUser!.shopId, roNumber, customerId: data.customerId,
      vehicleId: data.vehicleId, status: "estimate",
      serviceAdvisorId: req.autoUser!.id, technicianId: data.technicianId || null,
      bayId: data.bayId || null, customerConcern: data.customerConcern || null,
      internalNotes: data.internalNotes || null,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
      approvalToken,
    }).returning();

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "repair_order", entityId: ro.id, action: "created",
      details: { roNumber },
    });

    res.json(ro);
  } catch (err: any) {
    console.error("Create RO error:", err);
    res.status(500).json({ error: "Failed to create repair order" });
  }
});

router.get("/repair-orders/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.id);
    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
    const lineItems = await db.select().from(autoLineItems).where(eq(autoLineItems.repairOrderId, roId)).orderBy(asc(autoLineItems.sortOrder));
    const payments = await db.select().from(autoPayments).where(eq(autoPayments.repairOrderId, roId));
    const inspections = await db.select().from(autoDviInspections).where(eq(autoDviInspections.repairOrderId, roId));

    let serviceAdvisor = null, technician = null;
    if (ro.serviceAdvisorId) {
      const [sa] = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName }).from(autoUsers).where(eq(autoUsers.id, ro.serviceAdvisorId));
      serviceAdvisor = sa;
    }
    if (ro.technicianId) {
      const [tech] = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName }).from(autoUsers).where(eq(autoUsers.id, ro.technicianId));
      technician = tech;
    }

    res.json({ repairOrder: ro, customer, vehicle, lineItems, payments, inspections, serviceAdvisor, technician });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch repair order" });
  }
});

router.patch("/repair-orders/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.shopId; delete updates.createdAt;
    if (updates.promisedDate) updates.promisedDate = new Date(updates.promisedDate);

    const [ro] = await db.update(autoRepairOrders).set(updates)
      .where(and(eq(autoRepairOrders.id, parseInt(req.params.id)), eq(autoRepairOrders.shopId, req.autoUser!.shopId)))
      .returning();
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    if (data.status) {
      await db.insert(autoActivityLog).values({
        shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
        entityType: "repair_order", entityId: ro.id, action: "status_changed",
        details: { newStatus: data.status, roNumber: ro.roNumber },
      });
    }

    res.json(ro);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update repair order" });
  }
});

async function recalculateROTotals(roId: number, shopId: number) {
  const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
  if (!shop) throw new Error("Shop not found");

  const partsTaxRate = parseFloat(shop.partsTaxRate || shop.taxRate || "0");
  const laborTaxRate = parseFloat(shop.laborTaxRate || "0");
  const laborTaxable = shop.laborTaxable === true;
  const cardFeePercent = parseFloat(shop.cardFeePercent || "0");

  const items = await db.select().from(autoLineItems)
    .where(and(
      eq(autoLineItems.repairOrderId, roId),
      or(eq(autoLineItems.status, "pending"), eq(autoLineItems.status, "approved"))
    ));

  let subtotalCash = 0, subtotalCard = 0;
  let taxablePartsCash = 0, taxableLaborCash = 0;
  let totalAdjustable = 0, totalNonAdjustable = 0;
  let totalDiscountCash = 0, totalDiscountCard = 0;

  for (const item of items) {
    if (item.isShopSupply) continue;

    const qty = parseFloat(item.quantity || "1");
    const unitCash = parseFloat(item.unitPriceCash || "0");
    const unitCard = parseFloat(item.unitPriceCard || "0");
    const baseCash = qty * unitCash;
    const baseCard = qty * unitCard;

    let lineDCash = parseFloat(item.discountAmountCash || "0");
    let lineDCard = parseFloat(item.discountAmountCard || "0");
    const discPct = parseFloat(item.discountPercent || "0");
    if (discPct > 0) {
      lineDCash = baseCash * discPct;
      lineDCard = baseCard * discPct;
      await db.update(autoLineItems).set({
        discountAmountCash: lineDCash.toFixed(2),
        discountAmountCard: lineDCard.toFixed(2),
      }).where(eq(autoLineItems.id, item.id));
    }

    const netCash = baseCash - lineDCash;
    const netCard = baseCard - lineDCard;
    totalDiscountCash += lineDCash;
    totalDiscountCard += lineDCard;

    if (item.type === "discount") {
      subtotalCash -= netCash;
      subtotalCard -= netCard;
    } else {
      subtotalCash += netCash;
      subtotalCard += netCard;

      if (item.isTaxable) {
        if (item.type === "parts" || item.type === "fee") {
          taxablePartsCash += netCash;
        } else if ((item.type === "labor" || item.type === "sublet") && laborTaxable) {
          taxableLaborCash += netCash;
        }
      }

      if (item.isNtnf) {
        totalNonAdjustable += netCash;
      } else if (item.isAdjustable) {
        totalAdjustable += netCash;
      }
    }
  }

  let shopSupplyCash = 0, shopSupplyCard = 0;
  if (shop.shopSupplyEnabled) {
    const ratePct = parseFloat(shop.shopSupplyRatePct || "0");
    const maxAmt = parseFloat(shop.shopSupplyMaxAmount || "0");
    shopSupplyCash = Math.min(subtotalCash * ratePct, maxAmt > 0 ? maxAmt : Infinity);
    if (shopSupplyCash < 0) shopSupplyCash = 0;
    shopSupplyCard = shopSupplyCash * (1 + cardFeePercent);

    const existingSupply = items.find(i => i.isShopSupply === true);
    if (existingSupply) {
      await db.update(autoLineItems).set({
        unitPriceCash: shopSupplyCash.toFixed(2),
        unitPriceCard: shopSupplyCard.toFixed(2),
        totalCash: shopSupplyCash.toFixed(2),
        totalCard: shopSupplyCard.toFixed(2),
        quantity: "1",
      }).where(eq(autoLineItems.id, existingSupply.id));
    } else {
      await db.insert(autoLineItems).values({
        repairOrderId: roId,
        type: "fee",
        description: "Shop Supplies",
        quantity: "1",
        unitPriceCash: shopSupplyCash.toFixed(2),
        unitPriceCard: shopSupplyCard.toFixed(2),
        totalCash: shopSupplyCash.toFixed(2),
        totalCard: shopSupplyCard.toFixed(2),
        isTaxable: shop.shopSupplyTaxable ?? true,
        isAdjustable: true,
        isShopSupply: true,
        status: "approved",
        sortOrder: 9999,
      });
    }

    subtotalCash += shopSupplyCash;
    subtotalCard += shopSupplyCard;
    if (shop.shopSupplyTaxable) {
      taxablePartsCash += shopSupplyCash;
    }
    totalAdjustable += shopSupplyCash;
  }

  const taxPartsAmount = taxablePartsCash * partsTaxRate;
  const taxLaborAmount = taxableLaborCash * laborTaxRate;
  const taxAmount = taxPartsAmount + taxLaborAmount;
  const feeAmount = totalAdjustable * cardFeePercent;
  const totalCash = subtotalCash + taxAmount;
  const totalCard = subtotalCard + taxAmount;

  const payments = await db.select().from(autoPayments)
    .where(and(eq(autoPayments.repairOrderId, roId), eq(autoPayments.status, "completed")));
  let paidAmount = 0;
  for (const p of payments) {
    paidAmount += parseFloat(p.amount || "0");
  }
  const balanceDue = Math.max(0, totalCard - paidAmount);

  const [updated] = await db.update(autoRepairOrders).set({
    subtotalCash: subtotalCash.toFixed(2),
    subtotalCard: subtotalCard.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    taxPartsAmount: taxPartsAmount.toFixed(2),
    taxLaborAmount: taxLaborAmount.toFixed(2),
    totalCash: totalCash.toFixed(2),
    totalCard: totalCard.toFixed(2),
    totalAdjustable: totalAdjustable.toFixed(2),
    totalNonAdjustable: totalNonAdjustable.toFixed(2),
    feeAmount: feeAmount.toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    shopSupplyAmountCash: shopSupplyCash.toFixed(2),
    shopSupplyAmountCard: shopSupplyCard.toFixed(2),
    discountAmountCash: totalDiscountCash.toFixed(2),
    discountAmountCard: totalDiscountCard.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(autoRepairOrders.id, roId)).returning();

  return updated;
}

router.post("/repair-orders/:id/recalculate", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.id);
    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    if (!ro) return res.status(404).json({ error: "RO not found" });

    const updated = await recalculateROTotals(roId, req.autoUser!.shopId);
    res.json(updated);
  } catch (err: any) {
    console.error("Recalculate error:", err);
    res.status(500).json({ error: "Failed to recalculate totals" });
  }
});

// ============================================================================
// LINE ITEMS
// ============================================================================

router.post("/repair-orders/:roId/line-items", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.roId);
    const data = req.body;

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, req.autoUser!.shopId)).limit(1);
    const cardFeePercent = parseFloat(shop[0]?.cardFeePercent || "0");

    const quantity = parseFloat(data.quantity || "1");
    const unitPriceCash = parseFloat(data.unitPriceCash || "0");
    const isNtnf = data.isNtnf === true;
    const isAdjustable = data.isAdjustable !== false;

    let unitPriceCard: number;
    if (data.unitPriceCard) {
      unitPriceCard = parseFloat(data.unitPriceCard);
    } else if (isNtnf) {
      unitPriceCard = unitPriceCash;
    } else if (isAdjustable) {
      unitPriceCard = unitPriceCash * (1 + cardFeePercent);
    } else {
      unitPriceCard = unitPriceCash;
    }

    const totalCash = quantity * unitPriceCash;
    const totalCard = quantity * unitPriceCard;

    const [item] = await db.insert(autoLineItems).values({
      repairOrderId: roId, type: data.type, description: data.description,
      partNumber: data.partNumber || null, quantity: quantity.toString(),
      unitPriceCash: unitPriceCash.toFixed(2), unitPriceCard: unitPriceCard.toFixed(2),
      totalCash: totalCash.toFixed(2), totalCard: totalCard.toFixed(2),
      laborHours: data.laborHours?.toString() || null, laborRate: data.laborRate?.toString() || null,
      vendorId: data.vendorId || null, isTaxable: data.isTaxable !== false,
      isAdjustable, isNtnf,
      costPrice: data.costPrice != null ? parseFloat(data.costPrice).toFixed(2) : null,
      sortOrder: data.sortOrder || 0, status: data.status || "pending",
    }).returning();

    res.json(item);
  } catch (err: any) {
    console.error("Create line item error:", err);
    res.status(500).json({ error: "Failed to create line item" });
  }
});

router.patch("/line-items/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data };
    delete updates.id; delete updates.createdAt;

    if (data.quantity != null || data.unitPriceCash != null || data.isAdjustable != null || data.isNtnf != null) {
      const existing = await db.select().from(autoLineItems).where(eq(autoLineItems.id, parseInt(req.params.id))).limit(1);
      if (!existing.length) return res.status(404).json({ error: "Line item not found" });
      const cur = existing[0];

      const shop = await db.select().from(autoShops).where(eq(autoShops.id, req.autoUser!.shopId)).limit(1);
      const cardFeePercent = parseFloat(shop[0]?.cardFeePercent || "0");

      const quantity = parseFloat(data.quantity ?? cur.quantity ?? "1");
      const unitPriceCash = parseFloat(data.unitPriceCash ?? cur.unitPriceCash ?? "0");
      const isNtnf = data.isNtnf ?? cur.isNtnf ?? false;
      const isAdjustable = data.isAdjustable ?? cur.isAdjustable ?? true;

      let unitPriceCard: number;
      if (data.unitPriceCard) {
        unitPriceCard = parseFloat(data.unitPriceCard);
      } else if (isNtnf) {
        unitPriceCard = unitPriceCash;
      } else if (isAdjustable) {
        unitPriceCard = unitPriceCash * (1 + cardFeePercent);
      } else {
        unitPriceCard = unitPriceCash;
      }

      updates.unitPriceCash = unitPriceCash.toFixed(2);
      updates.unitPriceCard = unitPriceCard.toFixed(2);
      updates.totalCash = (quantity * unitPriceCash).toFixed(2);
      updates.totalCard = (quantity * unitPriceCard).toFixed(2);
      updates.quantity = quantity.toString();
    }

    if (data.costPrice != null) {
      updates.costPrice = parseFloat(data.costPrice).toFixed(2);
    }

    const [item] = await db.update(autoLineItems).set(updates).where(eq(autoLineItems.id, parseInt(req.params.id))).returning();
    if (!item) return res.status(404).json({ error: "Line item not found" });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update line item" });
  }
});

router.delete("/line-items/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(autoLineItems).where(eq(autoLineItems.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete line item" });
  }
});

// ============================================================================
// PAYMENTS
// ============================================================================

router.get("/repair-orders/:roId/payments", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.roId);
    const payments = await db.select().from(autoPayments)
      .where(and(eq(autoPayments.repairOrderId, roId), eq(autoPayments.shopId, req.autoUser!.shopId)))
      .orderBy(desc(autoPayments.processedAt));

    const roData = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)))
      .limit(1);

    if (!roData.length) return res.status(404).json({ error: "Repair order not found" });

    const completedPayments = payments.filter(p => p.status === "completed");
    const totalPaid = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalCash = parseFloat(roData[0].totalCash || "0");
    const totalCard = parseFloat(roData[0].totalCard || "0");
    const balanceDue = Math.max(0, totalCash - totalPaid);

    res.json({ payments, totalPaid, balanceDue, totalCash, totalCard });
  } catch (err: any) {
    console.error("List payments error:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/repair-orders/:roId/payments", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.roId);
    const { amount, method, notes, referenceNumber } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ error: "Amount and method are required" });
    }

    const validMethods = ["cash", "card", "check", "financing", "other"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const paymentToken = crypto.randomBytes(32).toString("hex");

    const [payment] = await db.insert(autoPayments).values({
      repairOrderId: roId, shopId: req.autoUser!.shopId,
      amount: amount.toString(), method,
      status: "completed", transactionId: referenceNumber || null,
      paymentToken, notes: notes || null, processedAt: new Date(),
    }).returning();

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "payment", entityId: payment.id, action: "payment_received",
      details: { amount, method, roId, referenceNumber },
    });

    const allPayments = await db.select().from(autoPayments)
      .where(and(eq(autoPayments.repairOrderId, roId), eq(autoPayments.status, "completed")));
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const roData = await db.select().from(autoRepairOrders)
      .where(eq(autoRepairOrders.id, roId)).limit(1);

    if (roData.length) {
      const totalCash = parseFloat(roData[0].totalCash || "0");
      const totalCard = parseFloat(roData[0].totalCard || "0");
      const balanceDue = Math.max(0, totalCash - totalPaid);

      if (totalPaid >= totalCash && totalCash > 0) {
        await db.update(autoRepairOrders).set({ status: "paid", paidAt: new Date() })
          .where(eq(autoRepairOrders.id, roId));
      }

      res.json({ payment, totalPaid, balanceDue, totalCash, totalCard });
    } else {
      res.json({ payment, totalPaid, balanceDue: 0, totalCash: 0, totalCard: 0 });
    }
  } catch (err: any) {
    console.error("Create payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.post("/payments/:id/void", autoAuth, async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.id);
    const userRole = req.autoUser!.role;

    if (userRole !== "owner" && userRole !== "manager") {
      return res.status(403).json({ error: "Only owners and managers can void payments" });
    }

    const payment = await db.select().from(autoPayments)
      .where(and(eq(autoPayments.id, paymentId), eq(autoPayments.shopId, req.autoUser!.shopId)))
      .limit(1);

    if (!payment.length) return res.status(404).json({ error: "Payment not found" });
    if (payment[0].status === "voided") return res.status(400).json({ error: "Payment already voided" });

    await db.update(autoPayments).set({ status: "voided" }).where(eq(autoPayments.id, paymentId));

    const roId = payment[0].repairOrderId;
    const remainingPayments = await db.select().from(autoPayments)
      .where(and(eq(autoPayments.repairOrderId, roId), eq(autoPayments.status, "completed")));

    const totalPaidAfterVoid = remainingPayments
      .filter(p => p.id !== paymentId)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const roData = await db.select().from(autoRepairOrders)
      .where(eq(autoRepairOrders.id, roId)).limit(1);

    if (roData.length) {
      const totalCash = parseFloat(roData[0].totalCash || "0");
      if (totalPaidAfterVoid < totalCash && roData[0].status === "paid") {
        await db.update(autoRepairOrders).set({ status: "invoiced", paidAt: null })
          .where(eq(autoRepairOrders.id, roId));
      }
    }

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "payment", entityId: paymentId, action: "payment_voided",
      details: { amount: payment[0].amount, method: payment[0].method, roId },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Void payment error:", err);
    res.status(500).json({ error: "Failed to void payment" });
  }
});

// ============================================================================
// DVI
// ============================================================================

router.get("/dvi/inspections", autoAuth, async (req: Request, res: Response) => {
  try {
    const inspections = await db.select({
      id: autoDviInspections.id,
      repairOrderId: autoDviInspections.repairOrderId,
      status: autoDviInspections.status,
      overallCondition: autoDviInspections.overallCondition,
      notes: autoDviInspections.notes,
      vehicleMileage: autoDviInspections.vehicleMileage,
      technicianId: autoDviInspections.technicianId,
      publicToken: autoDviInspections.publicToken,
      sentToCustomerAt: autoDviInspections.sentToCustomerAt,
      createdAt: autoDviInspections.createdAt,
    }).from(autoDviInspections)
      .innerJoin(autoRepairOrders, eq(autoDviInspections.repairOrderId, autoRepairOrders.id))
      .where(eq(autoRepairOrders.shopId, req.autoUser!.shopId))
      .orderBy(desc(autoDviInspections.createdAt));

    const result = [];
    for (const insp of inspections) {
      const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.id, insp.repairOrderId)).limit(1);
      let customer = null, vehicle = null, technician = null;
      if (ro) {
        const [c] = await db.select({ id: autoCustomers.id, firstName: autoCustomers.firstName, lastName: autoCustomers.lastName, phone: autoCustomers.phone }).from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
        customer = c || null;
        const [v] = await db.select({ id: autoVehicles.id, year: autoVehicles.year, make: autoVehicles.make, model: autoVehicles.model, licensePlate: autoVehicles.licensePlate }).from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
        vehicle = v || null;
      }
      if (insp.technicianId) {
        const [t] = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName }).from(autoUsers).where(eq(autoUsers.id, insp.technicianId));
        technician = t || null;
      }
      const items = await db.select({ condition: autoDviItems.condition }).from(autoDviItems).where(eq(autoDviItems.inspectionId, insp.id));
      const counts = { good: 0, fair: 0, poor: 0, not_inspected: 0, total: items.length };
      for (const it of items) {
        if (it.condition === "good") counts.good++;
        else if (it.condition === "fair") counts.fair++;
        else if (it.condition === "poor") counts.poor++;
        else counts.not_inspected++;
      }
      result.push({ ...insp, repairOrder: ro ? { roNumber: ro.roNumber, status: ro.status } : null, customer, vehicle, technician, conditionCounts: counts });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch inspections" });
  }
});

router.get("/dvi/templates", autoAuth, async (req: Request, res: Response) => {
  try {
    const templates = await db.select().from(autoDviTemplates)
      .where(or(eq(autoDviTemplates.shopId, req.autoUser!.shopId), sql`${autoDviTemplates.shopId} IS NULL`))
      .orderBy(desc(autoDviTemplates.isDefault));
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/dvi/inspections", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const publicToken = crypto.randomBytes(32).toString("hex");

    const [inspection] = await db.insert(autoDviInspections).values({
      repairOrderId: data.repairOrderId, shopId: req.autoUser!.shopId,
      templateId: data.templateId || null, technicianId: req.autoUser!.id,
      vehicleMileage: data.vehicleMileage || null, publicToken,
      notes: data.notes || null,
    }).returning();

    if (data.templateId) {
      const [template] = await db.select().from(autoDviTemplates).where(eq(autoDviTemplates.id, data.templateId));
      if (template?.categories) {
        const categories = typeof template.categories === "string" ? JSON.parse(template.categories as string) : template.categories;
        for (const cat of categories as any[]) {
          for (const item of cat.items || []) {
            await db.insert(autoDviItems).values({
              inspectionId: inspection.id, categoryName: cat.name,
              itemName: item.name, condition: "good", sortOrder: item.sortOrder || 0,
            });
          }
        }
      }
    }

    res.json(inspection);
  } catch (err: any) {
    console.error("Create DVI error:", err);
    res.status(500).json({ error: "Failed to create inspection" });
  }
});

router.get("/dvi/inspections/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.select().from(autoDviInspections)
      .where(and(eq(autoDviInspections.id, parseInt(req.params.id)), eq(autoDviInspections.shopId, req.autoUser!.shopId)));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });

    const items = await db.select().from(autoDviItems)
      .where(eq(autoDviItems.inspectionId, inspection.id)).orderBy(asc(autoDviItems.sortOrder));
    res.json({ inspection, items });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch inspection" });
  }
});

router.patch("/dvi/items/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [item] = await db.update(autoDviItems).set({
      condition: data.condition, notes: data.notes, photoUrls: data.photoUrls,
    }).where(eq(autoDviItems.id, parseInt(req.params.id))).returning();
    if (!item) return res.status(404).json({ error: "DVI item not found" });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update DVI item" });
  }
});

router.post("/dvi/inspections/:id/complete", autoAuth, async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.update(autoDviInspections).set({
      status: "completed", completedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(autoDviInspections.id, parseInt(req.params.id)), eq(autoDviInspections.shopId, req.autoUser!.shopId))).returning();
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });
    res.json(inspection);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to complete inspection" });
  }
});

router.get("/dvi/public/:token", async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.select().from(autoDviInspections)
      .where(eq(autoDviInspections.publicToken, req.params.token));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });

    if (!inspection.customerViewedAt) {
      await db.update(autoDviInspections).set({ customerViewedAt: new Date() })
        .where(eq(autoDviInspections.id, inspection.id));
    }

    const items = await db.select().from(autoDviItems)
      .where(eq(autoDviItems.inspectionId, inspection.id))
      .orderBy(asc(autoDviItems.sortOrder));

    const [ro] = await db.select().from(autoRepairOrders)
      .where(eq(autoRepairOrders.id, inspection.repairOrderId));

    const [shop] = await db.select().from(autoShops)
      .where(eq(autoShops.id, inspection.shopId));

    const [technician] = await db.select().from(autoUsers)
      .where(eq(autoUsers.id, inspection.technicianId));

    let customer = null;
    let vehicle = null;
    if (ro) {
      const [c] = await db.select().from(autoCustomers)
        .where(eq(autoCustomers.id, ro.customerId));
      customer = c;
      const [v] = await db.select().from(autoVehicles)
        .where(eq(autoVehicles.id, ro.vehicleId));
      vehicle = v;
    }

    res.json({
      inspection,
      shop: shop ? { name: shop.name, phone: shop.phone, address: shop.address, city: shop.city, state: shop.state, zip: shop.zip } : null,
      customer: customer ? { firstName: customer.firstName } : null,
      vehicle: vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, color: vehicle.color, licensePlate: vehicle.licensePlate } : null,
      technician: technician ? { firstName: technician.firstName, lastName: technician.lastName } : null,
      items,
      repairOrder: ro ? { roNumber: ro.roNumber } : null,
    });
  } catch (err: any) {
    console.error("Public DVI fetch error:", err);
    res.status(500).json({ error: "Failed to fetch inspection report" });
  }
});

router.post("/dvi/inspections/:id/send", autoAuth, async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.update(autoDviInspections).set({
      status: "sent", sentToCustomerAt: new Date(), updatedAt: new Date(),
    }).where(and(
      eq(autoDviInspections.id, parseInt(req.params.id)),
      eq(autoDviInspections.shopId, req.autoUser!.shopId)
    )).returning();
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });
    res.json(inspection);
  } catch (err: any) {
    console.error("Send DVI error:", err);
    res.status(500).json({ error: "Failed to send inspection" });
  }
});

router.get("/dvi/inspections/:id/pdf", autoAuth, async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.select().from(autoDviInspections)
      .where(and(eq(autoDviInspections.id, parseInt(req.params.id)), eq(autoDviInspections.shopId, req.autoUser!.shopId)));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });

    const items = await db.select().from(autoDviItems)
      .where(eq(autoDviItems.inspectionId, inspection.id)).orderBy(asc(autoDviItems.sortOrder));

    const [ro] = await db.select().from(autoRepairOrders)
      .where(eq(autoRepairOrders.id, inspection.repairOrderId));

    const [shop] = await db.select().from(autoShops)
      .where(eq(autoShops.id, inspection.shopId));

    const [technician] = inspection.technicianId
      ? await db.select().from(autoUsers).where(eq(autoUsers.id, inspection.technicianId))
      : [null];

    let customer = null;
    let vehicle = null;
    if (ro) {
      const [c] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
      customer = c;
      const [v] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
      vehicle = v;
    }

    await generateDviPdf(res, { shop, customer, vehicle, repairOrder: ro, inspection, items, technician });
  } catch (err: any) {
    console.error("DVI PDF error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate DVI PDF" });
  }
});

router.get("/dvi/public/:token/pdf", async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.select().from(autoDviInspections)
      .where(eq(autoDviInspections.publicToken, req.params.token));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });

    const items = await db.select().from(autoDviItems)
      .where(eq(autoDviItems.inspectionId, inspection.id)).orderBy(asc(autoDviItems.sortOrder));

    const [ro] = await db.select().from(autoRepairOrders)
      .where(eq(autoRepairOrders.id, inspection.repairOrderId));

    const [shop] = await db.select().from(autoShops)
      .where(eq(autoShops.id, inspection.shopId));

    const [technician] = inspection.technicianId
      ? await db.select().from(autoUsers).where(eq(autoUsers.id, inspection.technicianId))
      : [null];

    let customer = null;
    let vehicle = null;
    if (ro) {
      const [c] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
      customer = c;
      const [v] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
      vehicle = v;
    }

    await generateDviPdf(res, { shop, customer, vehicle, repairOrder: ro, inspection, items, technician });
  } catch (err: any) {
    console.error("Public DVI PDF error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate DVI PDF" });
  }
});

// ============================================================================
// CANNED SERVICES
// ============================================================================

router.get("/canned-services", autoAuth, async (req: Request, res: Response) => {
  try {
    const services = await db.select().from(autoCannedServices)
      .where(eq(autoCannedServices.shopId, req.autoUser!.shopId))
      .orderBy(asc(autoCannedServices.sortOrder));

    const serviceIds = services.map(s => s.id);
    let allItems: any[] = [];
    if (serviceIds.length > 0) {
      allItems = await db.select().from(autoCannedServiceItems)
        .where(inArray(autoCannedServiceItems.cannedServiceId, serviceIds))
        .orderBy(asc(autoCannedServiceItems.sortOrder));
    }

    const result = services.map(s => ({
      ...s,
      items: allItems.filter(i => i.cannedServiceId === s.id),
    }));

    res.json(result);
  } catch (err: any) {
    console.error("Fetch canned services error:", err);
    res.status(500).json({ error: "Failed to fetch canned services" });
  }
});

router.post("/canned-services", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const { items, ...data } = req.body;

    const [service] = await db.insert(autoCannedServices).values({
      shopId: req.autoUser!.shopId,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      isActive: data.isActive !== false,
      defaultLaborHours: data.defaultLaborHours || null,
      defaultLaborRate: data.defaultLaborRate || null,
      defaultPriceCash: data.defaultPriceCash || null,
      defaultPriceCard: data.defaultPriceCard || null,
      isTaxable: data.isTaxable !== false,
      isAdjustable: data.isAdjustable !== false,
      sortOrder: data.sortOrder || 0,
    }).returning();

    let createdItems: any[] = [];
    if (items?.length) {
      for (const item of items) {
        const [created] = await db.insert(autoCannedServiceItems).values({
          cannedServiceId: service.id,
          type: item.type,
          description: item.description,
          partNumber: item.partNumber || null,
          quantity: item.quantity || "1",
          unitPriceCash: item.unitPriceCash,
          unitPriceCard: item.unitPriceCard || null,
          laborHours: item.laborHours || null,
          laborRate: item.laborRate || null,
          costPrice: item.costPrice || null,
          isTaxable: item.isTaxable !== false,
          isAdjustable: item.isAdjustable !== false,
          sortOrder: item.sortOrder || 0,
        }).returning();
        createdItems.push(created);
      }
    }

    res.json({ ...service, items: createdItems });
  } catch (err: any) {
    console.error("Create canned service error:", err);
    res.status(500).json({ error: "Failed to create canned service" });
  }
});

router.patch("/canned-services/:id", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const data = req.body;

    const [existing] = await db.select().from(autoCannedServices)
      .where(and(eq(autoCannedServices.id, serviceId), eq(autoCannedServices.shopId, req.autoUser!.shopId)));
    if (!existing) return res.status(404).json({ error: "Canned service not found" });

    const updates: any = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.isActive !== undefined) updates.isActive = data.isActive;
    if (data.defaultLaborHours !== undefined) updates.defaultLaborHours = data.defaultLaborHours;
    if (data.defaultLaborRate !== undefined) updates.defaultLaborRate = data.defaultLaborRate;
    if (data.defaultPriceCash !== undefined) updates.defaultPriceCash = data.defaultPriceCash;
    if (data.defaultPriceCard !== undefined) updates.defaultPriceCard = data.defaultPriceCard;
    if (data.isTaxable !== undefined) updates.isTaxable = data.isTaxable;
    if (data.isAdjustable !== undefined) updates.isAdjustable = data.isAdjustable;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const [updated] = await db.update(autoCannedServices).set(updates)
      .where(eq(autoCannedServices.id, serviceId)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("Update canned service error:", err);
    res.status(500).json({ error: "Failed to update canned service" });
  }
});

router.delete("/canned-services/:id", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    const [deleted] = await db.delete(autoCannedServices)
      .where(and(eq(autoCannedServices.id, serviceId), eq(autoCannedServices.shopId, req.autoUser!.shopId)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Canned service not found" });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete canned service error:", err);
    res.status(500).json({ error: "Failed to delete canned service" });
  }
});

router.post("/repair-orders/:roId/apply-canned-service/:serviceId", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.roId);
    const serviceId = parseInt(req.params.serviceId);
    const shopId = req.autoUser!.shopId;

    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    const [service] = await db.select().from(autoCannedServices)
      .where(and(eq(autoCannedServices.id, serviceId), eq(autoCannedServices.shopId, shopId)));
    if (!service) return res.status(404).json({ error: "Canned service not found" });

    const serviceItems = await db.select().from(autoCannedServiceItems)
      .where(eq(autoCannedServiceItems.cannedServiceId, serviceId))
      .orderBy(asc(autoCannedServiceItems.sortOrder));

    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
    const cardFeePercent = parseFloat(shop?.cardFeePercent || "0");

    const existingCount = await db.select({ cnt: count() }).from(autoLineItems)
      .where(eq(autoLineItems.repairOrderId, roId));
    let sortBase = (existingCount[0]?.cnt || 0) + 1;

    const createdItems: any[] = [];
    for (const si of serviceItems) {
      const qty = parseFloat(si.quantity || "1");
      const unitCash = parseFloat(si.unitPriceCash || "0");
      const isAdj = si.isAdjustable !== false;
      const isNtnf = false;

      let unitCard: number;
      if (si.unitPriceCard) {
        unitCard = parseFloat(si.unitPriceCard);
      } else if (isAdj) {
        unitCard = unitCash * (1 + cardFeePercent);
      } else {
        unitCard = unitCash;
      }

      const totalCash = qty * unitCash;
      const totalCard = qty * unitCard;

      const [lineItem] = await db.insert(autoLineItems).values({
        repairOrderId: roId,
        type: si.type,
        description: si.description,
        partNumber: si.partNumber || null,
        quantity: si.quantity || "1",
        unitPriceCash: unitCash.toFixed(2),
        unitPriceCard: unitCard.toFixed(2),
        totalCash: totalCash.toFixed(2),
        totalCard: totalCard.toFixed(2),
        laborHours: si.laborHours || null,
        laborRate: si.laborRate || null,
        costPrice: si.costPrice || null,
        isTaxable: si.isTaxable !== false,
        isAdjustable: isAdj,
        isNtnf,
        sortOrder: sortBase++,
        status: "pending",
      }).returning();
      createdItems.push(lineItem);
    }

    const updated = await recalculateROTotals(roId, shopId);

    res.json({ repairOrder: updated, lineItems: createdItems });
  } catch (err: any) {
    console.error("Apply canned service error:", err);
    res.status(500).json({ error: "Failed to apply canned service" });
  }
});

// ============================================================================
// BAYS
// ============================================================================

router.get("/bays", autoAuth, async (req: Request, res: Response) => {
  try {
    const bays = await db.select().from(autoBays)
      .where(eq(autoBays.shopId, req.autoUser!.shopId)).orderBy(asc(autoBays.sortOrder));
    res.json(bays);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch bays" });
  }
});

router.post("/bays", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const [bay] = await db.insert(autoBays).values({
      shopId: req.autoUser!.shopId, name: req.body.name,
      description: req.body.description || null, sortOrder: req.body.sortOrder || 0,
    }).returning();
    res.json(bay);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create bay" });
  }
});

router.patch("/bays/:id", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const [bay] = await db.update(autoBays).set(req.body)
      .where(and(eq(autoBays.id, parseInt(req.params.id)), eq(autoBays.shopId, req.autoUser!.shopId)))
      .returning();
    if (!bay) return res.status(404).json({ error: "Bay not found" });
    res.json(bay);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update bay" });
  }
});

router.delete("/bays/:id", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const [bay] = await db.delete(autoBays)
      .where(and(eq(autoBays.id, parseInt(req.params.id)), eq(autoBays.shopId, req.autoUser!.shopId)))
      .returning();
    if (!bay) return res.status(404).json({ error: "Bay not found" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete bay" });
  }
});

// ============================================================================
// APPOINTMENTS
// ============================================================================

router.get("/appointments", autoAuth, async (req: Request, res: Response) => {
  try {
    const { start, end, bayId, technicianId } = req.query;
    let conditions = [eq(autoAppointments.shopId, req.autoUser!.shopId)];

    if (start) conditions.push(sql`${autoAppointments.startTime} >= ${new Date(start as string)}`);
    if (end) conditions.push(sql`${autoAppointments.endTime} <= ${new Date(end as string)}`);
    if (bayId) conditions.push(eq(autoAppointments.bayId, parseInt(bayId as string)));
    if (technicianId) conditions.push(eq(autoAppointments.technicianId, parseInt(technicianId as string)));

    const appointments = await db.select().from(autoAppointments)
      .where(and(...conditions)).orderBy(asc(autoAppointments.startTime));

    const enriched = await Promise.all(appointments.map(async (apt) => {
      let customer = null, vehicle = null;
      if (apt.customerId) {
        const [c] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, apt.customerId));
        customer = c;
      }
      if (apt.vehicleId) {
        const [v] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, apt.vehicleId));
        vehicle = v;
      }
      return { ...apt, customer, vehicle };
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/appointments", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [appointment] = await db.insert(autoAppointments).values({
      shopId: req.autoUser!.shopId, customerId: data.customerId || null,
      vehicleId: data.vehicleId || null, repairOrderId: data.repairOrderId || null,
      bayId: data.bayId || null, technicianId: data.technicianId || null,
      title: data.title, description: data.description || null,
      status: data.status || "scheduled",
      startTime: new Date(data.startTime), endTime: new Date(data.endTime),
      estimatedDuration: data.estimatedDuration || null, color: data.color || null,
    }).returning();
    res.json(appointment);
  } catch (err: any) {
    console.error("Create appointment error:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.patch("/appointments/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.shopId; delete updates.createdAt;
    if (updates.startTime) updates.startTime = new Date(updates.startTime);
    if (updates.endTime) updates.endTime = new Date(updates.endTime);

    const [appointment] = await db.update(autoAppointments).set(updates)
      .where(and(eq(autoAppointments.id, parseInt(req.params.id)), eq(autoAppointments.shopId, req.autoUser!.shopId)))
      .returning();
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json(appointment);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.delete("/appointments/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(autoAppointments)
      .where(and(eq(autoAppointments.id, parseInt(req.params.id)), eq(autoAppointments.shopId, req.autoUser!.shopId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

// ============================================================================
// SHOP SETTINGS
// ============================================================================

router.get("/shop/settings", autoAuth, async (req: Request, res: Response) => {
  try {
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, req.autoUser!.shopId));
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch shop settings" });
  }
});

router.patch("/shop/settings", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.slug; delete updates.createdAt; delete updates.createdById;

    const [shop] = await db.update(autoShops).set(updates)
      .where(eq(autoShops.id, req.autoUser!.shopId)).returning();
    res.json(shop);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update shop settings" });
  }
});

router.post("/logo/upload", autoAuth, autoRequireRole("owner", "manager"), logoUpload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateObjectDir) {
      return res.status(500).json({ error: "Object storage not configured" });
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/auto-logos/${objectId}`;

    const pathWithoutLeadingSlash = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath;
    const [bucketName, ...rest] = pathWithoutLeadingSlash.split("/");
    const objectName = rest.join("/");

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype || "application/octet-stream",
      metadata: { originalName: req.file.originalname }
    });

    const objectPath = `/objects/auto-logos/${objectId}`;

    const [shop] = await db.update(autoShops).set({ logoUrl: objectPath, updatedAt: new Date() })
      .where(eq(autoShops.id, req.autoUser!.shopId)).returning();

    res.json({ logoUrl: objectPath, shop });
  } catch (err: any) {
    console.error("Logo upload error:", err);
    res.status(500).json({ error: "Failed to upload logo" });
  }
});

// ============================================================================
// INTEGRATION CONFIGS
// ============================================================================

router.get("/integrations", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const [config] = await db.select().from(autoIntegrationConfigs)
      .where(eq(autoIntegrationConfigs.shopId, req.autoUser!.shopId));
    res.json(config || {});
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

router.patch("/integrations", autoAuth, autoRequireRole("owner"), async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const updates: any = { ...data, updatedAt: new Date() };
    delete updates.id; delete updates.shopId;

    const [config] = await db.update(autoIntegrationConfigs).set(updates)
      .where(eq(autoIntegrationConfigs.shopId, req.autoUser!.shopId)).returning();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update integrations" });
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================

router.get("/dashboard/stats", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalROs] = await db.select({ count: count() }).from(autoRepairOrders).where(eq(autoRepairOrders.shopId, shopId));
    const [openROs] = await db.select({ count: count() }).from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.shopId, shopId), or(
        eq(autoRepairOrders.status, "estimate"), eq(autoRepairOrders.status, "approved"), eq(autoRepairOrders.status, "in_progress")
      )));
    const [totalCustomers] = await db.select({ count: count() }).from(autoCustomers).where(eq(autoCustomers.shopId, shopId));
    const [todayAppointments] = await db.select({ count: count() }).from(autoAppointments)
      .where(and(eq(autoAppointments.shopId, shopId), sql`${autoAppointments.startTime} >= ${today}`));

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const payments = await db.select({ amount: autoPayments.amount }).from(autoPayments)
      .where(and(eq(autoPayments.shopId, shopId), eq(autoPayments.status, "completed"), sql`${autoPayments.createdAt} >= ${monthStart}`));
    const monthRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    res.json({
      totalRepairOrders: totalROs.count, openRepairOrders: openROs.count,
      totalCustomers: totalCustomers.count, todayAppointments: todayAppointments.count,
      monthRevenue,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ============================================================================
// PDF GENERATION (authenticated)
// ============================================================================

router.get("/repair-orders/:id/pdf", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.id);
    const type = (req.query.type as string) || "estimate";
    if (!["estimate", "work_order", "invoice"].includes(type)) {
      return res.status(400).json({ error: "Invalid PDF type" });
    }

    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, ro.shopId));
    const lineItems = await db.select().from(autoLineItems).where(eq(autoLineItems.repairOrderId, roId)).orderBy(asc(autoLineItems.sortOrder));
    const payments = type === "invoice"
      ? await db.select().from(autoPayments).where(eq(autoPayments.repairOrderId, roId))
      : [];

    await generateROPdf(res, {
      type: type as "estimate" | "work_order" | "invoice",
      shop, customer, vehicle, repairOrder: ro, lineItems, payments,
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
});

// ============================================================================
// PUBLIC ROUTES (no auth - token-based)
// ============================================================================

router.get("/public/estimate/:token/pdf", async (req: Request, res: Response) => {
  try {
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, ro.shopId));
    const lineItems = await db.select().from(autoLineItems).where(eq(autoLineItems.repairOrderId, ro.id)).orderBy(asc(autoLineItems.sortOrder));

    await generateROPdf(res, {
      type: "estimate",
      shop, customer, vehicle, repairOrder: ro, lineItems,
    });
  } catch (err: any) {
    console.error("Public PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  }
});

router.get("/public/estimate/:token", async (req: Request, res: Response) => {
  try {
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, ro.shopId));
    const lineItems = await db.select().from(autoLineItems).where(eq(autoLineItems.repairOrderId, ro.id)).orderBy(asc(autoLineItems.sortOrder));

    res.json({ repairOrder: ro, customer, vehicle, shop, lineItems });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch estimate" });
  }
});

router.post("/public/estimate/:token/approve", async (req: Request, res: Response) => {
  try {
    const { customerName, approvedItemIds } = req.body;
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    if (ro.status !== "estimate" && ro.status !== "declined") {
      return res.status(400).json({ error: "This estimate has already been approved" });
    }

    if (approvedItemIds?.length) {
      for (const itemId of approvedItemIds) {
        await db.update(autoLineItems).set({ status: "approved" }).where(eq(autoLineItems.id, itemId));
      }
    }

    await db.update(autoRepairOrders).set({
      status: "approved", approvedAt: new Date(),
      approvedBy: customerName || "Online", updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, ro.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to approve estimate" });
  }
});

router.post("/public/estimate/:token/decline", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    if (ro.status !== "estimate") {
      return res.status(400).json({ error: "This estimate cannot be declined in its current state" });
    }

    await db.update(autoRepairOrders).set({
      approvalDeclinedAt: new Date(),
      approvalDeclinedReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, ro.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to decline estimate" });
  }
});

router.post("/public/estimate/:token/question", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question is required" });

    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    await db.update(autoRepairOrders).set({
      approvalQuestion: question,
      approvalQuestionAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, ro.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to submit question" });
  }
});

router.get("/public/estimate/:token/lines", async (req: Request, res: Response) => {
  try {
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, ro.shopId));
    const lineItems = await db.select().from(autoLineItems)
      .where(and(
        eq(autoLineItems.repairOrderId, ro.id),
        or(eq(autoLineItems.status, "pending"), eq(autoLineItems.status, "approved"))
      ))
      .orderBy(asc(autoLineItems.sortOrder));

    res.json({
      repairOrder: ro,
      customer,
      vehicle,
      shop,
      lineItems: lineItems.map(li => ({
        id: li.id,
        type: li.type,
        description: li.description,
        partNumber: li.partNumber,
        quantity: li.quantity,
        unitPriceCash: li.unitPriceCash,
        unitPriceCard: li.unitPriceCard,
        totalCash: li.totalCash,
        totalCard: li.totalCard,
        laborHours: li.laborHours,
        isTaxable: li.isTaxable,
        isAdjustable: li.isAdjustable,
        isNtnf: li.isNtnf,
        isShopSupply: li.isShopSupply,
        discountPercent: li.discountPercent,
        discountAmountCash: li.discountAmountCash,
        discountAmountCard: li.discountAmountCard,
        approvalStatus: li.approvalStatus,
        approvedAt: li.approvedAt,
        declinedAt: li.declinedAt,
        declinedReason: li.declinedReason,
        sortOrder: li.sortOrder,
        status: li.status,
      })),
    });
  } catch (err: any) {
    console.error("Public estimate lines error:", err);
    res.status(500).json({ error: "Failed to fetch estimate lines" });
  }
});

router.post("/public/estimate/:token/line-approval", async (req: Request, res: Response) => {
  try {
    const { lineItems } = req.body;
    if (!lineItems?.length) return res.status(400).json({ error: "lineItems array is required" });

    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalToken, req.params.token));
    if (!ro) return res.status(404).json({ error: "Estimate not found" });

    if (ro.status !== "estimate" && ro.status !== "declined") {
      return res.status(400).json({ error: "This estimate cannot be modified in its current state" });
    }

    const existingItems = await db.select().from(autoLineItems)
      .where(eq(autoLineItems.repairOrderId, ro.id));
    const existingIds = new Set(existingItems.map(i => i.id));

    let hasApproved = false;
    let hasDeclined = false;

    for (const li of lineItems) {
      if (!existingIds.has(li.id)) continue;

      const existing = existingItems.find(i => i.id === li.id);
      if (existing?.approvalStatus === "approved" || existing?.approvalStatus === "declined") {
        continue;
      }

      if (li.approved) {
        await db.update(autoLineItems).set({
          approvalStatus: "approved",
          approvedAt: new Date(),
          status: "approved",
        }).where(eq(autoLineItems.id, li.id));
        hasApproved = true;
      } else {
        await db.update(autoLineItems).set({
          approvalStatus: "declined",
          declinedAt: new Date(),
          declinedReason: li.declinedReason || null,
          status: "voided",
        }).where(eq(autoLineItems.id, li.id));
        hasDeclined = true;
      }
    }

    let newStatus = ro.status;
    if (hasApproved && !hasDeclined) {
      newStatus = "approved";
    } else if (hasApproved && hasDeclined) {
      newStatus = "approved";
    } else if (!hasApproved && hasDeclined) {
      newStatus = "declined";
    }

    await db.update(autoRepairOrders).set({
      status: newStatus,
      approvedAt: hasApproved ? new Date() : ro.approvedAt,
      updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, ro.id));

    const updated = await recalculateROTotals(ro.id, ro.shopId);

    res.json({ success: true, repairOrder: updated });
  } catch (err: any) {
    console.error("Line approval error:", err);
    res.status(500).json({ error: "Failed to process line approvals" });
  }
});

router.get("/public/dvi/:token", async (req: Request, res: Response) => {
  try {
    const [inspection] = await db.select().from(autoDviInspections).where(eq(autoDviInspections.publicToken, req.params.token));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });

    if (!inspection.customerViewedAt) {
      await db.update(autoDviInspections).set({ customerViewedAt: new Date() }).where(eq(autoDviInspections.id, inspection.id));
    }

    const items = await db.select().from(autoDviItems).where(eq(autoDviItems.inspectionId, inspection.id)).orderBy(asc(autoDviItems.sortOrder));
    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.id, inspection.repairOrderId));
    let vehicle = null;
    if (ro) {
      const [v] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
      vehicle = v;
    }
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, inspection.shopId));

    res.json({ inspection, items, vehicle, shop });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch DVI report" });
  }
});

router.get("/public/pay/:token", async (req: Request, res: Response) => {
  try {
    const [payment] = await db.select().from(autoPayments).where(eq(autoPayments.paymentToken, req.params.token));
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.id, payment.repairOrderId));
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, payment.shopId));

    res.json({ payment, repairOrder: ro, shop });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch payment info" });
  }
});

// ============================================================================
// REPORTS
// ============================================================================

function getDefaultDateRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate, endDate: now };
}

function parseDateRange(startDateStr?: string, endDateStr?: string) {
  if (startDateStr && endDateStr) {
    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T23:59:59");
    return { startDate, endDate };
  }
  return getDefaultDateRange();
}

router.get("/reports/job-profitability", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const ros = await db
      .select({
        roId: autoRepairOrders.id,
        roNumber: autoRepairOrders.roNumber,
        status: autoRepairOrders.status,
        totalCash: autoRepairOrders.totalCash,
        createdAt: autoRepairOrders.createdAt,
        customerFirstName: autoCustomers.firstName,
        customerLastName: autoCustomers.lastName,
        vehicleYear: autoVehicles.year,
        vehicleMake: autoVehicles.make,
        vehicleModel: autoVehicles.model,
      })
      .from(autoRepairOrders)
      .innerJoin(autoCustomers, eq(autoRepairOrders.customerId, autoCustomers.id))
      .innerJoin(autoVehicles, eq(autoRepairOrders.vehicleId, autoVehicles.id))
      .where(
        and(
          eq(autoRepairOrders.shopId, shopId),
          gte(autoRepairOrders.createdAt, startDate),
          lte(autoRepairOrders.createdAt, endDate),
          or(
            eq(autoRepairOrders.status, "paid"),
            eq(autoRepairOrders.status, "invoiced"),
            eq(autoRepairOrders.status, "completed")
          )
        )
      )
      .orderBy(desc(autoRepairOrders.createdAt));

    const roIds = ros.map((r) => r.roId);
    let lineItemsByRo: Record<number, { totalCash: string; costPrice: string | null }[]> = {};

    if (roIds.length > 0) {
      const lineItems = await db
        .select({
          repairOrderId: autoLineItems.repairOrderId,
          totalCash: autoLineItems.totalCash,
          costPrice: autoLineItems.costPrice,
        })
        .from(autoLineItems)
        .where(inArray(autoLineItems.repairOrderId, roIds));

      for (const li of lineItems) {
        if (!lineItemsByRo[li.repairOrderId]) lineItemsByRo[li.repairOrderId] = [];
        lineItemsByRo[li.repairOrderId].push(li);
      }
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const details = ros.map((ro) => {
      const items = lineItemsByRo[ro.roId] || [];
      const revenue = items.reduce((sum, i) => sum + parseFloat(i.totalCash || "0"), 0);
      const cost = items.reduce((sum, i) => sum + parseFloat(i.costPrice || "0"), 0);
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      totalRevenue += revenue;
      totalCost += cost;

      return {
        roId: ro.roId,
        roNumber: ro.roNumber,
        customerName: `${ro.customerFirstName} ${ro.customerLastName}`,
        vehicleInfo: `${ro.vehicleYear || ""} ${ro.vehicleMake || ""} ${ro.vehicleModel || ""}`.trim(),
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        date: ro.createdAt,
      };
    });

    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      details,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgMargin: Math.round(avgMargin * 100) / 100,
      },
    });
  } catch (err: any) {
    console.error("Job profitability report error:", err);
    res.status(500).json({ error: "Failed to generate job profitability report" });
  }
});

router.get("/reports/sales-tax", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const ros = await db
      .select({
        roNumber: autoRepairOrders.roNumber,
        createdAt: autoRepairOrders.createdAt,
        taxPartsAmount: autoRepairOrders.taxPartsAmount,
        taxLaborAmount: autoRepairOrders.taxLaborAmount,
        subtotalCash: autoRepairOrders.subtotalCash,
        totalCash: autoRepairOrders.totalCash,
      })
      .from(autoRepairOrders)
      .where(
        and(
          eq(autoRepairOrders.shopId, shopId),
          gte(autoRepairOrders.createdAt, startDate),
          lte(autoRepairOrders.createdAt, endDate),
          or(
            eq(autoRepairOrders.status, "invoiced"),
            eq(autoRepairOrders.status, "paid")
          )
        )
      )
      .orderBy(desc(autoRepairOrders.createdAt));

    let totalPartsTax = 0;
    let totalLaborTax = 0;

    const details = ros.map((ro) => {
      const partsTax = parseFloat(ro.taxPartsAmount || "0");
      const laborTax = parseFloat(ro.taxLaborAmount || "0");
      const roTotalTax = partsTax + laborTax;
      totalPartsTax += partsTax;
      totalLaborTax += laborTax;

      return {
        roNumber: ro.roNumber,
        date: ro.createdAt,
        subtotal: parseFloat(ro.subtotalCash || "0"),
        partsTax: Math.round(partsTax * 100) / 100,
        laborTax: Math.round(laborTax * 100) / 100,
        totalTax: Math.round(roTotalTax * 100) / 100,
        total: parseFloat(ro.totalCash || "0"),
      };
    });

    res.json({
      totalPartsTax: Math.round(totalPartsTax * 100) / 100,
      totalLaborTax: Math.round(totalLaborTax * 100) / 100,
      totalTax: Math.round((totalPartsTax + totalLaborTax) * 100) / 100,
      roCount: ros.length,
      details,
    });
  } catch (err: any) {
    console.error("Sales tax report error:", err);
    res.status(500).json({ error: "Failed to generate sales tax report" });
  }
});

router.get("/reports/tech-productivity", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const laborItems = await db
      .select({
        technicianId: autoRepairOrders.technicianId,
        repairOrderId: autoLineItems.repairOrderId,
        laborHours: autoLineItems.laborHours,
        totalCash: autoLineItems.totalCash,
        techFirstName: autoUsers.firstName,
        techLastName: autoUsers.lastName,
      })
      .from(autoLineItems)
      .innerJoin(autoRepairOrders, eq(autoLineItems.repairOrderId, autoRepairOrders.id))
      .leftJoin(autoUsers, eq(autoRepairOrders.technicianId, autoUsers.id))
      .where(
        and(
          eq(autoRepairOrders.shopId, shopId),
          gte(autoRepairOrders.createdAt, startDate),
          lte(autoRepairOrders.createdAt, endDate),
          eq(autoLineItems.type, "labor"),
          isNotNull(autoRepairOrders.technicianId)
        )
      );

    const techMap: Record<number, {
      id: number;
      name: string;
      totalHours: number;
      totalRevenue: number;
      roSet: Set<number>;
    }> = {};

    for (const item of laborItems) {
      const techId = item.technicianId!;
      if (!techMap[techId]) {
        techMap[techId] = {
          id: techId,
          name: `${item.techFirstName || "Unknown"} ${item.techLastName || ""}`.trim(),
          totalHours: 0,
          totalRevenue: 0,
          roSet: new Set(),
        };
      }
      techMap[techId].totalHours += parseFloat(item.laborHours || "0");
      techMap[techId].totalRevenue += parseFloat(item.totalCash || "0");
      techMap[techId].roSet.add(item.repairOrderId);
    }

    const technicians = Object.values(techMap).map((t) => ({
      id: t.id,
      name: t.name,
      totalHours: Math.round(t.totalHours * 100) / 100,
      totalRevenue: Math.round(t.totalRevenue * 100) / 100,
      roCount: t.roSet.size,
      effectiveRate: t.totalHours > 0
        ? Math.round((t.totalRevenue / t.totalHours) * 100) / 100
        : 0,
    }));

    res.json({ technicians });
  } catch (err: any) {
    console.error("Tech productivity report error:", err);
    res.status(500).json({ error: "Failed to generate tech productivity report" });
  }
});

router.get("/reports/approval-conversion", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const ros = await db
      .select({
        id: autoRepairOrders.id,
        status: autoRepairOrders.status,
        approvedAt: autoRepairOrders.approvedAt,
        approvalDeclinedAt: autoRepairOrders.approvalDeclinedAt,
        createdAt: autoRepairOrders.createdAt,
      })
      .from(autoRepairOrders)
      .where(
        and(
          eq(autoRepairOrders.shopId, shopId),
          gte(autoRepairOrders.createdAt, startDate),
          lte(autoRepairOrders.createdAt, endDate)
        )
      );

    const totalEstimates = ros.length;
    let approved = 0;
    let declined = 0;
    let pending = 0;
    let totalApprovalTimeHours = 0;
    let approvalCount = 0;

    for (const ro of ros) {
      if (ro.approvedAt) {
        approved++;
        if (ro.createdAt) {
          const diffMs = new Date(ro.approvedAt).getTime() - new Date(ro.createdAt).getTime();
          totalApprovalTimeHours += diffMs / (1000 * 60 * 60);
          approvalCount++;
        }
      } else if (ro.approvalDeclinedAt) {
        declined++;
      } else if (ro.status === "estimate") {
        pending++;
      }
    }

    const conversionRate = totalEstimates > 0
      ? Math.round((approved / totalEstimates) * 10000) / 100
      : 0;
    const avgApprovalTimeHours = approvalCount > 0
      ? Math.round((totalApprovalTimeHours / approvalCount) * 100) / 100
      : 0;

    res.json({
      totalEstimates,
      approved,
      declined,
      pending,
      conversionRate,
      avgApprovalTimeHours,
    });
  } catch (err: any) {
    console.error("Approval conversion report error:", err);
    res.status(500).json({ error: "Failed to generate approval conversion report" });
  }
});

// ============================================================================
// MOUNT
// ============================================================================

// ============================================================================
// COMMUNICATION LOG ROUTES
// ============================================================================

router.post("/communication/log", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = req.autoUser!;
    const { customerId, repairOrderId, channel, templateUsed, recipientPhone, recipientEmail, subject, bodyPreview, invoiceUrl } = req.body;

    if (!customerId || !channel) {
      return res.status(400).json({ error: "customerId and channel are required" });
    }

    const [entry] = await db.insert(autoCommunicationLog).values({
      shopId: user.shopId,
      customerId: parseInt(customerId),
      repairOrderId: repairOrderId ? parseInt(repairOrderId) : null,
      channel,
      direction: "outbound",
      templateUsed: templateUsed || null,
      recipientPhone: recipientPhone || null,
      recipientEmail: recipientEmail || null,
      subject: subject || null,
      bodyPreview: bodyPreview ? bodyPreview.substring(0, 200) : null,
      invoiceUrl: invoiceUrl || null,
      initiatedBy: user.id,
    }).returning();

    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/communication/customer/:customerId", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = req.autoUser!;
    const customerId = parseInt(req.params.customerId);

    const logs = await db.select({
      id: autoCommunicationLog.id,
      channel: autoCommunicationLog.channel,
      direction: autoCommunicationLog.direction,
      templateUsed: autoCommunicationLog.templateUsed,
      recipientPhone: autoCommunicationLog.recipientPhone,
      recipientEmail: autoCommunicationLog.recipientEmail,
      subject: autoCommunicationLog.subject,
      bodyPreview: autoCommunicationLog.bodyPreview,
      createdAt: autoCommunicationLog.createdAt,
      userName: sql<string>`concat(${autoUsers.firstName}, ' ', ${autoUsers.lastName})`,
    })
    .from(autoCommunicationLog)
    .leftJoin(autoUsers, eq(autoCommunicationLog.initiatedBy, autoUsers.id))
    .where(and(
      eq(autoCommunicationLog.shopId, user.shopId),
      eq(autoCommunicationLog.customerId, customerId),
    ))
    .orderBy(desc(autoCommunicationLog.createdAt))
    .limit(50);

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/email/invoice", autoAuth, async (req: Request, res: Response) => {
  try {
    const { roId, type, paymentMethod, cardBrand, cardLast4, authCode, tipAmount, totalCharged, paidAt } = req.body;
    if (!roId) return res.status(400).json({ error: "roId is required" });

    const roResults = await db.select().from(autoRepairOrders).where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    const ro = roResults[0];
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    const customerResults = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
    const customer = customerResults[0];
    if (!customer?.email) return res.status(400).json({ error: "Customer has no email address" });

    const vehicleResults = ro.vehicleId
      ? await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId))
      : [];
    const vehicle = vehicleResults[0] || null;

    const lineItems = await db.select().from(autoLineItems).where(eq(autoLineItems.repairOrderId, roId));
    const shopResults = await db.select().from(autoShops).where(eq(autoShops.id, req.autoUser!.shopId));
    const shop = shopResults[0];
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const result = await sendAutoInvoiceEmail({
      shop: {
        name: shop.name,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        zip: shop.zip,
        phone: shop.phone,
        email: shop.email,
        cardFeePercent: shop.cardFeePercent || "0",
      },
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
      },
      vehicle: vehicle ? {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
      } : null,
      ro: {
        roNumber: ro.roNumber,
        mileageIn: ro.mileageIn,
        subtotalCash: ro.subtotalCash || "0",
        subtotalCard: ro.subtotalCard || "0",
        taxAmount: ro.taxAmount || "0",
        totalCash: ro.totalCash || "0",
        totalCard: ro.totalCard || "0",
        feeAmount: ro.feeAmount || "0",
        shopSupplyAmountCash: ro.shopSupplyAmountCash || "0",
        shopSupplyAmountCard: ro.shopSupplyAmountCard || "0",
        discountAmountCash: ro.discountAmountCash || "0",
        discountAmountCard: ro.discountAmountCard || "0",
      },
      lineItems: lineItems.map((li) => ({
        description: li.description,
        type: li.type,
        quantity: li.quantity || "1",
        unitPriceCash: li.unitPriceCash,
        unitPriceCard: li.unitPriceCard,
        totalCash: li.totalCash,
        totalCard: li.totalCard,
      })),
      isPaid: type === "receipt",
      paymentMethod,
      cardBrand,
      cardLast4,
      authCode,
      tipAmount,
      totalCharged,
      paidAt,
    });

    res.json(result);
  } catch (err: any) {
    console.error("Auto email error:", err);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

export function registerAutoRoutes(app: Express) {
  app.use("/api/auto", router);

  // Ensure demo shop, account, and sample data exist on startup
  (async () => {
    try {
      const { seedDemoData } = await import("./auto-seed-demo");
      const freshHash = await hashPassword("password123");

      // Check if demo shop exists
      const existingShop = await db.select().from(autoShops).where(eq(autoShops.slug, "demo-auto")).limit(1);
      let shopId: number;

      if (existingShop.length) {
        shopId = existingShop[0].id;
        console.log("[AutoInit] Demo shop exists (id:", shopId, ")");
      } else {
        const [shop] = await db.insert(autoShops).values({
          name: "Demo Auto Shop",
          slug: "demo-auto",
          address: "123 Main St",
          city: "Dallas",
          state: "TX",
          zip: "75001",
          phone: "(214) 555-1234",
          timezone: "America/New_York",
        }).returning();
        shopId = shop.id;
        console.log("[AutoInit] Created demo shop (id:", shopId, ")");

        await db.insert(autoBays).values([
          { shopId, name: "Bay 1", sortOrder: 1 },
          { shopId, name: "Bay 2", sortOrder: 2 },
          { shopId, name: "Bay 3", sortOrder: 3 },
        ]);
        console.log("[AutoInit] Created default bays");
      }

      // Check if demo user exists
      let ownerId: number;
      const existingUser = await db.select().from(autoUsers).where(eq(autoUsers.email, "owner@demo.com")).limit(1);
      if (existingUser.length) {
        ownerId = existingUser[0].id;
        await db.update(autoUsers).set({ passwordHash: freshHash }).where(eq(autoUsers.id, ownerId));
        console.log("[AutoInit] Demo user password refreshed");
      } else {
        const [newUser] = await db.insert(autoUsers).values({
          shopId,
          email: "owner@demo.com",
          passwordHash: freshHash,
          firstName: "John",
          lastName: "Smith",
          role: "owner",
          isActive: true,
        }).returning();
        ownerId = newUser.id;
        console.log("[AutoInit] Created demo user owner@demo.com");
      }

      // Seed sample data for demo
      await seedDemoData(shopId, ownerId);
    } catch (err) {
      console.error("[AutoInit] Failed to seed demo data:", err);
    }
  })();
}
