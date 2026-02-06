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
  PRESENTATION_MODULE_COMPLETE: 150,
  EQUIPIQ_QUIZ_COMPLETE: 50,
  EQUIPIQ_QUIZ_PERFECT: 50,
  ROLEPLAY_SESSION_COMPLETE: 60,
  ROLEPLAY_HIGH_SCORE: 40,
  DAILY_EDGE_VIEW: 5,
  DAILY_EDGE_CHALLENGE: 15,
  SALES_PROCESS_PHASE_VIEW: 10,
  GAUNTLET_PER_OBJECTION: 15,
  GAUNTLET_PERFECT_BONUS: 50,
  SCENARIO_COMPLETE: 40,
  SCENARIO_BEST_BONUS: 20,
  DELIVERY_ANALYSIS: 80,
  DELIVERY_ALL_STAGES_BONUS: 20,
  DAILY_CAP: 400,
  STREAK_BONUS_3_DAYS: 25,
  STREAK_BONUS_7_DAYS: 100,
  STREAK_BONUS_14_DAYS: 250,
  STREAK_BONUS_30_DAYS: 500,
  LESSON_QUICK_CHECK_BONUS_80: 10,
  LESSON_QUICK_CHECK_BONUS_90: 25,
  ALL_MODULES_MILESTONE: 500,
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

  // Award streak bonuses (direct, no recursion - bypasses daily cap)
  const currentStreak = streakData.currentStreak || existingProfile?.currentStreak || 0;
  const streakMilestones = [
    { days: 30, xp: XP_CONFIG.STREAK_BONUS_30_DAYS },
    { days: 14, xp: XP_CONFIG.STREAK_BONUS_14_DAYS },
    { days: 7, xp: XP_CONFIG.STREAK_BONUS_7_DAYS },
    { days: 3, xp: XP_CONFIG.STREAK_BONUS_3_DAYS },
  ];

  for (const milestone of streakMilestones) {
    if (currentStreak === milestone.days) {
      const existingEntries = await storage.getXpLedger(userId, 200);
      const alreadyAwarded = existingEntries.some((e: any) =>
        e.source === 'streak_bonus' && e.sourceId === `streak_${milestone.days}_${getTodayDate()}`
      );

      if (!alreadyAwarded) {
        await storage.createXpEntry({
          userId,
          amount: milestone.xp,
          source: 'streak_bonus',
          sourceId: `streak_${milestone.days}_${getTodayDate()}`,
          description: `${milestone.days}-day streak bonus!`,
        });

        const updatedProfile = await storage.getGamificationProfile(userId);
        if (updatedProfile) {
          const streakNewTotal = updatedProfile.totalXp + milestone.xp;
          await storage.upsertGamificationProfile(userId, { totalXp: streakNewTotal, currentLevel: calculateLevel(streakNewTotal) });
        }

        console.log(`[Gamification] Streak bonus: ${milestone.xp} XP for ${milestone.days}-day streak`);
      }
      break;
    }
  }

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

// ========== SKILL SCORE SYSTEM ==========
// Weighted composite score 0-100 based on training performance

export const SKILL_SCORE_WEIGHTS = {
  roleplayPerformance: 0.25,
  objectionHandling: 0.25,
  presentationMastery: 0.30,
  scenarioDecisionMaking: 0.10,
  consistency: 0.10,
};

export async function calculateSkillScore(userId: string): Promise<{
  overallScore: number;
  components: Record<string, { score: number; weight: number; weighted: number; details: string }>;
}> {
  const roleplaySessions = await storage.getTrainingSessions(userId, 'roleplay', 30);
  const gauntletSessions = await storage.getTrainingSessions(userId, 'gauntlet', 30);
  const scenarioSessions = await storage.getTrainingSessions(userId, 'scenario', 30);
  const deliverySessions = await storage.getTrainingSessions(userId, 'delivery_analyzer', 30);

  const completedRoleplays = roleplaySessions.filter(s => s.endedAt && s.scorePercent !== null);
  const roleplayScore = completedRoleplays.length > 0
    ? Math.round(completedRoleplays.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / completedRoleplays.length)
    : 0;

  const completedGauntlets = gauntletSessions.filter(s => s.endedAt && s.scorePercent !== null);
  const gauntletScore = completedGauntlets.length > 0
    ? Math.round(completedGauntlets.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / completedGauntlets.length)
    : 0;

  const completedDelivery = deliverySessions.filter(s => s.endedAt && s.scorePercent !== null);
  const deliveryAvg = completedDelivery.length > 0
    ? Math.round(completedDelivery.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / completedDelivery.length)
    : 0;
  const presentationScore = deliveryAvg;

  const completedScenarios = scenarioSessions.filter(s => s.endedAt && s.scorePercent !== null);
  const scenarioScore = completedScenarios.length > 0
    ? Math.round(completedScenarios.reduce((sum, s) => sum + (s.scorePercent || 0), 0) / completedScenarios.length)
    : 0;

  const profile = await storage.getGamificationProfile(userId);
  const streak = profile?.currentStreak || 0;
  const consistencyScore = Math.min(100, Math.round((streak / 7) * 100));

  const components: Record<string, { score: number; weight: number; weighted: number; details: string }> = {
    roleplayPerformance: {
      score: roleplayScore,
      weight: SKILL_SCORE_WEIGHTS.roleplayPerformance,
      weighted: Math.round(roleplayScore * SKILL_SCORE_WEIGHTS.roleplayPerformance),
      details: `${completedRoleplays.length} sessions, avg ${roleplayScore}%`,
    },
    objectionHandling: {
      score: gauntletScore,
      weight: SKILL_SCORE_WEIGHTS.objectionHandling,
      weighted: Math.round(gauntletScore * SKILL_SCORE_WEIGHTS.objectionHandling),
      details: `${completedGauntlets.length} runs, avg ${gauntletScore}%`,
    },
    presentationMastery: {
      score: presentationScore,
      weight: SKILL_SCORE_WEIGHTS.presentationMastery,
      weighted: Math.round(presentationScore * SKILL_SCORE_WEIGHTS.presentationMastery),
      details: `${completedDelivery.length} analyses, avg ${presentationScore}%`,
    },
    scenarioDecisionMaking: {
      score: scenarioScore,
      weight: SKILL_SCORE_WEIGHTS.scenarioDecisionMaking,
      weighted: Math.round(scenarioScore * SKILL_SCORE_WEIGHTS.scenarioDecisionMaking),
      details: `${completedScenarios.length} completed, avg ${scenarioScore}%`,
    },
    consistency: {
      score: consistencyScore,
      weight: SKILL_SCORE_WEIGHTS.consistency,
      weighted: Math.round(consistencyScore * SKILL_SCORE_WEIGHTS.consistency),
      details: `${streak}-day streak`,
    },
  };

  const overallScore = Object.values(components).reduce((sum, c) => sum + c.weighted, 0);

  return { overallScore: Math.min(100, overallScore), components };
}

