import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  LogOut, 
  Package, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Bell,
  Mail,
  Smartphone,
  Settings,
  HelpCircle,
  Shield,
  Users,
  ChevronRight,
  Sparkles,
  UserPlus
} from "lucide-react";
import { Link } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

const REMINDER_OPTIONS = [
  { value: "6", label: "6 hours before" },
  { value: "12", label: "12 hours before" },
  { value: "24", label: "24 hours before" },
  { value: "48", label: "48 hours before" },
];

export default function ProfilePage() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  
  const { data: drops } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/drops"],
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
  });

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const updatePreferences = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const res = await apiRequest("PATCH", "/api/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (field: keyof UserPreferences, value: boolean) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleReminderChange = (value: string) => {
    updatePreferences.mutate({ reminderHoursBefore: parseInt(value) });
  };

  const stats = {
    total: drops?.length || 0,
    pending: drops?.filter((d) => d.status === "pending").length || 0,
    completed: drops?.filter((d) => d.status !== "pending").length || 0,
    converted: drops?.filter((d) => d.outcome === "signed").length || 0,
  };

  const conversionRate = stats.completed > 0 
    ? Math.round((stats.converted / stats.completed) * 100) 
    : 0;

  const userInitials = user 
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const userName = user 
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User"
    : "User";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center">
          <span className="font-semibold">Profile</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16" data-testid="avatar-profile">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold" data-testid="text-user-name">
                {userName}
              </h2>
              {user?.email && (
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Drops</p>
          </Card>
          
          <Card className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
          
          <Card className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-2xl font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </Card>
          
          <Card className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Performance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Signed Deals</span>
              <span className="font-semibold">{stats.converted}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${stats.completed > 0 ? (stats.converted / stats.completed) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.converted} out of {stats.completed} completed pickups resulted in signed deals
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Settings className="w-5 h-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
            <h3 className="font-semibold">Notification Settings</h3>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="notifications-enabled" className="text-sm font-medium cursor-pointer">
                  Enable Notifications
                </Label>
              </div>
              <Switch
                id="notifications-enabled"
                checked={preferences?.notificationsEnabled ?? true}
                onCheckedChange={(checked) => handleToggle("notificationsEnabled", checked)}
                disabled={preferencesLoading || updatePreferences.isPending}
                data-testid="switch-notifications-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-timing" className="text-sm font-medium">
                Remind me before pickup
              </Label>
              <Select
                value={String(preferences?.reminderHoursBefore ?? 24)}
                onValueChange={handleReminderChange}
                disabled={preferencesLoading || updatePreferences.isPending || !preferences?.notificationsEnabled}
              >
                <SelectTrigger 
                  id="reminder-timing" 
                  className="w-full min-h-[48px]"
                  data-testid="select-reminder-timing"
                >
                  <SelectValue placeholder="Select timing" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      data-testid={`option-reminder-${option.value}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="email-notifications" className="text-sm font-medium cursor-pointer">
                  Email Notifications
                </Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences?.emailNotifications ?? true}
                onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
                disabled={preferencesLoading || updatePreferences.isPending || !preferences?.notificationsEnabled}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="push-notifications" className="text-sm font-medium cursor-pointer">
                  Push Notifications
                </Label>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences?.pushNotifications ?? true}
                onCheckedChange={(checked) => handleToggle("pushNotifications", checked)}
                disabled={preferencesLoading || updatePreferences.isPending || !preferences?.notificationsEnabled}
                data-testid="switch-push-notifications"
              />
            </div>
          </div>
        </Card>

        <Card className="p-2">
          <div className="space-y-1">
            {userRole?.role === "master_admin" && (
              <>
                <Link href="/admin">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between min-h-touch"
                    data-testid="link-admin-dashboard"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span>Admin Dashboard</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </Link>
                <Link href="/admin/team">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between min-h-touch"
                    data-testid="link-team-management"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Team Management</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </Link>
              </>
            )}
            
            {userRole?.role === "relationship_manager" && (
              <Link href="/manager">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between min-h-touch"
                  data-testid="link-manager-dashboard"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span>Manager Dashboard</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Button>
              </Link>
            )}
            
            <Link href="/email">
              <Button 
                variant="ghost" 
                className="w-full justify-between min-h-touch"
                data-testid="link-email-drafter"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>AI Email Drafter</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            
            <Link href="/inventory">
              <Button 
                variant="ghost" 
                className="w-full justify-between min-h-touch"
                data-testid="link-inventory"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>Inventory Tracking</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            
            <Link href="/referrals">
              <Button 
                variant="ghost" 
                className="w-full justify-between min-h-touch"
                data-testid="link-referrals"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  <span>Referral Tracking</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
            
            <Link href="/help">
              <Button 
                variant="ghost" 
                className="w-full justify-between min-h-touch"
                data-testid="link-help"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <span>Help & Guide</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </Card>

        <div className="pt-4">
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-h-touch gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => logout()}
                disabled={isLoggingOut}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
