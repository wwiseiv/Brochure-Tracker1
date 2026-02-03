/**
 * Digest Database Layer
 * =====================
 * 
 * Database schema and queries for digest preferences and tracking.
 * 
 * INSTALLATION:
 *   Copy to: server/services/digest-db.ts
 *   Run migration to create tables
 */

import { db } from '../db';
import { 
  pgTable, 
  serial, 
  integer, 
  varchar, 
  text,
  boolean, 
  timestamp, 
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { eq, and, gte, lte, isNull, or, desc, sql } from 'drizzle-orm';
import type { 
  UserDigestPreferences, 
  PendingNotification,
  DigestFrequency,
} from './smart-digest-scheduler';

// ============================================
// SCHEMA DEFINITIONS
// ============================================

/**
 * User digest preferences table
 */
export const userDigestPreferences = pgTable('user_digest_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique(),
  frequency: varchar('frequency', { length: 20 }).notNull().default('daily'),
  preferredTime: varchar('preferred_time', { length: 5 }).notNull().default('09:00'),
  preferredDay: integer('preferred_day'), // 0-6 for weekly
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/New_York'),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  categories: jsonb('categories').notNull().default([]),
  lastDigestSent: timestamp('last_digest_sent'),
  pausedUntil: timestamp('paused_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('digest_prefs_user_id_idx').on(table.userId),
  frequencyIdx: index('digest_prefs_frequency_idx').on(table.frequency),
  enabledIdx: index('digest_prefs_enabled_idx').on(table.emailEnabled),
}));

/**
 * Notifications table (if not already exists)
 */
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  read: boolean('read').notNull().default(false),
  includedInDigest: boolean('included_in_digest').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  categoryIdx: index('notifications_category_idx').on(table.category),
  digestIdx: index('notifications_digest_idx').on(table.includedInDigest, table.userId),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

/**
 * Digest history for tracking and analytics
 */
export const digestHistory = pgTable('digest_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  notificationCount: integer('notification_count').notNull(),
  categories: jsonb('categories').notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  reason: varchar('reason', { length: 20 }).notNull(), // scheduled, threshold, manual
  success: boolean('success').notNull(),
  error: text('error'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('digest_history_user_id_idx').on(table.userId),
  sentAtIdx: index('digest_history_sent_at_idx').on(table.sentAt),
}));

// ============================================
// TYPE CONVERSIONS
// ============================================

function dbToUserPreferences(row: any): UserDigestPreferences {
  return {
    userId: row.userId,
    frequency: row.frequency as DigestFrequency,
    preferredTime: row.preferredTime,
    preferredDay: row.preferredDay ?? undefined,
    timezone: row.timezone,
    emailEnabled: row.emailEnabled,
    categories: (row.categories as string[]) || [],
    lastDigestSent: row.lastDigestSent ?? undefined,
    pausedUntil: row.pausedUntil ?? undefined,
  };
}

function dbToNotification(row: any): PendingNotification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    category: row.category,
    title: row.title,
    message: row.message,
    data: row.data as Record<string, any> | undefined,
    createdAt: row.createdAt,
    read: row.read,
    includedInDigest: row.includedInDigest,
  };
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get all users with digest preferences enabled
 */
export async function getAllUserPreferences(): Promise<UserDigestPreferences[]> {
  const rows = await db
    .select()
    .from(userDigestPreferences)
    .where(eq(userDigestPreferences.emailEnabled, true));
  
  return rows.map(dbToUserPreferences);
}

/**
 * Get digest preferences for a specific user
 */
export async function getUserDigestPreferences(
  userId: number
): Promise<UserDigestPreferences | null> {
  const [row] = await db
    .select()
    .from(userDigestPreferences)
    .where(eq(userDigestPreferences.userId, userId))
    .limit(1);
  
  return row ? dbToUserPreferences(row) : null;
}

/**
 * Create or update user digest preferences
 */
export async function upsertUserPreferences(
  userId: number,
  preferences: Partial<Omit<UserDigestPreferences, 'userId'>>
): Promise<UserDigestPreferences> {
  const existing = await getUserDigestPreferences(userId);
  
  if (existing) {
    const [updated] = await db
      .update(userDigestPreferences)
      .set({
        ...preferences,
        updatedAt: new Date(),
      })
      .where(eq(userDigestPreferences.userId, userId))
      .returning();
    
    return dbToUserPreferences(updated);
  } else {
    const [created] = await db
      .insert(userDigestPreferences)
      .values({
        userId,
        frequency: preferences.frequency || 'daily',
        preferredTime: preferences.preferredTime || '09:00',
        preferredDay: preferences.preferredDay,
        timezone: preferences.timezone || 'America/New_York',
        emailEnabled: preferences.emailEnabled ?? true,
        categories: preferences.categories || [],
      })
      .returning();
    
    return dbToUserPreferences(created);
  }
}

/**
 * Get pending notifications for a user
 */
export async function getPendingNotifications(
  userId: number,
  maxAgeHours: number
): Promise<PendingNotification[]> {
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  const rows = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.includedInDigest, false),
      gte(notifications.createdAt, cutoffDate)
    ))
    .orderBy(desc(notifications.createdAt));
  
  return rows.map(dbToNotification);
}

/**
 * Mark notifications as included in digest
 */
export async function markNotificationsDigested(
  notificationIds: number[]
): Promise<void> {
  if (notificationIds.length === 0) return;
  
  await db
    .update(notifications)
    .set({ includedInDigest: true })
    .where(sql`${notifications.id} = ANY(${notificationIds})`);
}

/**
 * Update last digest sent timestamp
 */
