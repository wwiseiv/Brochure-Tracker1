import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Zap,
  Trophy,
  Award,
  Flame,
  Target,
  Star,
  BarChart3,
  ChevronRight,
  ArrowLeft,
  Download,
  Loader2,
  Lock,
  Shield,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface GamificationProfile {
  profile: {
    totalXp: number;
    currentLevel: number;
    currentStreak: number;
    longestStreak: number;
    badgesEarned: number;
    certificatesEarned: number;
    lastActivityDate: string;
  };
  levelInfo: {
    level: number;
    title: string;
    xpRequired: number;
    currentXp: number;
    nextLevelXp: number;
    progressPercent: number;
  };
  recentXp: {
    amount: number;
    source: string;
    description: string;
    earnedAt: string;
  }[];
  badges: {
    badgeId: string;
    badgeLevel: number;
    category: string;
    earnedAt: string;
  }[];
}

interface LeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalXp: number;
  currentLevel: number;
  badgesEarned: number;
  rank: number;
}

interface Certificate {
  id: number;
  type: string;
  name: string;
  description: string;
  status: "earned" | "available" | "locked";
  earnedAt?: string;
  requirement?: string;
  verificationCode?: string;
}

interface EligibilityData {
  eligible: {
    type: string;
    title: string;
    description: string;
    requirement: string;
  }[];
}

interface ProgressionLevel {
  level: number;
  title: string;
  xpRequired: number;
  skillScoreRequired: number;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

interface LadderData {
  currentLevel: number;
  currentTitle: string;
  nextLevel: ProgressionLevel | null;
  progress: { xpPercent: number; skillScorePercent: number };
  allLevels: ProgressionLevel[];
  skillScoreWarning: boolean;
  warningMessage?: string;
}

interface SkillScoreData {
  overallScore: number;
  components: Record<string, { score: number; weight: number; weighted: number; details: string }>;
}

const BADGE_CATEGORIES: Record<string, { name: string; color: string }> = {
  presentation: { name: "Presentation", color: "#7C5CFC" },
  equipiq: { name: "Equipment", color: "#10B981" },
  roleplay: { name: "Roleplay", color: "#F59E0B" },
  daily_edge: { name: "Daily Edge", color: "#EC4899" },
  sales_process: { name: "Sales Process", color: "#3B82F6" },
  overall: { name: "Overall", color: "#EF4444" },
};

const BADGE_LEVELS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];

const DAILY_XP_CAP = 400;

const CERTIFICATE_TYPES = {
  presentation_mastery: "Presentation Mastery",
  equipiq_expert: "Equipment Expert",
  roleplay_champion: "Roleplay Champion",
  sales_excellence: "Sales Excellence",
  ladder_field_scout: "Field Scout Achievement",
  ladder_pipeline_builder: "Pipeline Builder Achievement",
  ladder_deal_closer: "Deal Closer Achievement",
  ladder_revenue_generator: "Revenue Generator Achievement",
  ladder_residual_architect: "Residual Architect Mastery",
};

const SOURCE_ICONS: Record<string, typeof Zap> = {
  presentation_lesson: Target,
  roleplay: Trophy,
  equipiq: Star,
  daily_edge: Flame,
  sales_process: BarChart3,
};

function LevelProgressRing({
  progress,
  level,
  size = 160,
  strokeWidth = 12,
}: {
  progress: number;
  level: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="#7C5CFC"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" data-testid="text-current-level">
          {level}
        </span>
        <span className="text-xs text-muted-foreground">Level</span>
      </div>
    </div>
  );
}

function getSourceIcon(source: string) {
  const Icon = SOURCE_ICONS[source] || Zap;
  return Icon;
}

