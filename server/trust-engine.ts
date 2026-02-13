import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { trustAssessments, trustSessionSummaries, agentTrustProfiles } from "@shared/schema";

export const DECEPTION_TYPES = [
  "polite_lie",
  "time_trap",
  "honesty_test",
  "red_herring",
  "gatekeeper_test",
  "competitor_bluff",
] as const;

export type DeceptionType = typeof DECEPTION_TYPES[number];

export const DECEPTION_DESCRIPTIONS: Record<DeceptionType, string> = {
  polite_lie: "Express false satisfaction with current processor to test if the rep pushes for commitment or genuinely listens",
  time_trap: "Create fake urgency ('I have a meeting in 2 minutes') to pressure the rep into rushing their pitch",
  honesty_test: "Deliberately misstate a fact about processing (wrong rate, wrong fee) to see if the rep corrects you or agrees",
  red_herring: "Bring up an irrelevant concern to test if the rep stays focused on what matters",
  gatekeeper_test: "Pretend someone else makes decisions ('My partner handles that') to see how the rep navigates",
  competitor_bluff: "Cite a fake competitor offer ('XYZ offered me 1.2%') to see if the rep panics or responds confidently",
};

export const MOOD_BANDS = {
  guarded: { min: 0, max: 35, label: "Guarded", emoji: "guarded" },
  warming: { min: 36, max: 65, label: "Warming Up", emoji: "warming" },
  engaged: { min: 66, max: 100, label: "Engaged", emoji: "engaged" },
} as const;

export type MoodBand = keyof typeof MOOD_BANDS;

export function getMoodBand(score: number): MoodBand {
  if (score <= 35) return "guarded";
  if (score <= 65) return "warming";
  return "engaged";
}

export function getMoodLabel(score: number): string {
  return MOOD_BANDS[getMoodBand(score)].label;
}

export interface TrustAssessmentResult {
  trustDelta: number;
  newScore: number;
  moodBand: MoodBand;
  deceptionDeployed: boolean;
  deceptionType: DeceptionType | null;
  deceptionCaught: boolean | null;
  rationale: string;
  nextDeceptionHint: DeceptionType | null;
}

export interface AdaptiveDifficultyConfig {
  difficulty: "easy" | "normal" | "hard";
  startingTrust: number;
  deceptionFrequency: number;
  deceptionSophistication: "basic" | "moderate" | "advanced";
  patternBasedBaiting: string[];
}

export function buildDeceptionInstructions(difficulty: AdaptiveDifficultyConfig): string {
  const deceptionTypes = DECEPTION_TYPES.slice(0, difficulty.difficulty === "easy" ? 3 : difficulty.difficulty === "normal" ? 5 : 6);

  const deceptionBlock = deceptionTypes.map(type => {
    return `- ${type.replace(/_/g, ' ').toUpperCase()}: ${DECEPTION_DESCRIPTIONS[type]}`;
  }).join("\n");

  const frequencyGuide = difficulty.difficulty === "easy"
    ? "Deploy a deception tactic roughly every 4-5 exchanges."
    : difficulty.difficulty === "normal"
      ? "Deploy a deception tactic roughly every 3 exchanges."
      : "Deploy a deception tactic every 2 exchanges. Be subtle and sophisticated.";

  const baitingInstructions = difficulty.patternBasedBaiting.length > 0
    ? `\n\nADAPTIVE BAITING (based on this rep's past patterns):\n${difficulty.patternBasedBaiting.map(b => `- ${b}`).join("\n")}`
    : "";

  return `
DECEPTION TOOLKIT - TRUST BUILDING TEST:
You have a hidden agenda: test whether this sales rep builds genuine trust or uses manipulative tactics.
Your trust level starts at ${difficulty.startingTrust}/100. You don't reveal this number.

DECEPTION TACTICS AVAILABLE:
${deceptionBlock}

DEPLOYMENT FREQUENCY: ${frequencyGuide}

RULES:
- Never reveal you're testing them
- Stay fully in character when deploying deceptions
- If the rep catches your deception (corrects your false info, doesn't panic at fake urgency, etc.), you should be subtly impressed
- If the rep falls for the deception, note it mentally but don't call it out
- Weave deceptions naturally into conversation${baitingInstructions}
`;
}

