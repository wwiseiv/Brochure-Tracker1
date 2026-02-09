import express, { Router, Request, Response } from "express";
import type { Express } from "express";
import { db } from "./db";
import { 
  autoShops, autoUsers, autoInvitations, autoCustomers, autoVehicles,
  autoRepairOrders, autoLineItems, autoPayments, autoDviTemplates,
  autoDviInspections, autoDviItems, autoBays, autoAppointments,
  autoIntegrationConfigs, autoSmsLog, autoActivityLog,
  autoCannedServices, autoCannedServiceItems, autoCommunicationLog,
  autoStaffAvailability, autoStaffTimeOff, autoDashboardVisibility,
  autoLocations, autoRoSequences, autoEstimateSequences, autoTechSessions,
  autoDeclinedServices, autoCampaignSettings, autoRoCloseSnapshots,
} from "@shared/schema";
import { eq, and, desc, asc, or, sql, count, sum, gte, lte, between, inArray, isNotNull, ilike, isNull } from "drizzle-orm";
import { autoAuth, autoRequireRole, hashPassword, comparePasswords, generateToken, type AutoAuthUser } from "./auto-auth";
import crypto from "crypto";
import { randomUUID } from "crypto";
import multer from "multer";
import { generateROPdf, generateDviPdf } from "./auto-pdf";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { sendAutoInvoiceEmail } from "./auto-email";
import { getCredentials } from "./email";
import { Resend } from "resend";
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

E-SIGNATURES: Send documents for electronic signature. Upload PDFs, add signing fields, send to customers or vendors. Track status (sent, viewed, completed). Manage document templates.

PIPELINE: Prospect pipeline for tracking potential customers through sales stages. Add prospects, move them through stages, track deal values and conversion rates.

QUICKBOOKS: Integration with QuickBooks for accounting sync. Connect your account, configure sync settings, and keep your books up to date automatically.

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
- [[nav:esign]] -> "E-Signatures" (/auto/esign)
- [[nav:pipeline]] -> "Pipeline" (/auto/pipeline)
- [[nav:quickbooks]] -> "QuickBooks" (/auto/quickbooks)

RULES FOR NAVIGATION LINKS:
1. When explaining a feature, ALWAYS include a nav link so the user can jump there
2. Use them naturally in sentences like: "You can see this on your [[nav:fees-saved]] card"
3. Include multiple links when discussing related features
4. For "where is X" questions, lead with the nav link
5. For "what is X" questions, explain first, then provide the nav link
6. When giving a shop overview, link every metric you mention

7. NEVER wrap [[nav:key]] tokens in markdown bold (**) or italic (*). Write them plain: [[nav:revenue]] not **[[nav:revenue]]**

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

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const users = await db.select().from(autoUsers)
      .where(and(eq(autoUsers.email, email.toLowerCase()), eq(autoUsers.isActive, true)))
      .limit(1);

    if (users.length) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.update(autoUsers).set({ resetToken, resetTokenExpiresAt }).where(eq(autoUsers.id, users[0].id));
    }

    res.json({ message: "If an account exists with that email, a reset link has been generated." });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const users = await db.select().from(autoUsers)
      .where(eq(autoUsers.resetToken, token))
      .limit(1);

    if (!users.length) return res.status(400).json({ error: "Invalid or expired reset token" });

    const user = users[0];
    if (!user.resetTokenExpiresAt || new Date() > user.resetTokenExpiresAt) {
      await db.update(autoUsers).set({ resetToken: null, resetTokenExpiresAt: null }).where(eq(autoUsers.id, user.id));
      return res.status(400).json({ error: "Reset token has expired" });
    }

    const passwordHash = await hashPassword(password);
    await db.update(autoUsers).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null, updatedAt: new Date() }).where(eq(autoUsers.id, user.id));

    res.json({ message: "Password has been reset successfully" });
  } catch (err: any) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
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

router.post("/tech-portal/login", async (req: Request, res: Response) => {
  try {
    const { employeeNumber, pin, shopId } = req.body;
    if (!employeeNumber || !shopId) {
      return res.status(400).json({ error: "Employee number and shop ID required" });
    }

    const [user] = await db.select().from(autoUsers)
      .where(and(
        eq(autoUsers.employeeNumber, employeeNumber),
        eq(autoUsers.shopId, parseInt(shopId))
      ));

    if (!user) return res.status(404).json({ error: "Employee not found" });
    if (user.role !== "technician" && user.role !== "tech") return res.status(403).json({ error: "Tech portal access is for technicians only" });

    if (user.pin && user.pin !== pin) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    res.json({
      id: user.id,
      shopId: user.shopId,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (err: any) {
    console.error("Tech portal login error:", err);
    res.status(500).json({ error: "Login failed" });
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
    const { role, isActive, phone, pin, payType, payRate, employeeNumber } = req.body;

    const user = await db.select().from(autoUsers).where(and(eq(autoUsers.id, userId), eq(autoUsers.shopId, req.autoUser!.shopId))).limit(1);
    if (!user.length) return res.status(404).json({ error: "User not found" });

    if (user[0].role === "owner" && req.autoUser!.role !== "owner") {
      return res.status(403).json({ error: "Cannot modify owner account" });
    }

    const updates: any = {};
    if (role !== undefined) {
      if (role === "owner" && req.autoUser!.role !== "owner") {
        return res.status(403).json({ error: "Only owners can set the owner role" });
      }
      updates.role = role;
    }
    if (isActive !== undefined) updates.isActive = isActive;
    if (phone !== undefined) updates.phone = phone;
    if (pin !== undefined) updates.pin = pin;
    if (payType !== undefined) updates.payType = payType;
    if (payRate !== undefined) updates.payRate = payRate;
    if (employeeNumber !== undefined) updates.employeeNumber = employeeNumber;
    updates.updatedAt = new Date();

    const [updated] = await db.update(autoUsers).set(updates).where(eq(autoUsers.id, userId)).returning();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

router.post("/staff/:id/reset-password", autoAuth, autoRequireRole("owner", "manager"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await db.select().from(autoUsers)
      .where(and(eq(autoUsers.id, userId), eq(autoUsers.shopId, req.autoUser!.shopId)))
      .limit(1);
    if (!user.length) return res.status(404).json({ error: "User not found" });

    if (user[0].role === "owner" && req.autoUser!.role !== "owner") {
      return res.status(403).json({ error: "Only owners can reset other owners' passwords" });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(autoUsers).set({ passwordHash, updatedAt: new Date() }).where(eq(autoUsers.id, userId));

    res.json({ message: "Password reset successfully" });
  } catch (err: any) {
    console.error("Staff reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
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

async function getOrCreateDefaultLocation(shopId: number): Promise<typeof autoLocations.$inferSelect> {
  const existing = await db.select().from(autoLocations)
    .where(eq(autoLocations.shopId, shopId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const shop = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
  const [location] = await db.insert(autoLocations).values({
    shopId,
    locationNumber: 1,
    name: shop[0]?.name || "Main Location",
    isPrimary: true,
  }).returning();

  await db.insert(autoRoSequences).values({
    shopId,
    locationId: location.id,
    currentNumber: 0,
  });

  return location;
}

async function generateRoNumber(shopId: number, locationId?: number): Promise<{ roNumber: string; locationId: number }> {
  let location;
  if (locationId) {
    const loc = await db.select().from(autoLocations)
      .where(and(eq(autoLocations.id, locationId), eq(autoLocations.shopId, shopId)))
      .limit(1);
    if (!loc.length) throw new Error("Location not found");
    location = loc[0];
  } else {
    location = await getOrCreateDefaultLocation(shopId);
  }

  const [seq] = await db.select().from(autoRoSequences)
    .where(and(eq(autoRoSequences.shopId, shopId), eq(autoRoSequences.locationId, location.id)))
    .limit(1);

  let nextNumber: number;
  if (!seq) {
    await db.insert(autoRoSequences).values({
      shopId,
      locationId: location.id,
      currentNumber: 1,
    });
    nextNumber = 1;
  } else {
    nextNumber = seq.currentNumber + 1;
    await db.update(autoRoSequences)
      .set({ currentNumber: nextNumber, updatedAt: new Date() })
      .where(eq(autoRoSequences.id, seq.id));
  }

  const roNumber = String(location.locationNumber * 10000 + nextNumber);
  return { roNumber, locationId: location.id };
}

async function generateEstimateNumber(shopId: number): Promise<string> {
  const [seq] = await db.select().from(autoEstimateSequences)
    .where(eq(autoEstimateSequences.shopId, shopId))
    .limit(1);

  if (!seq) {
    await db.insert(autoEstimateSequences).values({
      shopId,
      currentNumber: 10001,
      prefix: "EST-",
    });
    return "EST-10001";
  }

  const nextNumber = seq.currentNumber + 1;
  await db.update(autoEstimateSequences)
    .set({ currentNumber: nextNumber, updatedAt: new Date() })
    .where(eq(autoEstimateSequences.id, seq.id));

  return `${seq.prefix || "EST-"}${nextNumber}`;
}

async function generateRONumber(shopId: number): Promise<string> {
  const result = await generateRoNumber(shopId);
  return result.roNumber;
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
    const roResult = await generateRoNumber(req.autoUser!.shopId, data.locationId);
    const roNumber = roResult.roNumber;
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const approvalShortCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [ro] = await db.insert(autoRepairOrders).values({
      shopId: req.autoUser!.shopId, roNumber, customerId: data.customerId,
      vehicleId: data.vehicleId, status: "estimate",
      serviceAdvisorId: req.autoUser!.id, technicianId: data.technicianId || null,
      bayId: data.bayId || null, customerConcern: data.customerConcern || null,
      internalNotes: data.internalNotes || null,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
      approvalToken,
      approvalShortCode,
      isEstimate: false,
      advisorEmployeeId: req.autoUser!.id,
      locationId: roResult.locationId,
    }).returning();

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "repair_order", entityId: ro.id, action: "created",
      details: { roNumber },
    });

    try {
      const publicToken = crypto.randomBytes(32).toString("hex");
      const shopId = req.autoUser!.shopId;
      const defaultTemplates = await db.select().from(autoDviTemplates)
        .where(and(eq(autoDviTemplates.shopId, shopId), eq(autoDviTemplates.isDefault, true)))
        .limit(1);

      const [inspection] = await db.insert(autoDviInspections).values({
        repairOrderId: ro.id, shopId,
        templateId: defaultTemplates.length ? defaultTemplates[0].id : null,
        technicianId: req.autoUser!.id,
        customerId: data.customerId, vehicleId: data.vehicleId,
        publicToken,
      }).returning();

      if (defaultTemplates.length && defaultTemplates[0].categories) {
        const categories = typeof defaultTemplates[0].categories === "string"
          ? JSON.parse(defaultTemplates[0].categories as string)
          : defaultTemplates[0].categories;
        for (const cat of categories as any[]) {
          for (const item of cat.items || []) {
            await db.insert(autoDviItems).values({
              inspectionId: inspection.id, categoryName: cat.name,
              itemName: item.name, condition: "not_inspected", sortOrder: item.sortOrder || 0,
            });
          }
        }
      } else {
        await createDviItemsFromDefaults(inspection.id);
      }
    } catch (dviErr: any) {
      console.error("Auto-create DVI inspection error (non-blocking):", dviErr);
    }

    res.json(ro);
  } catch (err: any) {
    console.error("Create RO error:", err);
    res.status(500).json({ error: "Failed to create repair order" });
  }
});

router.post("/repair-orders/quick", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { customerId, vehicleId, mileageIn, serviceDescription, locationId } = req.body;

    if (!customerId || !vehicleId) {
      return res.status(400).json({ error: "Customer and vehicle are required" });
    }

    const roResult = await generateRoNumber(shopId, locationId);
    const roNumber = roResult.roNumber;
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const approvalShortCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [ro] = await db.insert(autoRepairOrders).values({
      shopId,
      roNumber,
      customerId,
      vehicleId,
      status: "in_progress",
      serviceAdvisorId: req.autoUser!.id,
      mileageIn: mileageIn ? parseInt(mileageIn) : null,
      locationId: roResult.locationId,
      isEstimate: false,
      approvalToken,
      approvalShortCode,
    }).returning();

    if (serviceDescription) {
      const shop = await db.select().from(autoShops).where(eq(autoShops.id, shopId)).limit(1);
      const cardFeePercent = parseFloat(shop[0]?.cardFeePercent || "0");

      await db.insert(autoLineItems).values({
        repairOrderId: ro.id,
        type: "labor",
        description: serviceDescription,
        quantity: "1",
        unitPriceCash: "0.00",
        unitPriceCard: "0.00",
        totalCash: "0.00",
        totalCard: "0.00",
        lineOrigin: "original",
        addedByUserId: req.autoUser!.id,
        addedAt: new Date(),
        status: "pending",
      });
    }

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "repair_order",
      entityId: ro.id,
      action: "quick_ro_created",
      details: { roNumber },
    });

    res.json(ro);
  } catch (err: any) {
    console.error("Quick RO creation error:", err);
    res.status(500).json({ error: "Failed to create quick repair order" });
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

router.post("/repair-orders/:id/send-estimate", autoAuth, async (req: Request, res: Response) => {
  try {
    const roId = parseInt(req.params.id);
    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    if (ro.status !== "estimate" && ro.status !== "sent") {
      return res.status(400).json({ error: "Only estimates can be sent for approval" });
    }

    const [updated] = await db.update(autoRepairOrders).set({
      status: "sent",
      estimateSentAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, roId)).returning();

    await db.insert(autoActivityLog).values({
      shopId: req.autoUser!.shopId, userId: req.autoUser!.id,
      entityType: "repair_order", entityId: ro.id, action: "estimate_sent",
      details: { roNumber: ro.roNumber, method: req.body.method || "manual" },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Send estimate error:", err);
    res.status(500).json({ error: "Failed to send estimate" });
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

    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    let lineOrigin = data.lineOrigin || 'original';
    if (!data.lineOrigin && ro.createdAt) {
      const secondsSinceCreation = (Date.now() - new Date(ro.createdAt).getTime()) / 1000;
      if (secondsSinceCreation > 300) {
        lineOrigin = 'addon';
      }
    }
    if (data.lineOrigin === 'inspection' || data.lineOrigin === 'dvi') {
      lineOrigin = 'inspection';
    }

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
      lineOrigin,
      addedByUserId: req.autoUser!.id,
      addedAt: new Date(),
      partsPayType: data.partsPayType || 'customer_pay',
      laborPayType: data.laborPayType || 'customer_pay',
      retailValueOverride: data.retailValueOverride || null,
      warrantyVendor: data.warrantyVendor || null,
      warrantyClaimNumber: data.warrantyClaimNumber || null,
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

    const existing = await db.select().from(autoLineItems).where(eq(autoLineItems.id, parseInt(req.params.id))).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Line item not found" });

    if (data.quantity != null || data.unitPriceCash != null || data.isAdjustable != null || data.isNtnf != null) {
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

    if (data.approvalStatus === 'approved') {
      updates.authorizationTimestamp = new Date();
      updates.customerRespondedAt = new Date();
      updates.authorizationMethod = data.authorizationMethod || 'in_person';
    }

    const [item] = await db.update(autoLineItems).set(updates).where(eq(autoLineItems.id, parseInt(req.params.id))).returning();
    if (!item) return res.status(404).json({ error: "Line item not found" });

    if (data.approvalStatus === 'declined' && (!existing[0]?.approvalStatus || existing[0].approvalStatus !== 'declined')) {
      const lineRo = await db.select().from(autoRepairOrders)
        .where(eq(autoRepairOrders.id, existing[0].repairOrderId)).limit(1);
      if (lineRo.length) {
        await db.insert(autoDeclinedServices).values({
          shopId: req.autoUser!.shopId,
          customerId: lineRo[0].customerId,
          vehicleId: lineRo[0].vehicleId,
          repairOrderId: lineRo[0].id,
          serviceLineId: parseInt(req.params.id),
          serviceDescription: existing[0].description,
          estimatedCost: existing[0].totalCash,
          declinedAt: new Date(),
        });
      }
    }

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
    const balanceDueCash = Math.max(0, totalCash - totalPaid);
    const balanceDueCard = Math.max(0, totalCard - totalPaid);

    res.json({ payments, totalPaid, balanceDue: balanceDueCard, balanceDueCash, balanceDueCard, totalCash: totalCash.toFixed(2), totalCard: totalCard.toFixed(2) });
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
      const balanceDueCash = Math.max(0, totalCash - totalPaid);
      const balanceDueCard = Math.max(0, totalCard - totalPaid);

      if (totalPaid >= totalCash && totalCash > 0) {
        await db.update(autoRepairOrders).set({ status: "paid", paidAt: new Date() })
          .where(eq(autoRepairOrders.id, roId));
      }

      res.json({ payment, totalPaid, balanceDue: balanceDueCard, balanceDueCash, balanceDueCard, totalCash: totalCash.toFixed(2), totalCard: totalCard.toFixed(2) });
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
// LOCATIONS
// ============================================================================

router.get("/locations", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const locations = await db.select().from(autoLocations)
      .where(eq(autoLocations.shopId, shopId))
      .orderBy(asc(autoLocations.locationNumber));
    res.json(locations);
  } catch (err: any) {
    console.error("List locations error:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

router.post("/locations", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const role = req.autoUser!.role;
    if (role !== "owner" && role !== "manager") {
      return res.status(403).json({ error: "Only owners and managers can create locations" });
    }

    const { name, addressLine1, addressLine2, city, state, zip, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Location name is required" });
    }

    const existing = await db.select({ locationNumber: autoLocations.locationNumber })
      .from(autoLocations)
      .where(eq(autoLocations.shopId, shopId))
      .orderBy(desc(autoLocations.locationNumber))
      .limit(1);

    const nextLocationNumber = existing.length > 0 ? existing[0].locationNumber + 1 : 1;

    const [location] = await db.insert(autoLocations).values({
      shopId,
      locationNumber: nextLocationNumber,
      name,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      phone: phone || null,
      isPrimary: nextLocationNumber === 1,
    }).returning();

    await db.insert(autoRoSequences).values({
      shopId,
      locationId: location.id,
      currentNumber: 0,
    });

    res.json(location);
  } catch (err: any) {
    console.error("Create location error:", err);
    res.status(500).json({ error: "Failed to create location" });
  }
});

router.patch("/locations/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const role = req.autoUser!.role;
    if (role !== "owner" && role !== "manager") {
      return res.status(403).json({ error: "Only owners and managers can update locations" });
    }

    const locationId = parseInt(req.params.id);
    const [existing] = await db.select().from(autoLocations)
      .where(and(eq(autoLocations.id, locationId), eq(autoLocations.shopId, shopId)));
    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }

    const { name, addressLine1, addressLine2, city, state, zip, phone, isActive } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (addressLine1 !== undefined) updates.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updates.addressLine2 = addressLine2;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (zip !== undefined) updates.zip = zip;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;

    const [location] = await db.update(autoLocations).set(updates)
      .where(eq(autoLocations.id, locationId))
      .returning();

    res.json(location);
  } catch (err: any) {
    console.error("Update location error:", err);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// ============================================================================
// ESTIMATES
// ============================================================================

router.get("/estimates", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const estimates = await db.select({
      id: autoRepairOrders.id,
      shopId: autoRepairOrders.shopId,
      roNumber: autoRepairOrders.roNumber,
      estimateNumber: autoRepairOrders.estimateNumber,
      status: autoRepairOrders.status,
      customerId: autoRepairOrders.customerId,
      vehicleId: autoRepairOrders.vehicleId,
      customerConcern: autoRepairOrders.customerConcern,
      internalNotes: autoRepairOrders.internalNotes,
      subtotalCash: autoRepairOrders.subtotalCash,
      subtotalCard: autoRepairOrders.subtotalCard,
      totalCash: autoRepairOrders.totalCash,
      totalCard: autoRepairOrders.totalCard,
      taxAmount: autoRepairOrders.taxAmount,
      isEstimate: autoRepairOrders.isEstimate,
      convertedToRoId: autoRepairOrders.convertedToRoId,
      convertedFromEstimateId: autoRepairOrders.convertedFromEstimateId,
      serviceAdvisorId: autoRepairOrders.serviceAdvisorId,
      advisorEmployeeId: autoRepairOrders.advisorEmployeeId,
      promisedDate: autoRepairOrders.promisedDate,
      createdAt: autoRepairOrders.createdAt,
      updatedAt: autoRepairOrders.updatedAt,
      customerFirstName: autoCustomers.firstName,
      customerLastName: autoCustomers.lastName,
      customerPhone: autoCustomers.phone,
      customerEmail: autoCustomers.email,
      vehicleYear: autoVehicles.year,
      vehicleMake: autoVehicles.make,
      vehicleModel: autoVehicles.model,
      vehicleLicensePlate: autoVehicles.licensePlate,
    })
    .from(autoRepairOrders)
    .leftJoin(autoCustomers, eq(autoRepairOrders.customerId, autoCustomers.id))
    .leftJoin(autoVehicles, eq(autoRepairOrders.vehicleId, autoVehicles.id))
    .where(and(eq(autoRepairOrders.shopId, shopId), eq(autoRepairOrders.isEstimate, true)))
    .orderBy(desc(autoRepairOrders.createdAt));

    res.json(estimates);
  } catch (err: any) {
    console.error("List estimates error:", err);
    res.status(500).json({ error: "Failed to fetch estimates" });
  }
});

router.post("/estimates", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const data = req.body;

    if (!data.customerId || !data.vehicleId) {
      return res.status(400).json({ error: "customerId and vehicleId are required" });
    }

    const estimateNumber = await generateEstimateNumber(shopId);
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const approvalShortCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [estimate] = await db.insert(autoRepairOrders).values({
      shopId,
      roNumber: estimateNumber,
      estimateNumber,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      status: "estimate",
      isEstimate: true,
      serviceAdvisorId: data.serviceAdvisorId || req.autoUser!.id,
      advisorEmployeeId: req.autoUser!.id,
      bayId: data.bayId || null,
      customerConcern: data.customerConcern || null,
      internalNotes: data.internalNotes || null,
      promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
      approvalToken,
      approvalShortCode,
    }).returning();

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "estimate",
      entityId: estimate.id,
      action: "created",
      details: { estimateNumber },
    });

    res.json(estimate);
  } catch (err: any) {
    console.error("Create estimate error:", err);
    res.status(500).json({ error: "Failed to create estimate" });
  }
});

router.get("/estimates/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const estimateId = parseInt(req.params.id);

    const [estimate] = await db.select().from(autoRepairOrders)
      .where(and(
        eq(autoRepairOrders.id, estimateId),
        eq(autoRepairOrders.shopId, shopId),
        eq(autoRepairOrders.isEstimate, true),
      ));
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });

    const [customer] = await db.select().from(autoCustomers).where(eq(autoCustomers.id, estimate.customerId));
    const [vehicle] = await db.select().from(autoVehicles).where(eq(autoVehicles.id, estimate.vehicleId));
    const lineItems = await db.select().from(autoLineItems)
      .where(eq(autoLineItems.repairOrderId, estimateId))
      .orderBy(asc(autoLineItems.sortOrder));

    let serviceAdvisor = null;
    if (estimate.serviceAdvisorId) {
      const [sa] = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName })
        .from(autoUsers).where(eq(autoUsers.id, estimate.serviceAdvisorId));
      serviceAdvisor = sa;
    }

    res.json({
      estimate,
      customer,
      vehicle,
      lineItems,
      serviceAdvisor,
      convertedToRoId: estimate.convertedToRoId,
    });
  } catch (err: any) {
    console.error("Get estimate error:", err);
    res.status(500).json({ error: "Failed to fetch estimate" });
  }
});

router.patch("/estimates/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const estimateId = parseInt(req.params.id);
    const data = req.body;

    const updates: any = { updatedAt: new Date() };
    if (data.customerConcern !== undefined) updates.customerConcern = data.customerConcern;
    if (data.internalNotes !== undefined) updates.internalNotes = data.internalNotes;
    if (data.serviceAdvisorId !== undefined) updates.serviceAdvisorId = data.serviceAdvisorId;
    if (data.promisedDate !== undefined) updates.promisedDate = data.promisedDate ? new Date(data.promisedDate) : null;
    if (data.bayId !== undefined) updates.bayId = data.bayId;
    if (data.status !== undefined) updates.status = data.status;
    if (data.technicianId !== undefined) updates.technicianId = data.technicianId;

    const [estimate] = await db.update(autoRepairOrders).set(updates)
      .where(and(
        eq(autoRepairOrders.id, estimateId),
        eq(autoRepairOrders.shopId, shopId),
        eq(autoRepairOrders.isEstimate, true),
      ))
      .returning();

    if (!estimate) return res.status(404).json({ error: "Estimate not found" });

    res.json(estimate);
  } catch (err: any) {
    console.error("Update estimate error:", err);
    res.status(500).json({ error: "Failed to update estimate" });
  }
});

