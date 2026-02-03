# Smart Email Digest Scheduler

## The Problem

The current email digest system runs every 15 minutes for ALL users, regardless of whether they have pending notifications or want digests at that time:

```typescript
// OLD CODE - Inefficient!
cron.schedule('*/15 * * * *', async () => {
  const users = await db.select().from(users);  // Get ALL users
  
  for (const user of users) {  // Process EVERYONE
    const notifications = await getNotifications(user.id);
    if (notifications.length > 0) {
      await sendDigestEmail(user, notifications);  // Even at 3 AM!
    }
  }
});
```

Problems:
- **Wasted processing**: Checks users with no notifications
- **Bad timing**: Sends emails at 3 AM in user's timezone
- **No preferences**: Everyone gets same frequency
- **Database strain**: Queries all users every 15 minutes

## The Solution

Smart scheduling that only processes users who need digests:

| Feature | Benefit |
|---------|---------|
| **User preferences** | Choose frequency (immediate/daily/weekly/none) |
| **Timezone-aware** | Deliver at user's preferred local time |
| **Smart batching** | Only process users with pending notifications |
| **Adaptive scheduling** | Scheduler adjusts based on upcoming deliveries |
| **Pause/resume** | Users can temporarily stop digests |

## Files Included

```
smart-digest/
├── server/
│   ├── services/
│   │   ├── smart-digest-scheduler.ts  # Core scheduler logic
│   │   └── digest-db.ts               # Database layer
│   └── routes-integration.ts          # API endpoints
├── client/
│   └── src/components/
│       └── DigestPreferences.tsx      # Settings UI
└── README.md
```

## Installation

### Step 1: Run Database Migration

```sql
-- User digest preferences
CREATE TABLE user_digest_preferences (
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

-- Add to notifications table if not exists
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS included_in_digest BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX idx_digest_prefs_enabled ON user_digest_preferences(email_enabled);
CREATE INDEX idx_notifications_digest ON notifications(included_in_digest, user_id);
```

### Step 2: Copy Server Files

```bash
cp server/services/smart-digest-scheduler.ts your-project/server/services/
cp server/services/digest-db.ts your-project/server/services/
```

### Step 3: Initialize Scheduler

```typescript
// In your server startup
import { createDigestScheduler } from './services/digest-db';
import { sendEmail } from './services/email';

const digestScheduler = createDigestScheduler(
  { debug: true },
  async (user, notifications) => {
    await sendEmail({
      to: user.email,
      template: 'digest',
      data: { notifications },
    });
  }
);

// Start the scheduler
digestScheduler.start();
```

### Step 4: Add Frontend Component

```bash
cp client/src/components/DigestPreferences.tsx your-project/client/src/components/
```

## How Smart Scheduling Works

### Before (Every 15 min, all users)

```
00:00 - Process 1000 users → 5 need digests
00:15 - Process 1000 users → 3 need digests
00:30 - Process 1000 users → 2 need digests
00:45 - Process 1000 users → 8 need digests
...
(Wasted: ~99.5% of processing)
```

### After (Smart scheduling)

```
00:00 - Check schedule → 0 users due
        Next check in 45 min (next user due at 00:45)

00:45 - Check schedule → 3 users due (9 AM in their timezone)
        Process only these 3 users
        Next check in 15 min

01:00 - Check schedule → 1 user due
        Process 1 user
        Next check in 60 min
...
(Only processes users who need it)
```

### Decision Flow

```
For each user:
┌─────────────────────────────────┐
│ Email enabled?                   │
│   No → Skip                      │
│                                  │
│ Paused?                          │
│   Yes → Skip                     │
│                                  │
│ Has pending notifications?       │
│   No → Skip                      │
│                                  │
│ Frequency = immediate?           │
│   → Check threshold (5+) + biz hours │
│                                  │
│ Frequency = daily?               │
│   → Check if within time window  │
│   → Check if not sent today      │
│                                  │
│ Frequency = weekly?              │
│   → Check day + time window      │
│   → Check if not sent this week  │
│                                  │
│ All checks pass → SEND DIGEST    │
└─────────────────────────────────┘
```

## User Preferences

### Frequency Options

| Frequency | Behavior |
|-----------|----------|
| **Immediate** | Send when 5+ notifications accumulate (business hours only) |
| **Daily** | Send once per day at preferred time |
| **Weekly** | Send once per week on preferred day and time |
| **None** | Don't send email digests |

### Timezone Support

- User sets their timezone in preferences
- Delivery time is calculated in user's local time
- Example: "09:00" in "America/Los_Angeles" = 9 AM Pacific

### Category Filtering

Users can choose which notification types to include:
- Deal Updates
- Prospect Activity
- Tasks & Reminders
- Team Activity
- System Notifications