export function buildTrustAssessmentPrompt(
  currentTrust: number,
  messageIndex: number,
  userMessage: string,
  merchantResponse: string,
  personaName: string,
  conversationContext: string,
  difficulty: AdaptiveDifficultyConfig
): string {
  return `You are a trust assessment engine evaluating a sales roleplay conversation. Analyze the LATEST exchange and provide a trust score assessment.

CURRENT STATE:
- Trust Score: ${currentTrust}/100
- Mood: ${getMoodLabel(currentTrust)}
- Exchange #: ${messageIndex}
- Difficulty: ${difficulty.difficulty}
- Persona: ${personaName}

CONVERSATION CONTEXT (last few exchanges):
${conversationContext}

LATEST EXCHANGE:
Sales Rep said: "${userMessage}"
Merchant (${personaName}) responded: "${merchantResponse}"

SCORING CRITERIA:
Trust INCREASES (+3 to +8) when the rep:
- Actively listens and references what the merchant said earlier
- Shows genuine empathy for the merchant's situation
- Handles objections with honesty (admits downsides)
- Provides specific, verifiable facts
- Catches a deception attempt (corrects false info, stays calm under pressure)
- Asks thoughtful questions instead of pitching
- Acknowledges the merchant's expertise or experience

Trust DECREASES (-3 to -10) when the rep:
- Uses high-pressure or manipulative tactics
- Makes vague or unverifiable promises
- Ignores merchant concerns or steamrolls
- Falls for a deception (agrees with false info, panics at fake urgency)
- Badmouths competitors
- Talks too much without listening
- Gets defensive when challenged

Trust STAYS SAME (0) when:
- Exchange is neutral/informational
- Small talk without substance

DECEPTION ASSESSMENT:
Was a deception tactic deployed in the merchant's response? If yes:
- Which type? (polite_lie, time_trap, honesty_test, red_herring, gatekeeper_test, competitor_bluff)
- Did the rep catch it or fall for it?

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "trustDelta": <number between -10 and +8>,
  "rationale": "<1-2 sentence explanation>",
  "deceptionDeployed": <true/false>,
  "deceptionType": "<type or null>",
  "deceptionCaught": <true/false/null>,
  "suggestNextDeception": "<deception type to try next or null>"
}`;
}

export async function getAdaptiveDifficulty(agentId: string): Promise<AdaptiveDifficultyConfig> {
  try {
    const profile = await db.select().from(agentTrustProfiles).where(eq(agentTrustProfiles.agentId, agentId)).limit(1);

    if (!profile || profile.length === 0) {
      return {
        difficulty: "normal",
        startingTrust: 50,
        deceptionFrequency: 3,
        deceptionSophistication: "moderate",
        patternBasedBaiting: [],
      };
    }

    const p = profile[0];
    const avg = p.avgTrustLast5 ?? 50;
    const patterns = (p.patternFlags as Record<string, any>) || {};
    const sessions = p.totalSessions ?? 0;

    let difficulty: "easy" | "normal" | "hard";
    let startingTrust: number;
    let sophistication: "basic" | "moderate" | "advanced";

    if (sessions < 3) {
      difficulty = "easy";
      startingTrust = 55;
      sophistication = "basic";
    } else if (avg >= 70) {
      difficulty = "hard";
      startingTrust = 40;
      sophistication = "advanced";
    } else if (avg <= 40) {
      difficulty = "easy";
      startingTrust = 55;
      sophistication = "basic";
    } else {
      difficulty = "normal";
      startingTrust = 50;
      sophistication = "moderate";
    }

    const baiting: string[] = [];
    if (patterns.pitchesTooEarly) {
      baiting.push("This rep tends to pitch too early. Ask an open-ended question about their day to see if they immediately pivot to sales.");
    }
    if (patterns.ignoresObjections) {
      baiting.push("This rep tends to ignore objections. Raise a subtle concern and see if they address it or talk over it.");
    }
    if (patterns.agreesWithEverything) {
      baiting.push("This rep tends to agree with everything. State something obviously wrong about processing fees to test if they correct you.");
    }
    if (patterns.rushesClosure) {
      baiting.push("This rep rushes to close. Express mild interest early and see if they immediately try to schedule a sign-up.");
    }

    return {
      difficulty,
      startingTrust,
      deceptionFrequency: difficulty === "easy" ? 5 : difficulty === "normal" ? 3 : 2,
      deceptionSophistication: sophistication,
      patternBasedBaiting: baiting,
    };
  } catch (err) {
    console.error("[TrustEngine] Error getting adaptive difficulty:", err);
    return {
      difficulty: "normal",
      startingTrust: 50,
      deceptionFrequency: 3,
      deceptionSophistication: "moderate",
      patternBasedBaiting: [],
    };
  }
}