// ========== 5-LEVEL PROGRESSION LADDER ==========
// Career progression badges requiring both XP and Skill Score

export const PROGRESSION_LADDER = [
  { level: 1, title: "Field Scout", xpRequired: 200, skillScoreRequired: 20,
    description: "Beginning the journey. Learning the basics of field sales." },
  { level: 2, title: "Pipeline Builder", xpRequired: 1000, skillScoreRequired: 35,
    description: "Building a consistent pipeline of merchant opportunities." },
  { level: 3, title: "Deal Closer", xpRequired: 3000, skillScoreRequired: 50,
    description: "Consistently closing deals with strong sales technique." },
  { level: 4, title: "Revenue Generator", xpRequired: 7000, skillScoreRequired: 65,
    description: "Driving significant revenue with advanced selling skills." },
  { level: 5, title: "Residual Architect", xpRequired: 15000, skillScoreRequired: 80,
    description: "Mastering every aspect of PCBancard sales methodology." },
];

export async function checkProgressionLadder(userId: string): Promise<{
  currentLevel: number;
  currentTitle: string;
  nextLevel: typeof PROGRESSION_LADDER[number] | null;
  progress: { xpPercent: number; skillScorePercent: number };
  allLevels: (typeof PROGRESSION_LADDER[number] & { earned: boolean; earnedAt?: string })[];
  skillScoreWarning: boolean;
  warningMessage?: string;
}> {
  const profile = await storage.getGamificationProfile(userId);
  const totalXp = profile?.totalXp || 0;
  const skillScore = profile?.skillScore || 0;

  let currentLevel = 0;
  let currentTitle = "Unranked";

  const existingBadges = await storage.getBadgesForUser(userId);
  const ladderBadges = existingBadges.filter((b: any) => b.category === 'progression_ladder');

  for (const level of PROGRESSION_LADDER) {
    if (totalXp >= level.xpRequired && skillScore >= level.skillScoreRequired) {
      currentLevel = level.level;
      currentTitle = level.title;

      const badgeId = `ladder_level_${level.level}`;
      const existing = ladderBadges.find((b: any) => b.badgeId === badgeId);
      if (!existing) {
        await storage.createBadge({
          userId,
          badgeId,
          badgeLevel: level.level,
          category: 'progression_ladder',
        });

        if (profile) {
          await storage.upsertGamificationProfile(userId, {
            badgesEarned: (profile.badgesEarned || 0) + 1,
          });
        }
      }
    }
  }

  const nextLevel = PROGRESSION_LADDER.find(l => l.level === currentLevel + 1) || null;

  const progress = nextLevel ? {
    xpPercent: Math.min(100, Math.round((totalXp / nextLevel.xpRequired) * 100)),
    skillScorePercent: Math.min(100, Math.round((skillScore / nextLevel.skillScoreRequired) * 100)),
  } : { xpPercent: 100, skillScorePercent: 100 };

  let skillScoreWarning = false;
  let warningMessage: string | undefined;
  const currentLevelDef = PROGRESSION_LADDER.find(l => l.level === currentLevel);
  if (currentLevelDef && skillScore < currentLevelDef.skillScoreRequired) {
    skillScoreWarning = true;
    warningMessage = `Your Skill Score (${skillScore}) has dropped below the ${currentTitle} requirement (${currentLevelDef.skillScoreRequired}). Your badge is retained, but practice to maintain your level!`;
  }

  const allLevels = PROGRESSION_LADDER.map(level => {
    const badgeId = `ladder_level_${level.level}`;
    const badge = ladderBadges.find((b: any) => b.badgeId === badgeId);
    return {
      ...level,
      earned: !!badge,
      earnedAt: badge?.earnedAt?.toISOString(),
    };
  });

  return {
    currentLevel,
    currentTitle,
    nextLevel,
    progress,
    allLevels,
    skillScoreWarning,
    warningMessage,
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