router.post("/estimates/:id/convert", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const estimateId = parseInt(req.params.id);

    const [estimate] = await db.select().from(autoRepairOrders)
      .where(and(
        eq(autoRepairOrders.id, estimateId),
        eq(autoRepairOrders.shopId, shopId),
        eq(autoRepairOrders.isEstimate, true),
      ));

    if (!estimate) return res.status(404).json({ error: "Estimate not found" });
    if (estimate.convertedToRoId) {
      return res.status(400).json({ error: "Estimate has already been converted to RO", convertedToRoId: estimate.convertedToRoId });
    }

    const roResult = await generateRoNumber(shopId);
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const approvalShortCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [newRo] = await db.insert(autoRepairOrders).values({
      shopId,
      roNumber: roResult.roNumber,
      customerId: estimate.customerId,
      vehicleId: estimate.vehicleId,
      status: "estimate",
      isEstimate: false,
      convertedFromEstimateId: estimateId,
      serviceAdvisorId: estimate.serviceAdvisorId,
      advisorEmployeeId: req.autoUser!.id,
      technicianId: estimate.technicianId,
      bayId: estimate.bayId,
      customerConcern: estimate.customerConcern,
      internalNotes: estimate.internalNotes,
      promisedDate: estimate.promisedDate,
      locationId: roResult.locationId,
      approvalToken,
      approvalShortCode,
    }).returning();

    const estimateLineItems = await db.select().from(autoLineItems)
      .where(eq(autoLineItems.repairOrderId, estimateId));

    if (estimateLineItems.length > 0) {
      for (const item of estimateLineItems) {
        const { id, repairOrderId, createdAt, updatedAt, ...itemData } = item as any;
        await db.insert(autoLineItems).values({
          ...itemData,
          repairOrderId: newRo.id,
        });
      }
    }

    await db.update(autoRepairOrders).set({
      convertedToRoId: newRo.id,
      updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, estimateId));

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "estimate",
      entityId: estimateId,
      action: "converted_to_ro",
      details: { estimateId, newRoId: newRo.id, roNumber: roResult.roNumber },
    });

    res.json(newRo);
  } catch (err: any) {
    console.error("Convert estimate error:", err);
    res.status(500).json({ error: "Failed to convert estimate to repair order" });
  }
});

router.delete("/estimates/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const estimateId = parseInt(req.params.id);

    const [estimate] = await db.select().from(autoRepairOrders)
      .where(and(
        eq(autoRepairOrders.id, estimateId),
        eq(autoRepairOrders.shopId, shopId),
        eq(autoRepairOrders.isEstimate, true),
      ));

    if (!estimate) return res.status(404).json({ error: "Estimate not found" });
    if (estimate.convertedToRoId) {
      return res.status(400).json({ error: "Cannot delete an estimate that has been converted to an RO" });
    }

    await db.delete(autoLineItems).where(eq(autoLineItems.repairOrderId, estimateId));
    await db.delete(autoRepairOrders).where(eq(autoRepairOrders.id, estimateId));

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "estimate",
      entityId: estimateId,
      action: "deleted",
      details: { estimateNumber: estimate.estimateNumber },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete estimate error:", err);
    res.status(500).json({ error: "Failed to delete estimate" });
  }
});

// ============================================================================
// DOUGH GATEWAY PAYMENT PROCESSING
// ============================================================================

router.post("/dough/process-payment", autoAuth, async (req: Request, res: Response) => {
  try {
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured. Set DOUGH_SANDBOX_API_KEY." });
    }
    const { repairOrderId, token } = req.body;
    if (!repairOrderId || !token) {
      return res.status(400).json({ error: "repairOrderId and token are required" });
    }
    const shopId = req.autoUser!.shopId;
    const roData = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, repairOrderId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);
    if (!roData.length) return res.status(404).json({ error: "Repair order not found" });
    const ro = roData[0];
    const customer = await db.select().from(autoCustomers).where(eq(autoCustomers.id, ro.customerId)).limit(1);
    const totalCard = parseFloat(ro.totalCard || ro.total || "0");
    const totalCents = Math.round(totalCard * 100);
    const repairOrder = {
      repairOrderId: ro.id,
      customerName: customer.length ? `${customer[0].firstName} ${customer[0].lastName}` : "Customer",
      subtotal: Math.round(parseFloat(ro.subtotal || "0") * 100),
      tax: Math.round(parseFloat(ro.taxAmount || "0") * 100),
      total: totalCents,
      paymentType: "card_price" as const,
      lineItems: [],
    };
    const payments = new PCBAutoPaymentService(config);
    const result = await payments.processTokenPayment(repairOrder, token);
    if (result.success) {
      const amountStr = totalCard.toFixed(2);
      await db.insert(autoPayments).values({
        repairOrderId: ro.id, shopId,
        amount: amountStr, method: "card",
        status: "completed", transactionId: result.transactionId || null,
        paymentToken: token, notes: `Dough Gateway: ${result.receiptData?.authCode || ""}`,
        processedAt: new Date(),
      });
      await db.insert(autoActivityLog).values({
        shopId, userId: req.autoUser!.id,
        entityType: "payment", entityId: ro.id, action: "dough_payment_processed",
        details: { amount: amountStr, transactionId: result.transactionId, last4: result.receiptData?.last4 },
      });
      res.json({ success: true, receipt: result.receiptData });
    } else {
      res.status(400).json({ success: false, error: result.errorMessage });
    }
  } catch (err: any) {
    console.error("Dough payment error:", err);
    res.status(500).json({ error: "Payment processing failed" });
  }
});

