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
import { QrCode, ChevronRight, AlertTriangle, Calendar, Shield, Briefcase, Activity, Route, WifiOff, RefreshCw, Loader2, CloudUpload } from "lucide-react";
import { isToday, isPast, isFuture, addDays } from "date-fns";
import type { DropWithBrochure, UserPreferences } from "@shared/schema";

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
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <span className="font-semibold">BrochureDrop</span>
            <div className="w-8 h-8 rounded-full bg-muted" />
          </div>
        </header>
        <main className="container max-w-md mx-auto px-4 py-6">
          <DashboardSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <span className="font-semibold">BrochureDrop</span>
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

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
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

        <section>
          <div className="flex items-center justify-between mb-3">
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

        <div className="grid grid-cols-2 gap-4">
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

        {upcomingPickups.length > 0 && (
          <section>
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
