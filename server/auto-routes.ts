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
import Anthropic from "@anthropic-ai/sdk";

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

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "dummy",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const assistantSessions = new Map<string, { messages: Array<{role: string; content: string}>, lastAccess: number }>();
const MAX_HISTORY = 20;
const SESSION_TTL = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of Array.from(assistantSessions)) {
    if (now - session.lastAccess > SESSION_TTL) assistantSessions.delete(id);
  }
}, 60 * 60 * 1000);

const ASSISTANT_SYSTEM_PROMPT = `You are the PCB Auto Assistant — a helpful, knowledgeable guide built into the PCB Auto shop management platform. You help auto repair shop owners, service advisors, and technicians use every feature of the platform.

YOUR PERSONALITY:
- Talk like a knowledgeable coworker, not a customer support bot
- Be direct and concise — shop people are busy
- Use plain English, no jargon unless it's industry terms they already know
- When walking someone through steps, number them clearly
- If they're on a specific page, reference what they can see right now
- Never say "I'm just an AI" — you're the PCB Auto Assistant
- If asked something outside your knowledge, say "That's outside what I can help with — but I can show you how to run your reports so you can share them with your accountant."

RESPONSE GUIDELINES:
- Keep responses under 150 words unless walking through a multi-step process
- Use bold for button names and page names: **New RO**, **Settings**
- Use numbered lists for step-by-step instructions
- After answering, offer one relevant follow-up
- If the user seems frustrated, acknowledge it briefly
- Never overwhelm with all features at once

PCB AUTO FEATURE KNOWLEDGE:

DASHBOARD: Shows today's car count, revenue, pending approvals, pending payments, fees saved (dual pricing savings), cash vs card breakdown, upcoming appointments, and ROs needing attention.

REPAIR ORDERS (ROs): The core of everything. Tracks a single visit for a single vehicle. Create by tapping New RO, selecting customer/vehicle, adding labor and parts lines. RO statuses flow: Estimate → Approved → In Progress → Completed → Invoiced → Paid. The RO detail page shows header info, estimate builder with line items, running totals with dual pricing, and action buttons.

DUAL PRICING: Two prices are always displayed side by side — Cash Price and Card Price. This is NOT surcharging. Customers simply choose which price to pay. The difference between cash and card price is the dual pricing rate, configurable in Settings (typically 3-4%). The customer never sees the word "fee" or "surcharge" — they just see two prices and pick one. Either way the shop nets the same amount.

ESTIMATES & APPROVALS: After building an estimate, send it for approval via text/email. Customer sees dual pricing, can approve/decline individual line items, and the RO auto-updates.

DIGITAL VEHICLE INSPECTIONS (DVI): Multi-point inspection on tablet. Each item marked Good (green), Watch (yellow), or Bad (red). Can add notes and photos. Generates customer-facing report. Bad items can convert to RO service lines.

SCHEDULING: Calendar view with bay rows. Create appointments with customer, vehicle, date, time, bay. Appointments auto-create RO on check-in.

CUSTOMERS: Search by name/phone/email/vehicle. Customer detail shows contact info, vehicles, full service history, communication log.

PAYMENTS: Open completed RO, tap Take Payment, choose Cash or Card. System shows correct amount. Can add tip. Print or email receipt.

COMMUNICATION: Text/email/call customers from any RO or customer profile. Pre-filled templates for estimates, invoices, vehicle ready.

REPORTS: Daily/weekly/monthly revenue, car count, average RO value, tech productivity, cash vs card breakdown, approval conversion rates.

SETTINGS: Shop profile, employees, bays, dual pricing rate, tax rates, labor rates, parts markup.

GUIDED WORKFLOWS: When asked "how do I...", respond with numbered steps referencing what's on their current screen.

HANDLING UNKNOWNS:
- Car repair questions: "I'm here to help you use PCB Auto — for technical repair questions, check with your team."
- Accounting/legal: "I'd recommend checking with your accountant — but I can show you how to pull the report you'd need."
- Features not built: "That feature is coming soon. Here's how you can handle it for now."
- Bugs: "That doesn't sound right. Try refreshing. If it persists, reach out to support."

NAVIGATION LINKS:
You can embed tappable navigation links in your responses that take the user directly to specific sections of the app. Use the format [[nav:key]] where key is from this list:

- [[nav:revenue]] -> "Revenue" (/auto/dashboard)
- [[nav:open-ros]] -> "Open ROs" (/auto/dashboard)
- [[nav:total-customers]] -> "Total Customers" (/auto/dashboard)
- [[nav:appointments]] -> "Today's Appointments" (/auto/dashboard)
- [[nav:fees-saved]] -> "Fees Saved" (/auto/dashboard)
- [[nav:work-orders]] -> "Work Orders" (/auto/repair-orders)
- [[nav:estimates]] -> "Estimates" (/auto/repair-orders)
- [[nav:customers]] -> "Customers" (/auto/customers)
- [[nav:vehicles]] -> "Vehicles" (/auto/customers)
- [[nav:schedule]] -> "Schedule" (/auto/schedule)
- [[nav:inspections]] -> "Inspections (DVI)" (/auto/inspections)
- [[nav:invoices]] -> "Invoices" (/auto/repair-orders)
- [[nav:parts]] -> "Parts" (/auto/repair-orders)
- [[nav:reports]] -> "Reports" (/auto/reports)
- [[nav:report-cash-card]] -> "Cash vs Card Report" (/auto/reports)
- [[nav:report-revenue]] -> "Revenue Report" (/auto/reports)
- [[nav:report-tech]] -> "Tech Productivity" (/auto/reports)
- [[nav:report-customers]] -> "Customer Report" (/auto/reports)
- [[nav:settings]] -> "Settings" (/auto/settings)
- [[nav:settings-dual-pricing]] -> "Dual Pricing Settings" (/auto/settings)
- [[nav:settings-staff]] -> "Staff Management" (/auto/staff)
- [[nav:settings-quickbooks]] -> "QuickBooks" (/auto/quickbooks)
- [[nav:new-ro]] -> "New Work Order" (/auto/repair-orders/new)
- [[nav:payment-processor]] -> "Payment Processor" (/auto/processor)

RULES FOR NAVIGATION LINKS:
1. When explaining a feature, ALWAYS include a nav link so the user can jump there
2. Use them naturally in sentences like: "You can see this on your [[nav:fees-saved]] card"
3. Include multiple links when discussing related features
4. For "where is X" questions, lead with the nav link
5. For "what is X" questions, explain first, then provide the nav link
6. When giving a shop overview, link every metric you mention

The user will see these rendered as tappable blue pills with an arrow icon. When tapped, the app navigates to that section and highlights it.`;

function buildAssistantContextBlock(context: any): string {
  if (!context) return '';
  let block = '\n## CURRENT USER CONTEXT\n';
  block += `- User: ${context.userName || 'Unknown'} (${context.userRole || 'unknown'})\n`;
  block += `- Shop: ${context.shopName || 'Unknown'}\n`;
  block += `- Currently viewing: ${context.currentPage} (${context.currentUrl})\n`;
  if (context.roNumber) block += `- Looking at RO #${context.roNumber} (status: ${context.roStatus})\n`;
  if (context.customerName) block += `- Customer: ${context.customerName}\n`;
  if (context.vehicleInfo) block += `- Vehicle: ${context.vehicleInfo}\n`;
  block += '\n## SHOP CONFIGURATION\n';
  block += `- Dual pricing: ${context.dualPricingEnabled ? `enabled at ${context.dualPricingRate}%` : 'disabled'}\n`;
  block += `- Staff configured: ${context.hasEmployees ? 'yes' : 'no'}\n`;
  block += `- Bays configured: ${context.hasBays ? 'yes' : 'no'}\n`;
  return block;
}

function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = query[0];
    const valid = await comparePasswords(password, user.passwordHash);
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

router.post("/admin/shops", autoAuth, async (req: Request, res: Response) => {
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

router.get("/admin/shops", autoAuth, async (_req: Request, res: Response) => {
  try {
    const shops = await db.select().from(autoShops).orderBy(desc(autoShops.createdAt));
    res.json(shops);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch shops" });
  }
});

router.get("/admin/shops/:id", autoAuth, async (req: Request, res: Response) => {
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
    const { status, search, from, to, sort = "date", order = "desc", page = "1", limit = "25" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [eq(autoRepairOrders.shopId, req.autoUser!.shopId)];
    if (status) conditions.push(eq(autoRepairOrders.status, status as string));

    if (search) {
      const searchTerm = `%${search}%`;

      const matchingCustomers = await db.select({ id: autoCustomers.id })
        .from(autoCustomers)
        .where(and(
          eq(autoCustomers.shopId, req.autoUser!.shopId),
          or(
            sql`${autoCustomers.firstName} ILIKE ${searchTerm}`,
            sql`${autoCustomers.lastName} ILIKE ${searchTerm}`,
            sql`${autoCustomers.phone} ILIKE ${searchTerm}`,
            sql`${autoCustomers.email} ILIKE ${searchTerm}`,
            sql`CONCAT(${autoCustomers.firstName}, ' ', ${autoCustomers.lastName}) ILIKE ${searchTerm}`,
          )
        ));

      const matchingVehicles = await db.select({ id: autoVehicles.id })
        .from(autoVehicles)
        .where(and(
          eq(autoVehicles.shopId, req.autoUser!.shopId),
          or(
            sql`${autoVehicles.vin} ILIKE ${searchTerm}`,
            sql`CONCAT(${autoVehicles.year}::text, ' ', ${autoVehicles.make}, ' ', ${autoVehicles.model}) ILIKE ${searchTerm}`,
            sql`${autoVehicles.make} ILIKE ${searchTerm}`,
            sql`${autoVehicles.model} ILIKE ${searchTerm}`,
          )
        ));

      const customerIds = matchingCustomers.map(c => c.id);
      const vehicleIds = matchingVehicles.map(v => v.id);

      const searchConditions: any[] = [];
      searchConditions.push(sql`${autoRepairOrders.roNumber} ILIKE ${searchTerm}`);
      if (customerIds.length > 0) searchConditions.push(inArray(autoRepairOrders.customerId, customerIds));
      if (vehicleIds.length > 0) searchConditions.push(inArray(autoRepairOrders.vehicleId, vehicleIds));

      conditions.push(or(...searchConditions)!);
    }

    if (from) conditions.push(gte(autoRepairOrders.createdAt, new Date(from as string)));
    if (to) {
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(autoRepairOrders.createdAt, toDate));
    }

    let orderClause;
    const isAsc = order === "asc";
    switch(sort) {
      case "customer":
      case "ro_number": orderClause = isAsc ? asc(autoRepairOrders.roNumber) : desc(autoRepairOrders.roNumber); break;
      case "total": orderClause = isAsc ? asc(autoRepairOrders.totalCash) : desc(autoRepairOrders.totalCash); break;
      case "status": orderClause = isAsc ? asc(autoRepairOrders.status) : desc(autoRepairOrders.status); break;
      default: orderClause = isAsc ? asc(autoRepairOrders.createdAt) : desc(autoRepairOrders.createdAt);
    }

    const statsResult = await db.select({
      totalRos: count(),
      totalBilled: sql<string>`COALESCE(SUM(CAST(${autoRepairOrders.totalCash} AS numeric)), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(CAST(${autoRepairOrders.paidAmount} AS numeric)), 0)`,
      outstanding: sql<string>`COALESCE(SUM(CAST(${autoRepairOrders.balanceDue} AS numeric)), 0)`,
    }).from(autoRepairOrders).where(and(...conditions));

    const stats = {
      totalRos: statsResult[0]?.totalRos || 0,
      totalBilled: parseFloat(statsResult[0]?.totalBilled || "0"),
      totalPaid: parseFloat(statsResult[0]?.totalPaid || "0"),
      outstanding: parseFloat(statsResult[0]?.outstanding || "0"),
      avgTicket: statsResult[0]?.totalRos > 0 ? parseFloat(statsResult[0]?.totalBilled || "0") / statsResult[0].totalRos : 0,
    };

    const ros = await db.select().from(autoRepairOrders)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(limitNum).offset(offset);

    const enriched = await Promise.all(ros.map(async (ro) => {
      const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId)).limit(1);
      const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId)).limit(1);
      return { ...ro, customer, vehicle };
    }));

    const [totalResult] = await db.select({ count: count() }).from(autoRepairOrders).where(and(...conditions));
    res.json({ repairOrders: enriched, total: totalResult.count, page: pageNum, limit: limitNum, stats });
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
    const ratePct = parseFloat(shop.shopSupplyRatePct || "0") / 100;
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

