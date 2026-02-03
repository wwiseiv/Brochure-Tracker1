/**
 * Smart Email Digest Scheduler
 * =============================
 * 
 * Intelligent email digest processing that:
 * - Only processes users who have pending notifications
 * - Respects user timezone and preferred delivery times
 * - Batches users efficiently
 * - Tracks digest history to avoid duplicates
 * - Supports multiple digest frequencies (immediate, daily, weekly)
 * 
 * INSTALLATION:
 *   Copy to: server/services/smart-digest-scheduler.ts
 */

import { EventEmitter } from 'events';

// ============================================
// CONFIGURATION
// ============================================

export interface DigestSchedulerConfig {
  /** Minimum interval between scheduler runs (ms, default: 60000 = 1 min) */
  minCheckInterval: number;
  
  /** Maximum users to process per batch (default: 50) */
  batchSize: number;
  
  /** Delay between batches (ms, default: 1000) */
  batchDelay: number;
  
  /** Minimum notifications to trigger immediate digest (default: 5) */
  immediateThreshold: number;
  
  /** Hours to consider "business hours" for immediate digests */
  businessHoursStart: number;
  businessHoursEnd: number;
  
  /** Default timezone if user hasn't set one */
  defaultTimezone: string;
  
  /** Maximum age of notifications to include (hours, default: 168 = 1 week) */
  maxNotificationAge: number;
  
  /** Enable debug logging */
  debug: boolean;
}

const DEFAULT_CONFIG: DigestSchedulerConfig = {
  minCheckInterval: 60000,      // 1 minute
  batchSize: 50,
  batchDelay: 1000,
  immediateThreshold: 5,
  businessHoursStart: 8,        // 8 AM
  businessHoursEnd: 20,         // 8 PM
  defaultTimezone: 'America/New_York',
  maxNotificationAge: 168,      // 1 week
  debug: false,
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DigestFrequency = 'immediate' | 'daily' | 'weekly' | 'none';

export interface UserDigestPreferences {
  userId: number;
  frequency: DigestFrequency;
  preferredTime: string;        // HH:MM format (e.g., "09:00")
  preferredDay?: number;        // 0-6 for weekly (0 = Sunday)
  timezone: string;
  emailEnabled: boolean;
  categories: string[];         // Which notification types to include
  lastDigestSent?: Date;
  pausedUntil?: Date;
}

export interface PendingNotification {
  id: number;
  userId: number;
  type: string;
  category: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
  read: boolean;
  includedInDigest: boolean;
}

export interface DigestCandidate {
  user: UserDigestPreferences;
  notifications: PendingNotification[];
  reason: 'scheduled' | 'threshold' | 'manual';
  priority: number;
}

export interface DigestResult {
  userId: number;
  success: boolean;
  notificationCount: number;
  error?: string;
  sentAt: Date;
}

export interface SchedulerStats {
  lastRun: Date | null;
  totalRuns: number;
  totalDigestsSent: number;
  totalNotificationsProcessed: number;
  averageProcessingTime: number;
  usersSkipped: number;
  errors: number;
}

// ============================================
// TIMEZONE UTILITIES
// ============================================

/**
 * Get current time in user's timezone
 */
function getUserLocalTime(timezone: string): Date {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    return new Date(
      parseInt(getPart('year')),
      parseInt(getPart('month')) - 1,
      parseInt(getPart('day')),
      parseInt(getPart('hour')),
      parseInt(getPart('minute'))
    );
  } catch {
    return new Date();
  }
}

/**
 * Check if current time is within user's preferred delivery window
 */
function isWithinDeliveryWindow(
  user: UserDigestPreferences,
  windowMinutes: number = 30
): boolean {
  const localTime = getUserLocalTime(user.timezone);
  const [prefHour, prefMinute] = user.preferredTime.split(':').map(Number);
  
  const currentMinutes = localTime.getHours() * 60 + localTime.getMinutes();
  const preferredMinutes = prefHour * 60 + prefMinute;
  
  const diff = Math.abs(currentMinutes - preferredMinutes);
  return diff <= windowMinutes || diff >= (24 * 60 - windowMinutes);
}