export async function updateLastDigestSent(
  userId: number,
  sentAt: Date
): Promise<void> {
  await db
    .update(userDigestPreferences)
    .set({ 
      lastDigestSent: sentAt,
      updatedAt: new Date(),
    })
    .where(eq(userDigestPreferences.userId, userId));
}

/**
 * Record digest in history
 */
export async function recordDigestHistory(
  userId: number,
  data: {
    notificationCount: number;
    categories: string[];
    frequency: string;
    reason: string;
    success: boolean;
    error?: string;
  }
): Promise<void> {
  await db.insert(digestHistory).values({
    userId,
    notificationCount: data.notificationCount,
    categories: data.categories,
    frequency: data.frequency,
    reason: data.reason,
    success: data.success,
    error: data.error,
    sentAt: new Date(),
  });
}

/**
 * Get digest history for a user
 */
export async function getDigestHistory(
  userId: number,
  limit: number = 20
): Promise<Array<{
  id: number;
  notificationCount: number;
  categories: string[];
  frequency: string;
  reason: string;
  success: boolean;
  error?: string;
  sentAt: Date;
}>> {
  const rows = await db
    .select()
    .from(digestHistory)
    .where(eq(digestHistory.userId, userId))
    .orderBy(desc(digestHistory.sentAt))
    .limit(limit);
  
  return rows.map(row => ({
    id: row.id,
    notificationCount: row.notificationCount,
    categories: row.categories as string[],
    frequency: row.frequency,
    reason: row.reason,
    success: row.success,
    error: row.error ?? undefined,
    sentAt: row.sentAt,
  }));
}

/**
 * Get users who need digest based on timing
 * More efficient query that pre-filters at database level
 */
export async function getUsersReadyForDigest(): Promise<{
  immediate: UserDigestPreferences[];
  daily: UserDigestPreferences[];
  weekly: UserDigestPreferences[];
}> {
  const now = new Date();
  
  // Get all enabled users
  const rows = await db
    .select()
    .from(userDigestPreferences)
    .where(and(
      eq(userDigestPreferences.emailEnabled, true),
      or(
        isNull(userDigestPreferences.pausedUntil),
        lte(userDigestPreferences.pausedUntil, now)
      )
    ));
  
  const result = {
    immediate: [] as UserDigestPreferences[],
    daily: [] as UserDigestPreferences[],
    weekly: [] as UserDigestPreferences[],
  };
  
  for (const row of rows) {
    const prefs = dbToUserPreferences(row);
    
    switch (prefs.frequency) {
      case 'immediate':
        result.immediate.push(prefs);
        break;
      case 'daily':
        result.daily.push(prefs);
        break;
      case 'weekly':
        result.weekly.push(prefs);
        break;
    }
  }
  
  return result;
}

/**
 * Get notification counts by user (for efficient batch processing)
 */
export async function getNotificationCountsByUser(
  userIds: number[],
  maxAgeHours: number
): Promise<Map<number, number>> {
  if (userIds.length === 0) return new Map();
  
  const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  
  const rows = await db
    .select({
      userId: notifications.userId,
      count: sql<number>`COUNT(*)`,
    })
    .from(notifications)
    .where(and(
      sql`${notifications.userId} = ANY(${userIds})`,
      eq(notifications.includedInDigest, false),
      gte(notifications.createdAt, cutoffDate)
    ))
    .groupBy(notifications.userId);
  
  return new Map(rows.map(r => [r.userId, r.count]));
}

// ============================================
// MIGRATION SQL
// ============================================

export const MIGRATION_SQL = `
-- User digest preferences
CREATE TABLE IF NOT EXISTS user_digest_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  preferred_time VARCHAR(5) NOT NULL DEFAULT '09:00',
  preferred_day INTEGER,
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  categories JSONB NOT NULL DEFAULT '[]',
  last_digest_sent TIMESTAMP,
  paused_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS digest_prefs_user_id_idx ON user_digest_preferences(user_id);
CREATE INDEX IF NOT EXISTS digest_prefs_frequency_idx ON user_digest_preferences(frequency);
CREATE INDEX IF NOT EXISTS digest_prefs_enabled_idx ON user_digest_preferences(email_enabled);

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  included_in_digest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_category_idx ON notifications(category);
CREATE INDEX IF NOT EXISTS notifications_digest_idx ON notifications(included_in_digest, user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- Digest history
CREATE TABLE IF NOT EXISTS digest_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  notification_count INTEGER NOT NULL,
  categories JSONB NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  reason VARCHAR(20) NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS digest_history_user_id_idx ON digest_history(user_id);
CREATE INDEX IF NOT EXISTS digest_history_sent_at_idx ON digest_history(sent_at);
`;

// ============================================
// FACTORY FUNCTION
// ============================================

import { SmartDigestScheduler, DigestSchedulerConfig } from './smart-digest-scheduler';

/**
 * Create a configured digest scheduler with database integration
 */
export function createDigestScheduler(
  config: Partial<DigestSchedulerConfig> = {},
  emailSender: (user: UserDigestPreferences, notifications: PendingNotification[]) => Promise<void>
): SmartDigestScheduler {
  return new SmartDigestScheduler(config, {
    getUserPreferences: getAllUserPreferences,
    getNotificationsForUser: getPendingNotifications,
    sendDigestEmail: emailSender,
    markNotificationsAsDigested: markNotificationsDigested,
    updateLastDigestSent: updateLastDigestSent,
  });
}

export default {
  getAllUserPreferences,
  getUserDigestPreferences,
  upsertUserPreferences,
  getPendingNotifications,
  markNotificationsDigested,
  updateLastDigestSent,
  recordDigestHistory,
  getDigestHistory,
  getUsersReadyForDigest,
  getNotificationCountsByUser,
  createDigestScheduler,
  MIGRATION_SQL,
};
