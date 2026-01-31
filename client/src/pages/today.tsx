import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  CalendarCheck,
  Bell,
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  FileText,
  Loader2,
  Phone,
} from "lucide-react";
import { format, differenceInDays, isToday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import type { Deal } from "@shared/schema";

interface TodayData {
  followUpsDue: Deal[];
  staleDeals: Deal[];
  checkInsDue: Deal[];
}

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  hot: { label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: Flame },
  warm: { label: "Warm", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Thermometer },
  cold: { label: "Cold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Snowflake },
};

const STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  cold_call: "Cold Call",
  appointment_set: "Appt Set",
  presentation_made: "Presented",
  proposal_sent: "Proposal",
  statement_analysis: "Analysis",
  negotiating: "Negotiating",
  follow_up: "Follow-Up",
  documents_sent: "Docs Sent",
  documents_signed: "Signed",
  sold: "Won",
  dead: "Lost",
  installation_scheduled: "Install",
  active_merchant: "Active",
};

export default function TodayPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todayData, isLoading } = useQuery<TodayData>({
    queryKey: ["/api/deals/today"],
  });

  const { data: allDeals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const markFollowUpDoneMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const response = await apiRequest("POST", `/api/deals/${dealId}/follow-up`, {
        method: "other",
        outcome: "completed",
        notes: "Marked as done from Today View",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Follow-up marked as done" });
    },
    onError: () => {
      toast({ title: "Failed to mark as done", variant: "destructive" });
    },
  });

  const appointmentsToday = useMemo(() => {
    if (!allDeals) return [];
    return allDeals.filter(deal => {
      if (!deal.appointmentDate) return false;
      return isToday(new Date(deal.appointmentDate));
    });
  }, [allDeals]);

  const sortedFollowUps = useMemo(() => {
    if (!todayData?.followUpsDue) return [];
    return [...todayData.followUpsDue].sort((a, b) => {
      const tempOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
      const tempDiff = (tempOrder[a.temperature] ?? 1) - (tempOrder[b.temperature] ?? 1);
      if (tempDiff !== 0) return tempDiff;
      
      const aDays = a.lastFollowUpAt ? differenceInDays(new Date(), new Date(a.lastFollowUpAt)) : 999;
      const bDays = b.lastFollowUpAt ? differenceInDays(new Date(), new Date(b.lastFollowUpAt)) : 999;
      return bDays - aDays;
    });
  }, [todayData?.followUpsDue]);

  const weeklyStats = useMemo(() => {
    if (!allDeals) return { dealsWon: 0, totalPipelineValue: 0 };
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    
    const dealsWon = allDeals.filter(deal => {
      if (deal.currentStage !== "sold") return false;
      if (!deal.stageEnteredAt) return false;
      return isWithinInterval(new Date(deal.stageEnteredAt), { start: weekStart, end: weekEnd });
    }).length;

    const totalPipelineValue = allDeals
      .filter(deal => !["sold", "dead", "active_merchant"].includes(deal.currentStage))
      .reduce((sum, deal) => sum + (Number(deal.estimatedCommission) || 0), 0);

    return { dealsWon, totalPipelineValue };
  }, [allDeals]);

  const followUpsCount = todayData?.followUpsDue?.length ?? 0;
  const appointmentsCount = appointmentsToday.length;
  const staleCount = todayData?.staleDeals?.length ?? 0;
  const checkInsCount = todayData?.checkInsDue?.length ?? 0;

  const recordCheckInMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const response = await apiRequest("POST", `/api/deals/${dealId}/check-in`, {
        notes: "Quarterly check-in completed from Today view",
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({ title: "Check-in recorded" });
    },
    onError: () => {
      toast({ title: "Failed to record check-in", variant: "destructive" });
    },
  });

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleText = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleDirections = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
  };

  const getDaysSinceContact = (deal: Deal) => {
    if (!deal.lastFollowUpAt) return null;
    return differenceInDays(new Date(), new Date(deal.lastFollowUpAt));
  };

  const getDaysInStage = (deal: Deal) => {
    if (!deal.stageEnteredAt) return null;
    return differenceInDays(new Date(), new Date(deal.stageEnteredAt));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading today's tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Today's Tasks</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-4 gap-3">
          <Card data-testid="card-followups-summary">
            <CardContent className="p-3 text-center">
              <Bell className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold">{followUpsCount}</p>
              <p className="text-xs text-muted-foreground">Follow-ups</p>
            </CardContent>
          </Card>
          <Card data-testid="card-appointments-summary">
            <CardContent className="p-3 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{appointmentsCount}</p>
              <p className="text-xs text-muted-foreground">Appointments</p>
            </CardContent>
          </Card>
          <Card data-testid="card-checkins-summary">
            <CardContent className="p-3 text-center">
              <CalendarCheck className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
              <p className="text-2xl font-bold">{checkInsCount}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stale-summary">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-2xl font-bold">{staleCount}</p>
              <p className="text-xs text-muted-foreground">Stale</p>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-600" />
              Follow-ups Due
            </h2>
            <Link href="/prospects/pipeline">
              <Button variant="ghost" size="sm" data-testid="link-view-pipeline">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {sortedFollowUps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">All caught up! No follow-ups due.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedFollowUps.map((deal) => {
                const tempConfig = TEMPERATURE_CONFIG[deal.temperature] || TEMPERATURE_CONFIG.warm;
                const TempIcon = tempConfig.icon;
                const daysSince = getDaysSinceContact(deal);

                return (
                  <Card key={deal.id} className="hover-elevate" data-testid={`card-followup-${deal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                            <h3 className="font-medium truncate cursor-pointer hover:text-primary">
                              {deal.businessName}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={tempConfig.color}>
                              <TempIcon className="w-3 h-3 mr-1" />
                              {tempConfig.label}
                            </Badge>
                            {daysSince !== null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {daysSince} {daysSince === 1 ? "day" : "days"} ago
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {deal.businessPhone && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCall(deal.businessPhone!)}
                              data-testid={`button-call-${deal.id}`}
                            >
                              <PhoneCall className="w-4 h-4 mr-1" />
                              Call
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleText(deal.businessPhone!)}
                              data-testid={`button-text-${deal.id}`}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Text
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markFollowUpDoneMutation.mutate(deal.id)}
                          disabled={markFollowUpDoneMutation.isPending}
                          data-testid={`button-done-${deal.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Appointments Today
            </h2>
          </div>

          {appointmentsToday.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No appointments scheduled for today.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {appointmentsToday.map((deal) => (
                <Card key={deal.id} className="hover-elevate" data-testid={`card-appointment-${deal.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">
                            {deal.appointmentDate && format(new Date(deal.appointmentDate), "h:mm a")}
                          </span>
                          <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                            <h3 className="font-medium truncate cursor-pointer hover:text-primary">
                              {deal.businessName}
                            </h3>
                          </Link>
                        </div>
                        {deal.businessAddress && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {deal.businessAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {deal.businessAddress && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDirections(deal.businessAddress!)}
                          data-testid={`button-directions-${deal.id}`}
                        >
                          <Navigation className="w-4 h-4 mr-1" />
                          Directions
                        </Button>
                      )}
                      <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-prep-${deal.id}`}>
                          <FileText className="w-4 h-4 mr-1" />
                          Prep
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              Quarterly Check-ins Due
            </h2>
            <Link href="/prospects/pipeline?phase=Post-Sale">
              <Button variant="ghost" size="sm" data-testid="link-view-checkins">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {(todayData?.checkInsDue?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-muted-foreground">No quarterly check-ins due.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayData?.checkInsDue?.map((deal) => {
                const daysSinceCheckIn = deal.lastQuarterlyCheckinAt 
                  ? differenceInDays(new Date(), new Date(deal.lastQuarterlyCheckinAt))
                  : null;

                return (
                  <Card key={deal.id} className="hover-elevate border-emerald-200 dark:border-emerald-900/50" data-testid={`card-checkin-${deal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                            <h3 className="font-medium truncate cursor-pointer hover:text-primary">
                              {deal.businessName}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <Building2 className="w-3 h-3 mr-1" />
                              Active Merchant
                            </Badge>
                            {daysSinceCheckIn !== null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {daysSinceCheckIn} days since last check-in
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {deal.businessPhone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCall(deal.businessPhone!)}
                            data-testid={`button-call-checkin-${deal.id}`}
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => recordCheckInMutation.mutate(deal.id)}
                          disabled={recordCheckInMutation.isPending}
                          data-testid={`button-checkin-${deal.id}`}
                        >
                          {recordCheckInMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Record Check-in
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Stale Deals
            </h2>
            <Link href="/prospects/pipeline">
              <Button variant="ghost" size="sm" data-testid="link-view-stale">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {(todayData?.staleDeals?.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-green-500" />
                <p className="text-muted-foreground">All deals are progressing well!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayData?.staleDeals?.map((deal) => {
                const daysInStage = getDaysInStage(deal);

                return (
                  <Card key={deal.id} className="hover-elevate border-orange-200 dark:border-orange-900/50" data-testid={`card-stale-${deal.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                            <h3 className="font-medium truncate cursor-pointer hover:text-primary">
                              {deal.businessName}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              <Building2 className="w-3 h-3 mr-1" />
                              {STAGE_LABELS[deal.currentStage] || deal.currentStage}
                            </Badge>
                            {daysInStage !== null && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {daysInStage} days in stage
                              </span>
                            )}
                          </div>
                          {deal.lastActivityAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last activity: {format(new Date(deal.lastActivityAt), "MMM d")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/prospects/pipeline?deal=${deal.id}`}>
                          <Button variant="outline" size="sm" data-testid={`button-action-${deal.id}`}>
                            <ChevronRight className="w-4 h-4 mr-1" />
                            Take Action
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Quick Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card data-testid="card-deals-won-week">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{weeklyStats.dealsWon}</p>
                    <p className="text-xs text-muted-foreground">Won This Week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-pipeline-value">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${weeklyStats.totalPipelineValue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