router.post("/dough/calculate-dual-pricing", autoAuth, async (req: Request, res: Response) => {
  try {
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const { subtotalCents } = req.body;
    if (!subtotalCents || typeof subtotalCents !== "number") {
      return res.status(400).json({ error: "subtotalCents is required" });
    }
    const pricing = await payments.calculateDualPricing(subtotalCents);
    res.json(pricing);
  } catch (err: any) {
    console.error("Dual pricing calc error:", err);
    res.status(500).json({ error: "Failed to calculate pricing" });
  }
});

router.post("/dough/void", autoAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.autoUser!.role;
    if (userRole !== "owner" && userRole !== "manager") {
      return res.status(403).json({ error: "Only owners and managers can void payments" });
    }
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const { transactionId } = req.body;
    if (!transactionId) return res.status(400).json({ error: "transactionId is required" });
    const result = await payments.voidPayment(transactionId);
    res.json(result);
  } catch (err: any) {
    console.error("Dough void error:", err);
    res.status(500).json({ error: "Failed to void payment" });
  }
});

router.post("/dough/refund", autoAuth, async (req: Request, res: Response) => {
  try {
    const userRole = req.autoUser!.role;
    if (userRole !== "owner" && userRole !== "manager") {
      return res.status(403).json({ error: "Only owners and managers can issue refunds" });
    }
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const { transactionId, amount } = req.body;
    if (!transactionId) return res.status(400).json({ error: "transactionId is required" });
    const result = await payments.refundPayment(transactionId, amount);
    res.json(result);
  } catch (err: any) {
    console.error("Dough refund error:", err);
    res.status(500).json({ error: "Failed to process refund" });
  }
});

router.post("/dough/vault/create", autoAuth, async (req: Request, res: Response) => {
  try {
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const { customerName, email, token } = req.body;
    if (!customerName || !token) return res.status(400).json({ error: "customerName and token required" });
    const result = await payments.createCustomerVault(customerName, email || "", token);
    res.json(result);
  } catch (err: any) {
    console.error("Vault create error:", err);
    res.status(500).json({ error: "Failed to create customer vault" });
  }
});

router.post("/dough/vault/charge", autoAuth, async (req: Request, res: Response) => {
  try {
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const { repairOrder, customerId } = req.body;
    if (!repairOrder || !customerId) return res.status(400).json({ error: "repairOrder and customerId required" });
    const result = await payments.chargeVaultCustomer(repairOrder, customerId);
    if (result.success) {
      res.json({ success: true, receipt: result.receiptData });
    } else {
      res.status(400).json({ success: false, error: result.errorMessage });
    }
  } catch (err: any) {
    console.error("Vault charge error:", err);
    res.status(500).json({ error: "Failed to charge stored card" });
  }
});

router.get("/dough/transaction/:id", autoAuth, async (req: Request, res: Response) => {
  try {
    const { PCBAutoPaymentService, getDoughConfig } = await import("./services/dough-gateway");
    const config = getDoughConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }
    const payments = new PCBAutoPaymentService(config);
    const transaction = await payments.getTransactionDetails(req.params.id);
    res.json(transaction);
  } catch (err: any) {
    console.error("Get transaction error:", err);
    res.status(500).json({ error: "Failed to get transaction" });
  }
});

router.get("/dough/config", autoAuth, async (req: Request, res: Response) => {
  try {
    const publicKey = process.env.DOUGH_SANDBOX_PUBLIC_KEY || "";
    const gatewayUrl = process.env.NODE_ENV === "production"
      ? "https://app.doughgateway.com"
      : "https://sandbox.doughgateway.com";
    const isConfigured = !!(process.env.DOUGH_SANDBOX_API_KEY);
    res.json({ publicKey, gatewayUrl, isConfigured });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get config" });
  }
});

// Dough Gateway webhook (no auth - external, uses raw body for HMAC verification)
router.post("/dough/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.DOUGH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(503).json({ error: "Webhook not configured" });
    }
    const { createWebhookHandler } = await import("./services/dough-gateway");
    const handler = createWebhookHandler({
      clientSecret: webhookSecret,
      onTransactionSettled: async (event) => {
        console.log(`[Dough Webhook] Transaction settled: ${event.id}`);
      },
      onSettlementBatch: async (event) => {
        console.log(`[Dough Webhook] Settlement batch received: ${event.id}`);
      },
    });
    handler(req, res, () => {});
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ============================================================================
// DVI
// ============================================================================

const DEFAULT_DVI_CATEGORIES: Record<string, string[]> = {
  "Under Hood": ["Air Filter", "Battery", "Belts", "Coolant Level", "Coolant Hoses", "Power Steering Fluid", "Brake Fluid", "Transmission Fluid", "Engine Oil Level", "Wiper Fluid", "Wiper Blades"],
  "Under Vehicle": ["CV Boots/Axles", "Exhaust System", "Fuel Lines", "Oil Leaks", "Suspension Components", "Shocks/Struts", "Steering Components", "Differential Fluid", "Transfer Case Fluid", "Frame/Underbody"],
  "Brakes": ["Front Brake Pads", "Rear Brake Pads", "Front Rotors", "Rear Rotors", "Brake Lines", "Parking Brake", "Brake Calipers"],
  "Tires & Wheels": ["LF Tire Tread", "RF Tire Tread", "LR Tire Tread", "RR Tire Tread", "Tire Pressure", "Wheel Condition", "Spare Tire", "Alignment"],
  "Interior": ["Horn", "Interior Lights", "Dash Lights/Warning", "Seat Belts", "A/C System", "Heater", "Cabin Air Filter", "Power Windows", "Power Locks", "Mirrors"],
  "Exterior": ["Headlights", "Tail Lights", "Turn Signals", "Brake Lights", "Windshield", "Body Condition", "Paint Condition", "Door Handles", "Weatherstripping", "Wipers"],
  "Fluids & Filters": ["Engine Oil Condition", "Transmission Fluid Condition", "Coolant Condition", "Power Steering Fluid Condition", "Brake Fluid Condition", "Oil Filter", "Fuel Filter"],
};

async function createDviItemsFromDefaults(inspectionId: number) {
  let sortOrder = 0;
  for (const [categoryName, items] of Object.entries(DEFAULT_DVI_CATEGORIES)) {
    for (const itemName of items) {
      await db.insert(autoDviItems).values({
        inspectionId, categoryName, itemName, condition: "not_inspected", sortOrder: sortOrder++,
      });
    }
  }
}

router.get("/dvi/search", autoAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim();
    const shopId = req.autoUser!.shopId;
    const excludedStatuses = ["completed", "invoiced", "void"];

    let conditions: any[] = [
      eq(autoRepairOrders.shopId, shopId),
    ];

    let limitNum = 5;

    if (q && q.length >= 2) {
      limitNum = 10;
      const searchPattern = `%${q}%`;
      conditions.push(
        or(
          ilike(autoCustomers.firstName, searchPattern),
          ilike(autoCustomers.lastName, searchPattern),
          ilike(autoVehicles.make, searchPattern),
          ilike(autoVehicles.model, searchPattern),
          sql`CAST(${autoVehicles.year} AS TEXT) ILIKE ${searchPattern}`,
          ilike(autoRepairOrders.roNumber, searchPattern),
        )!
      );
    } else {
      conditions.push(
        sql`${autoRepairOrders.status} NOT IN ('completed', 'invoiced', 'void', 'paid')`
      );
    }

    const rows = await db.select({
      id: autoRepairOrders.id,
      roNumber: autoRepairOrders.roNumber,
      status: autoRepairOrders.status,
      customerId: autoRepairOrders.customerId,
      vehicleId: autoRepairOrders.vehicleId,
      customerFirstName: autoCustomers.firstName,
      customerLastName: autoCustomers.lastName,
      vehicleYear: autoVehicles.year,
      vehicleMake: autoVehicles.make,
      vehicleModel: autoVehicles.model,
      vehicleColor: autoVehicles.color,
      vehicleMileage: autoVehicles.mileage,
    }).from(autoRepairOrders)
      .leftJoin(autoCustomers, eq(autoRepairOrders.customerId, autoCustomers.id))
      .leftJoin(autoVehicles, eq(autoRepairOrders.vehicleId, autoVehicles.id))
      .where(and(...conditions))
      .orderBy(desc(autoRepairOrders.createdAt))
      .limit(limitNum);

    const results = [];
    for (const row of rows) {
      const existingDvi = await db.select({ id: autoDviInspections.id }).from(autoDviInspections)
        .where(eq(autoDviInspections.repairOrderId, row.id)).limit(1);
      results.push({
        id: row.id,
        roNumber: row.roNumber,
        status: row.status,
        customerId: row.customerId,
        vehicleId: row.vehicleId,
        customerName: [row.customerFirstName, row.customerLastName].filter(Boolean).join(" "),
        vehicleInfo: [row.vehicleYear, row.vehicleMake, row.vehicleModel].filter(Boolean).join(" "),
        vehicleColor: row.vehicleColor,
        vehicleMileage: row.vehicleMileage,
        hasDvi: existingDvi.length > 0,
      });
    }

    res.json(results);
  } catch (err: any) {
    console.error("DVI search error:", err);
    res.status(500).json({ error: "Failed to search repair orders" });
  }
});

router.get("/dvi/search-customers", autoAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim();
    const shopId = req.autoUser!.shopId;

    let customerConditions: any[] = [eq(autoCustomers.shopId, shopId)];
    let limitNum = 5;

    if (q && q.length >= 2) {
      limitNum = 10;
      const searchPattern = `%${q}%`;
      customerConditions.push(
        or(
          ilike(autoCustomers.firstName, searchPattern),
          ilike(autoCustomers.lastName, searchPattern),
        )!
      );
    }

    const customers = await db.select({
      id: autoCustomers.id,
      firstName: autoCustomers.firstName,
      lastName: autoCustomers.lastName,
      phone: autoCustomers.phone,
    }).from(autoCustomers)
      .where(and(...customerConditions))
      .orderBy(desc(autoCustomers.createdAt))
      .limit(limitNum);

    const results = [];
    for (const cust of customers) {
      const vehicles = await db.select({
        id: autoVehicles.id,
        year: autoVehicles.year,
        make: autoVehicles.make,
        model: autoVehicles.model,
        color: autoVehicles.color,
        vin: autoVehicles.vin,
        mileage: autoVehicles.mileage,
      }).from(autoVehicles)
        .where(and(eq(autoVehicles.customerId, cust.id), eq(autoVehicles.shopId, shopId)));

      if (q && q.length >= 2) {
        const searchPattern = `%${q}%`;
        const vehicleMatches = await db.select({
          id: autoVehicles.id,
          year: autoVehicles.year,
          make: autoVehicles.make,
          model: autoVehicles.model,
          color: autoVehicles.color,
          vin: autoVehicles.vin,
          mileage: autoVehicles.mileage,
        }).from(autoVehicles)
          .where(and(
            eq(autoVehicles.shopId, shopId),
            or(
              ilike(autoVehicles.make, searchPattern),
              ilike(autoVehicles.model, searchPattern),
              sql`CAST(${autoVehicles.year} AS TEXT) ILIKE ${searchPattern}`,
            )
          ))
          .limit(limitNum);

        const existingIds = new Set(vehicles.map(v => v.id));
        for (const vm of vehicleMatches) {
          if (!existingIds.has(vm.id)) {
            const [owner] = await db.select({
              id: autoCustomers.id,
              firstName: autoCustomers.firstName,
              lastName: autoCustomers.lastName,
              phone: autoCustomers.phone,
            }).from(autoCustomers)
              .innerJoin(autoVehicles, eq(autoVehicles.customerId, autoCustomers.id))
              .where(and(eq(autoVehicles.id, vm.id), eq(autoCustomers.shopId, shopId)));

            if (owner && !results.find(r => r.customerId === owner.id)) {
              const ownerVehicles = await db.select({
                id: autoVehicles.id,
                year: autoVehicles.year,
                make: autoVehicles.make,
                model: autoVehicles.model,
                color: autoVehicles.color,
                vin: autoVehicles.vin,
                mileage: autoVehicles.mileage,
              }).from(autoVehicles)
                .where(and(eq(autoVehicles.customerId, owner.id), eq(autoVehicles.shopId, shopId)));

              results.push({
                customerId: owner.id,
                customerName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
                customerPhone: owner.phone,
                vehicles: ownerVehicles,
              });
            }
          }
        }
      }

      if (!results.find(r => r.customerId === cust.id)) {
        results.push({
          customerId: cust.id,
          customerName: [cust.firstName, cust.lastName].filter(Boolean).join(" "),
          customerPhone: cust.phone,
          vehicles,
        });
      }
    }

    res.json(results.slice(0, 10));
  } catch (err: any) {
    console.error("DVI customer search error:", err);
    res.status(500).json({ error: "Failed to search customers" });
  }
});

