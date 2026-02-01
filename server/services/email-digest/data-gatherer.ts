import { db } from "../../db";
import { deals, referrals } from "@shared/schema";
import { eq, and, gte, lte, sql, desc, isNotNull } from "drizzle-orm";
import { addDays, subDays, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export interface DigestData {
  appointments: Array<{
    id: number;
    businessName: string;
    appointmentDate: Date;
    temperature: string | null;
    stage: string;
  }>;
  followups: Array<{
    id: number;
    businessName: string;
    nextFollowUpDate: Date;
    followUpNumber: number;
    temperature: string | null;
  }>;
  staleDeals: Array<{
    id: number;
    businessName: string;
    lastActivityDate: Date | null;
    daysSinceActivity: number;
    stage: string;
    estimatedValue: number | null;
  }>;
  pipelineSummary: {
    totalDeals: number;
    totalValue: number;
    dealsByStage: Record<string, number>;
  };
  recentWins: Array<{
    id: number;
    businessName: string;
    wonDate: Date;
    estimatedValue: number | null;
  }>;
  quarterlyCheckins: Array<{
    id: number;
    businessName: string;
    nextQuarterlyCheckIn: Date;
  }>;
  newReferrals: Array<{
    id: number;
    businessName: string;
    referrerName: string | null;
    createdAt: Date;
  }>;
}

export async function gatherDigestData(
  userId: string,
  timezone: string,
  preferences: {
    includeAppointments: boolean;
    includeFollowups: boolean;
    includeStaleDeals: boolean;
    includePipelineSummary: boolean;
    includeRecentWins: boolean;
    includeQuarterlyCheckins: boolean;
    includeNewReferrals: boolean;
    appointmentLookaheadDays: number;
    staleDealThresholdDays: number;
  },
  digestType: 'daily' | 'weekly'
): Promise<DigestData> {
  const now = new Date();
  const userNow = toZonedTime(now, timezone);
  const today = startOfDay(userNow);
  const lookbackDays = digestType === 'weekly' ? 7 : 1;
  const lookbackDate = subDays(today, lookbackDays);

  const result: DigestData = {
    appointments: [],
    followups: [],
    staleDeals: [],
    pipelineSummary: { totalDeals: 0, totalValue: 0, dealsByStage: {} },
    recentWins: [],
    quarterlyCheckins: [],
    newReferrals: [],
  };

  const userDeals = await db.select().from(deals)
    .where(and(
      eq(deals.assignedAgentId, userId),
      sql`${deals.currentStage} NOT IN ('dead', 'sold', 'active_merchant')`
    ));

  if (preferences.includeAppointments) {
    const appointmentEnd = addDays(today, preferences.appointmentLookaheadDays);
    result.appointments = userDeals
      .filter(d => d.appointmentDate && new Date(d.appointmentDate) >= today && new Date(d.appointmentDate) <= appointmentEnd)
      .map(d => ({
        id: d.id,
        businessName: d.businessName,
        appointmentDate: new Date(d.appointmentDate!),
        temperature: d.temperature,
        stage: d.currentStage,
      }))
      .sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime());
  }

  if (preferences.includeFollowups) {
    const followupEnd = addDays(today, 1);
    result.followups = userDeals
      .filter(d => d.nextFollowUpAt && new Date(d.nextFollowUpAt) <= followupEnd)
      .map(d => ({
        id: d.id,
        businessName: d.businessName,
        nextFollowUpDate: new Date(d.nextFollowUpAt!),
        followUpNumber: d.followUpAttemptCount || 0,
        temperature: d.temperature,
      }))
      .sort((a, b) => a.nextFollowUpDate.getTime() - b.nextFollowUpDate.getTime());
  }

  if (preferences.includeStaleDeals) {
    const staleThreshold = subDays(today, preferences.staleDealThresholdDays);
    result.staleDeals = userDeals
      .filter(d => {
        const lastActivity = d.lastActivityAt || d.stageEnteredAt;
        return lastActivity && new Date(lastActivity) < staleThreshold;
      })
      .map(d => {
        const lastActivity = d.lastActivityAt || d.stageEnteredAt;
        const daysSince = Math.floor((now.getTime() - new Date(lastActivity!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: d.id,
          businessName: d.businessName,
          lastActivityDate: lastActivity,
          daysSinceActivity: daysSince,
          stage: d.currentStage,
          estimatedValue: d.estimatedCommission ? parseFloat(d.estimatedCommission) : null,
        };
      })
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  }

  if (preferences.includePipelineSummary) {
    const allActiveDeals = await db.select().from(deals)
      .where(and(
        eq(deals.assignedAgentId, userId),
        sql`${deals.currentStage} NOT IN ('dead')`
      ));
    
    result.pipelineSummary.totalDeals = allActiveDeals.length;
    result.pipelineSummary.totalValue = allActiveDeals.reduce((sum, d) => 
      sum + (d.estimatedCommission ? parseFloat(d.estimatedCommission) : 0), 0);
    
    allActiveDeals.forEach(d => {
      result.pipelineSummary.dealsByStage[d.currentStage] = (result.pipelineSummary.dealsByStage[d.currentStage] || 0) + 1;
    });
  }

  if (preferences.includeRecentWins) {
    const wonDeals = await db.select().from(deals)
      .where(and(
        eq(deals.assignedAgentId, userId),
        eq(deals.currentStage, 'sold'),
        gte(deals.closedAt, lookbackDate)
      ))
      .orderBy(desc(deals.closedAt));
    
    result.recentWins = wonDeals.map(d => ({
      id: d.id,
      businessName: d.businessName,
      wonDate: d.closedAt!,
      estimatedValue: d.estimatedCommission ? parseFloat(d.estimatedCommission) : null,
    }));
  }

  if (preferences.includeQuarterlyCheckins) {
    const checkinEnd = addDays(today, 7);
    const activeMerchants = await db.select().from(deals)
      .where(and(
        eq(deals.assignedAgentId, userId),
        eq(deals.currentStage, 'active_merchant'),
        isNotNull(deals.nextQuarterlyCheckinAt),
        gte(deals.nextQuarterlyCheckinAt, today),
        lte(deals.nextQuarterlyCheckinAt, checkinEnd)
      ));
    
    result.quarterlyCheckins = activeMerchants.map(d => ({
      id: d.id,
      businessName: d.businessName,
      nextQuarterlyCheckIn: d.nextQuarterlyCheckinAt!,
    }));
  }

  if (preferences.includeNewReferrals) {
    const newReferrals = await db.select().from(referrals)
      .where(and(
        eq(referrals.agentId, userId),
        gte(referrals.createdAt, lookbackDate)
      ))
      .orderBy(desc(referrals.createdAt));
    
    result.newReferrals = newReferrals.map(r => ({
      id: r.id,
      businessName: r.referredBusinessName,
      referrerName: r.referringPartyName,
      createdAt: r.createdAt,
    }));
  }

  return result;
}
