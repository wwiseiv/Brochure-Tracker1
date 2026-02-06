import { storage } from "./storage";
import { db } from "./db";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import {
  gamificationProfiles,
  xpLedger,
  badgesEarned as badgesEarnedTable,
  certificates,
  gamificationDailyLog,
  organizationMembers,
} from "@shared/schema";

export const XP_CONFIG = {
  PRESENTATION_LESSON_COMPLETE: 25,
  PRESENTATION_QUIZ_PASS: 15,
  PRESENTATION_MODULE_COMPLETE: 100,
  EQUIPIQ_QUIZ_COMPLETE: 20,
  EQUIPIQ_QUIZ_PERFECT: 50,
  ROLEPLAY_SESSION_COMPLETE: 30,
  ROLEPLAY_HIGH_SCORE: 50,
  DAILY_EDGE_VIEW: 5,
  DAILY_EDGE_CHALLENGE: 15,
  SALES_PROCESS_PHASE_VIEW: 10,
  GAUNTLET_COMPLETE: 35,
  SCENARIO_COMPLETE: 25,
  DELIVERY_ANALYSIS: 30,
  DAILY_CAP: 300,
};

export const LEVEL_THRESHOLDS = [
  { level: 1, xpRequired: 0, title: "Rookie" },
  { level: 2, xpRequired: 200, title: "Learner" },
  { level: 3, xpRequired: 500, title: "Practitioner" },
  { level: 4, xpRequired: 1000, title: "Specialist" },
  { level: 5, xpRequired: 2000, title: "Expert" },
  { level: 6, xpRequired: 3500, title: "Master" },
  { level: 7, xpRequired: 5000, title: "Elite" },
  { level: 8, xpRequired: 7500, title: "Legend" },
  { level: 9, xpRequired: 10000, title: "Champion" },
  { level: 10, xpRequired: 15000, title: "Grand Master" },
];

export const BADGE_LEVELS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"] as const;

export const BADGE_DEFINITIONS: Record<string, { name: string; thresholds: number[] }> = {
  presentation: {
    name: "Presentation Pro",
    thresholds: [3, 8, 16, 20, 24],
  },
  equipiq: {
    name: "Equipment Expert",
    thresholds: [3, 8, 15, 25, 40],
  },
  roleplay: {
    name: "Roleplay Master",
    thresholds: [3, 10, 20, 35, 50],
  },
  daily_edge: {
    name: "Daily Warrior",
    thresholds: [5, 15, 30, 60, 100],
  },
  sales_process: {
    name: "Process Pro",
    thresholds: [2, 5, 8, 12, 20],
  },
  overall: {
    name: "Sales Champion",
    thresholds: [100, 500, 1500, 3500, 7500],
  },
};

function calculateLevel(totalXp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getLevelInfo(level: number): { title: string; xpRequired: number; nextLevelXp: number } {
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level) || LEVEL_THRESHOLDS[0];
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);
  return {
    title: currentThreshold.title,
    xpRequired: currentThreshold.xpRequired,
    nextLevelXp: nextThreshold ? nextThreshold.xpRequired : currentThreshold.xpRequired,
  };
}

export function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function awardXP(
  userId: string,
  amount: number,
  source: string,
  sourceId?: string,
  description?: string
): Promise<{
  xpAwarded: number;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
  dailyCapped: boolean;
  newBadges: any[];
}> {
  const today = getTodayDate();

  const dailyLog = await storage.getDailyLog(userId, today);
  const currentDailyXp = dailyLog?.xpEarned || 0;
  const remaining = XP_CONFIG.DAILY_CAP - currentDailyXp;

  let dailyCapped = false;
  let xpToAward = amount;

  if (remaining <= 0) {
    return {
      xpAwarded: 0,
      newTotal: (await storage.getGamificationProfile(userId))?.totalXp || 0,
      leveledUp: false,
      newLevel: (await storage.getGamificationProfile(userId))?.currentLevel || 1,
      dailyCapped: true,
      newBadges: [],
    };
  }

  if (xpToAward > remaining) {
    xpToAward = remaining;
    dailyCapped = true;
  }

  await storage.createXpEntry({
    userId,
    amount: xpToAward,
    source,
    sourceId: sourceId || null,
    description: description || null,
  });

  await storage.upsertDailyLog(userId, today, xpToAward);

  const existingProfile = await storage.getGamificationProfile(userId);
  const previousLevel = existingProfile?.currentLevel || 1;
  const newTotalXp = (existingProfile?.totalXp || 0) + xpToAward;
  const newLevel = calculateLevel(newTotalXp);

  const streakData: Record<string, any> = {
    totalXp: newTotalXp,
    currentLevel: newLevel,
    lastActivityDate: today,
  };

  if (existingProfile?.lastActivityDate) {
    const lastDate = new Date(existingProfile.lastActivityDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      const newStreak = (existingProfile.currentStreak || 0) + 1;
      streakData.currentStreak = newStreak;
      if (newStreak > (existingProfile.longestStreak || 0)) {
        streakData.longestStreak = newStreak;
      }
    } else if (diffDays > 1) {
      streakData.currentStreak = 1;
    }
  } else {
    streakData.currentStreak = 1;
    streakData.longestStreak = 1;
  }

  await storage.upsertGamificationProfile(userId, streakData);

  const newBadges: any[] = [];
  const overallBadge = await checkBadgeProgression(userId, "overall", newTotalXp);
  if (overallBadge) {
    newBadges.push(overallBadge);
  }

  return {
    xpAwarded: xpToAward,
    newTotal: newTotalXp,
    leveledUp: newLevel > previousLevel,
    newLevel,
    dailyCapped,
    newBadges,
  };
}