router.get("/dvi/inspections", autoAuth, async (req: Request, res: Response) => {
  try {
    const inspections = await db.select({
      id: autoDviInspections.id,
      repairOrderId: autoDviInspections.repairOrderId,
      customerId: autoDviInspections.customerId,
      vehicleId: autoDviInspections.vehicleId,
      status: autoDviInspections.status,
      overallCondition: autoDviInspections.overallCondition,
      notes: autoDviInspections.notes,
      vehicleMileage: autoDviInspections.vehicleMileage,
      technicianId: autoDviInspections.technicianId,
      publicToken: autoDviInspections.publicToken,
      sentToCustomerAt: autoDviInspections.sentToCustomerAt,
      createdAt: autoDviInspections.createdAt,
    }).from(autoDviInspections)
      .where(eq(autoDviInspections.shopId, req.autoUser!.shopId))
      .orderBy(desc(autoDviInspections.createdAt));

    const result = [];
    for (const insp of inspections) {
      let ro = null, customer = null, vehicle = null, technician = null;

      if (insp.repairOrderId) {
        const [roRow] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.id, insp.repairOrderId)).limit(1);
        ro = roRow || null;
      }

      const custId = ro ? ro.customerId : insp.customerId;
      const vehId = ro ? ro.vehicleId : insp.vehicleId;

      if (custId) {
        const [c] = await db.select({ id: autoCustomers.id, firstName: autoCustomers.firstName, lastName: autoCustomers.lastName, phone: autoCustomers.phone }).from(autoCustomers).where(eq(autoCustomers.id, custId));
        customer = c || null;
      }
      if (vehId) {
        const [v] = await db.select({ id: autoVehicles.id, year: autoVehicles.year, make: autoVehicles.make, model: autoVehicles.model, licensePlate: autoVehicles.licensePlate }).from(autoVehicles).where(eq(autoVehicles.id, vehId));
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

    if (!data.repairOrderId && (!data.customerId || !data.vehicleId)) {
      return res.status(400).json({ error: "Either a repair order or both customer and vehicle are required" });
    }

    const publicToken = crypto.randomBytes(32).toString("hex");

    let customerId = data.customerId || null;
    let vehicleId = data.vehicleId || null;

    if (data.repairOrderId) {
      const [ro] = await db.select().from(autoRepairOrders)
        .where(and(eq(autoRepairOrders.id, data.repairOrderId), eq(autoRepairOrders.shopId, req.autoUser!.shopId)));
      if (ro) {
        customerId = customerId || ro.customerId;
        vehicleId = vehicleId || ro.vehicleId;
      }
    }

    const [inspection] = await db.insert(autoDviInspections).values({
      repairOrderId: data.repairOrderId || null, shopId: req.autoUser!.shopId,
      templateId: data.templateId || null, technicianId: req.autoUser!.id,
      customerId, vehicleId,
      vehicleMileage: data.vehicleMileage || null, publicToken,
      notes: data.notes || null,
    }).returning();

    let itemsCreated = false;

    if (data.templateId) {
      const [template] = await db.select().from(autoDviTemplates).where(eq(autoDviTemplates.id, data.templateId));
      if (template?.categories) {
        const categories = typeof template.categories === "string" ? JSON.parse(template.categories as string) : template.categories;
        for (const cat of categories as any[]) {
          for (const item of cat.items || []) {
            await db.insert(autoDviItems).values({
              inspectionId: inspection.id, categoryName: cat.name,
              itemName: item.name, condition: "not_inspected", sortOrder: item.sortOrder || 0,
            });
          }
        }
        itemsCreated = true;
      }
    }

    if (!itemsCreated && data.items && Array.isArray(data.items)) {
      let sortOrder = 0;
      for (const item of data.items) {
        await db.insert(autoDviItems).values({
          inspectionId: inspection.id,
          categoryName: item.categoryName || item.category || "General",
          itemName: item.itemName || item.name,
          condition: item.condition || "not_inspected",
          sortOrder: item.sortOrder ?? sortOrder++,
        });
      }
      itemsCreated = true;
    }

    if (!itemsCreated) {
      await createDviItemsFromDefaults(inspection.id);
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

router.post("/dvi/inspections/:id/create-ro", autoAuth, async (req: Request, res: Response) => {
  try {
    const inspectionId = parseInt(req.params.id);
    const shopId = req.autoUser!.shopId;

    const [inspection] = await db.select().from(autoDviInspections)
      .where(and(eq(autoDviInspections.id, inspectionId), eq(autoDviInspections.shopId, shopId)));
    if (!inspection) return res.status(404).json({ error: "Inspection not found" });
    if (inspection.repairOrderId) return res.status(400).json({ error: "Inspection already has a repair order" });
    if (!inspection.customerId || !inspection.vehicleId) {
      return res.status(400).json({ error: "Inspection must have a customer and vehicle to create an RO" });
    }

    const roResult = await generateRoNumber(shopId);
    const roNumber = roResult.roNumber;
    const approvalToken = crypto.randomBytes(32).toString("hex");
    const approvalShortCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const [ro] = await db.insert(autoRepairOrders).values({
      shopId, roNumber, customerId: inspection.customerId,
      vehicleId: inspection.vehicleId, status: "estimate",
      serviceAdvisorId: req.autoUser!.id,
      advisorEmployeeId: req.autoUser!.id,
      locationId: roResult.locationId,
      isEstimate: false,
      approvalToken, approvalShortCode,
    }).returning();

    await db.update(autoDviInspections)
      .set({ repairOrderId: ro.id, updatedAt: new Date() })
      .where(eq(autoDviInspections.id, inspectionId));

    await db.insert(autoActivityLog).values({
      shopId, userId: req.autoUser!.id,
      entityType: "repair_order", entityId: ro.id, action: "created",
      details: { roNumber, source: "dvi_inspection", inspectionId },
    });

    res.json(ro);
  } catch (err: any) {
    console.error("Create RO from inspection error:", err);
    res.status(500).json({ error: "Failed to create repair order from inspection" });
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
// ENHANCED DASHBOARD (authenticated)
// ============================================================================

router.get("/dashboard/enhanced", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const userRole = req.autoUser!.role;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;

    const todayPayments = await db.select({ amount: autoPayments.amount, tipAmount: autoPayments.tipAmount })
      .from(autoPayments)
      .where(and(eq(autoPayments.shopId, shopId), eq(autoPayments.status, "completed"),
        gte(autoPayments.processedAt, today), lte(autoPayments.processedAt, tomorrow)));
    const todayRevenue = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0") + parseFloat(p.tipAmount || "0"), 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthPayments = await db.select({ amount: autoPayments.amount, tipAmount: autoPayments.tipAmount })
      .from(autoPayments)
      .where(and(eq(autoPayments.shopId, shopId), eq(autoPayments.status, "completed"), gte(autoPayments.processedAt, monthStart)));
    const monthRevenue = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0") + parseFloat(p.tipAmount || "0"), 0);

    const openStatuses = ["estimate", "approved", "in_progress"];
    let openROsQuery = and(eq(autoRepairOrders.shopId, shopId), or(...openStatuses.map(s => eq(autoRepairOrders.status, s))));
    
    const [carsInShop] = await db.select({ count: count() }).from(autoRepairOrders).where(openROsQuery);

    const completedROs = await db.select({ totalCash: autoRepairOrders.totalCash })
      .from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.shopId, shopId), eq(autoRepairOrders.status, "completed"), gte(autoRepairOrders.updatedAt, monthStart)));
    const aro = completedROs.length > 0 
      ? completedROs.reduce((sum, ro) => sum + parseFloat(ro.totalCash || "0"), 0) / completedROs.length 
      : 0;

    const monthLineItems = await db.select({ approvalStatus: autoLineItems.approvalStatus })
      .from(autoLineItems)
      .innerJoin(autoRepairOrders, eq(autoLineItems.repairOrderId, autoRepairOrders.id))
      .where(and(eq(autoRepairOrders.shopId, shopId), gte(autoLineItems.createdAt, monthStart)));
    const approvedCount = monthLineItems.filter(li => li.approvalStatus === "approved").length;
    const approvalRate = monthLineItems.length > 0 ? Math.round((approvedCount / monthLineItems.length) * 100) : 0;

    const dpPayments = await db.select({ method: autoPayments.method, totalCash: autoRepairOrders.totalCash, totalCard: autoRepairOrders.totalCard })
      .from(autoPayments)
      .innerJoin(autoRepairOrders, eq(autoPayments.repairOrderId, autoRepairOrders.id))
      .where(and(eq(autoPayments.shopId, shopId), gte(autoPayments.processedAt, monthStart)));
    const feesSaved = dpPayments.filter(p => p.method !== 'cash')
      .reduce((sum, p) => sum + (parseFloat(p.totalCard || "0") - parseFloat(p.totalCash || "0")), 0);

    let openROConditions: any[] = [eq(autoRepairOrders.shopId, shopId), or(...openStatuses.map(s => eq(autoRepairOrders.status, s)))];
    if (startDate) openROConditions.push(gte(autoRepairOrders.createdAt, startDate));
    if (endDate) openROConditions.push(lte(autoRepairOrders.createdAt, endDate));
    
    const openROs = await db.select({
      id: autoRepairOrders.id,
      roNumber: autoRepairOrders.roNumber,
      status: autoRepairOrders.status,
      totalCash: autoRepairOrders.totalCash,
      totalCard: autoRepairOrders.totalCard,
      createdAt: autoRepairOrders.createdAt,
      customerId: autoRepairOrders.customerId,
      vehicleId: autoRepairOrders.vehicleId,
    }).from(autoRepairOrders).where(and(...openROConditions)).orderBy(desc(autoRepairOrders.createdAt)).limit(20);

    const enrichedROs = [];
    for (const ro of openROs) {
      let customer = null, vehicle = null;
      if (ro.customerId) {
        const [c] = await db.select({ firstName: autoCustomers.firstName, lastName: autoCustomers.lastName }).from(autoCustomers).where(eq(autoCustomers.id, ro.customerId));
        customer = c || null;
      }
      if (ro.vehicleId) {
        const [v] = await db.select({ year: autoVehicles.year, make: autoVehicles.make, model: autoVehicles.model }).from(autoVehicles).where(eq(autoVehicles.id, ro.vehicleId));
        vehicle = v || null;
      }
      enrichedROs.push({ ...ro, customer, vehicle });
    }

    const bays = await db.select().from(autoBays).where(and(eq(autoBays.shopId, shopId), eq(autoBays.isActive, true)));
    const totalSellableHours = bays.reduce((sum, b) => sum + parseFloat((b as any).sellableHoursPerDay || "8"), 0);
    
    const todayApts = await db.select({ estimatedDuration: autoAppointments.estimatedDuration })
      .from(autoAppointments)
      .where(and(eq(autoAppointments.shopId, shopId), gte(autoAppointments.startTime, today), lte(autoAppointments.startTime, tomorrow)));
    const bookedHours = todayApts.reduce((sum, a) => sum + (a.estimatedDuration || 60) / 60, 0);
    const availableHours = Math.max(0, totalSellableHours - bookedHours);

    const appointments = await db.select()
      .from(autoAppointments)
      .where(and(eq(autoAppointments.shopId, shopId), gte(autoAppointments.startTime, today), lte(autoAppointments.startTime, tomorrow)))
      .orderBy(asc(autoAppointments.startTime));
    
    const enrichedApts = [];
    for (const apt of appointments) {
      let customer = null, vehicle = null;
      if (apt.customerId) {
        const [c] = await db.select({ id: autoCustomers.id, firstName: autoCustomers.firstName, lastName: autoCustomers.lastName, phone: autoCustomers.phone }).from(autoCustomers).where(eq(autoCustomers.id, apt.customerId));
        customer = c || null;
      }
      if (apt.vehicleId) {
        const [v] = await db.select({ year: autoVehicles.year, make: autoVehicles.make, model: autoVehicles.model }).from(autoVehicles).where(eq(autoVehicles.id, apt.vehicleId));
        vehicle = v || null;
      }
      enrichedApts.push({ ...apt, customer, vehicle });
    }

    const dayOfWeek = today.getDay();
    const staffAvail = await db.select({
      userId: autoStaffAvailability.userId,
      startTime: autoStaffAvailability.startTime,
      endTime: autoStaffAvailability.endTime,
      isAvailable: autoStaffAvailability.isAvailable,
    }).from(autoStaffAvailability)
      .where(and(eq(autoStaffAvailability.shopId, shopId), eq(autoStaffAvailability.dayOfWeek, dayOfWeek), eq(autoStaffAvailability.isAvailable, true)));

    const timeOff = await db.select({ userId: autoStaffTimeOff.userId })
      .from(autoStaffTimeOff)
      .where(and(eq(autoStaffTimeOff.shopId, shopId), lte(autoStaffTimeOff.startDate, tomorrow), gte(autoStaffTimeOff.endDate, today), eq(autoStaffTimeOff.status, "approved")));
    const timeOffUserIds = new Set(timeOff.map(t => t.userId));

    const availableStaffIds = staffAvail.filter(s => !timeOffUserIds.has(s.userId)).map(s => s.userId);
    let staffOnDuty: { id: number; firstName: string; lastName: string; role: string }[] = [];
    if (availableStaffIds.length > 0) {
      staffOnDuty = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName, role: autoUsers.role })
        .from(autoUsers)
        .where(and(eq(autoUsers.shopId, shopId), eq(autoUsers.isActive, true), inArray(autoUsers.id, availableStaffIds)));
    }

    if (staffAvail.length === 0) {
      staffOnDuty = await db.select({ id: autoUsers.id, firstName: autoUsers.firstName, lastName: autoUsers.lastName, role: autoUsers.role })
        .from(autoUsers)
        .where(and(eq(autoUsers.shopId, shopId), eq(autoUsers.isActive, true), or(
          eq(autoUsers.role, "technician"), eq(autoUsers.role, "service_advisor"), eq(autoUsers.role, "manager")
        )));
    }

    const [totalCustomersResult] = await db.select({ count: count() }).from(autoCustomers).where(eq(autoCustomers.shopId, shopId));

    const visibility = await db.select().from(autoDashboardVisibility).where(eq(autoDashboardVisibility.shopId, shopId));

    const visibilityMap: Record<string, boolean> = {};
    const defaultCards = ["revenue", "carsInShop", "aro", "approvalRate", "feesSaved", "openRos", "quickActions", "appointmentsAvailability", "shopStats"];
    for (const cardKey of defaultCards) {
      const setting = visibility.find(v => v.cardKey === cardKey);
      if (setting) {
        if (userRole === "owner") visibilityMap[cardKey] = setting.visibleToOwner ?? true;
        else if (userRole === "manager") visibilityMap[cardKey] = setting.visibleToManager ?? true;
        else if (userRole === "service_advisor") visibilityMap[cardKey] = setting.visibleToAdvisor ?? true;
        else if (userRole === "technician") visibilityMap[cardKey] = setting.visibleToTech ?? false;
        else visibilityMap[cardKey] = true;
      } else {
        visibilityMap[cardKey] = userRole !== "technician" || ["carsInShop", "quickActions", "appointmentsAvailability"].includes(cardKey);
      }
    }

    res.json({
      todayRevenue,
      monthRevenue,
      carsInShop: carsInShop.count,
      aro: Math.round(aro * 100) / 100,
      approvalRate,
      feesSaved: Math.round(feesSaved * 100) / 100,
      openROs: enrichedROs,
      bayCapacity: { totalBays: bays.length, totalSellableHours, bookedHours: Math.round(bookedHours * 10) / 10, availableHours: Math.round(availableHours * 10) / 10 },
      appointments: enrichedApts,
      staffOnDuty,
      totalCustomers: totalCustomersResult.count,
      visibility: visibilityMap,
    });
  } catch (err: any) {
    console.error("Enhanced dashboard error:", err);
    res.status(500).json({ error: "Failed to fetch enhanced dashboard" });
  }
});

// ============================================================================
// DASHBOARD VISIBILITY SETTINGS (authenticated)
// ============================================================================

router.get("/dashboard/visibility", autoAuth, autoRequireRole("owner", "manager"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const settings = await db.select().from(autoDashboardVisibility).where(eq(autoDashboardVisibility.shopId, shopId));
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch visibility settings" });
  }
});

