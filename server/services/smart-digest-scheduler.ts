import { EventEmitter } from 'events';
import { storage } from '../storage';
import { gatherDigestData, generateDigestContent, sendDigestEmail } from './email-digest';
import { toZonedTime, format } from 'date-fns-tz';
import type { EmailDigestPreferences } from '@shared/schema';

export interface SchedulerConfig {
  minCheckIntervalMs: number;
  maxCheckIntervalMs: number;
  immediateCheckIntervalMs: number;
  debug: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  minCheckIntervalMs: 60000,        // 1 minute minimum
  maxCheckIntervalMs: 30 * 60000,   // 30 minutes maximum
  immediateCheckIntervalMs: 5 * 60000, // 5 minutes for immediate digests
  debug: process.env.NODE_ENV !== 'production',
};

export interface SchedulerStats {
  lastRun: Date | null;
  totalRuns: number;
  totalDigestsSent: number;
  usersSkipped: number;
  errors: number;
  nextRunTime: Date | null;
  averageProcessingTimeMs: number;
  isRunning: boolean;
}

export interface DigestResult {
  userId: string;
  digestType: 'daily' | 'weekly' | 'immediate';
  success: boolean;
  notificationCount?: number;
  error?: string;
  sentAt: Date;
}

const WEEKLY_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getUserLocalTime(timezone: string): Date {
  try {
    const now = new Date();
    return toZonedTime(now, timezone);
  } catch {
    return new Date();
  }
}

function isWithinDeliveryWindow(
  currentHour: number,
  currentMinute: number,
  prefHour: number,
  prefMinute: number,
  windowMinutes: number = 15
): boolean {
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const preferredMinutes = prefHour * 60 + prefMinute;
  return currentTotalMinutes >= preferredMinutes && currentTotalMinutes < preferredMinutes + windowMinutes;
}

function isBusinessHours(hour: number, startHour: number, endHour: number): boolean {
  return hour >= startHour && hour < endHour;
}

function minutesUntilPreferredTime(currentHour: number, currentMinute: number, prefHour: number, prefMinute: number): number {
  const now = currentHour * 60 + currentMinute;
  const preferred = prefHour * 60 + prefMinute;
  
  if (preferred > now) {
    return preferred - now;
  } else {
    return (24 * 60) - now + preferred;
  }
}

