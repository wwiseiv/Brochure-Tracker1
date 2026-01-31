import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropCard } from "@/components/DropCard";
import { EmptyState } from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/LoadingState";
import { BottomNav } from "@/components/BottomNav";
import { LocationReminder } from "@/components/LocationReminder";
import { useAuth } from "@/hooks/use-auth";
import { useLocationReminders } from "@/hooks/use-location-reminders";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { QrCode, ChevronRight, AlertTriangle, Calendar, Shield, Briefcase, Activity, Route, WifiOff, RefreshCw, Loader2, CloudUpload, Trophy, Search, TrendingUp, Sparkles, Camera } from "lucide-react";
import pcbLogoFullColor from "@/assets/pcb_logo_fullcolor.png";
import { isToday, isPast, isFuture, addDays } from "date-fns";
import type { DropWithBrochure, UserPreferences, UserPermissions } from "@shared/schema";

interface LeaderboardEntry {
  rank: number;
  memberId: number;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  totalDrops: number;
  conversions: number;
  conversionRate: number;
  score: number;
}

interface UserRole {
  role: string;
  memberId: number;
  organization: {
    id: number;
    name: string;
  };
  managerId: number | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isOnline, syncStatus, pendingCount, syncPendingDrops } = useOfflineSync();
  
  const { data: drops, isLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/drops"],
  });

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: userPreferences } = useQuery<UserPreferences>({
    queryKey: ["/api/me/preferences"],
  });

  const { data: myPermissions } = useQuery<UserPermissions>({
    queryKey: ["/api/me/permissions"],
  });

  // Fetch leaderboard when role is known and user has access
  // Query is enabled once we know the user's role AND they're either admin or have permission
  const shouldFetchLeaderboard = userRole !== undefined && (
    userRole?.role === "master_admin" || myPermissions?.canViewLeaderboard === true
  );
  
  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    enabled: shouldFetchLeaderboard,
    retry: false, // Don't retry on 403
  });

  const isAdmin = userRole?.role === "master_admin";
  const isRM = userRole?.role === "relationship_manager";
  const isSyncing = syncStatus === 'syncing';

  const pendingDrops = drops?.filter((d) => d.status === "pending") || [];
  
  const { nearbyDrop, dismissReminder } = useLocationReminders(
    pendingDrops,
    userPreferences?.notificationsEnabled ?? true
  );
  
  const todaysPickups = pendingDrops.filter((d) => 
    d.pickupScheduledFor && isToday(new Date(d.pickupScheduledFor))
  );
  
  const overduePickups = pendingDrops.filter((d) =>
    d.pickupScheduledFor && 
    isPast(new Date(d.pickupScheduledFor)) && 
    !isToday(new Date(d.pickupScheduledFor))
  );
  
  const upcomingPickups = pendingDrops.filter((d) =>
    d.pickupScheduledFor && 
    isFuture(new Date(d.pickupScheduledFor)) &&
    !isToday(new Date(d.pickupScheduledFor)) &&
    new Date(d.pickupScheduledFor) <= addDays(new Date(), 7)
  );

  const userInitials = user 
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <img src={pcbLogoFullColor} alt="PCBancard" className="h-7 w-auto" />
            <div className="w-8 h-8 rounded-full bg-muted" />
          </div>
        </header>
        <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6">
          <DashboardSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <img src={pcbLogoFullColor} alt="PCBancard" className="h-7 w-auto" />
          <div className="flex items-center gap-2">
            <Link href="/activity">
              <Button variant="ghost" size="icon" data-testid="button-activity-feed">
                <Activity className="h-5 w-5 text-emerald-600" />
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" data-testid="button-admin-dashboard">
                  <Shield className="h-5 w-5 text-purple-600" />
                </Button>
              </Link>
            )}
            {isRM && (
              <Link href="/manager">
                <Button variant="ghost" size="icon" data-testid="button-rm-dashboard">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </Button>
              </Link>
            )}
            <Link href="/profile">
              <Avatar className="w-8 h-8 cursor-pointer" data-testid="avatar-user">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        {(!isOnline || pendingCount > 0) && (
          <Card className={`p-4 ${!isOnline ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`} data-testid="card-offline-status">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!isOnline ? (
                  <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CloudUpload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
                <div>
                  <p className={`font-medium ${!isOnline ? 'text-amber-800 dark:text-amber-200' : 'text-blue-800 dark:text-blue-200'}`}>
                    {!isOnline ? 'Offline Mode' : `${pendingCount} Pending Drop${pendingCount > 1 ? 's' : ''}`}
                  </p>
                  <p className={`text-sm ${!isOnline ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {!isOnline 
                      ? 'You can still log drops. They will sync when online.' 
                      : 'Drops saved offline are ready to sync.'
                    }
                  </p>
                </div>
              </div>
              {isOnline && pendingCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={syncPendingDrops}
                  disabled={isSyncing}
                  className="gap-1.5 shrink-0"
                  data-testid="button-sync-drops"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        )}

        <Link href="/scan">
          <Button 
            className="w-full min-h-touch-lg gap-3 text-lg font-semibold shadow-lg"
            data-testid="button-scan-drop"
          >
            <QrCode className="w-7 h-7" />
            Scan & Drop
          </Button>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Today's Pickups</h2>
              <div className="flex items-center gap-2">
                <Link href="/route">
                  <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-route-planner">
                    <Route className="w-4 h-4" />
                    Plan Route
                  </Button>
                </Link>
                <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {todaysPickups.length}
                </span>
              </div>
            </div>
            
            {todaysPickups.length > 0 ? (
              <div className="space-y-3">
                {todaysPickups.slice(0, 3).map((drop) => (
                  <DropCard key={drop.id} drop={drop} variant="urgent" />
                ))}
                {todaysPickups.length > 3 && (
                  <Link href="/history?filter=today">
                    <Button variant="ghost" className="w-full min-h-touch gap-1 text-primary" data-testid="button-view-all-today">
                      View all {todaysPickups.length} pickups
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <EmptyState type="today" />
            )}
          </section>

          <section className="md:block hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Coming Up</h2>
              <Link href="/history?filter=upcoming">
                <Button variant="ghost" className="min-h-touch text-primary gap-1" data-testid="button-view-upcoming-grid">
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            {upcomingPickups.length > 0 ? (
              <div className="space-y-3">
                {upcomingPickups.slice(0, 3).map((drop) => (
                  <DropCard key={drop.id} drop={drop} />
                ))}
              </div>
            ) : (
              <EmptyState type="upcoming" />
            )}
          </section>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/history?filter=upcoming">
            <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-upcoming">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-semibold text-2xl">{upcomingPickups.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Upcoming (7 days)</p>
            </Card>
          </Link>
          
          <Link href="/history?filter=overdue">
            <Card 
              className={`p-4 hover-elevate cursor-pointer ${overduePickups.length > 0 ? "border-destructive/50" : ""}`}
              data-testid="card-overdue"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-5 h-5 ${overduePickups.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                <span className={`font-semibold text-2xl ${overduePickups.length > 0 ? "text-destructive" : ""}`}>
                  {overduePickups.length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </Card>
          </Link>
        </div>

        {/* AI-Powered Prospecting Section */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered Prospecting
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Find and convert local businesses in your territory
            </p>
          </div>
          
          <div className="space-y-3">
            <Link href="/prospects/search">
              <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-prospect-finder">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">Prospect Finder</h3>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          AI-Powered
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Discover local businesses ready for better rates
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </Link>

            <Link href="/prospects/pipeline">
              <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-my-pipeline">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">My Pipeline</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Track and manage your claimed prospects
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </Link>

            <Link href="/prospects/scan-card">
              <Card className="p-4 hover-elevate cursor-pointer" data-testid="card-scan-business-card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">Scan Business Card</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          New
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Snap a photo to add prospects instantly
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            </Link>
          </div>
        </section>

        {/* Leaderboard Section - Only shows when user has permission */}
        {(isAdmin || myPermissions?.canViewLeaderboard) && leaderboard && leaderboard.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Team Leaderboard</h2>
              </div>
            </div>
            <Card className="overflow-hidden">
              <div className="divide-y divide-border">
                {leaderboard.slice(0, 5).map((entry) => (
                  <div 
                    key={entry.memberId} 
                    className={`flex items-center justify-between p-3 ${
                      entry.userId === user?.id ? "bg-primary/5" : ""
                    }`}
                    data-testid={`leaderboard-row-${entry.memberId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        entry.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                        entry.rank === 2 ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                        entry.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {entry.firstName || entry.lastName 
                            ? `${entry.firstName || ""} ${entry.lastName || ""}`.trim()
                            : entry.userId.slice(0, 12) + "..."}
                          {entry.userId === user?.id && (
                            <span className="ml-1 text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.totalDrops} drops, {entry.conversions} conversions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{entry.score}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {upcomingPickups.length > 0 && (
          <section className="md:hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Coming Up</h2>
              <Link href="/history?filter=upcoming">
                <Button variant="ghost" className="min-h-touch text-primary gap-1" data-testid="button-view-all-upcoming">
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingPickups.slice(0, 2).map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          </section>
        )}
      </main>

      <LocationReminder nearbyDrop={nearbyDrop} onDismiss={dismissReminder} />
      <BottomNav />
    </div>
  );
}
