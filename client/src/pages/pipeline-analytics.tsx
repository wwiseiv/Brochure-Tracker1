import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Clock,
  Trophy,
  Target,
  BarChart3,
  DollarSign,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
} from "lucide-react";
import AccessDenied from "@/pages/access-denied";

interface AnalyticsData {
  summary: {
    totalDeals: number;
    activeDeals: number;
    wonDeals: number;
    lostDeals: number;
    wonThisMonth: number;
    wonThisQuarter: number;
    totalPipelineValue: number;
    avgDealSize: number;
    winRate: number;
  };
  stageCounts: Record<string, number>;
  avgTimeByStage: Record<string, number>;
  topPerformers: Array<{
    agentId: string;
    name: string;
    won: number;
    lost: number;
    active: number;
    value: number;
  }>;
  agentStats: Array<{
    agentId: string;
    name: string;
    won: number;
    lost: number;
    active: number;
    value: number;
  }>;
}

interface UserRole {
  role: string;
  memberId: number;
  organization: { id: number; name: string };
}

const DEAL_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-gray-500" },
  cold_call: { label: "Cold Call", color: "bg-blue-500" },
  appointment_set: { label: "Appt Set", color: "bg-sky-500" },
  presentation_made: { label: "Presented", color: "bg-purple-500" },
  proposal_sent: { label: "Proposal", color: "bg-indigo-500" },
  statement_analysis: { label: "Analysis", color: "bg-cyan-500" },
  negotiating: { label: "Negotiating", color: "bg-orange-500" },
  follow_up: { label: "Follow-Up", color: "bg-yellow-500" },
  documents_sent: { label: "Docs Sent", color: "bg-amber-500" },
  documents_signed: { label: "Signed", color: "bg-lime-500" },
  sold: { label: "Won", color: "bg-green-500" },
  dead: { label: "Lost", color: "bg-red-500" },
  installation_scheduled: { label: "Install", color: "bg-teal-500" },
  active_merchant: { label: "Active", color: "bg-emerald-500" },
};

const STAGE_ORDER = [
  "prospect", "cold_call", "appointment_set", "presentation_made", 
  "proposal_sent", "statement_analysis", "negotiating", "follow_up",
  "documents_sent", "documents_signed", "sold", "dead"
];

export default function PipelineAnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>("month");

  const { data: userRole, isLoading: loadingRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/deals/analytics", dateRange],
    enabled: userRole?.role === "master_admin" || userRole?.role === "relationship_manager",
  });

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return <AccessDenied feature="Pipeline Analytics" />;
  }

  const maxStageCount = analytics 
    ? Math.max(...Object.values(analytics.stageCounts), 1) 
    : 1;

  const maxAgentValue = analytics?.agentStats
    ? Math.max(...analytics.agentStats.map(a => a.value), 1)
    : 1;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/team-pipeline">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Pipeline Analytics</h1>
              <p className="text-xs text-muted-foreground">Performance insights</p>
            </div>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]" data-testid="select-date-range">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {loadingAnalytics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <Target className="h-4 w-4" />
                    Win Rate
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-win-rate">
                    {analytics.summary.winRate}%
                  </div>
                  <Progress value={analytics.summary.winRate} className="mt-2 h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <DollarSign className="h-4 w-4" />
                    Avg Deal Size
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-avg-deal-size">
                    ${analytics.summary.avgDealSize.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Monthly volume</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Won This Month
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-won-month">
                    {analytics.summary.wonThisMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.summary.wonThisQuarter} this quarter
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                    <Activity className="h-4 w-4" />
                    Active Deals
                  </div>
                  <div className="text-2xl font-bold" data-testid="text-active-deals">
                    {analytics.summary.activeDeals}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${Math.round(analytics.summary.totalPipelineValue / 1000)}k total value
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Deals by Stage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {STAGE_ORDER.filter(stage => analytics.stageCounts[stage]).map(stage => (
                  <div key={stage} className="space-y-1" data-testid={`stage-bar-${stage}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{DEAL_STAGE_CONFIG[stage]?.label || stage}</span>
                      <span className="font-medium">{analytics.stageCounts[stage]}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${DEAL_STAGE_CONFIG[stage]?.color || 'bg-primary'} transition-all`}
                        style={{ width: `${(analytics.stageCounts[stage] / maxStageCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {Object.keys(analytics.stageCounts).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No deals in pipeline</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Average Time in Stage (Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(analytics.avgTimeByStage)
                    .sort((a, b) => STAGE_ORDER.indexOf(a[0]) - STAGE_ORDER.indexOf(b[0]))
                    .map(([stage, days]) => (
                      <div key={stage} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`time-stage-${stage}`}>
                        <span className="text-xs">{DEAL_STAGE_CONFIG[stage]?.label || stage}</span>
                        <Badge variant="secondary" className="text-xs">{days} days</Badge>
                      </div>
                    ))}
                </div>
                {Object.keys(analytics.avgTimeByStage).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No timing data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.topPerformers.map((performer, index) => (
                  <div key={performer.agentId} className="flex items-center gap-3 p-3 rounded-md bg-muted/50" data-testid={`performer-${index}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-500' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {performer.won} won • {performer.active} active
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      ${Math.round(performer.value / 1000)}k
                    </Badge>
                  </div>
                ))}
                {analytics.topPerformers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No performer data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Agent Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.agentStats.map(agent => (
                  <div key={agent.agentId} className="space-y-2" data-testid={`agent-comparison-${agent.agentId}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400">{agent.won} won</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-red-600 dark:text-red-400">{agent.lost} lost</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-4">
                      {agent.won > 0 && (
                        <div 
                          className="bg-green-500 rounded-l-sm transition-all"
                          style={{ width: `${(agent.won / (agent.won + agent.lost + agent.active)) * 100}%` }}
                          title={`${agent.won} won`}
                        />
                      )}
                      {agent.active > 0 && (
                        <div 
                          className="bg-blue-500 transition-all"
                          style={{ width: `${(agent.active / (agent.won + agent.lost + agent.active)) * 100}%` }}
                          title={`${agent.active} active`}
                        />
                      )}
                      {agent.lost > 0 && (
                        <div 
                          className="bg-red-500 rounded-r-sm transition-all"
                          style={{ width: `${(agent.lost / (agent.won + agent.lost + agent.active)) * 100}%` }}
                          title={`${agent.lost} lost`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Won
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" /> Active
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Lost
                      </span>
                    </div>
                  </div>
                ))}
                {analytics.agentStats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No agent data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Win/Loss Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Won</span>
                      </div>
                      <span className="text-lg font-bold text-green-600" data-testid="text-total-won">
                        {analytics.summary.wonDeals}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Lost</span>
                      </div>
                      <span className="text-lg font-bold text-red-600" data-testid="text-total-lost">
                        {analytics.summary.lostDeals}
                      </span>
                    </div>
                  </div>
                  <div className="w-24 h-24 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-red-500"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-green-500"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={`${analytics.summary.winRate}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{analytics.summary.winRate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