/**
 * Check if it's business hours in user's timezone
 */
function isBusinessHours(
  user: UserDigestPreferences,
  config: DigestSchedulerConfig
): boolean {
  const localTime = getUserLocalTime(user.timezone);
  const hour = localTime.getHours();
  return hour >= config.businessHoursStart && hour < config.businessHoursEnd;
}

/**
 * Check if today is the user's preferred day (for weekly digests)
 */
function isPreferredDay(user: UserDigestPreferences): boolean {
  if (user.preferredDay === undefined) return true;
  
  const localTime = getUserLocalTime(user.timezone);
  return localTime.getDay() === user.preferredDay;
}

/**
 * Calculate minutes until next preferred delivery time
 */
function minutesUntilPreferredTime(user: UserDigestPreferences): number {
  const localTime = getUserLocalTime(user.timezone);
  const [prefHour, prefMinute] = user.preferredTime.split(':').map(Number);
  
  const now = localTime.getHours() * 60 + localTime.getMinutes();
  const preferred = prefHour * 60 + prefMinute;
  
  if (preferred > now) {
    return preferred - now;
  } else {
    return (24 * 60) - now + preferred;
  }
}

// ============================================
// DIGEST CANDIDATE EVALUATION
// ============================================

/**
 * Evaluate if a user should receive a digest now
 */
function shouldSendDigest(
  user: UserDigestPreferences,
  notifications: PendingNotification[],
  config: DigestSchedulerConfig
): { should: boolean; reason: 'scheduled' | 'threshold' | 'none'; priority: number } {
  // Check if digests are enabled
  if (!user.emailEnabled || user.frequency === 'none') {
    return { should: false, reason: 'none', priority: 0 };
  }
  
  // Check if paused
  if (user.pausedUntil && user.pausedUntil > new Date()) {
    return { should: false, reason: 'none', priority: 0 };
  }
  
  // Check if there are any notifications
  if (notifications.length === 0) {
    return { should: false, reason: 'none', priority: 0 };
  }
  
  // Immediate frequency: send when threshold reached during business hours
  if (user.frequency === 'immediate') {
    if (notifications.length >= config.immediateThreshold) {
      if (isBusinessHours(user, config)) {
        return { should: true, reason: 'threshold', priority: 10 };
      }
    }
    return { should: false, reason: 'none', priority: 0 };
  }
  
  // Daily frequency: send at preferred time
  if (user.frequency === 'daily') {
    if (isWithinDeliveryWindow(user, 30)) {
      // Check if we already sent today
      if (user.lastDigestSent) {
        const hoursSinceLastSent = 
          (Date.now() - user.lastDigestSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSent < 20) { // Allow some buffer
          return { should: false, reason: 'none', priority: 0 };
        }
      }
      return { should: true, reason: 'scheduled', priority: 5 };
    }
    return { should: false, reason: 'none', priority: 0 };
  }
  
  // Weekly frequency: send at preferred time on preferred day
  if (user.frequency === 'weekly') {
    if (isPreferredDay(user) && isWithinDeliveryWindow(user, 30)) {
      // Check if we already sent this week
      if (user.lastDigestSent) {
        const daysSinceLastSent = 
          (Date.now() - user.lastDigestSent.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent < 6) {
          return { should: false, reason: 'none', priority: 0 };
        }
      }
      return { should: true, reason: 'scheduled', priority: 3 };
    }
    return { should: false, reason: 'none', priority: 0 };
  }
  
  return { should: false, reason: 'none', priority: 0 };
}

// ============================================
// SMART DIGEST SCHEDULER CLASS
// ============================================

export class SmartDigestScheduler extends EventEmitter {
  private config: DigestSchedulerConfig;
  private stats: SchedulerStats;
  private isRunning: boolean = false;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private nextRunTime: Date | null = null;
  