export default function GamificationDashboardPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { hasFeature } = usePermissions();
  const { toast } = useToast();

  const { data: profileData, isLoading: profileLoading } = useQuery<GamificationProfile>({
    queryKey: ["/api/gamification/profile"],
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/gamification/leaderboard"],
    enabled: hasFeature("gamification_leaderboard"),
  });

  const { data: certificates, isLoading: certificatesLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/gamification/certificates"],
  });

  const { data: eligibilityData } = useQuery<EligibilityData>({
    queryKey: ["/api/gamification/certificates/check-eligibility"],
  });

  const { data: ladderData } = useQuery<LadderData>({
    queryKey: ["/api/gamification/progression-ladder"],
  });

  const { data: skillScoreData } = useQuery<SkillScoreData>({
    queryKey: ["/api/gamification/skill-score"],
  });

  const { data: trainingHistory } = useQuery<any[]>({
    queryKey: ["/api/training/sessions"],
  });

  const { data: assetManifest } = useQuery<any>({
    queryKey: ["/api/certificates/manifest"],
  });

  const { data: earnedItemsData } = useQuery<{ earnedItems: any[] }>({
    queryKey: ["/api/certificates/earned"],
  });

  const generateCertMutation = useMutation({
    mutationFn: async (certificateType: string) => {
      const res = await apiRequest("POST", "/api/gamification/certificates/generate", { certificateType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/certificates/check-eligibility"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/profile"] });
      toast({
        title: "Certificate earned!",
        description: "Your certificate has been generated and is ready to download.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate certificate.",
        variant: "destructive",
      });
    },
  });

  const todayXp = profileData?.recentXp
    ?.filter((xp) => {
      const today = new Date().toISOString().split("T")[0];
      return xp.earnedAt?.startsWith(today);
    })
    .reduce((sum, xp) => sum + xp.amount, 0) ?? 0;

  const recentEntries = profileData?.recentXp?.slice(0, 5) ?? [];

  const earnedBadgeMap = new Map<string, number>();
  profileData?.badges?.forEach((b) => {
    const key = b.category;
    const existing = earnedBadgeMap.get(key) ?? 0;
    if (b.badgeLevel > existing) {
      earnedBadgeMap.set(key, b.badgeLevel);
    }
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/profile")}
            data-testid="button-back-profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Training Progress</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex flex-col items-center gap-3">
            <LevelProgressRing
              progress={profileData?.levelInfo?.progressPercent ?? 0}
              level={profileData?.levelInfo?.level ?? 1}
            />
            <h2 className="text-lg font-semibold" data-testid="text-level-title">
              {profileData?.levelInfo?.title ?? "Beginner"}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-xp-counter">
              {profileData?.levelInfo?.currentXp ?? 0} / {profileData?.levelInfo?.xpRequired ?? 0} XP
            </p>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-center gap-1.5" data-testid="text-current-streak">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">
                  {profileData?.profile?.currentStreak ?? 0} day streak
                </span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="text-badges-count">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium">
                  {profileData?.profile?.badgesEarned ?? 0} badges
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-progression-ladder">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-500" />
            Progression Ladder
            {ladderData?.currentTitle && ladderData.currentTitle !== "Unranked" && (
              <Badge variant="secondary" className="ml-auto" data-testid="badge-ladder-current">
                {ladderData.currentTitle}
              </Badge>
            )}
          </h3>

          {ladderData?.skillScoreWarning && (
            <div className="mb-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2" data-testid="alert-skill-score-warning">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">{ladderData.warningMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            {(ladderData?.allLevels || []).map((level) => {
              const isCurrent = ladderData?.currentLevel === level.level;
              const isNext = ladderData?.nextLevel?.level === level.level;

              return (
                <div
                  key={level.level}
                  className={`flex items-center gap-3 p-3 rounded-md border ${
                    level.earned
                      ? isCurrent
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-green-500/50 bg-green-500/5'
                      : isNext
                        ? 'border-border bg-muted/30'
                        : 'border-border opacity-50'
                  }`}
                  data-testid={`ladder-level-${level.level}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                    level.earned
                      ? 'bg-indigo-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {level.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${level.earned ? '' : 'text-muted-foreground'}`}>
                      {level.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {level.earned
                        ? level.earnedAt
                          ? `Earned ${new Date(level.earnedAt).toLocaleDateString()}`
                          : 'Earned'
                        : `${level.xpRequired.toLocaleString()} XP + ${level.skillScoreRequired} Skill Score`
                      }
                    </p>
                    {isNext && ladderData?.progress && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">XP</span>
                          <Progress value={ladderData.progress.xpPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground">{ladderData.progress.xpPercent}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Skill</span>
                          <Progress value={ladderData.progress.skillScorePercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground">{ladderData.progress.skillScorePercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {level.earned && (
                    <Star className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {skillScoreData && (
          <Card className="p-4" data-testid="card-skill-score">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Skill Score
              <Badge variant="secondary" className="ml-auto" data-testid="badge-skill-score">
                {skillScoreData.overallScore}/100
              </Badge>
            </h3>

            <div className="space-y-3">
              {Object.entries(skillScoreData.components).map(([key, comp]) => {
                const labels: Record<string, string> = {
                  roleplayPerformance: 'Roleplay',
                  objectionHandling: 'Objections',
                  presentationMastery: 'Presentation',
                  scenarioDecisionMaking: 'Scenarios',
                  consistency: 'Consistency',
                };

                return (
                  <div key={key} data-testid={`skill-component-${key}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{labels[key] || key}</span>
                      <span className="font-medium">
                        {comp.score}% <span className="text-xs text-muted-foreground">({Math.round(comp.weight * 100)}%)</span>
                      </span>
                    </div>
                    <Progress value={comp.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-0.5">{comp.details}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Today's Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Daily XP</span>
              <span className="font-medium" data-testid="text-today-xp">
                {todayXp} / {DAILY_XP_CAP}
              </span>
            </div>
            <Progress
              value={Math.min((todayXp / DAILY_XP_CAP) * 100, 100)}
              className="h-2"
              data-testid="progress-daily-xp"
            />

            {recentEntries.length > 0 && (
              <div className="mt-4 space-y-2">
                {recentEntries.map((entry, idx) => {
                  const Icon = getSourceIcon(entry.source);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                      data-testid={`xp-entry-${idx}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm flex-1 truncate">{entry.description}</span>
                      <Badge variant="secondary" className="flex-shrink-0">
                        +{entry.amount} XP
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {recentEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity yet today. Start training to earn XP!
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Badge Collection
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(BADGE_CATEGORIES).map(([categoryKey, categoryInfo]) => {
              const highestEarned = earnedBadgeMap.get(categoryKey) ?? 0;
              return (
                <div
                  key={categoryKey}
                  className="flex flex-col items-center gap-2"
                  data-testid={`badge-category-${categoryKey}`}
                >
                  <div className="flex items-center gap-1.5">
                    {BADGE_LEVELS.map((levelName, levelIdx) => {
                      const levelNum = levelIdx + 1;
                      const isEarned = levelNum <= highestEarned;
                      return (
                        <div
                          key={levelName}
                          className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: isEarned ? categoryInfo.color : "var(--border)",
                            backgroundColor: isEarned ? categoryInfo.color : "transparent",
                          }}
                          title={levelName}
                          data-testid={`badge-${categoryKey}-${levelName.toLowerCase()}`}
                        >
                          {isEarned && (
                            <Star className="w-3 h-3 text-white" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground text-center">
                    {categoryInfo.name}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4" data-testid="card-badge-wall">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            Visual Badge Collection
          </h3>

          {/* Tier Medallions */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Tier Medallions</p>
            <div className="grid grid-cols-4 gap-3">
              {assetManifest?.assets && (Object.entries(assetManifest.assets) as [string, any][])
                .filter(([, asset]: [string, any]) => asset.type === "tier")
                .sort(([, a]: [string, any], [, b]: [string, any]) => (a.tier_level || 0) - (b.tier_level || 0))
                .map(([assetId, asset]: [string, any]) => {
                  const earnedItem = earnedItemsData?.earnedItems?.find((item) => item.assetId === assetId);
                  const isEarned = !!earnedItem;
                  return (
                    <div
                      key={assetId}
                      className="flex flex-col items-center gap-1.5"
                      data-testid={`visual-badge-${assetId.replace(/\./g, '-')}`}
                    >
                      <div className="relative">
                        <img
                          src={`/certificates/${asset.file}`}
                          alt={asset.displayName}
                          className="w-20 h-20 md:w-24 md:h-24 object-contain"
                          style={isEarned ? {} : { filter: 'grayscale(100%) opacity(40%)' }}
                        />
                        {!isEarned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px]">
                        {asset.displayName}
                      </span>
                      {isEarned && earnedItem && (
                        <span className="text-[9px] text-emerald-500">
                          {new Date(earnedItem.earnedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Training Badges */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Training Badges</p>
            <div className="grid grid-cols-4 gap-3">
              {assetManifest?.assets && (Object.entries(assetManifest.assets) as [string, any][])
                .filter(([, asset]: [string, any]) => asset.type === "badge")
                .map(([assetId, asset]: [string, any]) => {
                  const earnedItem = earnedItemsData?.earnedItems?.find((item) => item.assetId === assetId);
                  const isEarned = !!earnedItem;
                  return (
                    <div
                      key={assetId}
                      className="flex flex-col items-center gap-1.5"
                      data-testid={`visual-badge-${assetId.replace(/\./g, '-')}`}
                    >
                      <div className="relative">
                        <img
                          src={`/certificates/${asset.file}`}
                          alt={asset.displayName}
                          className="w-16 h-16 md:w-20 md:h-20 object-contain"
                          style={isEarned ? {} : { filter: 'grayscale(100%) opacity(40%)' }}
                        />
                        {!isEarned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px]">
                        {asset.displayName}
                      </span>
                      {isEarned && earnedItem && (
                        <span className="text-[9px] text-emerald-500">
                          {new Date(earnedItem.earnedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Seals & Stages */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Certifications & Milestones</p>
            <div className="grid grid-cols-5 gap-3">
              {assetManifest?.assets && (Object.entries(assetManifest.assets) as [string, any][])
                .filter(([, asset]: [string, any]) => asset.type === "seal" || asset.type === "stage")
                .map(([assetId, asset]: [string, any]) => {
                  const earnedItem = earnedItemsData?.earnedItems?.find((item) => item.assetId === assetId);
                  const isEarned = !!earnedItem;
                  return (
                    <div
                      key={assetId}
                      className="flex flex-col items-center gap-1.5"
                      data-testid={`visual-badge-${assetId.replace(/\./g, '-')}`}
                    >
                      <div className="relative">
                        <img
                          src={`/certificates/${asset.file}`}
                          alt={asset.displayName}
                          className="w-12 h-12 md:w-16 md:h-16 object-contain"
                          style={isEarned ? {} : { filter: 'grayscale(100%) opacity(40%)' }}
                        />
                        {!isEarned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px]">
                        {asset.displayName}
                      </span>
                      {isEarned && earnedItem && (
                        <span className="text-[9px] text-emerald-500">
                          {new Date(earnedItem.earnedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>

        {hasFeature("gamification_leaderboard") && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Leaderboard
            </h3>
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const initials =
                    (entry.firstName?.[0] ?? "") + (entry.lastName?.[0] ?? "");
                  return (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 py-2 px-3 rounded-md ${
                        isCurrentUser ? "bg-muted" : ""
                      }`}
                      data-testid={`leaderboard-row-${entry.rank}`}
                    >
                      <span className="text-sm font-bold w-6 text-center text-muted-foreground">
                        {entry.rank}
                      </span>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {initials.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.firstName} {entry.lastName}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-1">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Level {entry.currentLevel}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold">{entry.totalXp.toLocaleString()} XP</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.badgesEarned} badges
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leaderboard data available yet.
              </p>
            )}
          </Card>
        )}

        {hasFeature("gamification_certificates") && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Certificates
            </h3>
            {certificatesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(CERTIFICATE_TYPES).map(([certType, certTitle]) => {
                  const earned = certificates?.find((c) => c.type === certType && c.status === "earned");
                  const available = eligibilityData?.eligible?.find((e) => e.type === certType);
                  const isEligible = !!available;
                  const isClaimed = !!earned;
                  const status = isClaimed ? "earned" : isEligible ? "available" : "locked";

                  return (
                    <div
                      key={certType}
                      className="border border-border rounded-lg p-4"
                      data-testid={`certificate-${certType}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            status === "earned"
                              ? "bg-emerald-500/10"
                              : status === "available"
                                ? "bg-blue-500/10"
                                : "bg-muted"
                          }`}
                        >
                          {status === "locked" ? (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Award
                              className={`w-5 h-5 ${
                                status === "earned" ? "text-emerald-500" : "text-blue-500"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{certTitle}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {status === "earned" && earned && earned.earnedAt
                              ? `Earned on ${new Date(earned.earnedAt).toLocaleDateString()}`
                              : available
                                ? available.requirement
                                : "Complete training to unlock"}
                          </p>
                          {earned && earned.verificationCode && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Verification: {earned.verificationCode}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {status === "earned" && earned && (
                            <a
                              href={`/api/gamification/certificates/${earned.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`button-download-cert-${earned.id}`}
                            >
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Download PDF
                              </Button>
                            </a>
                          )}
                          {status === "available" && (
                            <Button
                              size="sm"
                              onClick={() => generateCertMutation.mutate(certType)}
                              disabled={generateCertMutation.isPending}
                              data-testid={`button-claim-cert-${certType}`}
                            >
                              {generateCertMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Claiming...
                                </>
                              ) : (
                                "Claim Certificate"
                              )}
                            </Button>
                          )}
                          {status === "locked" && (
                            <Badge variant="secondary" data-testid={`status-locked-${certType}`}>
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <Card className="p-4" data-testid="card-training-history">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-500" />
            Recent Training Sessions
          </h3>
          {trainingHistory && trainingHistory.length > 0 ? (
            <div className="space-y-2">
              {trainingHistory.slice(0, 10).map((session: any) => {
                const modeLabels: Record<string, string> = {
                  roleplay: 'Roleplay',
                  gauntlet: 'Objection Gauntlet',
                  scenario: 'Scenario Trainer',
                  delivery_analyzer: 'Delivery Analyzer',
                };
                const modeColors: Record<string, string> = {
                  roleplay: 'text-primary',
                  gauntlet: 'text-orange-500',
                  scenario: 'text-cyan-500',
                  delivery_analyzer: 'text-purple-500',
                };

                return (
                  <div key={session.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0" data-testid={`training-session-${session.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${modeColors[session.mode] || ''}`}>
                        {modeLabels[session.mode] || session.mode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.startedAt ? new Date(session.startedAt).toLocaleDateString() : 'Unknown date'}
                        {session.scorePercent !== null && ` · Score: ${session.scorePercent}%`}
                        {session.turnCount && ` · ${session.turnCount} turns`}
                      </p>
                    </div>
                    {session.xpAwarded > 0 && (
                      <Badge variant="secondary" className="flex-shrink-0">
                        +{session.xpAwarded} XP
                      </Badge>
                    )}
                    {session.scorePercent !== null && (
                      <div className={`text-sm font-bold ${
                        session.scorePercent >= 80 ? 'text-green-500' :
                        session.scorePercent >= 60 ? 'text-yellow-500' :
                        session.scorePercent >= 40 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {session.scorePercent}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No training sessions yet. Start practicing to see your history!
            </p>
          )}
        </Card>
      </main>
    </div>
  );
}