## API Endpoints

### Get Preferences

```
GET /api/digest/preferences

Response: {
  "userId": 123,
  "frequency": "daily",
  "preferredTime": "09:00",
  "timezone": "America/New_York",
  "emailEnabled": true,
  "categories": ["deal", "task"],
  "lastDigestSent": "2024-01-15T14:00:00Z"
}
```

### Update Preferences

```
PUT /api/digest/preferences
Body: {
  "frequency": "weekly",
  "preferredTime": "08:00",
  "preferredDay": 1,
  "timezone": "America/Chicago"
}
```

### Pause Digests

```
POST /api/digest/pause
Body: { "days": 7 }

Response: {
  "success": true,
  "pausedUntil": "2024-01-22T00:00:00Z"
}
```

### Preview Digest

```
GET /api/digest/preview

Response: {
  "notificationCount": 12,
  "content": {
    "subject": "You have 12 new notifications",
    "sections": [...]
  }
}
```

### Send Now

```
POST /api/digest/send-now

Response: {
  "success": true,
  "notificationCount": 12,
  "sentAt": "2024-01-15T14:00:00Z"
}
```

### Admin: Scheduler Stats

```
GET /api/admin/digest/stats

Response: {
  "lastRun": "2024-01-15T14:00:00Z",
  "totalRuns": 1523,
  "totalDigestsSent": 4521,
  "averageProcessingTime": 234,
  "usersSkipped": 45231,
  "errors": 12,
  "nextRun": "2024-01-15T14:30:00Z",
  "isRunning": false
}
```

## Configuration

```typescript
const scheduler = createDigestScheduler({
  // Minimum check interval (default: 1 min)
  minCheckInterval: 60000,
  
  // Users per batch (default: 50)
  batchSize: 50,
  
  // Delay between batches (default: 1s)
  batchDelay: 1000,
  
  // Notifications to trigger immediate (default: 5)
  immediateThreshold: 5,
  
  // Business hours for immediate digests
  businessHoursStart: 8,  // 8 AM
  businessHoursEnd: 20,   // 8 PM
  
  // Default timezone
  defaultTimezone: 'America/New_York',
  
  // Max notification age to include (default: 1 week)
  maxNotificationAge: 168,
  
  // Debug logging
  debug: false,
});
```

## Performance Comparison

### Processing Load

| Metric | Before | After |
|--------|--------|-------|
| Checks/hour | 4 × all users | Only users due |
| Queries/run | N users + N × notifications | ~10% of users |
| Email sends | Any time | User's preferred time |

### Example: 1000 Users

**Before (15 min cron):**
- 4 runs/hour × 1000 users = 4000 user checks/hour
- Even at 3 AM, even with no notifications

**After (smart scheduling):**
- Average: 50-100 user checks/hour
- Only when they have notifications
- Only at their preferred time

## Migration from Cron

### Before

```typescript
import cron from 'node-cron';

// Remove this!
cron.schedule('*/15 * * * *', async () => {
  const users = await db.select().from(users);
  for (const user of users) {
    await processDigest(user);
  }
});
```

### After

```typescript
import { createDigestScheduler } from './services/digest-db';

const scheduler = createDigestScheduler(config, emailSender);
scheduler.start();

// Scheduler handles everything automatically
```

## Events

```typescript
scheduler.on('runComplete', ({ results, processingTime }) => {
  console.log(`Sent ${results.length} digests in ${processingTime}ms`);
});

scheduler.on('error', (error) => {
  console.error('Digest error:', error);
  alertOps(error);
});

scheduler.on('configUpdated', (config) => {
  console.log('Config updated:', config);
});
```

## Email Template Data

The scheduler provides structured data for your email template:

```typescript
{
  subject: "You have 12 new notifications",
  preheader: "5 deal updates, 4 tasks, 3 team",
  sections: [
    {
      title: "Deal Updates",
      items: [
        {
          title: "Deal moved to Negotiation",
          message: "ABC Corp moved to negotiation stage",
          time: "2 hours ago",
          link: "/deals/123"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Digests not sending

1. Check `email_enabled` is true
2. Check `paused_until` is null or in past
3. Check pending notifications exist
4. Check timezone/time calculation
5. Check scheduler is running: `GET /api/admin/digest/stats`

### Wrong delivery time

1. Verify user's timezone setting
2. Check server timezone
3. Test with `GET /api/digest/preview`

### Too many/few digests

1. Adjust `immediateThreshold` for immediate frequency
2. Check `last_digest_sent` is being updated
3. Verify time window calculation (±30 min default)

---

*This package transforms a wasteful "check everyone every 15 minutes" approach into an intelligent system that respects user preferences and only processes when needed.*