  // These should be injected or overridden
  private getUserPreferences: () => Promise<UserDigestPreferences[]>;
  private getNotificationsForUser: (userId: number, maxAge: number) => Promise<PendingNotification[]>;
  private sendDigestEmail: (user: UserDigestPreferences, notifications: PendingNotification[]) => Promise<void>;
  private markNotificationsAsDigested: (notificationIds: number[]) => Promise<void>;
  private updateLastDigestSent: (userId: number, sentAt: Date) => Promise<void>;
  
  constructor(
    config: Partial<DigestSchedulerConfig> = {},
    dependencies: {
      getUserPreferences: () => Promise<UserDigestPreferences[]>;
      getNotificationsForUser: (userId: number, maxAge: number) => Promise<PendingNotification[]>;
      sendDigestEmail: (user: UserDigestPreferences, notifications: PendingNotification[]) => Promise<void>;
      markNotificationsAsDigested: (notificationIds: number[]) => Promise<void>;
      updateLastDigestSent: (userId: number, sentAt: Date) => Promise<void>;
    }
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.initStats();
    
    this.getUserPreferences = dependencies.getUserPreferences;
    this.getNotificationsForUser = dependencies.getNotificationsForUser;
    this.sendDigestEmail = dependencies.sendDigestEmail;
    this.markNotificationsAsDigested = dependencies.markNotificationsAsDigested;
    this.updateLastDigestSent = dependencies.updateLastDigestSent;
  }
  
  private initStats(): SchedulerStats {
    return {
      lastRun: null,
      totalRuns: 0,
      totalDigestsSent: 0,
      totalNotificationsProcessed: 0,
      averageProcessingTime: 0,
      usersSkipped: 0,
      errors: 0,
    };
  }
  
  /**
   * Start the scheduler
   */
  start(): void {
    if (this.schedulerTimer) {
      this.log('Scheduler already running');
      return;
    }
    
    this.log('Starting smart digest scheduler');
    this.scheduleNextRun();
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.nextRunTime = null;
    this.log('Scheduler stopped');
  }
  
  /**
   * Calculate optimal next run time
   */
  private async calculateNextRunInterval(): Promise<number> {
    try {
      // Get all users with digests enabled
      const users = await this.getUserPreferences();
      const activeUsers = users.filter(u => u.emailEnabled && u.frequency !== 'none');
      
      if (activeUsers.length === 0) {
        // No active users, check less frequently
        return this.config.minCheckInterval * 5;
      }
      
      // Find the nearest preferred delivery time
      let minMinutesUntilDelivery = Infinity;
      
      for (const user of activeUsers) {
        if (user.frequency === 'immediate') {
          // Immediate users need frequent checks
          minMinutesUntilDelivery = Math.min(minMinutesUntilDelivery, 5);
        } else {
          const minutes = minutesUntilPreferredTime(user);
          minMinutesUntilDelivery = Math.min(minMinutesUntilDelivery, minutes);
        }
      }
      
      // Convert to milliseconds, with min/max bounds
      const interval = Math.max(
        this.config.minCheckInterval,
        Math.min(minMinutesUntilDelivery * 60 * 1000, 30 * 60 * 1000) // Max 30 min
      );
      
      return interval;
    } catch (error) {
      this.log('Error calculating next run interval:', error);
      return this.config.minCheckInterval;
    }
  }
  
  /**
   * Schedule the next run
   */
  private async scheduleNextRun(): Promise<void> {
    const interval = await this.calculateNextRunInterval();
    this.nextRunTime = new Date(Date.now() + interval);
    
    this.log(`Next run scheduled in ${Math.round(interval / 1000)}s`);
    
    this.schedulerTimer = setTimeout(async () => {
      await this.run();
      this.scheduleNextRun();
    }, interval);
  }
  