router.get("/dashboard/dual-pricing", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = req.autoUser!;
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, user.shopId));
    if (!shop) return res.json({ totalCollected: 0, cashTotal: 0, cardTotal: 0, cashCount: 0, cardCount: 0, dpEarned: 0, totalPayments: 0 });

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const payments = await db.select({
      method: autoPayments.method,
      amount: autoPayments.amount,
      tipAmount: autoPayments.tipAmount,
      totalCash: autoRepairOrders.totalCash,
      totalCard: autoRepairOrders.totalCard,
    })
    .from(autoPayments)
    .innerJoin(autoRepairOrders, eq(autoPayments.repairOrderId, autoRepairOrders.id))
    .where(and(
      eq(autoPayments.shopId, shop.id),
      gte(autoPayments.processedAt, dayStart),
      lte(autoPayments.processedAt, dayEnd)
    ));

    let cashTotal = 0, cardTotal = 0, cashCount = 0, cardCount = 0, dpEarned = 0, totalCollected = 0;
    for (const p of payments) {
      const amt = parseFloat(p.amount || "0");
      const tip = parseFloat(p.tipAmount || "0");
      totalCollected += amt + tip;
      if (p.method === 'cash') {
        cashTotal += amt + tip;
        cashCount++;
      } else {
        cardTotal += amt + tip;
        cardCount++;
        const cashPrice = parseFloat(p.totalCash || "0");
        const cardPrice = parseFloat(p.totalCard || "0");
        dpEarned += (cardPrice - cashPrice);
      }
    }

    res.json({ totalCollected, cashTotal, cardTotal, cashCount, cardCount, dpEarned, totalPayments: payments.length });
  } catch (err) {
    console.error("Dashboard dual pricing error:", err);
    res.json({ totalCollected: 0, cashTotal: 0, cardTotal: 0, cashCount: 0, cardCount: 0, dpEarned: 0, totalPayments: 0 });
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
    const { lineItems, customerNote, signatureData, customerName } = req.body;
    if (!Array.isArray(lineItems) || !lineItems.length) {
      return res.status(400).json({ error: "lineItems array is required" });
    }
    for (const li of lineItems) {
      if (typeof li.id !== "number" || typeof li.approved !== "boolean") {
        return res.status(400).json({ error: "Each lineItem must have a numeric id and boolean approved" });
      }
    }
    if (customerNote !== undefined && typeof customerNote !== "string") {
      return res.status(400).json({ error: "customerNote must be a string" });
    }
    if (signatureData !== undefined && typeof signatureData !== "string") {
      return res.status(400).json({ error: "signatureData must be a string" });
    }
    if (customerName !== undefined && typeof customerName !== "string") {
      return res.status(400).json({ error: "customerName must be a string" });
    }

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
        if (existing.approvalStatus === "approved") hasApproved = true;
        if (existing.approvalStatus === "declined") hasDeclined = true;
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

    const roUpdate: any = {
      status: newStatus,
      approvedAt: hasApproved ? new Date() : ro.approvedAt,
      updatedAt: new Date(),
    };
    if (customerNote) roUpdate.approvalCustomerNote = customerNote;
    if (signatureData) roUpdate.approvalSignatureData = signatureData;
    if (customerName) roUpdate.approvedBy = customerName;

    await db.update(autoRepairOrders).set(roUpdate).where(eq(autoRepairOrders.id, ro.id));

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

router.get("/reports/dual-pricing", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
    if (!shop.length) return res.status(404).json({ error: "Shop not found" });

    const payments = await db.select({
      paymentId: autoPayments.id,
      roId: autoRepairOrders.id,
      roNumber: autoRepairOrders.roNumber,
      customerFirstName: autoCustomers.firstName,
      customerLastName: autoCustomers.lastName,
      vehicleYear: autoVehicles.year,
      vehicleMake: autoVehicles.make,
      vehicleModel: autoVehicles.model,
      method: autoPayments.method,
      amount: autoPayments.amount,
      tipAmount: autoPayments.tipAmount,
      cardBrand: autoPayments.cardBrand,
      cardLast4: autoPayments.cardLast4,
      authCode: autoPayments.authCode,
      processedAt: autoPayments.processedAt,
      totalCash: autoRepairOrders.totalCash,
      totalCard: autoRepairOrders.totalCard,
      feeAmount: autoRepairOrders.feeAmount,
    })
    .from(autoPayments)
    .innerJoin(autoRepairOrders, eq(autoPayments.repairOrderId, autoRepairOrders.id))
    .innerJoin(autoCustomers, eq(autoRepairOrders.customerId, autoCustomers.id))
    .innerJoin(autoVehicles, eq(autoRepairOrders.vehicleId, autoVehicles.id))
    .where(and(
      eq(autoPayments.shopId, shopId),
      gte(autoPayments.processedAt, new Date(startDate)),
      lte(autoPayments.processedAt, new Date(endDate + 'T23:59:59'))
    ));

    const transactions = payments.map(p => {
      const cashPrice = parseFloat(p.totalCash || "0");
      const cardPrice = parseFloat(p.totalCard || "0");
      const amountPaid = parseFloat(p.amount || "0");
      const tip = parseFloat(p.tipAmount || "0");
      const dpAmount = p.method === 'card' ? (cardPrice - cashPrice) : 0;
      return {
        date: p.processedAt,
        roNumber: p.roNumber,
        customerName: `${p.customerFirstName} ${p.customerLastName}`,
        vehicle: `${p.vehicleYear || ''} ${p.vehicleMake || ''} ${p.vehicleModel || ''}`.trim(),
        method: p.method,
        cashPrice,
        cardPrice,
        amountPaid,
        tip,
        totalCollected: amountPaid + tip,
        dpAmount,
        cardBrand: p.cardBrand || null,
        cardLast4: p.cardLast4 || null,
        authCode: p.authCode || null,
      };
    });

    const cashTx = transactions.filter(t => t.method === 'cash');
    const cardTx = transactions.filter(t => t.method === 'card');
    const totalCashBasis = transactions.reduce((s, t) => s + t.cashPrice, 0);
    const totalDPCollected = cardTx.reduce((s, t) => s + t.dpAmount, 0);
    const totalCollected = transactions.reduce((s, t) => s + t.totalCollected, 0);

    const summary = {
      totalTransactions: transactions.length,
      cashTransactions: cashTx.length,
      cardTransactions: cardTx.length,
      cashPercent: transactions.length > 0 ? Math.round((cashTx.length / transactions.length) * 100) : 0,
      cardPercent: transactions.length > 0 ? Math.round((cardTx.length / transactions.length) * 100) : 0,
      totalRevenueCashBasis: totalCashBasis,
      totalDualPricingCollected: totalDPCollected,
      totalCollected,
      avgTransactionCash: cashTx.length > 0 ? cashTx.reduce((s, t) => s + t.amountPaid, 0) / cashTx.length : 0,
      avgTransactionCard: cardTx.length > 0 ? cardTx.reduce((s, t) => s + t.amountPaid, 0) / cardTx.length : 0,
      dualPricingRate: parseFloat(shop[0].cardFeePercent || "0") * 100,
    };

    res.json({ summary, transactions });
  } catch (err: any) {
    console.error("Dual pricing report error:", err);
    res.status(500).json({ error: "Failed to generate dual pricing report" });
  }
});

