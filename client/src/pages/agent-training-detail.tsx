import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  PlayCircle,
  GraduationCap,
  MessageSquare,
  Package,
  Sun,
  Award,
  Check,
  Lock,
  Trophy,
  Zap,
  User,
  Loader2,
} from "lucide-react";

interface TrainingOverview {
  user: { id: string; role: string; stage: string; joinedAt: string } | null;
  overallProgress: number;
  videos: {
    completed: number;
    total: number;
    items: Array<{ videoId: string; completed: boolean; completedAt: string | null; watchTimeSeconds: number }>;
  };
  presentationTraining: {
    modulesCompleted: number;
    totalModules: number;
    items: Array<{ lessonId: number; completed: boolean; quizPassed: boolean; completedAt: string | null; lessonTitle: string; moduleNumber: number }>;
  };
  salesCoach: {
    sessionsCompleted: number;
    averageScore: number;
    recentSessions: Array<{ id: number; mode: string; personaId: string; scorePercent: number; startedAt: string; endedAt: string; xpAwarded: number }>;
  };
  equipiq: {
    vendorsCompleted: number;
    totalVendors: number;
    results: Array<{ vendorId: string; score: number; completedAt: string }>;
  };
  dailyEdge: { currentStreak: number; longestStreak: number; lastCompleted: string } | null;
  badges: Array<{ badgeId: string; category: string; earnedAt: string }>;
  gamification: { totalXp: number; currentLevel: number; skillScore: number } | null;
}

const VIDEO_NAMES: Record<string, string> = {
  video_hello: '1. Hello — Stop Losing to Fees',
  video_grow: '2. Grow — Reinvest & Scale',
  video_next_steps: '3. Next Steps — $1K Incentive',
  video_trust: '4. Trust — Support & Guarantees',
  video_in_store: '5. In-Store — Brick & Mortar Tools',
  video_mobile: '6. Mobile — Get Paid Anywhere',
  video_online: '7. Online — Get Paid Virtually',
  video_give_back: '8. Give Back — Business Into Impact',
};

