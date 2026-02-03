/**
 * Email Digest Routes
 * ===================
 * 
 * API endpoints for managing digest preferences and triggering digests.
 * 
 * INSTALLATION:
 *   Merge into your routes.ts
 */

import { Router, Request, Response } from 'express';
import {
  getUserDigestPreferences,
  upsertUserPreferences,
  getDigestHistory,
  getPendingNotifications,
  createDigestScheduler,
} from './services/digest-db';
import { 
  SmartDigestScheduler,
  generateDigestContent,
  aggregateNotifications,
} from './services/smart-digest-scheduler';
import { sendEmail } from './services/email'; // Your email service

const router = Router();

// ============================================
// SCHEDULER SETUP
// ============================================

// Create scheduler instance
const digestScheduler = createDigestScheduler(
  {
    debug: process.env.NODE_ENV !== 'production',
    batchSize: 50,
    immediateThreshold: 5,
  },
  async (user, notifications) => {
    const content = generateDigestContent(user, notifications);
    
    // Send via your email service
    await sendEmail({
      to: user.email, // You'll need to join with users table
      subject: content.subject,
      template: 'digest',
      data: {
        preheader: content.preheader,
        sections: content.sections,
        unsubscribeUrl: `${process.env.APP_URL}/settings/notifications`,
      },
    });
  }
);

// Start scheduler when server starts
digestScheduler.start();

// Log events
digestScheduler.on('runComplete', ({ results, processingTime }) => {
  const successful = results.filter((r: any) => r.success).length;
  console.log(`Digest run complete: ${successful}/${results.length} sent in ${processingTime}ms`);
});

digestScheduler.on('error', (error) => {
  console.error('Digest scheduler error:', error);
});

// ============================================
// BEFORE (Old approach)
// ============================================

/*
// OLD CODE - Runs for ALL users every 15 minutes!

import cron from 'node-cron';

cron.schedule('*/15 * * * *', async () => {
  const users = await db.select().from(users);
  
  for (const user of users) {  // Processes EVERYONE
    const notifications = await getNotifications(user.id);
    if (notifications.length > 0) {
      await sendDigestEmail(user, notifications);
    }
  }
});
*/

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/digest/preferences
 * 
 * Get current user's digest preferences
 */