router.get("/reports/dual-pricing/export", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const [shop] = await db.select().from(autoShops).where(eq(autoShops.id, shopId));
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    if (!startDate || !endDate) return res.status(400).json({ error: "startDate and endDate required" });

    const payments = await db.select({
      method: autoPayments.method,
      amount: autoPayments.amount,
      tipAmount: autoPayments.tipAmount,
      cardBrand: autoPayments.cardBrand,
      cardLast4: autoPayments.cardLast4,
      authCode: autoPayments.authCode,
      processedAt: autoPayments.processedAt,
      roNumber: autoRepairOrders.roNumber,
      totalCash: autoRepairOrders.totalCash,
      totalCard: autoRepairOrders.totalCard,
      customerFirstName: autoCustomers.firstName,
      customerLastName: autoCustomers.lastName,
      vehicleYear: autoVehicles.year,
      vehicleMake: autoVehicles.make,
      vehicleModel: autoVehicles.model,
    })
    .from(autoPayments)
    .innerJoin(autoRepairOrders, eq(autoPayments.repairOrderId, autoRepairOrders.id))
    .innerJoin(autoCustomers, eq(autoRepairOrders.customerId, autoCustomers.id))
    .innerJoin(autoVehicles, eq(autoRepairOrders.vehicleId, autoVehicles.id))
    .where(and(
      eq(autoPayments.shopId, shop.id),
      gte(autoPayments.processedAt, new Date(startDate)),
      lte(autoPayments.processedAt, new Date(endDate + "T23:59:59"))
    ));

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PCB Auto";
    workbook.created = new Date();

    const txSheet = workbook.addWorksheet("Transactions");
    txSheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "RO #", key: "roNumber", width: 10 },
      { header: "Customer", key: "customer", width: 22 },
      { header: "Vehicle", key: "vehicle", width: 26 },
      { header: "Method", key: "method", width: 12 },
      { header: "Cash Price", key: "cashPrice", width: 14, style: { numFmt: "$#,##0.00" } },
      { header: "Card Price", key: "cardPrice", width: 14, style: { numFmt: "$#,##0.00" } },
      { header: "Amount Paid", key: "amountPaid", width: 14, style: { numFmt: "$#,##0.00" } },
      { header: "Tip", key: "tip", width: 10, style: { numFmt: "$#,##0.00" } },
      { header: "Total Collected", key: "totalCollected", width: 16, style: { numFmt: "$#,##0.00" } },
      { header: "Dual Pricing Amt", key: "dpAmount", width: 18, style: { numFmt: "$#,##0.00" } },
      { header: "Card Brand", key: "cardBrand", width: 12 },
      { header: "Last 4", key: "cardLast4", width: 8 },
      { header: "Auth Code", key: "authCode", width: 12 },
    ];

    const headerRow = txSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 28;

    payments.forEach((p, i) => {
      const cashPrice = parseFloat(p.totalCash || "0");
      const cardPrice = parseFloat(p.totalCard || "0");
      const amountPaid = parseFloat(p.amount || "0");
      const tip = parseFloat(p.tipAmount || "0");
      const dpAmount = p.method === "card" ? (cardPrice - cashPrice) : 0;

      const row = txSheet.addRow({
        date: p.processedAt ? new Date(p.processedAt) : new Date(),
        roNumber: p.roNumber,
        customer: `${p.customerFirstName} ${p.customerLastName}`,
        vehicle: `${p.vehicleYear || ""} ${p.vehicleMake || ""} ${p.vehicleModel || ""}`.trim(),
        method: p.method === "card" ? "Card" : "Cash",
        cashPrice,
        cardPrice,
        amountPaid,
        tip,
        totalCollected: amountPaid + tip,
        dpAmount,
        cardBrand: p.cardBrand || "—",
        cardLast4: p.cardLast4 || "—",
        authCode: p.authCode || "—",
      });

      if (i % 2 === 1) {
        row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
      row.getCell("date").numFmt = "m/d/yyyy";
    });

    txSheet.views = [{ state: "frozen", ySplit: 1 }];
    txSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: payments.length + 1, column: 14 },
    };

    const sumSheet = workbook.addWorksheet("Summary");
    sumSheet.columns = [
      { header: "Metric", key: "metric", width: 32 },
      { header: "Value", key: "value", width: 22 },
    ];

    const sumHeader = sumSheet.getRow(1);
    sumHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    sumHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    sumHeader.height = 28;

    const cashTx = payments.filter(p => p.method === "cash");
    const cardTx = payments.filter(p => p.method === "card");
    const totalCashBasis = payments.reduce((s, p) => s + parseFloat(p.totalCash || "0"), 0);
    const totalDPCollected = cardTx.reduce((s, p) => s + (parseFloat(p.totalCard || "0") - parseFloat(p.totalCash || "0")), 0);
    const avgCash = cashTx.length > 0 ? cashTx.reduce((s, p) => s + parseFloat(p.amount || "0"), 0) / cashTx.length : 0;
    const avgCard = cardTx.length > 0 ? cardTx.reduce((s, p) => s + parseFloat(p.amount || "0"), 0) / cardTx.length : 0;

    const summaryData = [
      { metric: "Report Period", value: `${startDate} to ${endDate}` },
      { metric: "Total Transactions", value: payments.length.toString() },
      { metric: "Cash Transactions", value: cashTx.length.toString() },
      { metric: "Card Transactions", value: cardTx.length.toString() },
      { metric: "Cash Percentage", value: payments.length > 0 ? `${Math.round((cashTx.length / payments.length) * 100)}%` : "0%" },
      { metric: "Card Percentage", value: payments.length > 0 ? `${Math.round((cardTx.length / payments.length) * 100)}%` : "0%" },
      { metric: "Total Revenue (Cash Basis)", value: `$${totalCashBasis.toFixed(2)}` },
      { metric: "Total Dual Pricing Collected", value: `$${totalDPCollected.toFixed(2)}` },
      { metric: "Average Transaction (Cash)", value: `$${avgCash.toFixed(2)}` },
      { metric: "Average Transaction (Card)", value: `$${avgCard.toFixed(2)}` },
      { metric: "Dual Pricing Rate", value: `${(parseFloat(shop.cardFeePercent || "0") * 100).toFixed(2)}%` },
    ];

    summaryData.forEach((row, i) => {
      const r = sumSheet.addRow(row);
      r.getCell("metric").font = { bold: true };
      if (i % 2 === 1) {
        r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
    });

    const filename = `PCB_Auto_Transactions_${startDate}_to_${endDate}.xlsx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Dual pricing export error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

router.post("/reports/export", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = req.autoUser!;
    const { reportType, reportData, startDate, endDate } = req.body;

    if (!reportType || !reportData || !startDate || !endDate) {
      return res.status(400).json({ error: "reportType, reportData, startDate, and endDate are required" });
    }

    if (reportType === "dual-pricing") {
      return res.status(400).json({ error: "Use the dedicated dual-pricing export endpoint" });
    }

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, user.shopId)).limit(1);
    if (!shop.length) return res.status(404).json({ error: "Shop not found" });
    const shopName = shop[0].name;

    let aiSummary = "";
    try {
      let prompt = "";
      if (reportType === "job-pl") {
        prompt = `Write a brief professional executive summary (2-3 sentences) for an auto repair shop owner about their Job Profitability report for ${startDate} to ${endDate}. Data: Total Revenue: $${reportData.summary?.totalRevenue?.toFixed(2) || "0"}, Total Cost: $${reportData.summary?.totalCost?.toFixed(2) || "0"}, Total Profit: $${reportData.summary?.totalProfit?.toFixed(2) || "0"}, Average Margin: ${reportData.summary?.avgMargin?.toFixed(1) || "0"}%, Number of Jobs: ${reportData.details?.length || 0}. Include the actual numbers.`;
      } else if (reportType === "sales-tax") {
        prompt = `Write a brief professional executive summary (2-3 sentences) for an auto repair shop owner about their Sales Tax report for ${startDate} to ${endDate}. Data: Total Parts Tax: $${reportData.totalPartsTax?.toFixed(2) || "0"}, Total Labor Tax: $${reportData.totalLaborTax?.toFixed(2) || "0"}, Total Tax Collected: $${reportData.totalTax?.toFixed(2) || "0"}, Number of ROs: ${reportData.roCount || 0}. Include the actual numbers.`;
      } else if (reportType === "tech-productivity") {
        const techNames = reportData.technicians?.map((t: any) => `${t.name} (${t.roCount} ROs, $${t.totalRevenue?.toFixed(2)} revenue, ${t.totalHours} hrs)`).join("; ") || "none";
        prompt = `Write a brief professional executive summary (2-3 sentences) for an auto repair shop owner about their Technician Productivity report for ${startDate} to ${endDate}. Technicians: ${techNames}. Include the actual numbers.`;
      } else if (reportType === "approvals") {
        prompt = `Write a brief professional executive summary (2-3 sentences) for an auto repair shop owner about their Estimate Approval report for ${startDate} to ${endDate}. Data: Total Estimates: ${reportData.totalEstimates || 0}, Approved: ${reportData.approved || 0}, Declined: ${reportData.declined || 0}, Pending: ${reportData.pending || 0}, Conversion Rate: ${reportData.conversionRate || 0}%, Avg Approval Time: ${reportData.avgApprovalTimeHours?.toFixed(1) || "0"} hours. Include the actual numbers.`;
      }

      if (prompt) {
        const response = await anthropicClient.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });
        const block = response.content[0];
        if (block.type === "text") {
          aiSummary = block.text;
        }
      }
    } catch (aiErr) {
      console.error("AI summary generation failed (continuing without):", aiErr);
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PCB Auto";
    workbook.created = new Date();

    const reportTitles: Record<string, string> = {
      "job-pl": "Job Profitability Report",
      "sales-tax": "Sales Tax Report",
      "tech-productivity": "Technician Productivity Report",
      "approvals": "Estimate Approval Report",
    };

    const sumSheet = workbook.addWorksheet("Summary");
    sumSheet.columns = [
      { header: "Field", key: "field", width: 32 },
      { header: "Value", key: "value", width: 40 },
    ];

    const sumHeader = sumSheet.getRow(1);
    sumHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    sumHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    sumHeader.alignment = { vertical: "middle", horizontal: "center" };
    sumHeader.height = 28;

    const summaryRows: Array<{ field: string; value: string }> = [
      { field: "Shop Name", value: shopName },
      { field: "Report", value: reportTitles[reportType] || reportType },
      { field: "Period", value: `${startDate} to ${endDate}` },
      { field: "Generated", value: new Date().toLocaleString() },
    ];

    if (aiSummary) {
      summaryRows.push({ field: "", value: "" });
      summaryRows.push({ field: "AI Executive Summary", value: aiSummary });
    }

    summaryRows.push({ field: "", value: "" });

    if (reportType === "job-pl") {
      summaryRows.push({ field: "Total Revenue", value: `$${(reportData.summary?.totalRevenue ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Total Cost", value: `$${(reportData.summary?.totalCost ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Total Profit", value: `$${(reportData.summary?.totalProfit ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Average Margin", value: `${(reportData.summary?.avgMargin ?? 0).toFixed(1)}%` });
      summaryRows.push({ field: "Number of Jobs", value: `${reportData.details?.length ?? 0}` });
    } else if (reportType === "sales-tax") {
      summaryRows.push({ field: "Total Parts Tax", value: `$${(reportData.totalPartsTax ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Total Labor Tax", value: `$${(reportData.totalLaborTax ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Total Tax Collected", value: `$${(reportData.totalTax ?? 0).toFixed(2)}` });
      summaryRows.push({ field: "Repair Orders", value: `${reportData.roCount ?? 0}` });
    } else if (reportType === "tech-productivity") {
      const techs = reportData.technicians || [];
      summaryRows.push({ field: "Total Technicians", value: `${techs.length}` });
      summaryRows.push({ field: "Total ROs", value: `${techs.reduce((s: number, t: any) => s + (t.roCount || 0), 0)}` });
      summaryRows.push({ field: "Total Revenue", value: `$${techs.reduce((s: number, t: any) => s + (t.totalRevenue || 0), 0).toFixed(2)}` });
      summaryRows.push({ field: "Total Hours", value: `${techs.reduce((s: number, t: any) => s + (t.totalHours || 0), 0)}` });
    } else if (reportType === "approvals") {
      summaryRows.push({ field: "Total Estimates", value: `${reportData.totalEstimates ?? 0}` });
      summaryRows.push({ field: "Approved", value: `${reportData.approved ?? 0}` });
      summaryRows.push({ field: "Declined", value: `${reportData.declined ?? 0}` });
      summaryRows.push({ field: "Pending", value: `${reportData.pending ?? 0}` });
      summaryRows.push({ field: "Conversion Rate", value: `${reportData.conversionRate ?? 0}%` });
      summaryRows.push({ field: "Avg Approval Time", value: `${(reportData.avgApprovalTimeHours ?? 0).toFixed(1)} hours` });
    }

    summaryRows.forEach((row, i) => {
      const r = sumSheet.addRow(row);
      r.getCell("field").font = { bold: true };
      if (row.field === "AI Executive Summary") {
        r.getCell("value").alignment = { wrapText: true };
        r.height = 60;
      }
      if (i % 2 === 1) {
        r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }
    });

    const detSheet = workbook.addWorksheet("Details");

    if (reportType === "job-pl") {
      detSheet.columns = [
        { header: "RO #", key: "roNumber", width: 12 },
        { header: "Customer", key: "customerName", width: 24 },
        { header: "Vehicle", key: "vehicleInfo", width: 28 },
        { header: "Revenue", key: "revenue", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Cost", key: "cost", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Profit", key: "profit", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Margin %", key: "margin", width: 12, style: { numFmt: "0.0%" } },
      ];

      (reportData.details || []).forEach((row: any, i: number) => {
        const r = detSheet.addRow({
          roNumber: row.roNumber,
          customerName: row.customerName,
          vehicleInfo: row.vehicleInfo,
          revenue: row.revenue ?? 0,
          cost: row.cost ?? 0,
          profit: row.profit ?? 0,
          margin: (row.margin ?? 0) / 100,
        });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
      });
    } else if (reportType === "sales-tax") {
      detSheet.columns = [
        { header: "RO #", key: "roNumber", width: 12 },
        { header: "Date", key: "date", width: 14 },
        { header: "Subtotal", key: "subtotal", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Parts Tax", key: "partsTax", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Labor Tax", key: "laborTax", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Total Tax", key: "totalTax", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Total", key: "total", width: 14, style: { numFmt: "$#,##0.00" } },
      ];

      (reportData.details || []).forEach((row: any, i: number) => {
        const r = detSheet.addRow({
          roNumber: row.roNumber,
          date: row.date || "",
          subtotal: row.subtotal ?? 0,
          partsTax: row.partsTax ?? 0,
          laborTax: row.laborTax ?? 0,
          totalTax: row.totalTax ?? 0,
          total: row.total ?? 0,
        });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
      });
    } else if (reportType === "tech-productivity") {
      detSheet.columns = [
        { header: "Technician", key: "name", width: 24 },
        { header: "RO Count", key: "roCount", width: 12 },
        { header: "Total Hours", key: "totalHours", width: 14 },
        { header: "Total Revenue", key: "totalRevenue", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Effective Rate", key: "effectiveRate", width: 16, style: { numFmt: "$#,##0.00" } },
      ];

      (reportData.technicians || []).forEach((row: any, i: number) => {
        const r = detSheet.addRow({
          name: row.name,
          roCount: row.roCount ?? 0,
          totalHours: row.totalHours ?? 0,
          totalRevenue: row.totalRevenue ?? 0,
          effectiveRate: row.effectiveRate ?? 0,
        });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
      });
    } else if (reportType === "approvals") {
      detSheet.columns = [
        { header: "Metric", key: "metric", width: 28 },
        { header: "Value", key: "value", width: 20 },
      ];

      const approvalDetails = [
        { metric: "Total Estimates", value: `${reportData.totalEstimates ?? 0}` },
        { metric: "Approved", value: `${reportData.approved ?? 0}` },
        { metric: "Declined", value: `${reportData.declined ?? 0}` },
        { metric: "Pending", value: `${reportData.pending ?? 0}` },
        { metric: "Conversion Rate", value: `${reportData.conversionRate ?? 0}%` },
        { metric: "Avg Approval Time", value: `${(reportData.avgApprovalTimeHours ?? 0).toFixed(1)} hours` },
      ];

      approvalDetails.forEach((row, i) => {
        const r = detSheet.addRow(row);
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
      });
    }

    const detHeader = detSheet.getRow(1);
    detHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    detHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
    detHeader.alignment = { vertical: "middle", horizontal: "center" };
    detHeader.height = 28;

    detSheet.views = [{ state: "frozen", ySplit: 1 }];
    const lastCol = detSheet.columns.length;
    const lastRow = detSheet.rowCount;
    if (lastRow > 1) {
      detSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: lastRow, column: lastCol },
      };
    }

    const filename = `PCB_Auto_${reportType}_${startDate}_to_${endDate}.xlsx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Report export error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// ============================================================================
// REVENUE EXPORT (AI-POWERED)
// ============================================================================

router.post("/reports/revenue/export", autoAuth, async (req: Request, res: Response) => {
  try {
    const user = req.autoUser!;
    const { startDate, endDate, jobPL, dualPricing } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const shop = await db.select().from(autoShops).where(eq(autoShops.id, user.shopId)).limit(1);
    if (!shop.length) return res.status(404).json({ error: "Shop not found" });
    const shopName = shop[0].name;

    const totalRevenue = jobPL?.summary?.totalRevenue ?? 0;
    const totalCost = jobPL?.summary?.totalCost ?? 0;
    const totalProfit = jobPL?.summary?.totalProfit ?? 0;
    const avgMargin = jobPL?.summary?.avgMargin ?? 0;
    const jobCount = jobPL?.details?.length ?? 0;
    const cashTxCount = dualPricing?.summary?.cashTransactions ?? 0;
    const cardTxCount = dualPricing?.summary?.cardTransactions ?? 0;
    const totalTx = dualPricing?.summary?.totalTransactions ?? 0;
    const cashPct = dualPricing?.summary?.cashPercent ?? 0;
    const cardPct = dualPricing?.summary?.cardPercent ?? 0;
    const dpEarned = dualPricing?.summary?.totalDualPricingCollected ?? 0;
    const totalCollected = dualPricing?.summary?.totalCollected ?? 0;
    const avgCash = dualPricing?.summary?.avgTransactionCash ?? 0;
    const avgCard = dualPricing?.summary?.avgTransactionCard ?? 0;

    let aiAnalysis = "";
    try {
      const prompt = `You are a financial analyst for "${shopName}", an auto repair shop. Write a professional financial analysis report for ${startDate} to ${endDate}.

DATA:
- Total Revenue: $${totalRevenue.toFixed(2)} from ${jobCount} completed jobs
- Total Cost: $${totalCost.toFixed(2)}
- Net Profit: $${totalProfit.toFixed(2)}
- Average Margin: ${avgMargin.toFixed(1)}%
- Average Job Value: $${jobCount > 0 ? (totalRevenue / jobCount).toFixed(2) : "0"}
- Total Transactions: ${totalTx} (${cashTxCount} cash / ${cardTxCount} card)
- Cash: ${cashPct}%, Avg cash transaction: $${avgCash.toFixed(2)}
- Card: ${cardPct}%, Avg card transaction: $${avgCard.toFixed(2)}
- Dual Pricing Earned: $${dpEarned.toFixed(2)}
- Total Collected (including DP): $${totalCollected.toFixed(2)}

Write these sections (use ### headings, keep each section 2-4 sentences):
### Executive Summary
### Revenue Performance
### Profitability Analysis
### Payment Mix Analysis
### Dual Pricing Impact
### Recommendations

Use the actual numbers. Be specific, professional, and actionable. Keep it concise.

IMPORTANT COMPLIANCE RULES - You MUST follow these:
- NEVER use the words "fee", "surcharge", "processing fee", or "card fee" anywhere in your analysis.
- Always refer to dual pricing using ONLY these terms: "Cash Price", "Card Price", "Dual Pricing", or "Dual Pricing Earned".
- The difference between cash price and card price is called "Dual Pricing" — never call it a fee or surcharge.`;

      const response = await anthropicClient.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      if (block.type === "text") {
        aiAnalysis = block.text;
      }
    } catch (aiErr) {
      console.error("AI revenue analysis failed (continuing without):", aiErr);
      aiAnalysis = "AI analysis unavailable for this export.";
    }

    const ExcelJS = await import("exceljs");
    const workbook = new (ExcelJS.default?.Workbook ?? ExcelJS.Workbook)();
    workbook.creator = "PCB Auto";
    workbook.created = new Date();

    const brandColor = "FF6C3AE0";
    const darkHeader = "FF111827";
    const greenAccent = "FF16A34A";
    const lightBg = "FFF9FAFB";
    const whiteBg = "FFFFFFFF";

    // ─── Sheet 1: Financial Summary ───
    const summarySheet = workbook.addWorksheet("Financial Summary");
    summarySheet.columns = [
      { header: "", key: "col1", width: 32 },
      { header: "", key: "col2", width: 22 },
      { header: "", key: "col3", width: 22 },
      { header: "", key: "col4", width: 22 },
    ];

    const titleRow = summarySheet.addRow(["Revenue Report — " + shopName]);
    titleRow.font = { bold: true, size: 16, color: { argb: brandColor } };
    titleRow.height = 30;
    summarySheet.mergeCells("A1:D1");

    const subtitleRow = summarySheet.addRow([`Period: ${startDate} to ${endDate}  |  Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
    subtitleRow.font = { size: 10, color: { argb: "FF6B7280" } };
    summarySheet.mergeCells("A2:D2");

    summarySheet.addRow([]);

    const kpiHeader = summarySheet.addRow(["KEY FINANCIAL METRICS", "", "", ""]);
    kpiHeader.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkHeader } };
    kpiHeader.height = 26;
    summarySheet.mergeCells(`A${kpiHeader.number}:D${kpiHeader.number}`);

    const kpiRows = [
      ["Total Revenue", `$${totalRevenue.toFixed(2)}`, "Net Profit", `$${totalProfit.toFixed(2)}`],
      ["Total Cost", `$${totalCost.toFixed(2)}`, "Profit Margin", `${avgMargin.toFixed(1)}%`],
      ["Completed Jobs", `${jobCount}`, "Avg Job Value", `$${jobCount > 0 ? (totalRevenue / jobCount).toFixed(2) : "0.00"}`],
      ["Total Transactions", `${totalTx}`, "Total Collected", `$${totalCollected.toFixed(2)}`],
      ["Dual Pricing Earned", `$${dpEarned.toFixed(2)}`, "Total Earnings", `$${(totalProfit + dpEarned).toFixed(2)}`],
    ];

    kpiRows.forEach((rowData, i) => {
      const r = summarySheet.addRow(rowData);
      r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
      r.getCell(2).font = { bold: true, size: 12, color: { argb: "FF111827" } };
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(3).font = { bold: true, color: { argb: "FF374151" } };
      r.getCell(4).font = { bold: true, size: 12, color: { argb: "FF111827" } };
      r.getCell(4).alignment = { horizontal: "right" };
      r.height = 24;
      if (i % 2 === 0) {
        r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBg } };
      }
    });

    summarySheet.addRow([]);

    const payHeader = summarySheet.addRow(["PAYMENT BREAKDOWN", "", "", ""]);
    payHeader.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    payHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkHeader } };
    payHeader.height = 26;
    summarySheet.mergeCells(`A${payHeader.number}:D${payHeader.number}`);

    const payRows = [
      ["Cash Transactions", `${cashTxCount}`, "Cash %", `${cashPct}%`],
      ["Card Transactions", `${cardTxCount}`, "Card %", `${cardPct}%`],
      ["Avg Cash Transaction", `$${avgCash.toFixed(2)}`, "Avg Card Transaction", `$${avgCard.toFixed(2)}`],
    ];

    payRows.forEach((rowData, i) => {
      const r = summarySheet.addRow(rowData);
      r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
      r.getCell(2).font = { bold: true, color: { argb: "FF111827" } };
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(3).font = { bold: true, color: { argb: "FF374151" } };
      r.getCell(4).font = { bold: true, color: { argb: "FF111827" } };
      r.getCell(4).alignment = { horizontal: "right" };
      r.height = 24;
      if (i % 2 === 0) {
        r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBg } };
      }
    });

    // ─── Sheet 2: AI Analysis ───
    const aiSheet = workbook.addWorksheet("AI Financial Analysis");
    aiSheet.columns = [{ header: "", key: "content", width: 90 }];

    const aiTitle = aiSheet.addRow(["Financial Analysis — " + shopName]);
    aiTitle.font = { bold: true, size: 16, color: { argb: brandColor } };
    aiTitle.height = 30;

    const aiSubtitle = aiSheet.addRow([`AI-Generated Analysis for ${startDate} to ${endDate}`]);
    aiSubtitle.font = { size: 10, color: { argb: "FF6B7280" } };

    aiSheet.addRow([]);

    const sections = aiAnalysis.split(/###\s*/g).filter(Boolean);
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const heading = lines[0]?.trim();
      const body = lines.slice(1).join("\n").trim();

      if (heading) {
        const hRow = aiSheet.addRow([heading]);
        hRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
        hRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brandColor } };
        hRow.height = 28;
      }

      if (body) {
        const bRow = aiSheet.addRow([body]);
        bRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
        bRow.height = Math.max(40, Math.ceil(body.length / 80) * 18);
      }
      aiSheet.addRow([]);
    }

    // ─── Sheet 3: Job Details ───
    if (jobPL?.details?.length) {
      const jobSheet = workbook.addWorksheet("Job Revenue Details");
      jobSheet.columns = [
        { header: "RO #", key: "roNumber", width: 14 },
        { header: "Customer", key: "customerName", width: 26 },
        { header: "Vehicle", key: "vehicleInfo", width: 28 },
        { header: "Date", key: "date", width: 14 },
        { header: "Revenue", key: "revenue", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Cost", key: "cost", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Profit", key: "profit", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Margin", key: "margin", width: 12, style: { numFmt: "0.0%" } },
      ];

      const jHeader = jobSheet.getRow(1);
      jHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      jHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkHeader } };
      jHeader.alignment = { vertical: "middle", horizontal: "center" };
      jHeader.height = 28;

      (jobPL.details as any[]).forEach((row: any, i: number) => {
        const r = jobSheet.addRow({
          roNumber: row.roNumber,
          customerName: row.customerName,
          vehicleInfo: row.vehicleInfo,
          date: row.date ? new Date(row.date).toLocaleDateString("en-US") : "",
          revenue: row.revenue ?? 0,
          cost: row.cost ?? 0,
          profit: row.profit ?? 0,
          margin: (row.margin ?? 0) / 100,
        });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBg } };
        }
      });

      const totRow = jobSheet.addRow({
        roNumber: "",
        customerName: "TOTALS",
        vehicleInfo: "",
        date: "",
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalProfit,
        margin: totalRevenue > 0 ? totalProfit / totalRevenue : 0,
      });
      totRow.font = { bold: true };
      totRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      totRow.height = 26;

      jobSheet.views = [{ state: "frozen", ySplit: 1 }];
      jobSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: jobSheet.rowCount, column: jobSheet.columns.length },
      };
    }

    // ─── Sheet 4: Transaction Details ───
    if (dualPricing?.transactions?.length) {
      const txSheet = workbook.addWorksheet("Transaction Details");
      txSheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "RO #", key: "roNumber", width: 14 },
        { header: "Customer", key: "customerName", width: 26 },
        { header: "Vehicle", key: "vehicle", width: 28 },
        { header: "Method", key: "method", width: 10 },
        { header: "Cash Price", key: "cashPrice", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Card Price", key: "cardPrice", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Amount Paid", key: "amountPaid", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Tip", key: "tip", width: 12, style: { numFmt: "$#,##0.00" } },
        { header: "Total Collected", key: "totalCollected", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "DP Earned", key: "dpAmount", width: 14, style: { numFmt: "$#,##0.00" } },
      ];

      const txHeader = txSheet.getRow(1);
      txHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      txHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkHeader } };
      txHeader.alignment = { vertical: "middle", horizontal: "center" };
      txHeader.height = 28;

      (dualPricing.transactions as any[]).forEach((tx: any, i: number) => {
        const r = txSheet.addRow({
          date: tx.date ? new Date(tx.date).toLocaleDateString("en-US") : "",
          roNumber: tx.roNumber,
          customerName: tx.customerName,
          vehicle: tx.vehicle,
          method: tx.method === "cash" ? "Cash" : "Card",
          cashPrice: tx.cashPrice ?? 0,
          cardPrice: tx.cardPrice ?? 0,
          amountPaid: tx.amountPaid ?? 0,
          tip: tx.tip ?? 0,
          totalCollected: tx.totalCollected ?? 0,
          dpAmount: tx.dpAmount ?? 0,
        });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBg } };
        }
      });

      txSheet.views = [{ state: "frozen", ySplit: 1 }];
      txSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: txSheet.rowCount, column: txSheet.columns.length },
      };
    }

    // ─── Sheet 5: Daily Summary ───
    const dailyMap: Record<string, { revenue: number; count: number; cash: number; card: number; tips: number; dpEarned: number }> = {};
    if (dualPricing?.transactions) {
      for (const tx of dualPricing.transactions as any[]) {
        const day = tx.date ? new Date(tx.date).toLocaleDateString("en-US") : "Unknown";
        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, count: 0, cash: 0, card: 0, tips: 0, dpEarned: 0 };
        dailyMap[day].revenue += tx.totalCollected ?? 0;
        dailyMap[day].count += 1;
        if (tx.method === "cash") dailyMap[day].cash += tx.amountPaid ?? 0;
        else dailyMap[day].card += tx.amountPaid ?? 0;
        dailyMap[day].tips += tx.tip ?? 0;
        dailyMap[day].dpEarned += tx.dpAmount ?? 0;
      }
    }

    const dailyEntries = Object.entries(dailyMap);
    if (dailyEntries.length > 0) {
      const dailySheet = workbook.addWorksheet("Daily Breakdown");
      dailySheet.columns = [
        { header: "Date", key: "date", width: 16 },
        { header: "Transactions", key: "count", width: 14 },
        { header: "Cash Revenue", key: "cash", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Card Revenue", key: "card", width: 16, style: { numFmt: "$#,##0.00" } },
        { header: "Tips", key: "tips", width: 12, style: { numFmt: "$#,##0.00" } },
        { header: "DP Earned", key: "dpEarned", width: 14, style: { numFmt: "$#,##0.00" } },
        { header: "Total Revenue", key: "revenue", width: 18, style: { numFmt: "$#,##0.00" } },
      ];

      const dHeader = dailySheet.getRow(1);
      dHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      dHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: darkHeader } };
      dHeader.alignment = { vertical: "middle", horizontal: "center" };
      dHeader.height = 28;

      dailyEntries.forEach(([date, data], i) => {
        const r = dailySheet.addRow({ date, ...data });
        if (i % 2 === 1) {
          r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBg } };
        }
      });

      const dtotRow = dailySheet.addRow({
        date: "TOTALS",
        count: dailyEntries.reduce((s, [, d]) => s + d.count, 0),
        cash: dailyEntries.reduce((s, [, d]) => s + d.cash, 0),
        card: dailyEntries.reduce((s, [, d]) => s + d.card, 0),
        tips: dailyEntries.reduce((s, [, d]) => s + d.tips, 0),
        dpEarned: dailyEntries.reduce((s, [, d]) => s + d.dpEarned, 0),
        revenue: dailyEntries.reduce((s, [, d]) => s + d.revenue, 0),
      });
      dtotRow.font = { bold: true };
      dtotRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      dtotRow.height = 26;

      dailySheet.views = [{ state: "frozen", ySplit: 1 }];
    }

    const filename = `PCB_Auto_Revenue_Report_${startDate}_to_${endDate}.xlsx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Revenue export error:", err);
    res.status(500).json({ error: "Failed to generate revenue export" });
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

// ============================================================================
// AI ASSISTANT ROUTES
// ============================================================================

router.post("/assistant/chat", autoAuth, async (req: Request, res: Response) => {
  try {
    const { message, sessionId, context } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const sid = sessionId || `sess_${Date.now()}`;
    if (!assistantSessions.has(sid)) {
      assistantSessions.set(sid, { messages: [], lastAccess: Date.now() });
    }
    const session = assistantSessions.get(sid)!;
    session.lastAccess = Date.now();
    session.messages.push({ role: "user", content: message });
    while (session.messages.length > MAX_HISTORY) session.messages.shift();

    const contextBlock = buildAssistantContextBlock(context);

    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      system: ASSISTANT_SYSTEM_PROMPT + '\n\n' + contextBlock,
      messages: session.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const assistantMessage = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    session.messages.push({ role: "assistant", content: assistantMessage });

    res.json({ message: assistantMessage, sessionId: sid });
  } catch (err: any) {
    console.error("[AutoAssistant] Chat error:", err);
    res.status(500).json({ message: "Sorry, I'm having trouble right now. Try again in a moment." });
  }
});

router.post("/assistant/tts", autoAuth, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Text is required" });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "TTS not configured" });

    const cleanText = stripMarkdownForTTS(text);
    const voiceId = "pNInz6obpgDQGcFmaJgB";

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_turbo_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
      }),
    });

    if (!ttsResponse.ok) {
      console.error("[AutoTTS] ElevenLabs error:", ttsResponse.status);
      return res.status(500).json({ error: "Text-to-speech failed" });
    }

    const arrayBuffer = await ttsResponse.arrayBuffer();
    res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" });
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("[AutoTTS] Error:", err);
    res.status(500).json({ error: "Text-to-speech failed" });
  }
});

// ============================================================================
// AI HELP WITH SMART NAVIGATION
// ============================================================================

const AI_HELP_NAV_MAP = [
  { key: 'revenue', label: 'Revenue', route: '/auto/dashboard' },
  { key: 'open-ros', label: 'Open ROs', route: '/auto/dashboard' },
  { key: 'total-customers', label: 'Total Customers', route: '/auto/dashboard' },
  { key: 'appointments', label: "Today's Appointments", route: '/auto/dashboard' },
  { key: 'fees-saved', label: 'Fees Saved', route: '/auto/dashboard' },
  { key: 'work-orders', label: 'Work Orders', route: '/auto/repair-orders' },
  { key: 'estimates', label: 'Estimates', route: '/auto/repair-orders' },
  { key: 'customers', label: 'Customers', route: '/auto/customers' },
  { key: 'vehicles', label: 'Vehicles', route: '/auto/customers' },
  { key: 'schedule', label: 'Schedule', route: '/auto/schedule' },
  { key: 'inspections', label: 'Inspections (DVI)', route: '/auto/inspections' },
  { key: 'invoices', label: 'Invoices', route: '/auto/repair-orders' },
  { key: 'parts', label: 'Parts', route: '/auto/repair-orders' },
  { key: 'reports', label: 'Reports', route: '/auto/reports' },
  { key: 'report-cash-card', label: 'Cash vs Card Report', route: '/auto/reports' },
  { key: 'report-revenue', label: 'Revenue Report', route: '/auto/reports' },
  { key: 'report-tech', label: 'Tech Productivity', route: '/auto/reports' },
  { key: 'report-customers', label: 'Customer Report', route: '/auto/reports' },
  { key: 'settings', label: 'Settings', route: '/auto/settings' },
  { key: 'settings-dual-pricing', label: 'Dual Pricing Settings', route: '/auto/settings' },
  { key: 'settings-staff', label: 'Staff Management', route: '/auto/staff' },
  { key: 'settings-quickbooks', label: 'QuickBooks', route: '/auto/quickbooks' },
  { key: 'new-ro', label: 'New Work Order', route: '/auto/repair-orders/new' },
  { key: 'payment-processor', label: 'Payment Processor', route: '/auto/processor' },
];

function buildAIHelpNavPrompt(): string {
  const sections = AI_HELP_NAV_MAP.map(t => `- [[nav:${t.key}]] -> "${t.label}" (${t.route})`).join('\n');
  return `
