import { 
  brochures, 
  drops, 
  reminders,
  type Brochure,
  type InsertBrochure,
  type Drop,
  type InsertDrop,
  type Reminder,
  type InsertReminder,
  type DropWithBrochure,
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
}

export const storage = new DatabaseStorage();