  /**
   * Run the digest processing
   */
  async run(): Promise<DigestResult[]> {
    if (this.isRunning) {
      this.log('Scheduler already running, skipping');
      return [];
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    const results: DigestResult[] = [];
    
    try {
      this.log('Starting digest run');
      
      // Step 1: Get all users with digest preferences
      const users = await this.getUserPreferences();
      this.log(`Found ${users.length} users with digest preferences`);
      
      // Step 2: Find candidates who should receive digests
      const candidates: DigestCandidate[] = [];
      let skipped = 0;
      
      for (const user of users) {
        // Get pending notifications for this user
        const notifications = await this.getNotificationsForUser(
          user.userId,
          this.config.maxNotificationAge
        );
        
        // Filter to only undigested notifications in user's categories
        const pendingNotifications = notifications.filter(n => 
          !n.includedInDigest && 
          (user.categories.length === 0 || user.categories.includes(n.category))
        );
        
        // Check if user should receive digest
        const evaluation = shouldSendDigest(user, pendingNotifications, this.config);
        
        if (evaluation.should) {
          candidates.push({
            user,
            notifications: pendingNotifications,
            reason: evaluation.reason,
            priority: evaluation.priority,
          });
        } else {
          skipped++;
        }
      }
      
      this.log(`Found ${candidates.length} candidates, skipped ${skipped}`);
      this.stats.usersSkipped += skipped;
      
      // Step 3: Sort by priority (higher priority first)
      candidates.sort((a, b) => b.priority - a.priority);
      
      // Step 4: Process in batches
      for (let i = 0; i < candidates.length; i += this.config.batchSize) {
        const batch = candidates.slice(i, i + this.config.batchSize);
        
        const batchResults = await Promise.all(
          batch.map(candidate => this.processCandidate(candidate))
        );
        
        results.push(...batchResults);
        
        // Delay between batches
        if (i + this.config.batchSize < candidates.length) {
          await this.delay(this.config.batchDelay);
        }
      }
      
      // Update stats
      const processingTime = Date.now() - startTime;
      this.updateStats(results, processingTime);
      
      this.emit('runComplete', { results, processingTime });
      
    } catch (error) {
      this.log('Error during digest run:', error);
      this.stats.errors++;
      this.emit('error', error);
    } finally {
      this.isRunning = false;
    }
    
    return results;
  }
  
  /**
   * Process a single candidate
   */
  private async processCandidate(candidate: DigestCandidate): Promise<DigestResult> {
    const { user, notifications } = candidate;
    
    try {
      // Send the digest email
      await this.sendDigestEmail(user, notifications);
      
      // Mark notifications as included in digest
      const notificationIds = notifications.map(n => n.id);
      await this.markNotificationsAsDigested(notificationIds);
      
      // Update last digest sent
      const sentAt = new Date();
      await this.updateLastDigestSent(user.userId, sentAt);
      
      this.log(`Sent digest to user ${user.userId} with ${notifications.length} notifications`);
      
      return {
        userId: user.userId,
        success: true,
        notificationCount: notifications.length,
        sentAt,
      };
      
    } catch (error) {
      this.log(`Error sending digest to user ${user.userId}:`, error);
      this.stats.errors++;
      
      return {
        userId: user.userId,
        success: false,
        notificationCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        sentAt: new Date(),
      };
    }
  }
  
  /**
   * Update statistics
   */
  private updateStats(results: DigestResult[], processingTime: number): void {
    const successful = results.filter(r => r.success);
    
    this.stats.lastRun = new Date();
    this.stats.totalRuns++;
    this.stats.totalDigestsSent += successful.length;
    this.stats.totalNotificationsProcessed += successful.reduce(
      (sum, r) => sum + r.notificationCount, 0
    );
    
    // Rolling average for processing time
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalRuns - 1) + processingTime) / 
      this.stats.totalRuns;
  }
  
  /**
   * Get current statistics
   */
  getStats(): SchedulerStats & { nextRun: Date | null; isRunning: boolean } {
    return {
      ...this.stats,
      nextRun: this.nextRunTime,
      isRunning: this.isRunning,
    };
  }
  
  /**
   * Manually trigger digest for a specific user
   */
  async triggerForUser(userId: number): Promise<DigestResult> {
    const users = await this.getUserPreferences();
    const user = users.find(u => u.userId === userId);
    
    if (!user) {
      return {
        userId,
        success: false,
        notificationCount: 0,
        error: 'User not found or digest not enabled',
        sentAt: new Date(),
      };
    }
    
    const notifications = await this.getNotificationsForUser(
      userId,
      this.config.maxNotificationAge
    );
    
    const pendingNotifications = notifications.filter(n => 
      !n.includedInDigest && 
      (user.categories.length === 0 || user.categories.includes(n.category))
    );
    
    if (pendingNotifications.length === 0) {
      return {
        userId,
        success: false,
        notificationCount: 0,
        error: 'No pending notifications',
        sentAt: new Date(),
      };
    }
    
    return this.processCandidate({
      user,
      notifications: pendingNotifications,
      reason: 'manual',
      priority: 100,
    });
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<DigestSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }
  
  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Helper: log with debug check
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[DigestScheduler]', ...args);
    }
  }
}