## Navigation Links

You can embed tappable navigation links in your responses that take the user directly
to specific sections of the app. Use the format [[nav:key]] where key is from this list:

${sections}

RULES FOR NAVIGATION LINKS:
1. When explaining a feature, ALWAYS include a nav link so the user can jump there
2. Use them naturally in sentences like: "You can see this on your [[nav:fees-saved]] card"
3. Include multiple links when discussing related features
4. For "where is X" questions, lead with the nav link
5. For "what is X" questions, explain first, then provide the nav link
6. When giving a shop overview, link every metric you mention

The user will see these rendered as tappable blue pills with an arrow icon.
When tapped, the app navigates to that section and highlights it.
`.trim();
}

function buildAIHelpSystemPrompt(shopContext?: any): string {
  const navSection = buildAIHelpNavPrompt();

  const contextSection = shopContext
    ? `
## Current Shop Data
Use this real-time data when the user asks about their shop:
- Today's Revenue: $${shopContext.revenue?.toLocaleString() ?? 'N/A'}
- Cars In Shop: ${shopContext.carsInShop ?? 'N/A'}
- Average Repair Order: $${shopContext.aro?.toLocaleString() ?? 'N/A'}
- Approval Rate: ${shopContext.approvalRate ?? 'N/A'}%
- Active Work Orders: ${shopContext.activeWorkOrders ?? 'N/A'}
- Pending Estimates: ${shopContext.pendingEstimates ?? 'N/A'}
` : '';

  return `You are the AI Help Assistant for PCB Auto, an auto repair shop management platform.