router.put("/dashboard/visibility", autoAuth, autoRequireRole("owner"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { settings } = req.body;
    if (!Array.isArray(settings)) return res.status(400).json({ error: "settings must be an array" });

    const results = [];
    for (const s of settings) {
      const existing = await db.select().from(autoDashboardVisibility)
        .where(and(eq(autoDashboardVisibility.shopId, shopId), eq(autoDashboardVisibility.cardKey, s.cardKey)));
      
      if (existing.length > 0) {
        const [updated] = await db.update(autoDashboardVisibility)
          .set({ visibleToOwner: s.visibleToOwner, visibleToManager: s.visibleToManager, visibleToAdvisor: s.visibleToAdvisor, visibleToTech: s.visibleToTech })
          .where(and(eq(autoDashboardVisibility.shopId, shopId), eq(autoDashboardVisibility.cardKey, s.cardKey)))
          .returning();
        results.push(updated);
      } else {
        const [created] = await db.insert(autoDashboardVisibility)
          .values({ shopId, cardKey: s.cardKey, visibleToOwner: s.visibleToOwner, visibleToManager: s.visibleToManager, visibleToAdvisor: s.visibleToAdvisor, visibleToTech: s.visibleToTech })
          .returning();
        results.push(created);
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to update visibility settings" });
  }
});

// ============================================================================
// STAFF AVAILABILITY CRUD (authenticated)
// ============================================================================

router.get("/staff/availability/:userId", autoAuth, async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const userId = parseInt(req.params.userId);
    const availability = await db.select().from(autoStaffAvailability)
      .where(and(eq(autoStaffAvailability.shopId, shopId), eq(autoStaffAvailability.userId, userId)))
      .orderBy(asc(autoStaffAvailability.dayOfWeek));
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

router.put("/staff/availability/:userId", autoAuth, autoRequireRole("owner", "manager"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const userId = parseInt(req.params.userId);
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) return res.status(400).json({ error: "schedule must be an array" });

    await db.delete(autoStaffAvailability).where(and(eq(autoStaffAvailability.shopId, shopId), eq(autoStaffAvailability.userId, userId)));
    
    const results = [];
    for (const day of schedule) {
      const [created] = await db.insert(autoStaffAvailability)
        .values({ shopId, userId, dayOfWeek: day.dayOfWeek, startTime: day.startTime, endTime: day.endTime, isAvailable: day.isAvailable ?? true })
        .returning();
      results.push(created);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// ============================================================================
// STAFF TIME OFF CRUD (authenticated)
// ============================================================================

router.get("/staff/time-off", autoAuth, async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    
    let conditions: any[] = [eq(autoStaffTimeOff.shopId, shopId)];
    if (userId) conditions.push(eq(autoStaffTimeOff.userId, userId));
    
    const timeOff = await db.select().from(autoStaffTimeOff).where(and(...conditions)).orderBy(desc(autoStaffTimeOff.startDate));
    
    const enriched = [];
    for (const t of timeOff) {
      const [user] = await db.select({ firstName: autoUsers.firstName, lastName: autoUsers.lastName })
        .from(autoUsers).where(eq(autoUsers.id, t.userId));
      enriched.push({ ...t, user: user || null });
    }
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch time off" });
  }
});

router.post("/staff/time-off", autoAuth, autoRequireRole("owner", "manager"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { userId, startDate, endDate, reason, status } = req.body;
    if (!userId || !startDate || !endDate) return res.status(400).json({ error: "userId, startDate, and endDate are required" });
    
    const [created] = await db.insert(autoStaffTimeOff)
      .values({ shopId, userId, startDate: new Date(startDate), endDate: new Date(endDate), reason: reason || null, status: status || "approved" })
      .returning();
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create time off" });
  }
});

router.delete("/staff/time-off/:id", autoAuth, autoRequireRole("owner", "manager"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(autoStaffTimeOff)
      .where(and(eq(autoStaffTimeOff.id, id), eq(autoStaffTimeOff.shopId, shopId)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Time off not found" });
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete time off" });
  }
});

// ============================================================================
// BAY CONFIGURATION (authenticated)
// ============================================================================

router.get("/bays/config", autoAuth, async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const bays = await db.select().from(autoBays).where(eq(autoBays.shopId, shopId)).orderBy(asc(autoBays.sortOrder));
    res.json(bays);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bay config" });
  }
});

router.patch("/bays/:id/config", autoAuth, autoRequireRole("owner", "manager"), async (req, res) => {
  try {
    const shopId = req.autoUser!.shopId;
    const bayId = parseInt(req.params.id);
    const { sellableHoursPerDay } = req.body;
    if (sellableHoursPerDay === undefined) return res.status(400).json({ error: "sellableHoursPerDay is required" });
    
    const [updated] = await db.update(autoBays)
      .set({ sellableHoursPerDay: sellableHoursPerDay.toString() })
      .where(and(eq(autoBays.id, bayId), eq(autoBays.shopId, shopId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Bay not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update bay config" });
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

router.get("/public/approve-short/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const [ro] = await db.select().from(autoRepairOrders).where(eq(autoRepairOrders.approvalShortCode, code));
  if (!ro || !ro.approvalToken) return res.status(404).json({ error: "Not found" });
  res.json({ token: ro.approvalToken });
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

    if (ro.status !== "estimate" && ro.status !== "sent" && ro.status !== "declined") {
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

    if (ro.status !== "estimate" && ro.status !== "sent") {
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

    if (ro.status !== "estimate" && ro.status !== "sent" && ro.status !== "declined") {
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
      newStatus = "partially_approved";
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
  { key: 'new-estimate', label: 'New Estimate', route: '/auto/repair-orders' },
  { key: 'convert-estimate', label: 'Convert Estimate', route: '/auto/repair-orders' },
  { key: 'tech-sessions', label: 'Active Techs', route: '/auto/dashboard' },
  { key: 'addon-metrics', label: 'Add-On Metrics', route: '/auto/dashboard' },
  { key: 'labor-types', label: 'Labor Types', route: '/auto/repair-orders' },
  { key: 'warranty', label: 'Warranty Repairs', route: '/auto/repair-orders' },
  { key: 'declined-services', label: 'Declined Services', route: '/auto/settings/campaigns' },
  { key: 'campaigns', label: 'Follow-Up Campaigns', route: '/auto/settings/campaigns' },
  { key: 'report-monthly', label: 'Monthly Summary', route: '/auto/reports-v2' },
  { key: 'report-advisor', label: 'Advisor Performance', route: '/auto/reports-v2' },
  { key: 'report-tech-efficiency', label: 'Tech Efficiency', route: '/auto/reports-v2' },
  { key: 'employee-numbers', label: 'Employee Setup', route: '/auto/staff' },
  { key: 'authorization', label: 'Customer Authorization', route: '/auto/repair-orders' },
  { key: 'quick-ro', label: 'Quick Repair Order', route: '/auto/repair-orders' },
  { key: 'tech-portal', label: 'Tech Portal', route: '/auto/tech-portal' },
  { key: 'settings-locations', label: 'Shop Locations', route: '/auto/settings/locations' },
  { key: 'settings-campaigns', label: 'Campaign Settings', route: '/auto/settings/campaigns' },
  { key: 'analytics', label: 'Analytics', route: '/auto/reports-v2' },
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
7. NEVER wrap [[nav:key]] tokens in markdown bold (**) or italic (*). Write them plain: [[nav:revenue]] not **[[nav:revenue]]**

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

## New Features

**Estimates vs Repair Orders:** Estimates and Repair Orders are separate. Estimates are quotes that can be converted to ROs. They have different number sequences (EST-XXXXX vs location-based). Users can find estimates on the [[nav:estimates]] page and convert them from there.

**Labor Types:** Each service line now has TWO pay type classifications — one for parts and one for labor. The three types are Customer Pay (customer pays), Internal (shop absorbs the cost), and Warranty (vendor warranty like NAPA or CarQuest). Configured on each line in [[nav:work-orders]]. See [[nav:labor-types]] for more.

**Tech Portal:** Technicians have their own view at [[nav:tech-portal]] where they clock in and out of specific RO lines. Tracks who worked on what and for how long. Techs log in with employee number + optional PIN. No pricing is visible.

**Add-On Tracking:** Lines added after RO creation are automatically flagged as add-ons. This tracks upsell effectiveness. See [[nav:addon-metrics]] on the dashboard.

**Declined Repair Follow-Ups:** When a customer declines a repair, it's saved automatically. The shop can configure automated follow-up emails/texts after configurable days (e.g., 3, 7, 14). Configure in [[nav:campaigns]].

**Reports:** Three advanced reports available at [[nav:analytics]]:
- [[nav:report-monthly]] — Total ROs, revenue, hours, average RO, add-on rates
- [[nav:report-advisor]] — Per-advisor ROs, add-on conversion, revenue
- [[nav:report-tech-efficiency]] — Billed vs actual hours, efficiency percentage

**Customer Authorization:** Every repair and add-on must be authorized by the customer with timestamps. Digital signatures can be captured. See [[nav:authorization]].

**Employee Numbers:** Each tech and advisor has a unique employee number. Set these in [[nav:employee-numbers]].

**Quick RO:** For fast repair order creation, use [[nav:quick-ro]].

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
      { text: "Who is working in the shop right now?", icon: "wrench" },
      { text: "Show me today's add-on metrics", icon: "trending-up" },
    ],
    "/auto/repair-orders": [
      { text: "How do I create a work order?", icon: "wrench" },
      { text: "How do I assign a tech?", icon: "user" },
      { text: "Where are estimates?", icon: "clipboard" },
      { text: "How do labor types work?", icon: "tag" },
      { text: "How do I mark a part as warranty?", icon: "shield" },
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
    "/auto/tech-portal": [
      { text: "How do I clock into a repair order?", icon: "clock" },
      { text: "Can I work on two lines at once?", icon: "wrench" },
      { text: "What does the asterisk mean on a line?", icon: "help-circle" },
    ],
    "/auto/reports-v2": [
      { text: "What reports are available?", icon: "bar-chart" },
      { text: "How is tech efficiency calculated?", icon: "clock" },
      { text: "Can I export to Excel?", icon: "download" },
    ],
    "/auto/settings/campaigns": [
      { text: "How do follow-up campaigns work?", icon: "mail" },
      { text: "What merge fields can I use?", icon: "type" },
      { text: "When are follow-up messages sent?", icon: "clock" },
    ],
    "/auto/staff": [
      { text: "How do employee numbers work?", icon: "hash" },
      { text: "How do I set a tech PIN?", icon: "key" },
      { text: "What roles are available?", icon: "users" },
    ],
    "/auto/settings/locations": [
      { text: "How do multiple locations work?", icon: "map-pin" },
      { text: "How does location numbering work?", icon: "hash" },
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

// ============================================================================
// TECH SESSION ROUTES
// ============================================================================

router.post("/tech-sessions/clock-in", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { repairOrderId, serviceLineId, notes } = req.body;
    const techEmployeeId = req.body.techEmployeeId || req.autoUser!.id;

    if (!repairOrderId || !serviceLineId) {
      return res.status(400).json({ error: "repairOrderId and serviceLineId are required" });
    }

    const activeSession = await db.select().from(autoTechSessions)
      .where(and(
        eq(autoTechSessions.techEmployeeId, techEmployeeId),
        eq(autoTechSessions.isActive, true),
        isNull(autoTechSessions.clockOut)
      ))
      .limit(1);

    if (activeSession.length) {
      return res.status(400).json({ error: "Technician must clock out of current session first" });
    }

    const ro = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, repairOrderId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);

    if (!ro.length) {
      return res.status(404).json({ error: "Repair order not found" });
    }

    if (ro[0].isEstimate) {
      return res.status(400).json({ error: "Cannot clock into an estimate" });
    }

    if (ro[0].status !== "in_progress") {
      return res.status(400).json({ error: "Repair order must be in_progress to clock in" });
    }

    const lineItem = await db.select().from(autoLineItems)
      .where(and(eq(autoLineItems.id, serviceLineId), eq(autoLineItems.repairOrderId, repairOrderId)))
      .limit(1);

    if (!lineItem.length) {
      return res.status(404).json({ error: "Line item not found on this repair order" });
    }

    const [session] = await db.insert(autoTechSessions).values({
      shopId,
      repairOrderId,
      serviceLineId,
      techEmployeeId,
      clockIn: new Date(),
      isActive: true,
      notes: notes || null,
    }).returning();

    res.json(session);
  } catch (err: any) {
    console.error("Clock-in error:", err);
    res.status(500).json({ error: "Clock-in failed" });
  }
});

router.post("/tech-sessions/clock-out", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { sessionId, techEmployeeId, notes } = req.body;

    let session;

    if (sessionId) {
      const results = await db.select().from(autoTechSessions)
        .where(and(
          eq(autoTechSessions.id, sessionId),
          eq(autoTechSessions.shopId, shopId),
          eq(autoTechSessions.isActive, true),
          isNull(autoTechSessions.clockOut)
        ))
        .limit(1);
      session = results[0];
    } else {
      const techId = techEmployeeId || req.autoUser!.id;
      const results = await db.select().from(autoTechSessions)
        .where(and(
          eq(autoTechSessions.techEmployeeId, techId),
          eq(autoTechSessions.shopId, shopId),
          eq(autoTechSessions.isActive, true),
          isNull(autoTechSessions.clockOut)
        ))
        .limit(1);
      session = results[0];
    }

    if (!session) {
      return res.status(404).json({ error: "No active session found" });
    }

    const clockOut = new Date();
    const durationMinutes = Math.round((clockOut.getTime() - new Date(session.clockIn).getTime()) / 60000);

    const [updated] = await db.update(autoTechSessions).set({
      clockOut,
      isActive: false,
      durationMinutes,
      notes: notes !== undefined ? notes : session.notes,
    }).where(eq(autoTechSessions.id, session.id)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("Clock-out error:", err);
    res.status(500).json({ error: "Clock-out failed" });
  }
});

router.get("/tech-sessions/active", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;

    const sessions = await db.select({
      session: autoTechSessions,
      techFirstName: autoUsers.firstName,
      techLastName: autoUsers.lastName,
      roNumber: autoRepairOrders.roNumber,
      serviceDescription: autoLineItems.description,
    })
      .from(autoTechSessions)
      .innerJoin(autoUsers, eq(autoTechSessions.techEmployeeId, autoUsers.id))
      .innerJoin(autoRepairOrders, eq(autoTechSessions.repairOrderId, autoRepairOrders.id))
      .innerJoin(autoLineItems, eq(autoTechSessions.serviceLineId, autoLineItems.id))
      .where(and(
        eq(autoTechSessions.shopId, shopId),
        eq(autoTechSessions.isActive, true),
        isNull(autoTechSessions.clockOut)
      ));

    res.json(sessions);
  } catch (err: any) {
    console.error("Active sessions error:", err);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

router.get("/tech-sessions/ro/:roId", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.roId);

    if (isNaN(roId)) return res.status(400).json({ error: "Invalid RO ID" });

    const sessions = await db.select({
      session: autoTechSessions,
      techFirstName: autoUsers.firstName,
      techLastName: autoUsers.lastName,
      serviceDescription: autoLineItems.description,
    })
      .from(autoTechSessions)
      .innerJoin(autoUsers, eq(autoTechSessions.techEmployeeId, autoUsers.id))
      .innerJoin(autoLineItems, eq(autoTechSessions.serviceLineId, autoLineItems.id))
      .where(and(
        eq(autoTechSessions.repairOrderId, roId),
        eq(autoTechSessions.shopId, shopId)
      ))
      .orderBy(desc(autoTechSessions.clockIn));

    res.json(sessions);
  } catch (err: any) {
    console.error("RO sessions error:", err);
    res.status(500).json({ error: "Failed to fetch RO sessions" });
  }
});

router.get("/tech-sessions/tech/:techId", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const techId = parseInt(req.params.techId);
    const { startDate, endDate } = req.query;

    if (isNaN(techId)) return res.status(400).json({ error: "Invalid tech ID" });

    const conditions = [
      eq(autoTechSessions.techEmployeeId, techId),
      eq(autoTechSessions.shopId, shopId),
    ];

    if (startDate) {
      conditions.push(gte(autoTechSessions.clockIn, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(autoTechSessions.clockIn, new Date(endDate as string)));
    }

    const sessions = await db.select({
      session: autoTechSessions,
      roNumber: autoRepairOrders.roNumber,
      serviceDescription: autoLineItems.description,
    })
      .from(autoTechSessions)
      .innerJoin(autoRepairOrders, eq(autoTechSessions.repairOrderId, autoRepairOrders.id))
      .innerJoin(autoLineItems, eq(autoTechSessions.serviceLineId, autoLineItems.id))
      .where(and(...conditions))
      .orderBy(desc(autoTechSessions.clockIn))
      .limit(100);

    res.json(sessions);
  } catch (err: any) {
    console.error("Tech sessions error:", err);
    res.status(500).json({ error: "Failed to fetch tech sessions" });
  }
});

// ============================================================================
// AUTHORIZATION ROUTES
// ============================================================================

router.post("/repair-orders/:id/authorize-line", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);
    const { lineItemId, method, confirmationId } = req.body;

    if (!lineItemId || !method) {
      return res.status(400).json({ error: "lineItemId and method are required" });
    }

    const validMethods = ["verbal", "text", "email", "signature", "in_person"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: `method must be one of: ${validMethods.join(", ")}` });
    }

    const ro = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);

    if (!ro.length) return res.status(404).json({ error: "Repair order not found" });

    const lineItem = await db.select().from(autoLineItems)
      .where(and(eq(autoLineItems.id, lineItemId), eq(autoLineItems.repairOrderId, roId)))
      .limit(1);

    if (!lineItem.length) return res.status(404).json({ error: "Line item not found on this repair order" });

    const now = new Date();
    const [updated] = await db.update(autoLineItems).set({
      approvalStatus: "approved",
      approvedAt: now,
      authorizationMethod: method,
      authorizationTimestamp: now,
      authorizationConfirmationId: confirmationId || null,
    }).where(eq(autoLineItems.id, lineItemId)).returning();

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "repair_order",
      entityId: roId,
      action: "line_authorized",
      details: { lineItemId, description: lineItem[0].description, method },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Authorize line error:", err);
    res.status(500).json({ error: "Failed to authorize line item" });
  }
});