export async function saveTrustAssessment(
  sessionId: number,
  sessionType: "training" | "roleplay",
  messageIndex: number,
  trustBefore: number,
  result: TrustAssessmentResult
) {
  try {
    await db.insert(trustAssessments).values({
      sessionId,
      sessionType,
      messageIndex,
      trustScoreBefore: trustBefore,
      trustScoreAfter: result.newScore,
      trustDelta: result.trustDelta,
      moodBand: result.moodBand,
      deceptionType: result.deceptionType,
      deceptionDeployed: result.deceptionDeployed,
      deceptionCaught: result.deceptionCaught,
      rationale: result.rationale,
    });
  } catch (err) {
    console.error("[TrustEngine] Failed to save assessment:", err);
  }
}

export async function saveTrustSessionSummary(
  sessionId: number,
  sessionType: "training" | "roleplay",
  agentId: string,
  trustHistory: TrustAssessmentResult[],
  difficulty: string
) {
  try {
    const scores = trustHistory.map(h => h.newScore);
    const startScore = 50;
    const endScore = scores.length > 0 ? scores[scores.length - 1] : 50;
    const peakScore = scores.length > 0 ? Math.max(...scores) : 50;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 50;
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;

    const totalDeceptions = trustHistory.filter(h => h.deceptionDeployed).length;
    const deceptionsCaught = trustHistory.filter(h => h.deceptionDeployed && h.deceptionCaught).length;

    const moodTransitions = trustHistory.map((h, i) => ({
      exchange: i + 1,
      mood: h.moodBand,
      score: h.newScore,
    }));

    const trustProgression = trustHistory.map((h, i) => ({
      exchange: i + 1,
      score: h.newScore,
      delta: h.trustDelta,
    }));

    const deceptionDetails = trustHistory
      .filter(h => h.deceptionDeployed)
      .map((h, i) => ({
        exchange: trustHistory.indexOf(h) + 1,
        type: h.deceptionType,
        caught: h.deceptionCaught,
        rationale: h.rationale,
      }));

    await db.insert(trustSessionSummaries).values({
      sessionId,
      sessionType,
      agentId,
      startScore,
      endScore,
      peakScore,
      lowestScore,
      avgScore,
      totalDeceptions,
      deceptionsCaught,
      moodTransitions,
      trustProgression,
      deceptionDetails,
      difficultyUsed: difficulty,
    });

    await updateAgentTrustProfile(agentId, endScore, trustHistory);
  } catch (err) {
    console.error("[TrustEngine] Failed to save session summary:", err);
  }
}

async function updateAgentTrustProfile(agentId: string, latestScore: number, history: TrustAssessmentResult[]) {
  try {
    const existing = await db.select().from(agentTrustProfiles).where(eq(agentTrustProfiles.agentId, agentId)).limit(1);

    const patternFlags: Record<string, boolean> = {};

    const earlyDeceptionFails = history.slice(0, 3).filter(h => h.deceptionDeployed && !h.deceptionCaught);
    if (earlyDeceptionFails.length >= 2) {
      patternFlags.pitchesTooEarly = true;
    }

    const ignoredObjections = history.filter(h => h.trustDelta < -3 && h.rationale.toLowerCase().includes("ignor"));
    if (ignoredObjections.length >= 2) {
      patternFlags.ignoresObjections = true;
    }

    const agreesFails = history.filter(h => h.deceptionType === "honesty_test" && !h.deceptionCaught);
    if (agreesFails.length >= 2) {
      patternFlags.agreesWithEverything = true;
    }

    if (existing.length > 0) {
      const prev = existing[0];
      const totalSessions = (prev.totalSessions ?? 0) + 1;

      const recentSummaries = await db.select()
        .from(trustSessionSummaries)
        .where(eq(trustSessionSummaries.agentId, agentId))
        .orderBy(desc(trustSessionSummaries.createdAt))
        .limit(5);

      const last5Scores = recentSummaries.map(s => s.endScore);
      last5Scores.push(latestScore);
      const avgLast5 = Math.round(last5Scores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(last5Scores.length, 5));

      let adaptiveDifficulty = "normal";
      if (totalSessions < 3) adaptiveDifficulty = "easy";
      else if (avgLast5 >= 70) adaptiveDifficulty = "hard";
      else if (avgLast5 <= 40) adaptiveDifficulty = "easy";

      await db.update(agentTrustProfiles)
        .set({
          avgTrustLast5: avgLast5,
          totalSessions,
          patternFlags: { ...((prev.patternFlags as Record<string, any>) || {}), ...patternFlags },
          adaptiveDifficulty,
          lastSessionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentTrustProfiles.agentId, agentId));
    } else {
      await db.insert(agentTrustProfiles).values({
        agentId,
        avgTrustLast5: latestScore,
        totalSessions: 1,
        patternFlags,
        adaptiveDifficulty: "easy",
        lastSessionAt: new Date(),
      });
    }
  } catch (err) {
    console.error("[TrustEngine] Failed to update agent profile:", err);
  }
}