const ALL_BADGES = [
  { id: 'video_first_watch', name: 'First Video', icon: PlayCircle, category: 'videos' },
  { id: 'video_halfway', name: 'Halfway There', icon: PlayCircle, category: 'videos' },
  { id: 'video_all_complete', name: 'Video Master', icon: Trophy, category: 'videos' },
  { id: 'video_speed_learner', name: 'Speed Learner', icon: Zap, category: 'videos' },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function AgentTrainingDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/agent/:userId/training");
  const userId = params?.userId;

  const { data: overview, isLoading } = useQuery<TrainingOverview>({
    queryKey: [`/api/admin/agent/${userId}/training-overview`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/admin/team")} data-testid="button-back-team">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team Management
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground" data-testid="text-error">Agent not found or access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const earnedBadgeIds = new Set(overview.badges.map(b => b.badgeId));
  const sortedModules = [...(overview.presentationTraining?.items || [])].sort((a, b) => a.moduleNumber - b.moduleNumber);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/admin/team")} data-testid="button-back-team">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Team Management
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-agent-name">Agent</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {overview.user?.role && <Badge variant="secondary" data-testid="badge-role">{overview.user.role}</Badge>}
            {overview.user?.stage && <Badge variant="outline" data-testid="badge-stage">{overview.user.stage}</Badge>}
            {overview.user?.joinedAt && <span data-testid="text-joined">Joined {formatDate(overview.user.joinedAt)}</span>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Overall Progress</CardTitle>
          <span className="text-2xl font-bold" data-testid="text-overall-progress">{overview.overallProgress}%</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={overview.overallProgress} className="h-3" data-testid="progress-overall" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex flex-col items-center p-2 rounded-md bg-muted/50" data-testid="stat-videos">
              <PlayCircle className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="font-medium">{overview.videos.completed}/8</span>
              <span className="text-xs text-muted-foreground">Videos</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-md bg-muted/50" data-testid="stat-presentation">
              <GraduationCap className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="font-medium">{overview.presentationTraining.modulesCompleted}/{overview.presentationTraining.totalModules}</span>
              <span className="text-xs text-muted-foreground">Modules</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-md bg-muted/50" data-testid="stat-coach">
              <MessageSquare className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="font-medium">{overview.salesCoach.sessionsCompleted}</span>
              <span className="text-xs text-muted-foreground">Coach Sessions</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-md bg-muted/50" data-testid="stat-avg-score">
              <Award className="w-4 h-4 mb-1 text-muted-foreground" />
              <span className="font-medium">{overview.salesCoach.averageScore}%</span>
              <span className="text-xs text-muted-foreground">Avg Score</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Award className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              const IconComponent = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center p-3 rounded-md border ${earned ? 'border-green-500/30 bg-green-500/5' : 'border-muted bg-muted/30 opacity-50'}`}
                  data-testid={`badge-${badge.id}`}
                >
                  <div className="relative">
                    <IconComponent className={`w-6 h-6 ${earned ? 'text-green-600' : 'text-muted-foreground'}`} />
                    {earned && <Check className="w-3 h-3 text-green-600 absolute -top-1 -right-1" />}
                    {!earned && <Lock className="w-3 h-3 text-muted-foreground absolute -top-1 -right-1" />}
                  </div>
                  <span className={`text-xs mt-2 text-center ${earned ? 'font-medium' : 'text-muted-foreground'}`}>{badge.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Sales Videos</CardTitle>
          </div>
          <Badge variant="secondary" data-testid="badge-video-count">{overview.videos.completed}/{overview.videos.total}</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(VIDEO_NAMES).map(([videoId, title]) => {
              const item = overview.videos.items.find(v => v.videoId === videoId);
              const completed = item?.completed ?? false;
              return (
                <div key={videoId} className="flex items-center gap-3 py-1.5" data-testid={`video-item-${videoId}`}>
                  {completed ? (
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${completed ? '' : 'text-muted-foreground'}`}>{title}</span>
                  {completed && item?.completedAt && (
                    <span className="text-xs text-muted-foreground">{formatDate(item.completedAt)}</span>
                  )}
                  {!completed && (
                    <span className="text-xs text-muted-foreground">Not started</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Presentation Training</CardTitle>
          </div>
          <Badge variant="secondary" data-testid="badge-module-count">
            {overview.presentationTraining.modulesCompleted}/{overview.presentationTraining.totalModules}
          </Badge>
        </CardHeader>
        <CardContent>
          {sortedModules.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-presentation">No presentation data yet</p>
          ) : (
            <div className="space-y-2">
              {sortedModules.map((mod) => (
                <div key={mod.lessonId} className="flex items-center gap-3 py-1.5" data-testid={`module-item-${mod.lessonId}`}>
                  {mod.completed ? (
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={`text-sm flex-1 ${mod.completed ? '' : 'text-muted-foreground'}`}>
                    Module {mod.moduleNumber}: {mod.lessonTitle}
                  </span>
                  {mod.quizPassed && (
                    <Badge variant="secondary" className="text-xs">Quiz Passed</Badge>
                  )}
                  {mod.completedAt && (
                    <span className="text-xs text-muted-foreground">{formatDate(mod.completedAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">AI Sales Coach</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-session-count">{overview.salesCoach.sessionsCompleted} sessions</Badge>
            {overview.salesCoach.averageScore > 0 && (
              <Badge variant="outline" data-testid="badge-avg-score">Avg: {overview.salesCoach.averageScore}%</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {overview.salesCoach.recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-coach">No coaching sessions yet</p>
          ) : (
            <div className="space-y-2">
              {overview.salesCoach.recentSessions.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center gap-3 py-1.5" data-testid={`session-item-${session.id}`}>
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{formatDate(session.startedAt)}</span>
                  <Badge variant="outline" className="text-xs">{session.personaId}</Badge>
                  <Badge variant="secondary" className="text-xs">{session.mode}</Badge>
                  <span className="text-sm font-medium ml-auto">{session.scorePercent}%</span>
                  {session.xpAwarded > 0 && (
                    <span className="text-xs text-muted-foreground">+{session.xpAwarded} XP</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">EquipIQ</CardTitle>
          </div>
          <Badge variant="secondary" data-testid="badge-equipiq-count">
            {overview.equipiq.vendorsCompleted}/{overview.equipiq.totalVendors}
          </Badge>
        </CardHeader>
        <CardContent>
          {overview.equipiq.results.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-equipiq">No EquipIQ data yet</p>
          ) : (
            <div className="space-y-2">
              {overview.equipiq.results.map((result) => (
                <div key={result.vendorId} className="flex items-center gap-3 py-1.5" data-testid={`equipiq-item-${result.vendorId}`}>
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm flex-1">{result.vendorId}</span>
                  <Badge variant="secondary" className="text-xs">{result.score}%</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(result.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Sun className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Daily Edge</CardTitle>
        </CardHeader>
        <CardContent>
          {!overview.dailyEdge ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-daily-edge">No Daily Edge data yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="daily-edge-stats">
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-2xl font-bold">{overview.dailyEdge.currentStreak}</span>
                <span className="text-xs text-muted-foreground">Current Streak</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-2xl font-bold">{overview.dailyEdge.longestStreak}</span>
                <span className="text-xs text-muted-foreground">Longest Streak</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-sm font-medium">{formatDate(overview.dailyEdge.lastCompleted)}</span>
                <span className="text-xs text-muted-foreground">Last Completed</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {overview.gamification && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-medium">Gamification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="gamification-stats">
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-2xl font-bold">{overview.gamification.totalXp}</span>
                <span className="text-xs text-muted-foreground">Total XP</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-2xl font-bold">Level {overview.gamification.currentLevel}</span>
                <span className="text-xs text-muted-foreground">Current Level</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-md bg-muted/50">
                <span className="text-2xl font-bold">{overview.gamification.skillScore}</span>
                <span className="text-xs text-muted-foreground">Skill Score</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}