## Your Role
- Answer questions about platform features, terminology, and navigation
- Explain metrics, reports, and business concepts in plain language
- Help users find things in the app by embedding navigation links
- Provide shop performance insights using real-time data when available
- Be concise, friendly, and action-oriented

## Tone & Style
- Speak like a knowledgeable colleague, not a manual
- Lead with the answer, then explain
- Use short paragraphs (2-3 sentences max)
- Bold key terms with **double asterisks**
- Use bullet points for lists

${navSection}

${contextSection}

## Key Platform Concepts

**Dual Pricing / Cash Discount**: Shows customers two prices - Cash Price (base) and
Card Price (base + adjustment). Customers who pay by card cover the difference. The
shop's [[nav:fees-saved]] card tracks total savings.

**DVI (Digital Vehicle Inspection)**: Technicians photograph and document findings
during inspections. Photos are sent to customers with [[nav:estimates]] to build trust
and increase estimate approval.

**ARO (Average Repair Order)**: The average dollar amount per completed work order.
A key profitability metric. View your shop metrics on the [[nav:revenue]] dashboard.

**Fees Saved**: Running total of credit card processing costs the shop avoided
through dual pricing. Tracked on [[nav:fees-saved]].

## Important
- ALWAYS include at least one [[nav:key]] link when discussing a feature or section
- For "where is X" questions, put the nav link FIRST in your response
- For "what is X" questions, explain briefly then link
- Never say "go to the menu" or "click on" - use nav links instead
- If unsure which section to link, suggest the closest match
`.trim();
}

const aiHelpSessions = new Map<string, { messages: Array<{role: string; content: string}>, lastAccess: number }>();

router.post("/ai-help/chat", autoAuth, async (req: Request, res: Response) => {
  try {
    const { message, history = [], shopContext } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

    const messages = [
      ...history.slice(-10).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: buildAIHelpSystemPrompt(shopContext),
      messages,
    });

    const text = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    res.json({ response: text });
  } catch (err: any) {
    console.error("[AI Help] Error:", err);
    res.status(500).json({
      error: "Failed to get AI response",
      response: "I'm having trouble connecting right now. Try asking again in a moment, or check the section directly using the navigation menu.",
    });
  }
});

router.get("/ai-help/suggestions", autoAuth, (req: Request, res: Response) => {
  const { page } = req.query;

  const baseSuggestions = [
    { text: "How is my shop doing?", icon: "chart" },
    { text: "What is fees saved?", icon: "dollar" },
    { text: "Where are my work orders?", icon: "wrench" },
    { text: "Show me reports", icon: "bar-chart" },
  ];

  const contextSuggestions: Record<string, Array<{ text: string; icon: string }>> = {
    "/auto/dashboard": [
      { text: "Explain my approval rate", icon: "check" },
      { text: "What is ARO?", icon: "chart" },
      { text: "How does dual pricing work?", icon: "credit-card" },
    ],
    "/auto/repair-orders": [
      { text: "How do I create a work order?", icon: "wrench" },
      { text: "How do I assign a tech?", icon: "user" },
      { text: "Where are estimates?", icon: "clipboard" },
    ],
    "/auto/inspections": [
      { text: "How do DVIs work?", icon: "search" },
      { text: "How to send photos to customer?", icon: "camera" },
      { text: "What improves approval rates?", icon: "check" },
    ],
    "/auto/reports": [
      { text: "What reports are available?", icon: "bar-chart" },
      { text: "Explain cash vs card report", icon: "credit-card" },
      { text: "Show tech productivity", icon: "wrench" },
    ],
    "/auto/schedule": [
      { text: "Add an appointment", icon: "calendar" },
      { text: "How do bays work?", icon: "layout" },
      { text: "Can I drag to reschedule?", icon: "move" },
    ],
  };

  const pageSuggestions = contextSuggestions[page as string] || [];
  res.json({ suggestions: [...pageSuggestions, ...baseSuggestions].slice(0, 6) });
});

// ============================================================================
// PARTS LOOKUP (PartsTech Simulation)
// ============================================================================

const demoParts = [
  { id: "PT-1001", partNumber: "MOT-3087", description: "Premium Brake Pad Set - Front", brand: "Motorcraft", category: "Brakes", unitCost: 32.50, listPrice: 54.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 12, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 8, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 5, deliveryTime: "30 min" }] },
  { id: "PT-1002", partNumber: "ACDelco-17D1367CH", description: "Ceramic Brake Pad Set - Rear", brand: "ACDelco", category: "Brakes", unitCost: 28.75, listPrice: 48.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 6, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 14, deliveryTime: "Next Day" }] },
  { id: "PT-1003", partNumber: "BOA-BP1234", description: "Brake Rotor - Front (Pair)", brand: "Bosch", category: "Brakes", unitCost: 58.00, listPrice: 94.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 4, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: false, qty: 0, deliveryTime: "Next Day" }, { name: "Worldpac", inStock: true, qty: 10, deliveryTime: "30 min" }] },
  { id: "PT-1004", partNumber: "WIX-57502", description: "Engine Oil Filter", brand: "WIX", category: "Filters", unitCost: 4.25, listPrice: 8.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 50, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 30, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 25, deliveryTime: "In Stock" }] },
  { id: "PT-1005", partNumber: "FRM-CA11114", description: "Engine Air Filter", brand: "Fram", category: "Filters", unitCost: 8.50, listPrice: 18.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 15, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 10, deliveryTime: "In Stock" }] },
  { id: "PT-1006", partNumber: "FRM-CF11966", description: "Cabin Air Filter", brand: "Fram", category: "Filters", unitCost: 10.25, listPrice: 22.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 8, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 12, deliveryTime: "In Stock" }] },
  { id: "PT-1007", partNumber: "MOB-M1-110A", description: "Full Synthetic Motor Oil 5W-30 (5 Qt)", brand: "Mobil 1", category: "Oil & Fluids", unitCost: 22.00, listPrice: 36.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 40, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 25, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 30, deliveryTime: "In Stock" }] },
  { id: "PT-1008", partNumber: "CAS-03520C", description: "Conventional Motor Oil 5W-20 (5 Qt)", brand: "Castrol", category: "Oil & Fluids", unitCost: 16.50, listPrice: 28.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 35, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 20, deliveryTime: "In Stock" }] },
  { id: "PT-1009", partNumber: "NGK-7090", description: "Iridium IX Spark Plug", brand: "NGK", category: "Ignition", unitCost: 7.50, listPrice: 13.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 48, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 36, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 100, deliveryTime: "In Stock" }] },
  { id: "PT-1010", partNumber: "ACDelco-41-110", description: "Professional Platinum Spark Plug", brand: "ACDelco", category: "Ignition", unitCost: 5.75, listPrice: 11.49, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 24, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 18, deliveryTime: "In Stock" }] },
  { id: "PT-1011", partNumber: "DEN-234-4209", description: "Oxygen Sensor - Upstream", brand: "Denso", category: "Sensors", unitCost: 42.00, listPrice: 74.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 3, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 7, deliveryTime: "30 min" }] },
  { id: "PT-1012", partNumber: "BOA-15010", description: "Mass Air Flow Sensor", brand: "Bosch", category: "Sensors", unitCost: 85.00, listPrice: 139.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: false, qty: 0, deliveryTime: "Next Day" }, { name: "Worldpac", inStock: true, qty: 4, deliveryTime: "30 min" }] },
  { id: "PT-1013", partNumber: "GAT-K060923", description: "Serpentine Belt", brand: "Gates", category: "Belts & Hoses", unitCost: 18.00, listPrice: 32.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 6, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 4, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 3, deliveryTime: "30 min" }] },
  { id: "PT-1014", partNumber: "GAT-T43215", description: "Timing Belt Kit with Water Pump", brand: "Gates", category: "Belts & Hoses", unitCost: 125.00, listPrice: 219.99, coreCharge: 0, suppliers: [{ name: "Worldpac", inStock: true, qty: 2, deliveryTime: "30 min" }, { name: "NAPA", inStock: false, qty: 0, deliveryTime: "Next Day" }] },
  { id: "PT-1015", partNumber: "GAT-22319", description: "Upper Radiator Hose", brand: "Gates", category: "Belts & Hoses", unitCost: 14.50, listPrice: 26.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 5, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 3, deliveryTime: "In Stock" }] },
  { id: "PT-1016", partNumber: "DUR-DL-96R", description: "Automotive Battery - Group 96R", brand: "Duralast", category: "Electrical", unitCost: 95.00, listPrice: 164.99, coreCharge: 22.00, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 8, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 5, deliveryTime: "In Stock" }] },
  { id: "PT-1017", partNumber: "DEN-210-0580", description: "Remanufactured Alternator", brand: "Denso", category: "Electrical", unitCost: 145.00, listPrice: 249.99, coreCharge: 45.00, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 2, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 3, deliveryTime: "30 min" }] },
  { id: "PT-1018", partNumber: "DOR-926-313", description: "Remanufactured Starter Motor", brand: "Dorman", category: "Electrical", unitCost: 110.00, listPrice: 189.99, coreCharge: 35.00, suppliers: [{ name: "NAPA", inStock: true, qty: 2, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: false, qty: 0, deliveryTime: "Next Day" }, { name: "Worldpac", inStock: true, qty: 4, deliveryTime: "30 min" }] },
  { id: "PT-1019", partNumber: "MOG-MK80442", description: "Front Wheel Hub Assembly", brand: "Moog", category: "Suspension", unitCost: 72.00, listPrice: 124.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 4, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 2, deliveryTime: "30 min" }] },
  { id: "PT-1020", partNumber: "MON-71214", description: "Strut Assembly - Front Left", brand: "Monroe", category: "Suspension", unitCost: 88.00, listPrice: 149.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 2, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 5, deliveryTime: "30 min" }] },
  { id: "PT-1021", partNumber: "BOA-26-CA5528", description: "Wiper Blade Set - All Season (Pair)", brand: "Bosch", category: "Wipers", unitCost: 16.00, listPrice: 29.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 20, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 15, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 12, deliveryTime: "In Stock" }] },
  { id: "PT-1022", partNumber: "SYL-9006", description: "Halogen Headlight Bulb - Low Beam", brand: "Sylvania", category: "Lighting", unitCost: 9.50, listPrice: 18.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 25, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 15, deliveryTime: "In Stock" }] },
  { id: "PT-1023", partNumber: "SYL-H11", description: "LED Headlight Bulb Upgrade", brand: "Sylvania", category: "Lighting", unitCost: 28.00, listPrice: 49.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 10, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 8, deliveryTime: "30 min" }] },
  { id: "PT-1024", partNumber: "DOR-902-062", description: "Thermostat Housing Assembly", brand: "Dorman", category: "Cooling", unitCost: 35.00, listPrice: 62.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 3, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 6, deliveryTime: "30 min" }] },
  { id: "PT-1025", partNumber: "DOR-620-232", description: "Radiator Fan Assembly", brand: "Dorman", category: "Cooling", unitCost: 115.00, listPrice: 199.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: false, qty: 0, deliveryTime: "Next Day" }, { name: "Worldpac", inStock: true, qty: 2, deliveryTime: "30 min" }] },
  { id: "PT-1026", partNumber: "ACDelco-252-846", description: "Water Pump", brand: "ACDelco", category: "Cooling", unitCost: 48.00, listPrice: 84.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 3, deliveryTime: "In Stock" }, { name: "AutoZone Commercial", inStock: true, qty: 2, deliveryTime: "In Stock" }] },
  { id: "PT-1027", partNumber: "BOA-69620", description: "Ignition Coil Pack", brand: "Bosch", category: "Ignition", unitCost: 32.00, listPrice: 56.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 6, deliveryTime: "In Stock" }, { name: "NAPA", inStock: true, qty: 4, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 12, deliveryTime: "In Stock" }] },
  { id: "PT-1028", partNumber: "DOR-911-149", description: "EVAP Purge Valve Solenoid", brand: "Dorman", category: "Engine", unitCost: 22.00, listPrice: 39.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 4, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 6, deliveryTime: "30 min" }] },
  { id: "PT-1029", partNumber: "FEL-26325PT", description: "Valve Cover Gasket Set", brand: "Fel-Pro", category: "Engine", unitCost: 18.50, listPrice: 34.99, coreCharge: 0, suppliers: [{ name: "NAPA", inStock: true, qty: 5, deliveryTime: "In Stock" }, { name: "O'Reilly", inStock: true, qty: 3, deliveryTime: "In Stock" }] },
  { id: "PT-1030", partNumber: "ATO-FU84", description: "Electric Fuel Pump Assembly", brand: "Airtex", category: "Fuel System", unitCost: 135.00, listPrice: 229.99, coreCharge: 0, suppliers: [{ name: "AutoZone Commercial", inStock: true, qty: 2, deliveryTime: "In Stock" }, { name: "Worldpac", inStock: true, qty: 3, deliveryTime: "30 min" }, { name: "NAPA", inStock: false, qty: 0, deliveryTime: "Next Day" }] },
];

router.get("/parts/search", autoAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim().toLowerCase();

    let results = demoParts;
    if (q) {
      results = demoParts.filter(p =>
        p.description.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    } else {
      results = demoParts.slice(0, 10);
    }

    res.json(results);
  } catch (err: any) {
    console.error("Parts search error:", err);
    res.status(500).json({ error: "Parts search failed" });
  }
});

// ============================================================================
// LABOR GUIDE (MOTOR Simulation)
// ============================================================================

const demoLaborOps = [
  { id: "LB-1001", operationCode: "B1010", category: "Brakes", description: "Front Brake Pads - Remove & Replace", laborHours: 1.2, difficulty: "Easy", notes: "Includes cleaning and lubricating slide pins", includes: ["Remove wheels", "Remove calipers", "Replace pads", "Lubricate slide pins", "Reassemble"] },
  { id: "LB-1002", operationCode: "B1020", category: "Brakes", description: "Rear Brake Pads - Remove & Replace", laborHours: 1.4, difficulty: "Easy", notes: "Electronic parking brake models may require scan tool", includes: ["Remove wheels", "Remove calipers", "Replace pads", "Reassemble", "Reset parking brake if applicable"] },
  { id: "LB-1003", operationCode: "B1030", category: "Brakes", description: "Front Brake Rotors - Remove & Replace (Pair)", laborHours: 1.8, difficulty: "Moderate", notes: "Add 0.3 hrs if replacing pads at the same time", includes: ["Remove wheels", "Remove calipers and brackets", "Replace rotors", "Reassemble", "Torque to spec"] },
  { id: "LB-1004", operationCode: "B1040", category: "Brakes", description: "Brake Fluid Flush - Complete System", laborHours: 0.8, difficulty: "Easy", notes: null, includes: ["Pressure bleed all four corners", "Replace fluid", "Check pedal feel"] },
  { id: "LB-1005", operationCode: "E2010", category: "Engine", description: "Spark Plugs - Remove & Replace (4-Cylinder)", laborHours: 0.8, difficulty: "Easy", notes: "Add 0.5 hrs for V6, add 1.0 hrs for V8", includes: ["Remove ignition coils", "Remove and inspect spark plugs", "Gap and install new plugs", "Reinstall coils"] },
  { id: "LB-1006", operationCode: "E2020", category: "Engine", description: "Spark Plugs - Remove & Replace (V6)", laborHours: 1.3, difficulty: "Moderate", notes: "Some models require intake manifold removal for rear bank access", includes: ["Remove engine covers", "Remove ignition coils", "Replace all 6 plugs", "Reassemble"] },
  { id: "LB-1007", operationCode: "E2030", category: "Engine", description: "Valve Cover Gasket - Replace (Inline 4)", laborHours: 1.5, difficulty: "Moderate", notes: "Clean mating surfaces thoroughly", includes: ["Remove valve cover", "Clean surfaces", "Install new gasket", "Torque to spec", "Check for leaks"] },
  { id: "LB-1008", operationCode: "E2040", category: "Engine", description: "Timing Belt & Water Pump - Replace", laborHours: 4.5, difficulty: "Advanced", notes: "Includes tensioner and idler pulleys. Verify timing marks before and after.", includes: ["Remove accessories and covers", "Set engine to TDC", "Remove old belt, tensioner, idler", "Replace water pump", "Install new components", "Verify timing", "Reassemble"] },
  { id: "LB-1009", operationCode: "E2050", category: "Engine", description: "Engine Oil & Filter Change", laborHours: 0.4, difficulty: "Easy", notes: null, includes: ["Drain oil", "Replace filter", "Refill with correct oil", "Check for leaks", "Reset oil life monitor"] },
  { id: "LB-1010", operationCode: "EL3010", category: "Electrical", description: "Battery - Remove & Replace", laborHours: 0.4, difficulty: "Easy", notes: "May require radio code re-entry and power window relearn", includes: ["Disconnect cables", "Remove hold-down", "Install new battery", "Apply terminal protectant"] },
  { id: "LB-1011", operationCode: "EL3020", category: "Electrical", description: "Alternator - Remove & Replace", laborHours: 1.8, difficulty: "Moderate", notes: "Some models require removal from below", includes: ["Remove serpentine belt", "Disconnect electrical", "Remove mounting bolts", "Install new alternator", "Reinstall belt", "Verify charging output"] },
  { id: "LB-1012", operationCode: "EL3030", category: "Electrical", description: "Starter Motor - Remove & Replace", laborHours: 1.5, difficulty: "Moderate", notes: "Access may vary significantly by model", includes: ["Disconnect battery", "Remove starter bolts", "Disconnect wiring", "Install new starter", "Reconnect and test"] },
  { id: "LB-1013", operationCode: "S4010", category: "Suspension", description: "Front Strut Assembly - Replace (Each)", laborHours: 1.5, difficulty: "Moderate", notes: "Alignment recommended after replacement", includes: ["Remove wheel", "Disconnect sway bar link", "Remove strut bolts", "Install new strut assembly", "Torque all fasteners"] },
  { id: "LB-1014", operationCode: "S4020", category: "Suspension", description: "Front Wheel Hub/Bearing - Replace (Each)", laborHours: 1.8, difficulty: "Moderate", notes: "Requires torque wrench for axle nut", includes: ["Remove wheel and brake components", "Remove axle nut", "Remove hub assembly", "Install new hub", "Reassemble brakes", "Torque axle nut to spec"] },
  { id: "LB-1015", operationCode: "S4030", category: "Suspension", description: "Ball Joint - Lower - Replace (Each)", laborHours: 2.0, difficulty: "Advanced", notes: "Press-in type requires special tools. Alignment required after.", includes: ["Remove wheel", "Separate ball joint from knuckle", "Press out old joint", "Press in new joint", "Reassemble", "Alignment check"] },
  { id: "LB-1016", operationCode: "C5010", category: "Cooling", description: "Radiator - Remove & Replace", laborHours: 2.2, difficulty: "Moderate", notes: "Includes coolant drain and refill", includes: ["Drain cooling system", "Remove hoses and fan shroud", "Disconnect transmission cooler lines if applicable", "Remove radiator", "Install new radiator", "Refill and bleed cooling system"] },
  { id: "LB-1017", operationCode: "C5020", category: "Cooling", description: "Thermostat - Remove & Replace", laborHours: 1.0, difficulty: "Easy", notes: "Refill and bleed cooling system after replacement", includes: ["Drain coolant partially", "Remove thermostat housing", "Replace thermostat and gasket", "Reassemble", "Refill coolant and bleed air"] },
  { id: "LB-1018", operationCode: "C5030", category: "Cooling", description: "Water Pump - Remove & Replace", laborHours: 2.5, difficulty: "Advanced", notes: "Belt-driven: includes serpentine belt removal. Check for timing cover access.", includes: ["Drain cooling system", "Remove belt and accessories", "Remove water pump", "Clean mating surface", "Install new pump with gasket", "Reassemble and refill"] },
  { id: "LB-1019", operationCode: "T6010", category: "Transmission", description: "Transmission Fluid & Filter Service (Automatic)", laborHours: 1.2, difficulty: "Moderate", notes: "Pan drop service. Does not include full flush.", includes: ["Remove transmission pan", "Replace filter", "Clean pan and magnet", "Install new gasket", "Refill with correct ATF"] },
  { id: "LB-1020", operationCode: "T6020", category: "Transmission", description: "Clutch Assembly - Remove & Replace (Manual Trans)", laborHours: 5.5, difficulty: "Expert", notes: "Includes pressure plate, disc, and throw-out bearing", includes: ["Remove transmission", "Remove pressure plate and disc", "Inspect flywheel", "Install new clutch components", "Reinstall transmission", "Adjust clutch if applicable", "Road test"] },
  { id: "LB-1021", operationCode: "X7010", category: "Exhaust", description: "Catalytic Converter - Remove & Replace", laborHours: 1.5, difficulty: "Moderate", notes: "May require welding on some applications", includes: ["Raise vehicle", "Disconnect O2 sensors", "Remove converter bolts or clamps", "Install new converter", "Reconnect sensors", "Check for leaks"] },
  { id: "LB-1022", operationCode: "X7020", category: "Exhaust", description: "Muffler - Remove & Replace", laborHours: 1.0, difficulty: "Easy", notes: "Bolt-on type. Add 0.5 hrs if welded.", includes: ["Raise vehicle", "Remove hangers and clamps", "Remove old muffler", "Install new muffler", "Secure hangers", "Check for leaks"] },
  { id: "LB-1023", operationCode: "ST8010", category: "Steering", description: "Tie Rod End - Outer - Replace (Each)", laborHours: 0.8, difficulty: "Easy", notes: "Alignment required after replacement", includes: ["Remove cotter pin and nut", "Separate tie rod from knuckle", "Unthread from inner tie rod", "Install new tie rod end", "Set approximate toe"] },
  { id: "LB-1024", operationCode: "ST8020", category: "Steering", description: "Power Steering Pump - Replace", laborHours: 2.0, difficulty: "Moderate", notes: "Includes fluid flush and bleed", includes: ["Remove belt", "Disconnect lines", "Remove pump mounting bolts", "Install new pump", "Reconnect lines", "Fill and bleed system"] },
  { id: "LB-1025", operationCode: "H9010", category: "HVAC", description: "A/C Compressor - Remove & Replace", laborHours: 2.8, difficulty: "Advanced", notes: "Requires R-134a recovery and recharge. EPA certified tech required.", includes: ["Recover refrigerant", "Remove belt", "Disconnect lines", "Remove compressor", "Transfer clutch if needed", "Install new compressor", "Add oil", "Evacuate and recharge"] },
  { id: "LB-1026", operationCode: "H9020", category: "HVAC", description: "Cabin Air Filter - Replace", laborHours: 0.2, difficulty: "Easy", notes: "Location varies by model - check behind glove box or under cowl", includes: ["Access filter housing", "Remove old filter", "Install new filter"] },
  { id: "LB-1027", operationCode: "H9030", category: "HVAC", description: "Heater Core - Remove & Replace", laborHours: 6.0, difficulty: "Expert", notes: "Requires dashboard removal on most vehicles", includes: ["Drain coolant", "Remove dashboard assembly", "Disconnect heater hoses", "Remove heater core", "Install new core", "Reassemble dashboard", "Refill and bleed cooling system"] },
  { id: "LB-1028", operationCode: "D0010", category: "Drivetrain", description: "CV Axle/Half Shaft - Replace (Each)", laborHours: 1.5, difficulty: "Moderate", notes: "Check for transmission seal leak after removal", includes: ["Remove wheel and brake components", "Remove axle nut", "Separate lower ball joint", "Remove axle from transmission", "Install new axle", "Reassemble", "Torque axle nut"] },
  { id: "LB-1029", operationCode: "D0020", category: "Drivetrain", description: "Differential Fluid Service (Rear)", laborHours: 0.6, difficulty: "Easy", notes: "Use manufacturer-specified fluid", includes: ["Remove drain plug", "Drain old fluid", "Replace gasket or RTV", "Refill with correct fluid", "Check for leaks"] },
  { id: "LB-1030", operationCode: "EL3040", category: "Electrical", description: "Oxygen Sensor - Remove & Replace", laborHours: 0.7, difficulty: "Easy", notes: "Upstream or downstream. Use anti-seize on threads.", includes: ["Locate sensor", "Disconnect electrical connector", "Remove sensor", "Install new sensor with anti-seize", "Clear codes and verify"] },
];

router.get("/labor/search", autoAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim().toLowerCase();

    let results = demoLaborOps;
    if (q) {
      results = demoLaborOps.filter(op =>
        op.description.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q) ||
        op.operationCode.toLowerCase().includes(q)
      );
    } else {
      results = demoLaborOps.slice(0, 10);
    }

    res.json(results);
  } catch (err: any) {
    console.error("Labor search error:", err);
    res.status(500).json({ error: "Labor search failed" });
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
          taxRate: "0.0700",
          partsTaxRate: "0.0700",
          laborTaxRate: "0.0700",
          laborRate: "125.00",
          cardFeePercent: "0.0350",
          laborTaxable: true,
          shopSupplyEnabled: true,
          shopSupplyRatePct: "5.00",
          shopSupplyMaxAmount: "50.00",
          shopSupplyTaxable: true,
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