router.post("/repair-orders/:id/decline-line", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);
    const { lineItemId, reason } = req.body;

    if (!lineItemId) {
      return res.status(400).json({ error: "lineItemId is required" });
    }

    const ro = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);

    if (!ro.length) return res.status(404).json({ error: "Repair order not found" });

    const lineItem = await db.select().from(autoLineItems)
      .where(and(eq(autoLineItems.id, lineItemId), eq(autoLineItems.repairOrderId, roId)))
      .limit(1);

    if (!lineItem.length) return res.status(404).json({ error: "Line item not found on this repair order" });

    const now = new Date();
    const [updated] = await db.update(autoLineItems).set({
      approvalStatus: "declined",
      declinedAt: now,
      declinedReason: reason || null,
      customerRespondedAt: now,
    }).where(eq(autoLineItems.id, lineItemId)).returning();

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "repair_order",
      entityId: roId,
      action: "line_declined",
      details: { lineItemId, description: lineItem[0].description, reason: reason || null },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Decline line error:", err);
    res.status(500).json({ error: "Failed to decline line item" });
  }
});

router.post("/repair-orders/:id/present-lines", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);
    const { lineItemIds } = req.body;

    if (!lineItemIds || !Array.isArray(lineItemIds) || lineItemIds.length === 0) {
      return res.status(400).json({ error: "lineItemIds array is required" });
    }

    const ro = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);

    if (!ro.length) return res.status(404).json({ error: "Repair order not found" });

    const now = new Date();
    const updated = await db.update(autoLineItems).set({
      presentedToCustomer: true,
      presentedAt: now,
      presentedByAdvisorId: req.autoUser!.id,
    }).where(and(
      inArray(autoLineItems.id, lineItemIds),
      eq(autoLineItems.repairOrderId, roId)
    )).returning();

    res.json(updated);
  } catch (err: any) {
    console.error("Present lines error:", err);
    res.status(500).json({ error: "Failed to present line items" });
  }
});

router.post("/repair-orders/:id/signature", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);
    const { signatureData, method } = req.body;

    if (!signatureData) {
      return res.status(400).json({ error: "signatureData is required" });
    }

    const ro = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)))
      .limit(1);

    if (!ro.length) return res.status(404).json({ error: "Repair order not found" });

    const now = new Date();
    const sigMethod = method || "digital";

    await db.update(autoRepairOrders).set({
      customerSignatureData: signatureData,
      customerSignatureTimestamp: now,
      customerSignatureIp: req.ip || null,
      customerSignatureMethod: sigMethod,
      updatedAt: now,
    }).where(eq(autoRepairOrders.id, roId));

    await db.update(autoLineItems).set({
      approvalStatus: "approved",
      authorizationMethod: "signature",
      authorizationTimestamp: now,
    }).where(and(
      eq(autoLineItems.repairOrderId, roId),
      eq(autoLineItems.approvalStatus, "pending"),
      eq(autoLineItems.presentedToCustomer, true)
    ));

    await db.insert(autoActivityLog).values({
      shopId,
      userId: req.autoUser!.id,
      entityType: "repair_order",
      entityId: roId,
      action: "signature_captured",
      details: { method: sigMethod },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Signature error:", err);
    res.status(500).json({ error: "Failed to save signature" });
  }
});

// ============================================================================
// EMPLOYEE NUMBER SETUP ROUTES
// ============================================================================

router.patch("/users/:id/employee-number", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const userId = parseInt(req.params.id);
    const { employeeNumber } = req.body;

    if (!employeeNumber) {
      return res.status(400).json({ error: "employeeNumber is required" });
    }

    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

    const isSelf = userId === req.autoUser!.id;
    const isOwnerOrManager = req.autoUser!.role === "owner" || req.autoUser!.role === "manager";

    if (!isSelf && !isOwnerOrManager) {
      return res.status(403).json({ error: "Only owner/manager can update other users' employee numbers" });
    }

    const targetUser = await db.select().from(autoUsers)
      .where(and(eq(autoUsers.id, userId), eq(autoUsers.shopId, shopId)))
      .limit(1);

    if (!targetUser.length) return res.status(404).json({ error: "User not found" });

    const existing = await db.select().from(autoUsers)
      .where(and(
        eq(autoUsers.shopId, shopId),
        eq(autoUsers.employeeNumber, employeeNumber),
        sql`${autoUsers.id} != ${userId}`
      ))
      .limit(1);

    if (existing.length) {
      return res.status(400).json({ error: "Employee number already in use within this shop" });
    }

    const [updated] = await db.update(autoUsers).set({
      employeeNumber,
      updatedAt: new Date(),
    }).where(eq(autoUsers.id, userId)).returning();

    const { passwordHash, resetToken, resetTokenExpiresAt, ...userWithoutSensitive } = updated;
    res.json(userWithoutSensitive);
  } catch (err: any) {
    console.error("Update employee number error:", err);
    res.status(500).json({ error: "Failed to update employee number" });
  }
});

router.post("/users/employee-login", async (req: Request, res: Response) => {
  try {
    const { employeeNumber, pin, shopId } = req.body;

    if (!employeeNumber || !pin || !shopId) {
      return res.status(400).json({ error: "employeeNumber, pin, and shopId are required" });
    }

    const users = await db.select().from(autoUsers)
      .where(and(
        eq(autoUsers.employeeNumber, employeeNumber),
        eq(autoUsers.shopId, shopId),
        eq(autoUsers.isActive, true)
      ))
      .limit(1);

    if (!users.length) {
      return res.status(401).json({ error: "Invalid employee number or PIN" });
    }

    const user = users[0];

    if (!user.pin || user.pin !== pin) {
      return res.status(401).json({ error: "Invalid employee number or PIN" });
    }

    await db.update(autoUsers).set({ lastLoginAt: new Date() }).where(eq(autoUsers.id, user.id));

    const authUser: AutoAuthUser = {
      id: user.id,
      shopId: user.shopId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    const token = generateToken(authUser);
    res.json({ token, user: authUser });
  } catch (err: any) {
    console.error("Employee login error:", err);
    res.status(500).json({ error: "Employee login failed" });
  }
});

// ============================================================================
// RO CLOSE SNAPSHOT LOGIC
// ============================================================================

async function generateCloseSnapshot(shopId: number, roId: number) {
  const [ro] = await db.select().from(autoRepairOrders)
    .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)));
  if (!ro) throw new Error("Repair order not found");

  const lineItems = await db.select().from(autoLineItems)
    .where(eq(autoLineItems.repairOrderId, roId));

  const techSessions = await db.select({
    session: autoTechSessions,
    tech: { firstName: autoUsers.firstName, lastName: autoUsers.lastName },
  }).from(autoTechSessions)
    .leftJoin(autoUsers, eq(autoTechSessions.techEmployeeId, autoUsers.id))
    .where(eq(autoTechSessions.repairOrderId, roId));

  const totalLines = lineItems.length;
  const originalLines = lineItems.filter(li => li.lineOrigin === "original").length;
  const addonLines = lineItems.filter(li => li.lineOrigin === "addon" || li.lineOrigin === "inspection_finding").length;
  const inspectionLines = lineItems.filter(li => li.lineOrigin === "inspection_finding").length;

  const addonItems = lineItems.filter(li => li.lineOrigin === "addon" || li.lineOrigin === "inspection_finding");
  const approvedAddonLines = addonItems.filter(li => li.approvalStatus === "approved").length;
  const declinedAddonLines = addonItems.filter(li => li.approvalStatus === "declined").length;

  let totalPartsRevenue = 0, totalLaborRevenue = 0, totalFeesRevenue = 0, totalSubletRevenue = 0;
  let totalDiscount = 0;
  let totalCustomerPay = 0, totalInternalCharges = 0, totalWarrantyCharges = 0;
  let totalBilledHours = 0;

  for (const li of lineItems) {
    const amount = parseFloat(li.totalCash) || 0;
    const discountCash = parseFloat(li.discountAmountCash || "0") || 0;
    totalDiscount += discountCash;

    if (li.type === "labor") {
      totalLaborRevenue += amount;
    } else if (li.type === "part" || li.type === "parts") {
      totalPartsRevenue += amount;
    } else if (li.type === "fee" || li.type === "fees") {
      totalFeesRevenue += amount;
    } else if (li.type === "sublet") {
      totalSubletRevenue += amount;
    } else {
      totalPartsRevenue += amount;
    }

    const payType = li.partsPayType || li.laborPayType || "customer_pay";
    if (payType === "customer_pay") {
      totalCustomerPay += amount;
    } else if (payType === "internal") {
      totalInternalCharges += amount;
    } else if (payType === "warranty") {
      totalWarrantyCharges += amount;
    } else {
      totalCustomerPay += amount;
    }

    if (li.laborHours) {
      totalBilledHours += parseFloat(li.laborHours) || 0;
    }
  }

  let totalActualMinutes = 0;
  const techSummary: any[] = [];
  for (const ts of techSessions) {
    const mins = ts.session.durationMinutes || 0;
    totalActualMinutes += mins;
    techSummary.push({
      techId: ts.session.techEmployeeId,
      techName: ts.tech ? `${ts.tech.firstName} ${ts.tech.lastName}` : "Unknown",
      serviceLineId: ts.session.serviceLineId,
      billedHours: 0,
      actualMinutes: mins,
      clockIn: ts.session.clockIn,
      clockOut: ts.session.clockOut,
    });
  }

  for (const entry of techSummary) {
    const li = lineItems.find(l => l.id === entry.serviceLineId);
    if (li && li.laborHours) {
      entry.billedHours = parseFloat(li.laborHours) || 0;
    }
  }

  const totalActualHours = totalActualMinutes / 60;

  const [snapshot] = await db.insert(autoRoCloseSnapshots).values({
    shopId,
    repairOrderId: roId,
    locationId: ro.locationId,
    advisorEmployeeId: ro.advisorEmployeeId || ro.serviceAdvisorId,
    roNumber: ro.roNumber,
    customerId: ro.customerId,
    vehicleId: ro.vehicleId,
    totalLines,
    originalLines,
    addonLines,
    inspectionLines,
    approvedAddonLines,
    declinedAddonLines,
    totalPartsRevenue: totalPartsRevenue.toFixed(2),
    totalLaborRevenue: totalLaborRevenue.toFixed(2),
    totalFeesRevenue: totalFeesRevenue.toFixed(2),
    totalSubletRevenue: totalSubletRevenue.toFixed(2),
    totalDiscount: totalDiscount.toFixed(2),
    totalCustomerPay: totalCustomerPay.toFixed(2),
    totalInternalCharges: totalInternalCharges.toFixed(2),
    totalWarrantyCharges: totalWarrantyCharges.toFixed(2),
    totalBilledHours: totalBilledHours.toFixed(2),
    totalActualHours: totalActualHours.toFixed(2),
    techSummary,
    closedAt: new Date(),
  }).returning();

  const declinedItems = lineItems.filter(li => li.approvalStatus === "declined");
  for (const li of declinedItems) {
    const existingDeclined = await db.select().from(autoDeclinedServices)
      .where(and(eq(autoDeclinedServices.serviceLineId, li.id), eq(autoDeclinedServices.shopId, shopId)))
      .limit(1);
    if (!existingDeclined.length) {
      await db.insert(autoDeclinedServices).values({
        shopId,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        repairOrderId: roId,
        serviceLineId: li.id,
        serviceDescription: li.description,
        estimatedCost: li.totalCash,
        declinedAt: li.declinedAt || new Date(),
      });
    }
  }

  return snapshot;
}