export function parseTrustAssessmentResponse(
  jsonString: string,
  currentTrust: number
): TrustAssessmentResult {
  const safeDefault: TrustAssessmentResult = {
    trustDelta: 0,
    newScore: Math.max(0, Math.min(100, currentTrust)),
    moodBand: getMoodBand(Math.max(0, Math.min(100, currentTrust))),
    deceptionDeployed: false,
    deceptionType: null,
    deceptionCaught: null,
    rationale: "Assessment parse error",
    nextDeceptionHint: null,
  };

  try {
    if (!jsonString || typeof jsonString !== 'string') {
      console.error("[TrustEngine] Invalid input to parseTrustAssessmentResponse:", typeof jsonString);
      return safeDefault;
    }

    const cleaned = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (jsonErr) {
      console.error("[TrustEngine] JSON.parse failed:", jsonErr, cleaned.substring(0, 200));
      return safeDefault;
    }

    if (!parsed || typeof parsed !== 'object') {
      console.error("[TrustEngine] Parsed result is not an object:", typeof parsed);
      return safeDefault;
    }

    const rawDelta = typeof parsed.trustDelta === 'number' ? parsed.trustDelta : parseInt(parsed.trustDelta);
    const delta = isNaN(rawDelta) ? 0 : Math.max(-15, Math.min(15, rawDelta));
    const newScore = Math.max(0, Math.min(100, currentTrust + delta));

    return {
      trustDelta: delta,
      newScore,
      moodBand: getMoodBand(newScore),
      deceptionDeployed: Boolean(parsed.deceptionDeployed),
      deceptionType: parsed.deceptionType && DECEPTION_TYPES.includes(parsed.deceptionType) ? parsed.deceptionType : null,
      deceptionCaught: parsed.deceptionDeployed ? Boolean(parsed.deceptionCaught) : null,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : "No rationale provided",
      nextDeceptionHint: parsed.suggestNextDeception && DECEPTION_TYPES.includes(parsed.suggestNextDeception) ? parsed.suggestNextDeception : null,
    };
  } catch (err) {
    console.error("[TrustEngine] Failed to parse assessment:", err, jsonString?.substring?.(0, 200));
    return safeDefault;
  }
}

export function buildTrustDebrief(
  trustHistory: TrustAssessmentResult[],
  personaName: string
): {
  finalScore: number;
  startScore: number;
  peakScore: number;
  lowestScore: number;
  progression: { exchange: number; score: number; delta: number }[];
  deceptionsTotal: number;
  deceptionsCaught: number;
  deceptionDetails: { exchange: number; type: string; caught: boolean; rationale: string }[];
  moodJourney: { exchange: number; mood: string }[];
  trustGrade: string;
  trustGradeLabel: string;
} {
  const scores = trustHistory.map(h => h.newScore);
  const finalScore = scores.length > 0 ? scores[scores.length - 1] : 50;
  const peakScore = scores.length > 0 ? Math.max(...scores) : 50;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 50;

  const progression = trustHistory.map((h, i) => ({
    exchange: i + 1,
    score: h.newScore,
    delta: h.trustDelta,
  }));

  const deceptionItems = trustHistory.filter(h => h.deceptionDeployed);
  const deceptionsTotal = deceptionItems.length;
  const deceptionsCaught = deceptionItems.filter(h => h.deceptionCaught).length;

  const deceptionDetails = deceptionItems.map(h => ({
    exchange: trustHistory.indexOf(h) + 1,
    type: (h.deceptionType || "unknown").replace(/_/g, " "),
    caught: Boolean(h.deceptionCaught),
    rationale: h.rationale,
  }));

  const moodJourney = trustHistory.map((h, i) => ({
    exchange: i + 1,
    mood: MOOD_BANDS[h.moodBand].label,
  }));

  let trustGrade: string;
  let trustGradeLabel: string;
  if (finalScore >= 80) { trustGrade = "A"; trustGradeLabel = "Excellent - Built strong trust"; }
  else if (finalScore >= 65) { trustGrade = "B"; trustGradeLabel = "Good - Solid rapport built"; }
  else if (finalScore >= 50) { trustGrade = "C"; trustGradeLabel = "Average - Some trust established"; }
  else if (finalScore >= 35) { trustGrade = "D"; trustGradeLabel = "Below Average - Struggled with trust"; }
  else { trustGrade = "F"; trustGradeLabel = "Poor - Trust was lost"; }

  return {
    finalScore,
    startScore: 50,
    peakScore,
    lowestScore,
    progression,
    deceptionsTotal,
    deceptionsCaught,
    deceptionDetails,
    moodJourney,
    trustGrade,
    trustGradeLabel,
  };
}
