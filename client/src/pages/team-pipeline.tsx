import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Search,
  Building2,
  Phone,
  Flame,
  Thermometer,
  Snowflake,
  DollarSign,
  Users,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Download,
  Calendar,
  MapPin,
  Mail,
  BarChart3,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import type { Deal } from "@shared/schema";
import AccessDenied from "@/pages/access-denied";

interface TeamDeal extends Deal {
  agentName: string;
}

interface UserRole {
  role: string;
  memberId: number;
  organization: { id: number; name: string };
}

const DEAL_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" },
  cold_call: { label: "Cold Call", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  appointment_set: { label: "Appt Set", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  presentation_made: { label: "Presented", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  proposal_sent: { label: "Proposal", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  statement_analysis: { label: "Analysis", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  negotiating: { label: "Negotiating", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  follow_up: { label: "Follow-Up", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  documents_sent: { label: "Docs Sent", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  documents_signed: { label: "Signed", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300" },
  sold: { label: "Won", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  dead: { label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  installation_scheduled: { label: "Install", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  active_merchant: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  hot: { label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: Flame },
  warm: { label: "Warm", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Thermometer },
  cold: { label: "Cold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Snowflake },
};

export default function TeamPipelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");
  const [selectedDeal, setSelectedDeal] = useState<TeamDeal | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const { data: userRole, isLoading: loadingRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: teamDeals, isLoading: loadingDeals } = useQuery<TeamDeal[]>({
    queryKey: ["/api/deals/team"],
    enabled: userRole?.role === "master_admin" || userRole?.role === "relationship_manager",
  });

  const isManager = userRole?.role === "master_admin" || userRole?.role === "relationship_manager";

  const agents = useMemo(() => {
    if (!teamDeals) return [];
    const agentMap = new Map<string, string>();
    teamDeals.forEach(deal => {
      agentMap.set(deal.assignedAgentId, deal.agentName);
    });
    return Array.from(agentMap.entries()).map(([id, name]) => ({ id, name }));
  }, [teamDeals]);

  const filteredDeals = useMemo(() => {
    if (!teamDeals) return [];
    return teamDeals.filter(deal => {
      if (agentFilter !== "all" && deal.assignedAgentId !== agentFilter) return false;
      if (stageFilter !== "all" && deal.currentStage !== stageFilter) return false;
      if (temperatureFilter !== "all" && deal.temperature !== temperatureFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          deal.businessName.toLowerCase().includes(query) ||
          deal.agentName.toLowerCase().includes(query) ||
          deal.contactName?.toLowerCase().includes(query) ||
          deal.businessCity?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [teamDeals, agentFilter, stageFilter, temperatureFilter, searchQuery]);

  const dealsByAgent = useMemo(() => {
    const grouped: Record<string, { agentName: string; deals: TeamDeal[] }> = {};
    filteredDeals.forEach(deal => {
      if (!grouped[deal.assignedAgentId]) {
        grouped[deal.assignedAgentId] = { agentName: deal.agentName, deals: [] };
      }
      grouped[deal.assignedAgentId].deals.push(deal);
    });
    return Object.entries(grouped).sort((a, b) => b[1].deals.length - a[1].deals.length);
  }, [filteredDeals]);

  const summary = useMemo(() => {
    if (!teamDeals) return { total: 0, value: 0, wonThisMonth: 0 };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonth = teamDeals.filter(d => d.currentStage === "sold" && d.wonAt && new Date(d.wonAt) >= monthStart).length;
    const value = teamDeals.reduce((sum, d) => sum + (d.estimatedMonthlyVolume ? parseFloat(d.estimatedMonthlyVolume.toString()) : 0), 0);
    return { total: teamDeals.length, value, wonThisMonth };
  }, [teamDeals]);

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const handleExport = () => {
    if (!filteredDeals) return;
    const csvContent = [
      ["Business Name", "Agent", "Stage", "Temperature", "Est. Volume", "Contact", "Phone", "City", "State"].join(","),
      ...filteredDeals.map(deal => [
        `"${deal.businessName}"`,
        `"${deal.agentName}"`,
        DEAL_STAGE_CONFIG[deal.currentStage]?.label || deal.currentStage,
        deal.temperature,
        deal.estimatedMonthlyVolume || "",
        `"${deal.contactName || ""}"`,
        deal.businessPhone || "",
        deal.businessCity || "",
        deal.businessState || ""
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-pipeline-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isManager) {
    return <AccessDenied feature="Team Pipeline" />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Team Pipeline</h1>
              <p className="text-xs text-muted-foreground">{summary.total} deals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pipeline-analytics">
              <Button variant="outline" size="sm" data-testid="button-analytics">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="h-3.5 w-3.5" />
                Team Deals
              </div>
              <div className="text-xl font-bold" data-testid="text-total-deals">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Pipeline Value
              </div>
              <div className="text-xl font-bold" data-testid="text-pipeline-value">
                ${Math.round(summary.value / 1000)}k
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Trophy className="h-3.5 w-3.5" />
                Won (Month)
              </div>
              <div className="text-xl font-bold" data-testid="text-won-month">{summary.wonThisMonth}</div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals, agents, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="w-[140px] shrink-0" data-testid="select-agent">
              <SelectValue placeholder="Agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[130px] shrink-0" data-testid="select-stage">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(DEAL_STAGE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
            <SelectTrigger className="w-[110px] shrink-0" data-testid="select-temperature">
              <SelectValue placeholder="Temp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingDeals ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {dealsByAgent.map(([agentId, { agentName, deals }]) => (
              <Collapsible
                key={agentId}
                open={expandedAgents.has(agentId)}
                onOpenChange={() => toggleAgentExpanded(agentId)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate p-4" data-testid={`collapsible-agent-${agentId}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-medium">{agentName}</CardTitle>
                            <p className="text-xs text-muted-foreground">{deals.length} deals</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            ${Math.round(deals.reduce((s, d) => s + (d.estimatedMonthlyVolume ? parseFloat(d.estimatedMonthlyVolume.toString()) : 0), 0) / 1000)}k
                          </Badge>
                          {expandedAgents.has(agentId) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-2">
                      {deals.map(deal => (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDeal(deal)}
                          className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                          data-testid={`deal-card-${deal.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{deal.businessName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {deal.contactName || "No contact"} {deal.businessCity && `• ${deal.businessCity}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={`text-xs ${DEAL_STAGE_CONFIG[deal.currentStage]?.color}`}>
                              {DEAL_STAGE_CONFIG[deal.currentStage]?.label || deal.currentStage}
                            </Badge>
                            {deal.temperature === "hot" && <Flame className="h-3.5 w-3.5 text-red-500" />}
                            {deal.temperature === "warm" && <Thermometer className="h-3.5 w-3.5 text-yellow-500" />}
                            {deal.temperature === "cold" && <Snowflake className="h-3.5 w-3.5 text-blue-500" />}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}

            {dealsByAgent.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No deals match your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Sheet open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedDeal && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selectedDeal.businessName}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className={DEAL_STAGE_CONFIG[selectedDeal.currentStage]?.color}>
                    {DEAL_STAGE_CONFIG[selectedDeal.currentStage]?.label || selectedDeal.currentStage}
                  </Badge>
                  {selectedDeal.temperature && TEMPERATURE_CONFIG[selectedDeal.temperature] && (
                    <Badge className={TEMPERATURE_CONFIG[selectedDeal.temperature].color}>
                      {TEMPERATURE_CONFIG[selectedDeal.temperature].label}
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Agent</p>
                      <p className="text-sm font-medium">{selectedDeal.agentName}</p>
                    </div>
                  </div>

                  {selectedDeal.contactName && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="text-sm font-medium">{selectedDeal.contactName}</p>
                        {selectedDeal.contactTitle && (
                          <p className="text-xs text-muted-foreground">{selectedDeal.contactTitle}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedDeal.businessPhone || selectedDeal.contactPhone) && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{selectedDeal.contactPhone || selectedDeal.businessPhone}</p>
                      </div>
                    </div>
                  )}

                  {selectedDeal.businessEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{selectedDeal.businessEmail}</p>
                      </div>
                    </div>
                  )}

                  {selectedDeal.businessAddress && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">
                          {selectedDeal.businessAddress}
                          {selectedDeal.businessCity && `, ${selectedDeal.businessCity}`}
                          {selectedDeal.businessState && `, ${selectedDeal.businessState}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDeal.estimatedMonthlyVolume && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Monthly Volume</p>
                        <p className="text-sm font-medium">
                          ${parseFloat(selectedDeal.estimatedMonthlyVolume.toString()).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDeal.nextFollowUpAt && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Next Follow-up</p>
                        <p className="text-sm font-medium">
                          {format(new Date(selectedDeal.nextFollowUpAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDeal.lastActivityAt && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Last Activity</p>
                        <p className="text-sm font-medium">
                          {format(new Date(selectedDeal.lastActivityAt), "MMM d, yyyy")}
                          {selectedDeal.lastActivityType && ` - ${selectedDeal.lastActivityType}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Link href={`/prospects/pipeline?dealId=${selectedDeal.id}`}>
                  <Button className="w-full" data-testid="button-view-full-deal">
                    View Full Deal Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