router.post("/repair-orders/:id/close/validate", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);

    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    const warnings: { type: string; message: string; count?: number }[] = [];

    const activeSessions = await db.select().from(autoTechSessions)
      .where(and(eq(autoTechSessions.repairOrderId, roId), eq(autoTechSessions.isActive, true)));
    if (activeSessions.length > 0) {
      warnings.push({
        type: "active_sessions",
        message: `${activeSessions.length} technician(s) still clocked in. They will be auto-clocked out.`,
        count: activeSessions.length,
      });
    }

    if (!ro.customerSignatureData) {
      warnings.push({ type: "unsigned", message: "Customer has not signed this repair order." });
    }

    if (!ro.mileageIn) {
      warnings.push({ type: "no_mileage", message: "Mileage was not recorded." });
    }

    const pendingAddons = await db.select().from(autoLineItems)
      .where(and(
        eq(autoLineItems.repairOrderId, roId),
        sql`${autoLineItems.lineOrigin} != 'original'`,
        eq(autoLineItems.approvalStatus, 'pending')
      ));
    if (pendingAddons.length > 0) {
      warnings.push({
        type: "pending_addons",
        message: `${pendingAddons.length} add-on line(s) still pending customer approval. They will be marked as declined.`,
        count: pendingAddons.length,
      });
    }

    res.json({ warnings, canClose: true });
  } catch (err: any) {
    console.error("RO close validation error:", err);
    res.status(500).json({ error: "Failed to validate" });
  }
});

router.post("/repair-orders/:id/close", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const roId = parseInt(req.params.id);

    const [ro] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, roId), eq(autoRepairOrders.shopId, shopId)));
    if (!ro) return res.status(404).json({ error: "Repair order not found" });

    if (ro.isEstimate) {
      return res.status(400).json({ error: "Cannot close an estimate. Convert to RO first." });
    }

    if (!["in_progress", "ready_for_pickup"].includes(ro.status)) {
      return res.status(400).json({ error: `Cannot close RO with status "${ro.status}". Must be in_progress or ready_for_pickup.` });
    }

    const activeSessions = await db.select().from(autoTechSessions)
      .where(and(eq(autoTechSessions.repairOrderId, roId), eq(autoTechSessions.isActive, true)));
    for (const session of activeSessions) {
      const now = new Date();
      const durationMinutes = Math.round((now.getTime() - new Date(session.clockIn).getTime()) / 60000);
      await db.update(autoTechSessions).set({
        clockOut: now, durationMinutes, isActive: false, autoClockOut: true,
      }).where(eq(autoTechSessions.id, session.id));
    }

    const pendingAddons = await db.select().from(autoLineItems)
      .where(and(
        eq(autoLineItems.repairOrderId, roId),
        sql`${autoLineItems.lineOrigin} != 'original'`,
        eq(autoLineItems.approvalStatus, 'pending')
      ));
    for (const addon of pendingAddons) {
      await db.update(autoLineItems).set({
        approvalStatus: 'declined',
        declinedAt: new Date(),
      }).where(eq(autoLineItems.id, addon.id));

      await db.insert(autoDeclinedServices).values({
        shopId,
        customerId: ro.customerId,
        vehicleId: ro.vehicleId,
        repairOrderId: roId,
        serviceLineId: addon.id,
        serviceDescription: addon.description,
        estimatedCost: addon.totalCash,
        declinedAt: new Date(),
      });
    }

    const snapshot = await generateCloseSnapshot(shopId, roId);

    await db.update(autoRepairOrders).set({
      status: "completed", completedAt: new Date(), updatedAt: new Date(),
    }).where(eq(autoRepairOrders.id, roId));

    await db.insert(autoActivityLog).values({
      shopId, userId: req.autoUser!.id,
      entityType: "repair_order", entityId: roId, action: "ro_closed",
      details: { roNumber: ro.roNumber, snapshotId: snapshot.id },
    });

    res.json(snapshot);
  } catch (err: any) {
    console.error("RO close error:", err);
    res.status(500).json({ error: "Failed to close repair order" });
  }
});

// ============================================================================
// DECLINED SERVICES ROUTES
// ============================================================================

router.get("/declined-services", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { customerId, vehicleId, followUpSent, startDate, endDate } = req.query;

    const conditions: any[] = [eq(autoDeclinedServices.shopId, shopId)];
    if (customerId) conditions.push(eq(autoDeclinedServices.customerId, parseInt(customerId as string)));
    if (vehicleId) conditions.push(eq(autoDeclinedServices.vehicleId, parseInt(vehicleId as string)));
    if (followUpSent === "true") conditions.push(eq(autoDeclinedServices.followUpSent, true));
    if (followUpSent === "false") conditions.push(eq(autoDeclinedServices.followUpSent, false));
    if (startDate) conditions.push(gte(autoDeclinedServices.declinedAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(autoDeclinedServices.declinedAt, new Date(endDate as string)));

    const results = await db.select({
      declined: autoDeclinedServices,
      customerName: sql<string>`${autoCustomers.firstName} || ' ' || ${autoCustomers.lastName}`,
      vehicleInfo: sql<string>`${autoVehicles.year} || ' ' || ${autoVehicles.make} || ' ' || ${autoVehicles.model}`,
    }).from(autoDeclinedServices)
      .leftJoin(autoCustomers, eq(autoDeclinedServices.customerId, autoCustomers.id))
      .leftJoin(autoVehicles, eq(autoDeclinedServices.vehicleId, autoVehicles.id))
      .where(and(...conditions))
      .orderBy(desc(autoDeclinedServices.declinedAt));

    res.json(results);
  } catch (err: any) {
    console.error("Declined services list error:", err);
    res.status(500).json({ error: "Failed to fetch declined services" });
  }
});

router.get("/declined-services/customer/:customerId", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const customerId = parseInt(req.params.customerId);

    const results = await db.select({
      declined: autoDeclinedServices,
      vehicleInfo: sql<string>`${autoVehicles.year} || ' ' || ${autoVehicles.make} || ' ' || ${autoVehicles.model}`,
      roNumber: autoRepairOrders.roNumber,
    }).from(autoDeclinedServices)
      .leftJoin(autoVehicles, eq(autoDeclinedServices.vehicleId, autoVehicles.id))
      .leftJoin(autoRepairOrders, eq(autoDeclinedServices.repairOrderId, autoRepairOrders.id))
      .where(and(eq(autoDeclinedServices.shopId, shopId), eq(autoDeclinedServices.customerId, customerId)))
      .orderBy(desc(autoDeclinedServices.declinedAt));

    res.json(results);
  } catch (err: any) {
    console.error("Customer declined services error:", err);
    res.status(500).json({ error: "Failed to fetch customer declined services" });
  }
});

router.get("/declined-services/pending-followup", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;

    const results = await db.select({
      declined: autoDeclinedServices,
      customerName: sql<string>`${autoCustomers.firstName} || ' ' || ${autoCustomers.lastName}`,
      customerEmail: autoCustomers.email,
      customerPhone: autoCustomers.phone,
      vehicleInfo: sql<string>`${autoVehicles.year} || ' ' || ${autoVehicles.make} || ' ' || ${autoVehicles.model}`,
    }).from(autoDeclinedServices)
      .leftJoin(autoCustomers, eq(autoDeclinedServices.customerId, autoCustomers.id))
      .leftJoin(autoVehicles, eq(autoDeclinedServices.vehicleId, autoVehicles.id))
      .where(and(
        eq(autoDeclinedServices.shopId, shopId),
        eq(autoDeclinedServices.followUpSent, false),
        sql`${autoDeclinedServices.convertedToRoId} IS NULL`
      ))
      .orderBy(autoDeclinedServices.declinedAt);

    res.json(results);
  } catch (err: any) {
    console.error("Pending follow-up error:", err);
    res.status(500).json({ error: "Failed to fetch pending follow-ups" });
  }
});

router.post("/declined-services/:id/mark-followed-up", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const id = parseInt(req.params.id);
    const { response } = req.body;

    const [updated] = await db.update(autoDeclinedServices).set({
      followUpSent: true,
      followUpSentAt: new Date(),
      followUpResponse: response || null,
    }).where(and(eq(autoDeclinedServices.id, id), eq(autoDeclinedServices.shopId, shopId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Declined service not found" });
    res.json(updated);
  } catch (err: any) {
    console.error("Mark followed up error:", err);
    res.status(500).json({ error: "Failed to mark as followed up" });
  }
});

router.post("/declined-services/:id/convert", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const id = parseInt(req.params.id);
    const { repairOrderId } = req.body;

    if (!repairOrderId) return res.status(400).json({ error: "repairOrderId is required" });

    const [declined] = await db.select().from(autoDeclinedServices)
      .where(and(eq(autoDeclinedServices.id, id), eq(autoDeclinedServices.shopId, shopId)));
    if (!declined) return res.status(404).json({ error: "Declined service not found" });

    const [targetRo] = await db.select().from(autoRepairOrders)
      .where(and(eq(autoRepairOrders.id, repairOrderId), eq(autoRepairOrders.shopId, shopId)));
    if (!targetRo) return res.status(404).json({ error: "Target repair order not found" });

    const [newLineItem] = await db.insert(autoLineItems).values({
      repairOrderId,
      type: "labor",
      description: declined.serviceDescription,
      unitPriceCash: declined.estimatedCost || "0",
      unitPriceCard: declined.estimatedCost || "0",
      totalCash: declined.estimatedCost || "0",
      totalCard: declined.estimatedCost || "0",
      lineOrigin: "addon",
      approvalStatus: "pending",
      addedAt: new Date(),
    }).returning();

    await db.update(autoDeclinedServices).set({
      convertedToRoId: repairOrderId,
    }).where(eq(autoDeclinedServices.id, id));

    res.json(newLineItem);
  } catch (err: any) {
    console.error("Convert declined service error:", err);
    res.status(500).json({ error: "Failed to convert declined service" });
  }
});

// ============================================================================
// CAMPAIGN SETTINGS ROUTES
// ============================================================================

router.get("/campaign-settings", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const [settings] = await db.select().from(autoCampaignSettings)
      .where(eq(autoCampaignSettings.shopId, shopId));

    if (!settings) {
      return res.json({
        shopId,
        declinedFollowupEnabled: true,
        declinedFollowupDays: "3,7,14",
        declinedFollowupChannel: "email",
        declinedFollowupEmailTemplate: null,
        declinedFollowupSmsTemplate: null,
      });
    }

    res.json(settings);
  } catch (err: any) {
    console.error("Campaign settings fetch error:", err);
    res.status(500).json({ error: "Failed to fetch campaign settings" });
  }
});

router.put("/campaign-settings", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const role = req.autoUser!.role;

    if (!["owner", "manager"].includes(role)) {
      return res.status(403).json({ error: "Only owners and managers can update campaign settings" });
    }

    const { declinedFollowupEnabled, declinedFollowupDays, declinedFollowupChannel,
            declinedFollowupEmailTemplate, declinedFollowupSmsTemplate } = req.body;

    const [existing] = await db.select().from(autoCampaignSettings)
      .where(eq(autoCampaignSettings.shopId, shopId));

    let result;
    if (existing) {
      [result] = await db.update(autoCampaignSettings).set({
        declinedFollowupEnabled: declinedFollowupEnabled ?? existing.declinedFollowupEnabled,
        declinedFollowupDays: declinedFollowupDays ?? existing.declinedFollowupDays,
        declinedFollowupChannel: declinedFollowupChannel ?? existing.declinedFollowupChannel,
        declinedFollowupEmailTemplate: declinedFollowupEmailTemplate ?? existing.declinedFollowupEmailTemplate,
        declinedFollowupSmsTemplate: declinedFollowupSmsTemplate ?? existing.declinedFollowupSmsTemplate,
        updatedAt: new Date(),
      }).where(eq(autoCampaignSettings.id, existing.id)).returning();
    } else {
      [result] = await db.insert(autoCampaignSettings).values({
        shopId,
        declinedFollowupEnabled: declinedFollowupEnabled ?? true,
        declinedFollowupDays: declinedFollowupDays ?? "3,7,14",
        declinedFollowupChannel: declinedFollowupChannel ?? "email",
        declinedFollowupEmailTemplate: declinedFollowupEmailTemplate || null,
        declinedFollowupSmsTemplate: declinedFollowupSmsTemplate || null,
      }).returning();
    }

    res.json(result);
  } catch (err: any) {
    console.error("Campaign settings update error:", err);
    res.status(500).json({ error: "Failed to update campaign settings" });
  }
});

// ============================================================================
// REPORTING ENDPOINTS
// ============================================================================

router.get("/reports/monthly-summary", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { month, locationId } = req.query;

    if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "month query param required in YYYY-MM format" });
    }

    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    const conditions: any[] = [
      eq(autoRoCloseSnapshots.shopId, shopId),
      gte(autoRoCloseSnapshots.closedAt, monthStart),
      lte(autoRoCloseSnapshots.closedAt, nextMonth),
    ];
    if (locationId) conditions.push(eq(autoRoCloseSnapshots.locationId, parseInt(locationId as string)));

    const snapshots = await db.select().from(autoRoCloseSnapshots)
      .where(and(...conditions));

    const totalRosClosed = snapshots.length;
    let totalPartsRevenue = 0, totalLaborRevenue = 0, totalFeesRevenue = 0, totalSubletRevenue = 0;
    let totalDiscount = 0;
    let customerPay = 0, internal = 0, warranty = 0;
    let totalBilledHours = 0, totalActualHours = 0;
    let totalAddonLines = 0, totalApprovedAddon = 0, totalDeclinedAddon = 0;

    for (const s of snapshots) {
      totalPartsRevenue += parseFloat(s.totalPartsRevenue || "0");
      totalLaborRevenue += parseFloat(s.totalLaborRevenue || "0");
      totalFeesRevenue += parseFloat(s.totalFeesRevenue || "0");
      totalSubletRevenue += parseFloat(s.totalSubletRevenue || "0");
      totalDiscount += parseFloat(s.totalDiscount || "0");
      customerPay += parseFloat(s.totalCustomerPay || "0");
      internal += parseFloat(s.totalInternalCharges || "0");
      warranty += parseFloat(s.totalWarrantyCharges || "0");
      totalBilledHours += parseFloat(s.totalBilledHours || "0");
      totalActualHours += parseFloat(s.totalActualHours || "0");
      totalAddonLines += s.addonLines;
      totalApprovedAddon += s.approvedAddonLines;
      totalDeclinedAddon += s.declinedAddonLines;
    }

    const totalRevenue = customerPay + internal + warranty;
    const avgRevenuePerRo = totalRosClosed > 0 ? totalRevenue / totalRosClosed : 0;
    const avgBilledHoursPerRo = totalRosClosed > 0 ? totalBilledHours / totalRosClosed : 0;
    const efficiency = totalActualHours > 0 ? (totalBilledHours / totalActualHours) * 100 : 0;
    const addonApprovalRate = (totalApprovedAddon + totalDeclinedAddon) > 0
      ? (totalApprovedAddon / (totalApprovedAddon + totalDeclinedAddon)) * 100 : 0;

    res.json({
      month,
      totalRosClosed,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      avgRevenuePerRo: parseFloat(avgRevenuePerRo.toFixed(2)),
      totalPartsRevenue: parseFloat(totalPartsRevenue.toFixed(2)),
      totalLaborRevenue: parseFloat(totalLaborRevenue.toFixed(2)),
      totalFeesRevenue: parseFloat(totalFeesRevenue.toFixed(2)),
      totalSubletRevenue: parseFloat(totalSubletRevenue.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      revenueByPayType: {
        customerPay: parseFloat(customerPay.toFixed(2)),
        internal: parseFloat(internal.toFixed(2)),
        warranty: parseFloat(warranty.toFixed(2)),
      },
      totalBilledHours: parseFloat(totalBilledHours.toFixed(2)),
      totalActualHours: parseFloat(totalActualHours.toFixed(2)),
      avgBilledHoursPerRo: parseFloat(avgBilledHoursPerRo.toFixed(2)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      totalAddonLines,
      addonApprovalRate: parseFloat(addonApprovalRate.toFixed(1)),
    });
  } catch (err: any) {
    console.error("Monthly summary report error:", err);
    res.status(500).json({ error: "Failed to generate monthly summary report" });
  }
});