export async function checkBadgeProgression(
  userId: string,
  category: string,
  currentCount: number
): Promise<{ earned: boolean; badge: any } | null> {
  const definition = BADGE_DEFINITIONS[category];
  if (!definition) return null;

  let highestEarnedLevel = -1;
  for (let i = definition.thresholds.length - 1; i >= 0; i--) {
    if (currentCount >= definition.thresholds[i]) {
      highestEarnedLevel = i;
      break;
    }
  }

  if (highestEarnedLevel < 0) return null;

  const badgeId = `${category}_${BADGE_LEVELS[highestEarnedLevel].toLowerCase()}`;
  const existingBadge = await storage.getBadge(userId, badgeId);

  if (existingBadge) return null;

  const badge = await storage.createBadge({
    userId,
    badgeId,
    badgeLevel: highestEarnedLevel + 1,
    category,
  });

  const profile = await storage.getGamificationProfile(userId);
  if (profile) {
    await storage.upsertGamificationProfile(userId, {
      badgesEarned: (profile.badgesEarned || 0) + 1,
    });
  }

  return {
    earned: true,
    badge: {
      ...badge,
      levelName: BADGE_LEVELS[highestEarnedLevel],
      categoryName: definition.name,
    },
  };
}

export async function getGamificationProfile(userId: string): Promise<object> {
  let profile = await storage.getGamificationProfile(userId);

  if (!profile) {
    profile = await storage.upsertGamificationProfile(userId, {
      totalXp: 0,
      currentLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      badgesEarned: 0,
      certificatesEarned: 0,
    });
  }

  const levelInfo = getLevelInfo(profile.currentLevel);
  const nextLevelInfo = LEVEL_THRESHOLDS.find((t) => t.level === profile!.currentLevel + 1);
  const xpForNextLevel = nextLevelInfo ? nextLevelInfo.xpRequired - profile.totalXp : 0;
  const progressPercent = nextLevelInfo
    ? Math.min(100, Math.round(((profile.totalXp - levelInfo.xpRequired) / (nextLevelInfo.xpRequired - levelInfo.xpRequired)) * 100))
    : 100;

  const recentXp = await storage.getXpLedger(userId, 10);
  const badges = await storage.getBadgesForUser(userId);

  const enrichedBadges = badges.map((b) => {
    const def = BADGE_DEFINITIONS[b.category];
    const levelIndex = b.badgeLevel - 1;
    return {
      ...b,
      levelName: BADGE_LEVELS[levelIndex] || "Unknown",
      categoryName: def?.name || b.category,
    };
  });

  return {
    ...profile,
    levelTitle: levelInfo.title,
    xpForNextLevel: Math.max(0, xpForNextLevel),
    progressPercent,
    nextLevelTitle: nextLevelInfo ? LEVEL_THRESHOLDS.find((t) => t.level === profile!.currentLevel + 1)?.title : "Max Level",
    recentXp,
    badges: enrichedBadges,
  };
}

export async function getLeaderboard(orgId: number, limit: number = 10): Promise<object[]> {
  const results = await db
    .select({
      userId: gamificationProfiles.userId,
      totalXp: gamificationProfiles.totalXp,
      currentLevel: gamificationProfiles.currentLevel,
      currentStreak: gamificationProfiles.currentStreak,
      badgesEarned: gamificationProfiles.badgesEarned,
      firstName: organizationMembers.firstName,
      lastName: organizationMembers.lastName,
      profilePhotoUrl: organizationMembers.profilePhotoUrl,
    })
    .from(gamificationProfiles)
    .innerJoin(
      organizationMembers,
      and(
        eq(gamificationProfiles.userId, organizationMembers.userId),
        eq(organizationMembers.orgId, orgId)
      )
    )
    .orderBy(desc(gamificationProfiles.totalXp))
    .limit(limit);

  return results.map((r, index) => {
    const levelInfo = getLevelInfo(r.currentLevel);
    return {
      rank: index + 1,
      userId: r.userId,
      firstName: r.firstName,
      lastName: r.lastName,
      profilePhotoUrl: r.profilePhotoUrl,
      totalXp: r.totalXp,
      currentLevel: r.currentLevel,
      levelTitle: levelInfo.title,
      currentStreak: r.currentStreak,
      badgesEarned: r.badgesEarned,
    };
  });
}
