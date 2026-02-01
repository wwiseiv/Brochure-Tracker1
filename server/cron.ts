import { storage } from "./storage";
import { gatherDigestData, generateDigestContent, sendDigestEmail } from "./services/email-digest";
import { toZonedTime, format } from "date-fns-tz";

const CRON_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const WEEKLY_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

interface ProcessResult {
  userId: string;
  digestType: 'daily' | 'weekly';
  success: boolean;
  error?: string;
}

async function isDueForDigest(
  prefs: any,
  digestType: 'daily' | 'weekly'
): Promise<boolean> {
  const now = new Date();
  const userTime = toZonedTime(now, prefs.timezone);
  const currentHour = userTime.getHours();
  const currentMinute = userTime.getMinutes();
  const currentDay = WEEKLY_DAYS[userTime.getDay()];
  
  // Parse preferred send time
  const sendTime = digestType === 'daily' ? prefs.dailySendTime : prefs.weeklySendTime;
  const [prefHour, prefMinute] = sendTime.split(':').map(Number);
  
  // Check if current time is within the 15-minute window of preferred time
  const prefTotalMinutes = prefHour * 60 + prefMinute;
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const isWithinWindow = currentTotalMinutes >= prefTotalMinutes && currentTotalMinutes < prefTotalMinutes + 15;
  
  if (!isWithinWindow) return false;
  
  // For weekly, also check day
  if (digestType === 'weekly' && currentDay !== prefs.weeklySendDay) return false;
  
  // Check if already sent today
  const lastSent = digestType === 'daily' ? prefs.lastDailySentAt : prefs.lastWeeklySentAt;
  if (lastSent) {
    const lastSentDate = toZonedTime(new Date(lastSent), prefs.timezone);
    const todayStr = format(userTime, 'yyyy-MM-dd');
    const lastSentStr = format(lastSentDate, 'yyyy-MM-dd');
    if (todayStr === lastSentStr) return false;
  }
  
  return true;
}

async function processDigest(
  prefs: any,
  digestType: 'daily' | 'weekly'
): Promise<ProcessResult> {
  try {
    // Gather data
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
    }, digestType);
    
    // Skip if no meaningful content
    const hasContent = data.appointments.length > 0 ||
      data.followups.length > 0 ||
      data.staleDeals.length > 0 ||
      data.recentWins.length > 0 ||
      data.pipelineSummary.totalDeals > 0;
    
    if (!hasContent) {
      console.log(`Skipping empty ${digestType} digest for user ${prefs.userId}`);
      return { userId: prefs.userId, digestType, success: true };
    }
    
    // Generate content (using a generic name since we don't have user info here)
    const digest = await generateDigestContent(data, 'Sales Rep', digestType, prefs.includeAiTips);
    
    // Send email
    const appUrl = process.env.REPLIT_DEPLOYMENT_URL 
      ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
      : process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
    
    const result = await sendDigestEmail(prefs.emailAddress, digest, appUrl);
    
    // Log to history
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
    
    // Update last sent timestamp
    if (result.success) {
      const updateData = digestType === 'daily'
        ? { lastDailySentAt: new Date() }
        : { lastWeeklySentAt: new Date() };
      await storage.updateEmailDigestPreferences(prefs.userId, {
        ...updateData,
        totalEmailsSent: (prefs.totalEmailsSent || 0) + 1,
      });
    }
    
    return { userId: prefs.userId, digestType, success: result.success, error: result.error };
  } catch (error: any) {
    console.error(`Error processing ${digestType} digest for user ${prefs.userId}:`, error);
    return { userId: prefs.userId, digestType, success: false, error: error.message };
  }
}

async function runEmailDigestCron() {
  console.log('[Email Digest Cron] Running at', new Date().toISOString());
  
  try {
    // Process daily digests
    const dailyPrefs = await storage.getDueEmailDigests('daily');
    for (const prefs of dailyPrefs) {
      if (await isDueForDigest(prefs, 'daily')) {
        const result = await processDigest(prefs, 'daily');
        console.log(`[Email Digest] Daily for ${prefs.userId}:`, result.success ? 'sent' : result.error);
      }
    }
    
    // Process weekly digests
    const weeklyPrefs = await storage.getDueEmailDigests('weekly');
    for (const prefs of weeklyPrefs) {
      if (await isDueForDigest(prefs, 'weekly')) {
        const result = await processDigest(prefs, 'weekly');
        console.log(`[Email Digest] Weekly for ${prefs.userId}:`, result.success ? 'sent' : result.error);
      }
    }
  } catch (error) {
    console.error('[Email Digest Cron] Error:', error);
  }
}

let cronInterval: NodeJS.Timeout | null = null;

export function startEmailDigestCron() {
  if (cronInterval) {
    console.log('[Email Digest Cron] Already running');
    return;
  }
  
  console.log('[Email Digest Cron] Starting (runs every 15 minutes)');
  
  // Run immediately on start
  runEmailDigestCron();
  
  // Then run every 15 minutes
  cronInterval = setInterval(runEmailDigestCron, CRON_INTERVAL_MS);
}

export function stopEmailDigestCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Email Digest Cron] Stopped');
  }
}