router.get("/reports/advisor-performance", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate query params required" });
    }

    const conditions: any[] = [
      eq(autoRoCloseSnapshots.shopId, shopId),
      gte(autoRoCloseSnapshots.closedAt, new Date(startDate as string)),
      lte(autoRoCloseSnapshots.closedAt, new Date(endDate as string)),
    ];

    const snapshots = await db.select({
      snapshot: autoRoCloseSnapshots,
      advisorFirstName: autoUsers.firstName,
      advisorLastName: autoUsers.lastName,
    }).from(autoRoCloseSnapshots)
      .leftJoin(autoUsers, eq(autoRoCloseSnapshots.advisorEmployeeId, autoUsers.id))
      .where(and(...conditions));

    const advisorMap = new Map<number, {
      advisorId: number; advisorName: string;
      rosClosed: number; totalRevenue: number;
      addonLinesPresented: number; approvedAddon: number; declinedAddon: number;
    }>();

    for (const row of snapshots) {
      const advisorId = row.snapshot.advisorEmployeeId || 0;
      const advisorName = row.advisorFirstName && row.advisorLastName
        ? `${row.advisorFirstName} ${row.advisorLastName}` : "Unassigned";

      if (!advisorMap.has(advisorId)) {
        advisorMap.set(advisorId, {
          advisorId, advisorName,
          rosClosed: 0, totalRevenue: 0,
          addonLinesPresented: 0, approvedAddon: 0, declinedAddon: 0,
        });
      }
      const data = advisorMap.get(advisorId)!;
      data.rosClosed += 1;
      data.totalRevenue += parseFloat(row.snapshot.totalCustomerPay || "0")
        + parseFloat(row.snapshot.totalInternalCharges || "0")
        + parseFloat(row.snapshot.totalWarrantyCharges || "0");
      data.addonLinesPresented += row.snapshot.approvedAddonLines + row.snapshot.declinedAddonLines;
      data.approvedAddon += row.snapshot.approvedAddonLines;
      data.declinedAddon += row.snapshot.declinedAddonLines;
    }

    const advisors = Array.from(advisorMap.values()).map(a => ({
      advisorId: a.advisorId,
      advisorName: a.advisorName,
      rosClosed: a.rosClosed,
      totalRevenue: parseFloat(a.totalRevenue.toFixed(2)),
      avgRevenuePerRo: a.rosClosed > 0 ? parseFloat((a.totalRevenue / a.rosClosed).toFixed(2)) : 0,
      addonLinesPresented: a.addonLinesPresented,
      addonApprovalRate: (a.approvedAddon + a.declinedAddon) > 0
        ? parseFloat(((a.approvedAddon / (a.approvedAddon + a.declinedAddon)) * 100).toFixed(1)) : 0,
    }));

    res.json({ startDate, endDate, advisors });
  } catch (err: any) {
    console.error("Advisor performance report error:", err);
    res.status(500).json({ error: "Failed to generate advisor performance report" });
  }
});

router.get("/reports/tech-efficiency", autoAuth, async (req: Request, res: Response) => {
  try {
    const shopId = req.autoUser!.shopId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate query params required" });
    }

    const sessions = await db.select({
      session: autoTechSessions,
      techFirstName: autoUsers.firstName,
      techLastName: autoUsers.lastName,
      billedHours: autoLineItems.laborHours,
    }).from(autoTechSessions)
      .leftJoin(autoUsers, eq(autoTechSessions.techEmployeeId, autoUsers.id))
      .leftJoin(autoLineItems, eq(autoTechSessions.serviceLineId, autoLineItems.id))
      .where(and(
        eq(autoTechSessions.shopId, shopId),
        gte(autoTechSessions.clockIn, new Date(startDate as string)),
        lte(autoTechSessions.clockIn, new Date(endDate as string)),
      ));

    const techMap = new Map<number, {
      techId: number; techName: string;
      totalSessions: number; totalActualMinutes: number; totalBilledHours: number;
    }>();

    for (const row of sessions) {
      const techId = row.session.techEmployeeId;
      const techName = row.techFirstName && row.techLastName
        ? `${row.techFirstName} ${row.techLastName}` : "Unknown";

      if (!techMap.has(techId)) {
        techMap.set(techId, {
          techId, techName,
          totalSessions: 0, totalActualMinutes: 0, totalBilledHours: 0,
        });
      }
      const data = techMap.get(techId)!;
      data.totalSessions += 1;
      data.totalActualMinutes += row.session.durationMinutes || 0;
      data.totalBilledHours += parseFloat(row.billedHours || "0");
    }

    const techs = Array.from(techMap.values()).map(t => {
      const actualHours = t.totalActualMinutes / 60;
      return {
        techId: t.techId,
        techName: t.techName,
        totalSessions: t.totalSessions,
        totalActualMinutes: t.totalActualMinutes,
        totalBilledHours: parseFloat(t.totalBilledHours.toFixed(2)),
        avgSessionDuration: t.totalSessions > 0 ? parseFloat((t.totalActualMinutes / t.totalSessions).toFixed(1)) : 0,
        efficiency: actualHours > 0 ? parseFloat(((t.totalBilledHours / actualHours) * 100).toFixed(1)) : 0,
      };
    });

    res.json({ startDate, endDate, techs });
  } catch (err: any) {
    console.error("Tech efficiency report error:", err);
    res.status(500).json({ error: "Failed to generate tech efficiency report" });
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

      // Ensure demo staff exist (manager + technicians + service advisor)
      const demoStaff = [
        { email: "mike@demo.com", firstName: "Mike", lastName: "Thompson", phone: "(317) 555-0901", role: "technician", pin: "1234", payType: "flat_rate", payRate: "30.00" },
        { email: "sarah@demo.com", firstName: "Sarah", lastName: "Kim", phone: "(317) 555-0902", role: "technician", pin: "5678", payType: "hourly", payRate: "27.00" },
        { email: "dave@demo.com", firstName: "Dave", lastName: "Rodriguez", phone: "(317) 555-0903", role: "technician", pin: "9012", payType: "hourly", payRate: "25.00" },
        { email: "jessica@demo.com", firstName: "Jessica", lastName: "Adams", phone: "(317) 555-0904", role: "service_advisor", pin: "3456", payType: "salary", payRate: "52000.00" },
        { email: "manager@demo.com", firstName: "Rachel", lastName: "Martinez", phone: "(317) 555-0905", role: "manager", pin: "7890", payType: "salary", payRate: "65000.00" },
      ];
      for (const s of demoStaff) {
        const exists = await db.select().from(autoUsers).where(eq(autoUsers.email, s.email)).limit(1);
        if (!exists.length) {
          await db.insert(autoUsers).values({ shopId, passwordHash: freshHash, isActive: true, ...s });
          console.log(`[AutoInit] Created demo staff: ${s.firstName} ${s.lastName} (${s.role})`);
        }
      }

      // Seed sample data for demo
      await seedDemoData(shopId, ownerId);
    } catch (err) {
      console.error("[AutoInit] Failed to seed demo data:", err);
    }
  })();

  // Auto clock-out scheduler - runs every 15 minutes
  setInterval(async () => {
    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const expiredSessions = await db.select().from(autoTechSessions)
        .where(and(
          eq(autoTechSessions.isActive, true),
          lte(autoTechSessions.clockIn, twelveHoursAgo)
        ));
      
      for (const session of expiredSessions) {
        const clockOut = new Date();
        const durationMinutes = Math.round((clockOut.getTime() - new Date(session.clockIn).getTime()) / 60000);
        await db.update(autoTechSessions)
          .set({
            clockOut,
            isActive: false,
            autoClockOut: true,
            durationMinutes,
          })
          .where(eq(autoTechSessions.id, session.id));
      }
      
      if (expiredSessions.length > 0) {
        console.log(`Auto clock-out: ${expiredSessions.length} sessions expired`);
      }
    } catch (err) {
      console.error("Auto clock-out error:", err);
    }
  }, 15 * 60 * 1000); // Every 15 minutes

  // Declined repair follow-up scheduler - runs every 4 hours
  setInterval(async () => {
    try {
      // Get all shops with declined followup enabled
      const campaignSettings = await db.select()
        .from(autoCampaignSettings)
        .where(eq(autoCampaignSettings.declinedFollowupEnabled, true));

      if (campaignSettings.length === 0) {
        return;
      }

      let totalFollowupsSent = 0;

      for (const settings of campaignSettings) {
        try {
          // Parse follow-up day intervals (e.g., "3,7,14")
          const followupDays = (settings.declinedFollowupDays || "3,7,14")
            .split(",")
            .map(d => parseInt(d.trim()))
            .filter(d => !isNaN(d) && d > 0);

          if (followupDays.length === 0) {
            continue;
          }

          // Get shop details
          const shop = await db.select().from(autoShops)
            .where(eq(autoShops.id, settings.shopId))
            .limit(1);

          if (!shop.length) {
            continue;
          }

          const shopRecord = shop[0];

          // For each follow-up day interval, find matching declined services
          for (const dayInterval of followupDays) {
            const followupDueDate = new Date();
            followupDueDate.setDate(followupDueDate.getDate() - dayInterval);

            // Get declined services that are due for follow-up
            const declinedServicesToFollowUp = await db.select({
              declinedService: autoDeclinedServices,
              customer: autoCustomers,
              vehicle: autoVehicles,
            })
              .from(autoDeclinedServices)
              .innerJoin(autoCustomers, eq(autoDeclinedServices.customerId, autoCustomers.id))
              .innerJoin(autoVehicles, eq(autoDeclinedServices.vehicleId, autoVehicles.id))
              .where(and(
                eq(autoDeclinedServices.shopId, settings.shopId),
                eq(autoDeclinedServices.followUpSent, false),
                isNull(autoDeclinedServices.convertedToRoId),
                lte(autoDeclinedServices.declinedAt, followupDueDate)
              ));

            // Send follow-up emails
            for (const record of declinedServicesToFollowUp) {
              try {
                const { declinedService, customer, vehicle } = record;

                // Build merge fields
                const customerName = `${customer.firstName} ${customer.lastName}`;
                const vehicleYearMakeModel = [vehicle.year, vehicle.make, vehicle.model]
                  .filter(Boolean)
                  .join(" ");

                // Get email template (use default if not configured)
                let emailTemplate = settings.declinedFollowupEmailTemplate;
                if (!emailTemplate) {
                  emailTemplate = `Subject: Recommended Service for Your {vehicle_year_make_model}

Hi {customer_name},

During your recent visit to {shop_name}, our technician recommended the following service for your {vehicle_year_make_model}:

• {service_description}

This recommendation was made to help keep your vehicle running safely and reliably. We wanted to follow up in case you'd like to schedule this service.

Give us a call at {shop_phone} or reply to this email to set up an appointment.

Thank you,
{shop_name}`;
                }

                // Parse subject and body
                const [subjectLine, ...bodyLines] = emailTemplate.split("\n");
                const subject = (subjectLine.startsWith("Subject: ") 
                  ? subjectLine.replace("Subject: ", "") 
                  : subjectLine)
                  .replace("{customer_name}", customerName)
                  .replace("{vehicle_year_make_model}", vehicleYearMakeModel)
                  .replace("{service_description}", declinedService.serviceDescription)
                  .replace("{shop_name}", shopRecord.name)
                  .replace("{shop_phone}", shopRecord.phone || "");

                const body = bodyLines
                  .join("\n")
                  .replace("{customer_name}", customerName)
                  .replace("{vehicle_year_make_model}", vehicleYearMakeModel)
                  .replace("{service_description}", declinedService.serviceDescription)
                  .replace("{shop_name}", shopRecord.name)
                  .replace("{shop_phone}", shopRecord.phone || "");

                // Send email via Resend
                if (customer.email) {
                  const { apiKey, fromEmail } = await getCredentials();
                  const resend = new Resend(apiKey);

                  // Convert plain text to HTML
                  const htmlBody = body
                    .split("\n\n")
                    .map(para => `<p style="margin: 12px 0; color: #333; font-family: Arial, sans-serif;">${para.replace(/\n/g, "<br>")}</p>`)
                    .join("");

                  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background: #f5f5f5;">
  <div style="background: #111827; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${shopRecord.name}</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none;">
    ${htmlBody}
  </div>
  <div style="background: #f9fafb; padding: 20px; text-align: center; border: 1px solid #ddd; border-top: none;">
    <p style="margin: 0; font-size: 12px; color: #999;">
      ${shopRecord.name}${shopRecord.phone ? ` | ${shopRecord.phone}` : ""}
    </p>
  </div>
</body>
</html>`;

                  const { data: result, error } = await resend.emails.send({
                    from: `${shopRecord.name} <service@pcbisv.com>`,
                    to: [customer.email],
                    subject,
                    html: emailHtml,
                  });

                  if (error) {
                    console.error(`[DeclinedFollowup] Failed to send to ${customer.email}:`, error);
                    continue;
                  }

                  // Update declined service record
                  await db.update(autoDeclinedServices)
                    .set({
                      followUpSent: true,
                      followUpSentAt: new Date(),
                      followUpCampaignId: settings.id,
                    })
                    .where(eq(autoDeclinedServices.id, declinedService.id));

                  // Log activity
                  await db.insert(autoActivityLog).values({
                    shopId: settings.shopId,
                    entityType: "declined_service",
                    entityId: declinedService.id,
                    action: "followup_sent",
                    details: {
                      customerId: customer.id,
                      vehicleId: vehicle.id,
                      serviceDescription: declinedService.serviceDescription,
                      dayInterval,
                      emailSentTo: customer.email,
                    },
                  });

                  totalFollowupsSent++;
                  console.log(`[DeclinedFollowup] Sent to ${customer.email} for ${vehicleYearMakeModel} - ID: ${result?.id}`);
                } else {
                  console.warn(`[DeclinedFollowup] No email for customer ${customer.id}`);
                }
              } catch (err: any) {
                console.error(`[DeclinedFollowup] Error sending follow-up:`, err?.message || err);
              }
            }
          }
        } catch (err: any) {
          console.error(`[DeclinedFollowup] Error processing shop ${settings.shopId}:`, err?.message || err);
        }
      }

      if (totalFollowupsSent > 0) {
        console.log(`[DeclinedFollowup] Sent ${totalFollowupsSent} follow-up emails`);
      }
    } catch (err) {
      console.error("[DeclinedFollowup] Scheduler error:", err);
    }
  }, 4 * 60 * 60 * 1000); // Every 4 hours
}
