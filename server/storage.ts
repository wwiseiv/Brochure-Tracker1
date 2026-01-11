import { 
  brochures, 
  drops, 
  reminders,
  userPreferences,
  organizations,
  organizationMembers,
  type Brochure,
  type InsertBrochure,
  type Drop,
  type InsertDrop,
  type Reminder,
  type InsertReminder,
  type DropWithBrochure,
  type UserPreferences,
  type UpdateUserPreferences,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type OrgMemberRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Brochures
  getBrochure(id: string): Promise<Brochure | undefined>;
  createBrochure(brochure: InsertBrochure): Promise<Brochure>;
  updateBrochureStatus(id: string, status: string): Promise<Brochure | undefined>;
  
  // Drops
  getDrop(id: number): Promise<DropWithBrochure | undefined>;
  getDropsByAgent(agentId: string): Promise<DropWithBrochure[]>;
  createDrop(drop: InsertDrop): Promise<Drop>;
  updateDrop(id: number, data: Partial<Drop>): Promise<Drop | undefined>;
  
  // Reminders
  getReminder(id: number): Promise<Reminder | undefined>;
  getRemindersByDrop(dropId: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder | undefined>;
  
  // Demo data
  seedDemoData(agentId: string): Promise<void>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, data: UpdateUserPreferences): Promise<UserPreferences | undefined>;
  
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganizationMember(orgId: number, userId: string): Promise<OrganizationMember | undefined>;
  getUserMembership(userId: string): Promise<(OrganizationMember & { organization: Organization }) | undefined>;
  getOrganizationMembers(orgId: number): Promise<OrganizationMember[]>;
  createOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(id: number, data: Partial<Pick<OrganizationMember, 'role' | 'managerId'>>): Promise<OrganizationMember | undefined>;
  updateOrganizationMemberRole(id: number, role: OrgMemberRole): Promise<OrganizationMember | undefined>;
  deleteOrganizationMember(id: number): Promise<boolean>;
  getAgentsByManager(managerId: number): Promise<OrganizationMember[]>;
}

export class DatabaseStorage implements IStorage {
  // Brochures
  async getBrochure(id: string): Promise<Brochure | undefined> {
    const [brochure] = await db.select().from(brochures).where(eq(brochures.id, id));
    return brochure;
  }

  async createBrochure(brochure: InsertBrochure): Promise<Brochure> {
    const [created] = await db.insert(brochures).values(brochure).returning();
    return created;
  }

  async updateBrochureStatus(id: string, status: string): Promise<Brochure | undefined> {
    const [updated] = await db
      .update(brochures)
      .set({ status })
      .where(eq(brochures.id, id))
      .returning();
    return updated;
  }

  // Drops
  async getDrop(id: number): Promise<DropWithBrochure | undefined> {
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(eq(drops.id, id));
    
    if (result.length === 0) return undefined;
    
    const { drops: drop, brochures: brochure } = result[0];
    return { ...drop, brochure: brochure || undefined };
  }

  async getDropsByAgent(agentId: string): Promise<DropWithBrochure[]> {
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(eq(drops.agentId, agentId))
      .orderBy(desc(drops.droppedAt));
    
    return result.map(({ drops: drop, brochures: brochure }) => ({
      ...drop,
      brochure: brochure || undefined,
    }));
  }

  async createDrop(drop: InsertDrop): Promise<Drop> {
    const [created] = await db.insert(drops).values(drop).returning();
    return created;
  }

  async updateDrop(id: number, data: Partial<Drop>): Promise<Drop | undefined> {
    const [updated] = await db
      .update(drops)
      .set(data)
      .where(eq(drops.id, id))
      .returning();
    return updated;
  }

  // Reminders
  async getReminder(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async getRemindersByDrop(dropId: number): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.dropId, dropId));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(data)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async seedDemoData(agentId: string): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const demoData = [
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-001`,
        businessName: "Golden Gate Bistro",
        businessType: "restaurant",
        businessPhone: "(415) 555-0123",
        contactName: "Maria Santos",
        address: "123 Market Street, San Francisco, CA 94102",
        latitude: 37.7749,
        longitude: -122.4194,
        textNotes: "Owner was very interested in payment processing solutions. High foot traffic location near Union Square. Best time to follow up is after lunch rush around 2pm.",
        pickupScheduledFor: tomorrow,
        status: "pending",
      },
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-002`,
        businessName: "Tech Auto Repair",
        businessType: "auto",
        businessPhone: "(415) 555-0456",
        contactName: "James Chen",
        address: "789 Mission Street, San Francisco, CA 94103",
        latitude: 37.7851,
        longitude: -122.4056,
        textNotes: "Busy auto shop with 3 service bays. Currently using outdated payment terminal. Manager interested in modern POS system.",
        pickupScheduledFor: nextWeek,
        status: "pending",
      },
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-003`,
        businessName: "Sunset Nail Spa",
        businessType: "salon",
        businessPhone: "(415) 555-0789",
        contactName: "Lisa Nguyen",
        address: "456 Irving Street, San Francisco, CA 94122",
        latitude: 37.7642,
        longitude: -122.4621,
        textNotes: "Popular nail salon in Sunset district. Owner mentioned they need better tip handling for employees.",
        pickupScheduledFor: yesterday,
        status: "pending",
      },
    ];

    for (const demo of demoData) {
      try {
        const existingBrochure = await this.getBrochure(demo.brochureId);
        if (!existingBrochure) {
          await this.createBrochure({
            id: demo.brochureId,
            batch: "Demo Batch",
            status: "deployed",
          });
        }

        // Insert directly to bypass schema validation for demo data
        await db.insert(drops).values({
          brochureId: demo.brochureId,
          agentId: agentId,
          businessName: demo.businessName,
          businessType: demo.businessType,
          businessPhone: demo.businessPhone,
          contactName: demo.contactName,
          address: demo.address,
          latitude: demo.latitude,
          longitude: demo.longitude,
          textNotes: demo.textNotes,
          pickupScheduledFor: demo.pickupScheduledFor,
          status: demo.status,
        });
      } catch (error) {
        console.error(`Error seeding demo data for ${demo.businessName}:`, error);
      }
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async createUserPreferences(userId: string): Promise<UserPreferences> {
    const [created] = await db.insert(userPreferences).values({
      userId,
      notificationsEnabled: true,
      reminderHoursBefore: 24,
      emailNotifications: true,
      pushNotifications: true,
    }).returning();
    return created;
  }

  async updateUserPreferences(userId: string, data: UpdateUserPreferences): Promise<UserPreferences | undefined> {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated;
  }

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(data).returning();
    return created;
  }

  async getOrganizationMember(orgId: number, userId: string): Promise<OrganizationMember | undefined> {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return member;
  }

  async getOrganizationMembers(orgId: number): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.orgId, orgId));
  }

  async createOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(data).returning();
    return created;
  }

  async getUserMembership(userId: string): Promise<(OrganizationMember & { organization: Organization }) | undefined> {
    const result = await db
      .select()
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.orgId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
    
    if (result.length === 0) return undefined;
    
    const { organization_members: member, organizations: org } = result[0];
    return { ...member, organization: org };
  }

  async updateOrganizationMember(id: number, data: Partial<Pick<OrganizationMember, 'role' | 'managerId'>>): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set(data)
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async updateOrganizationMemberRole(id: number, role: OrgMemberRole): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set({ role })
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async deleteOrganizationMember(id: number): Promise<boolean> {
    const result = await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, id))
      .returning();
    return result.length > 0;
  }

  async getAgentsByManager(managerId: number): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.managerId, managerId));
  }
}

export const storage = new DatabaseStorage();