export class SmartDigestScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private stats: SchedulerStats;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private processingTimes: number[] = [];
  
  constructor(config: Partial<SchedulerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      lastRun: null,
      totalRuns: 0,
      totalDigestsSent: 0,
      usersSkipped: 0,
      errors: 0,
      nextRunTime: null,
      averageProcessingTimeMs: 0,
      isRunning: false,
    };
  }
  
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[SmartDigest]', ...args);
    }
  }
  
  start(): void {
    if (this.schedulerTimer) {
      this.log('Scheduler already running');
      return;
    }
    
    console.log('[SmartDigest] Starting smart digest scheduler');
    this.runAndScheduleNext();
  }
  
  stop(): void {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.stats.nextRunTime = null;
    this.stats.isRunning = false;
    console.log('[SmartDigest] Scheduler stopped');
  }
  
  getStats(): SchedulerStats {
    return { ...this.stats };
  }
  
  private async runAndScheduleNext(): Promise<void> {
    try {
      await this.run();
    } catch (error) {
      console.error('[SmartDigest] Run error:', error);
      this.emit('error', error);
    }
    
    const nextInterval = await this.calculateNextRunInterval();
    this.stats.nextRunTime = new Date(Date.now() + nextInterval);
    
    this.log(`Next run in ${Math.round(nextInterval / 1000)}s at ${this.stats.nextRunTime.toISOString()}`);
    
    this.schedulerTimer = setTimeout(() => this.runAndScheduleNext(), nextInterval);
  }
  
  private async calculateNextRunInterval(): Promise<number> {
    try {
      const allPrefs = await this.getAllActivePreferences();
      
      if (allPrefs.length === 0) {
        return this.config.maxCheckIntervalMs;
      }
      
      let minMinutesUntilDelivery = Infinity;
      let hasImmediateUsers = false;
      
      for (const prefs of allPrefs) {
        if (prefs.immediateDigestEnabled) {
          hasImmediateUsers = true;
        }
        
        const localTime = getUserLocalTime(prefs.timezone);
        const currentHour = localTime.getHours();
        const currentMinute = localTime.getMinutes();
        
        if (prefs.dailyDigestEnabled) {
          const [prefHour, prefMinute] = prefs.dailySendTime.split(':').map(Number);
          const minutes = minutesUntilPreferredTime(currentHour, currentMinute, prefHour, prefMinute);
          minMinutesUntilDelivery = Math.min(minMinutesUntilDelivery, minutes);
        }
        
        if (prefs.weeklyDigestEnabled) {
          const currentDay = WEEKLY_DAYS[localTime.getDay()];
          if (currentDay === prefs.weeklySendDay) {
            const [prefHour, prefMinute] = prefs.weeklySendTime.split(':').map(Number);
            const minutes = minutesUntilPreferredTime(currentHour, currentMinute, prefHour, prefMinute);
            minMinutesUntilDelivery = Math.min(minMinutesUntilDelivery, minutes);
          }
        }
      }
      
      if (hasImmediateUsers) {
        return this.config.immediateCheckIntervalMs;
      }
      
      const intervalMs = Math.max(
        this.config.minCheckIntervalMs,
        Math.min(minMinutesUntilDelivery * 60 * 1000, this.config.maxCheckIntervalMs)
      );
      
      return intervalMs;
    } catch (error) {
      this.log('Error calculating next interval:', error);
      return this.config.minCheckIntervalMs;
    }
  }
  
  private async getAllActivePreferences(): Promise<EmailDigestPreferences[]> {
    const dailyPrefs = await storage.getDueEmailDigests('daily');
    const weeklyPrefs = await storage.getDueEmailDigests('weekly');
    const immediatePrefs = await storage.getDueEmailDigests('immediate');
    
    const prefsMap = new Map<string, EmailDigestPreferences>();
    for (const prefs of [...dailyPrefs, ...weeklyPrefs, ...immediatePrefs]) {
      prefsMap.set(prefs.userId, prefs);
    }
    
    return Array.from(prefsMap.values());
  }
  
  async run(): Promise<DigestResult[]> {
    if (this.stats.isRunning) {
      this.log('Already running, skipping');
      return [];
    }
    
    this.stats.isRunning = true;
    const startTime = Date.now();
    const results: DigestResult[] = [];
    
    this.log('Starting digest run at', new Date().toISOString());
    
    try {
      results.push(...await this.processDailyDigests());
      results.push(...await this.processWeeklyDigests());
      results.push(...await this.processImmediateDigests());
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      this.stats.averageProcessingTimeMs = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      
      this.stats.lastRun = new Date();
      this.stats.totalRuns++;
      this.stats.totalDigestsSent += results.filter(r => r.success).length;
      this.stats.errors += results.filter(r => !r.success).length;
      
      this.emit('runComplete', { results, processingTime });
      
      const successful = results.filter(r => r.success).length;
      if (results.length > 0) {
        console.log(`[SmartDigest] Run complete: ${successful}/${results.length} sent in ${processingTime}ms`);
      }
    } finally {
      this.stats.isRunning = false;
    }
    
    return results;
  }
  
  private async processDailyDigests(): Promise<DigestResult[]> {
    const results: DigestResult[] = [];
    const prefs = await storage.getDueEmailDigests('daily');
    
    for (const p of prefs) {
      if (!this.isDueForDigest(p, 'daily')) {
        this.stats.usersSkipped++;
        continue;
      }
      
      const result = await this.sendDigestForUser(p, 'daily');
      results.push(result);
    }
    
    return results;
  }
  
  private async processWeeklyDigests(): Promise<DigestResult[]> {
    const results: DigestResult[] = [];
    const prefs = await storage.getDueEmailDigests('weekly');
    
    for (const p of prefs) {
      if (!this.isDueForDigest(p, 'weekly')) {
        this.stats.usersSkipped++;
        continue;
      }
      
      const result = await this.sendDigestForUser(p, 'weekly');
      results.push(result);
    }
    
    return results;
  }
  
  private async processImmediateDigests(): Promise<DigestResult[]> {
    const results: DigestResult[] = [];
    const prefs = await storage.getDueEmailDigests('immediate');
    
    for (const p of prefs) {
      if (!this.isDueForImmediate(p)) {
        this.stats.usersSkipped++;
        continue;
      }
      
      const result = await this.sendDigestForUser(p, 'immediate');
      results.push(result);
    }
    
    return results;
  }
  
  private isDueForDigest(prefs: EmailDigestPreferences, digestType: 'daily' | 'weekly'): boolean {
    if (prefs.pausedUntil && prefs.pausedUntil > new Date()) {
      return false;
    }
    
    const userTime = getUserLocalTime(prefs.timezone);
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentDay = WEEKLY_DAYS[userTime.getDay()];
    
    const sendTime = digestType === 'daily' ? prefs.dailySendTime : prefs.weeklySendTime;
    const [prefHour, prefMinute] = sendTime.split(':').map(Number);
    
    if (!isWithinDeliveryWindow(currentHour, currentMinute, prefHour, prefMinute)) {
      return false;
    }
    
    if (digestType === 'weekly' && currentDay !== prefs.weeklySendDay) {
      return false;
    }
    
    const lastSent = digestType === 'daily' ? prefs.lastDailySentAt : prefs.lastWeeklySentAt;
    if (lastSent) {
      const lastSentDate = toZonedTime(new Date(lastSent), prefs.timezone);
      const todayStr = format(userTime, 'yyyy-MM-dd');
      const lastSentStr = format(lastSentDate, 'yyyy-MM-dd');
      if (todayStr === lastSentStr) return false;
    }
    
    return true;
  }
  
  private isDueForImmediate(prefs: EmailDigestPreferences): boolean {
    if (prefs.pausedUntil && prefs.pausedUntil > new Date()) {
      return false;
    }
    
    const userTime = getUserLocalTime(prefs.timezone);
    const currentHour = userTime.getHours();
    
    if (!isBusinessHours(currentHour, prefs.businessHoursStart, prefs.businessHoursEnd)) {
      return false;
    }
    
    if (prefs.lastImmediateSentAt) {
      const hoursSinceLast = (Date.now() - prefs.lastImmediateSentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 1) {
        return false;
      }
    }
    
    return true;
  }
  
  private async sendDigestForUser(prefs: EmailDigestPreferences, digestType: 'daily' | 'weekly' | 'immediate'): Promise<DigestResult> {
    try {
      const data = await gatherDigestData(prefs.userId, prefs.timezone, {
        includeAppointments: prefs.includeAppointments,
        includeFollowups: prefs.includeFollowups,
        includeStaleDeals: prefs.includeStaleDeals,
        includePipelineSummary: prefs.includePipelineSummary,
        includeRecentWins: prefs.includeRecentWins,
        includeQuarterlyCheckins: prefs.includeQuarterlyCheckins,
        includeNewReferrals: prefs.includeNewReferrals,
        appointmentLookaheadDays: prefs.appointmentLookaheadDays,
        staleDealThresholdDays: prefs.staleDealThresholdDays,
      }, digestType === 'immediate' ? 'daily' : digestType);
      
      const notificationCount = data.appointments.length + data.followups.length + data.staleDeals.length + data.recentWins.length;
      
      const hasContent = data.appointments.length > 0 ||
        data.followups.length > 0 ||
        data.staleDeals.length > 0 ||
        data.recentWins.length > 0 ||
        data.pipelineSummary.totalDeals > 0;
      
      if (!hasContent) {
        this.log(`Skipping empty ${digestType} digest for user ${prefs.userId}`);
        return {
          userId: prefs.userId,
          digestType,
          success: true,
          notificationCount: 0,
          sentAt: new Date(),
        };
      }
      
      // For immediate digests, check if notification count meets threshold
      if (digestType === 'immediate') {
        const threshold = prefs.immediateThreshold || 5;
        if (notificationCount < threshold) {
          this.log(`Skipping immediate digest for user ${prefs.userId}: ${notificationCount} notifications < ${threshold} threshold`);
          return {
            userId: prefs.userId,
            digestType,
            success: true,
            notificationCount,
            sentAt: new Date(),
          };
        }
      }
      
      const digest = await generateDigestContent(data, 'Sales Rep', digestType === 'immediate' ? 'daily' : digestType, prefs.includeAiTips);
      
      const appUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      
      const result = await sendDigestEmail(prefs.emailAddress, digest, appUrl);
      
      await storage.createEmailDigestHistory({
        userId: prefs.userId,
        digestType,
        appointmentsCount: data.appointments.length,
        followupsCount: data.followups.length,
        staleDealsCount: data.staleDeals.length,
        pipelineValue: data.pipelineSummary.totalValue,
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
        subjectLine: digest.subject,
        emailProviderId: result.messageId,
      });
      
      if (result.success) {
        const updateData: any = {
          totalEmailsSent: (prefs.totalEmailsSent || 0) + 1,
        };
        
        if (digestType === 'daily') {
          updateData.lastDailySentAt = new Date();
        } else if (digestType === 'weekly') {
          updateData.lastWeeklySentAt = new Date();
        } else if (digestType === 'immediate') {
          updateData.lastImmediateSentAt = new Date();
        }
        
        await storage.updateEmailDigestPreferences(prefs.userId, updateData);
      }
      
      return {
        userId: prefs.userId,
        digestType,
        success: result.success,
        notificationCount,
        error: result.error,
        sentAt: new Date(),
      };
    } catch (error: any) {
      console.error(`[SmartDigest] Error sending ${digestType} digest for ${prefs.userId}:`, error);
      return {
        userId: prefs.userId,
        digestType,
        success: false,
        error: error.message,
        sentAt: new Date(),
      };
    }
  }
  
  async triggerForUser(userId: string): Promise<DigestResult> {
    const prefs = await storage.getEmailDigestPreferences(userId);
    
    if (!prefs) {
      return {
        userId,
        digestType: 'daily',
        success: false,
        error: 'No digest preferences found',
        sentAt: new Date(),
      };
    }
    
    return this.sendDigestForUser(prefs, 'daily');
  }
}

let schedulerInstance: SmartDigestScheduler | null = null;

export function getSmartDigestScheduler(config?: Partial<SchedulerConfig>): SmartDigestScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new SmartDigestScheduler(config);
  }
  return schedulerInstance;
}

export function startSmartDigestScheduler(config?: Partial<SchedulerConfig>): SmartDigestScheduler {
  const scheduler = getSmartDigestScheduler(config);
  scheduler.start();
  return scheduler;
}

export function stopSmartDigestScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}