// ============================================
// NOTIFICATION AGGREGATION
// ============================================

export interface AggregatedNotifications {
  byCategory: Record<string, PendingNotification[]>;
  byType: Record<string, PendingNotification[]>;
  summary: {
    total: number;
    categories: string[];
    oldestDate: Date;
    newestDate: Date;
  };
}

/**
 * Aggregate notifications for digest email formatting
 */
export function aggregateNotifications(
  notifications: PendingNotification[]
): AggregatedNotifications {
  const byCategory: Record<string, PendingNotification[]> = {};
  const byType: Record<string, PendingNotification[]> = {};
  
  for (const notification of notifications) {
    // Group by category
    if (!byCategory[notification.category]) {
      byCategory[notification.category] = [];
    }
    byCategory[notification.category].push(notification);
    
    // Group by type
    if (!byType[notification.type]) {
      byType[notification.type] = [];
    }
    byType[notification.type].push(notification);
  }
  
  // Sort each group by date (newest first)
  for (const category of Object.keys(byCategory)) {
    byCategory[category].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  const dates = notifications.map(n => new Date(n.createdAt).getTime());
  
  return {
    byCategory,
    byType,
    summary: {
      total: notifications.length,
      categories: Object.keys(byCategory),
      oldestDate: new Date(Math.min(...dates)),
      newestDate: new Date(Math.max(...dates)),
    },
  };
}

// ============================================
// DIGEST CONTENT GENERATOR
// ============================================

export interface DigestContent {
  subject: string;
  preheader: string;
  sections: Array<{
    title: string;
    items: Array<{
      title: string;
      message: string;
      time: string;
      link?: string;
    }>;
  }>;
}

/**
 * Generate digest email content
 */
export function generateDigestContent(
  user: UserDigestPreferences,
  notifications: PendingNotification[]
): DigestContent {
  const aggregated = aggregateNotifications(notifications);
  
  // Generate subject
  const subject = notifications.length === 1
    ? `You have 1 new notification`
    : `You have ${notifications.length} new notifications`;
  
  // Generate preheader
  const topCategories = Object.entries(aggregated.byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([cat, items]) => `${items.length} ${cat}`);
  const preheader = topCategories.join(', ');
  
  // Generate sections
  const sections = Object.entries(aggregated.byCategory).map(([category, items]) => ({
    title: formatCategoryTitle(category),
    items: items.slice(0, 10).map(item => ({
      title: item.title,
      message: item.message,
      time: formatRelativeTime(item.createdAt),
      link: item.data?.link,
    })),
  }));
  
  return {
    subject,
    preheader,
    sections,
  };
}

function formatCategoryTitle(category: string): string {
  const titles: Record<string, string> = {
    deal: 'Deal Updates',
    prospect: 'Prospect Activity',
    task: 'Tasks & Reminders',
    system: 'System Notifications',
    team: 'Team Activity',
  };
  return titles[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

// ============================================
// EXPORTS
// ============================================

export default SmartDigestScheduler;