router.get('/api/digest/preferences', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    let preferences = await getUserDigestPreferences(userId);
    
    // Return defaults if no preferences set
    if (!preferences) {
      preferences = {
        userId,
        frequency: 'daily',
        preferredTime: '09:00',
        timezone: 'America/New_York',
        emailEnabled: true,
        categories: [],
      };
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Failed to get digest preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/digest/preferences
 * 
 * Update user's digest preferences
 */
router.put('/api/digest/preferences', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const {
    frequency,
    preferredTime,
    preferredDay,
    timezone,
    emailEnabled,
    categories,
  } = req.body;
  
  // Validate
  if (frequency && !['immediate', 'daily', 'weekly', 'none'].includes(frequency)) {
    return res.status(400).json({ error: 'Invalid frequency' });
  }
  
  if (preferredTime && !/^\d{2}:\d{2}$/.test(preferredTime)) {
    return res.status(400).json({ error: 'Invalid time format (use HH:MM)' });
  }
  
  if (preferredDay !== undefined && (preferredDay < 0 || preferredDay > 6)) {
    return res.status(400).json({ error: 'Invalid day (use 0-6)' });
  }
  
  try {
    const updated = await upsertUserPreferences(userId, {
      frequency,
      preferredTime,
      preferredDay,
      timezone,
      emailEnabled,
      categories,
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Failed to update digest preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/digest/pause
 * 
 * Pause digests for a period
 */
router.post('/api/digest/pause', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { days } = req.body;
  
  if (!days || days < 1 || days > 30) {
    return res.status(400).json({ error: 'Invalid pause duration (1-30 days)' });
  }
  
  try {
    const pausedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    
    const updated = await upsertUserPreferences(userId, { pausedUntil });
    
    res.json({
      success: true,
      pausedUntil: updated.pausedUntil,
    });
  } catch (error) {
    console.error('Failed to pause digest:', error);
    res.status(500).json({ error: 'Failed to pause digest' });
  }
});

/**
 * POST /api/digest/resume
 * 
 * Resume paused digests
 */
router.post('/api/digest/resume', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    await upsertUserPreferences(userId, { pausedUntil: undefined });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to resume digest:', error);
    res.status(500).json({ error: 'Failed to resume digest' });
  }
});

/**
 * GET /api/digest/preview
 * 
 * Preview what digest would be sent now
 */
router.get('/api/digest/preview', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    const preferences = await getUserDigestPreferences(userId);
    
    if (!preferences) {
      return res.json({
        notifications: [],
        content: null,
        message: 'No digest preferences configured',
      });
    }
    
    const notifications = await getPendingNotifications(userId, 168);
    
    if (notifications.length === 0) {
      return res.json({
        notifications: [],
        content: null,
        message: 'No pending notifications',
      });
    }
    
    const content = generateDigestContent(preferences, notifications);
    const aggregated = aggregateNotifications(notifications);
    
    res.json({
      notifications: notifications.slice(0, 20),
      notificationCount: notifications.length,
      aggregated: aggregated.summary,
      content,
    });
  } catch (error) {
    console.error('Failed to generate preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

/**
 * POST /api/digest/send-now
 * 
 * Manually trigger digest for current user
 */
router.post('/api/digest/send-now', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    const result = await digestScheduler.triggerForUser(userId);
    
    if (result.success) {
      res.json({
        success: true,
        notificationCount: result.notificationCount,
        sentAt: result.sentAt,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Failed to send digest:', error);
    res.status(500).json({ error: 'Failed to send digest' });
  }
});

/**
 * GET /api/digest/history
 * 
 * Get user's digest history
 */
router.get('/api/digest/history', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  
  try {
    const history = await getDigestHistory(userId, limit);
    
    res.json({ history });
  } catch (error) {
    console.error('Failed to get digest history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * GET /api/admin/digest/stats
 * 
 * Get scheduler statistics (admin only)
 */
router.get('/api/admin/digest/stats', async (req: Request, res: Response) => {
  // Add admin auth check here
  
  const stats = digestScheduler.getStats();
  
  res.json(stats);
});

/**
 * POST /api/admin/digest/run
 * 
 * Manually trigger scheduler run (admin only)
 */
router.post('/api/admin/digest/run', async (req: Request, res: Response) => {
  // Add admin auth check here
  
  try {
    const results = await digestScheduler.run();
    
    res.json({
      success: true,
      digestsSent: results.filter(r => r.success).length,
      errors: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Failed to run scheduler:', error);
    res.status(500).json({ error: 'Failed to run scheduler' });
  }
});

// ============================================
// TIMEZONE LIST HELPER
// ============================================

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

router.get('/api/digest/timezones', (req: Request, res: Response) => {
  res.json(COMMON_TIMEZONES);
});

// ============================================
// NOTIFICATION CATEGORIES
// ============================================

const NOTIFICATION_CATEGORIES = [
  { value: 'deal', label: 'Deal Updates', description: 'Stage changes, comments, etc.' },
  { value: 'prospect', label: 'Prospect Activity', description: 'New prospects, intelligence updates' },
  { value: 'task', label: 'Tasks & Reminders', description: 'Due dates, assignments' },
  { value: 'team', label: 'Team Activity', description: 'Mentions, shares, collaborations' },
  { value: 'system', label: 'System Notifications', description: 'Account, billing, features' },
];

router.get('/api/digest/categories', (req: Request, res: Response) => {
  res.json(NOTIFICATION_CATEGORIES);
});

export default router;
