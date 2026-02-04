import { useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/contexts/PermissionContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
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
  ChevronDown,
  Sparkles,
  UserPlus,
  CalendarClock,
  Send,
  History,
  Loader2,
  Play,
  Pause,
  AlertCircle,
  Zap
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
];

const DAY_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const TIME_OPTIONS = [
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
];

interface EmailDigestPreferences {
  id?: number;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  immediateDigestEnabled: boolean;
  immediateThreshold: number;
  pausedUntil?: string;
  emailAddress: string;
  timezone: string;
  dailySendTime: string;
  weeklySendDay: string;
  weeklySendTime: string;
  businessHoursStart: number;
  businessHoursEnd: number;
  includeAppointments: boolean;
  includeFollowups: boolean;
  includeStaleDeals: boolean;
  includePipelineSummary: boolean;
  includeRecentWins: boolean;
  includeAiTips: boolean;
  includeQuarterlyCheckins: boolean;
  includeNewReferrals: boolean;
  appointmentLookaheadDays: number;
  staleDealThresholdDays: number;
  totalEmailsSent?: number;
}

export default function ProfilePage() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const { hasFeature } = usePermissions();
  
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [digestSettingsOpen, setDigestSettingsOpen] = useState(false);
  
  const { data: drops } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/drops"],
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/preferences"],
  });

  const { data: userRole } = useQuery<UserRole>({
    queryKey: ["/api/me/role"],
  });

  const { data: digestPrefs, isLoading: digestLoading } = useQuery<EmailDigestPreferences>({
    queryKey: ["/api/email-digest/preferences"],
  });

  const updateDigestPrefs = useMutation({
    mutationFn: async (data: Partial<EmailDigestPreferences>) => {
      const res = await apiRequest("PUT", "/api/email-digest/preferences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-digest/preferences"] });
      toast({
        title: "Email digest settings saved",
        description: "Your preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const pauseDigest = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiRequest("POST", "/api/email-digest/pause", { days });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-digest/preferences"] });
      toast({
        title: "Digests paused",
        description: "Email digests have been paused.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to pause digests.",
        variant: "destructive",
      });
    },
  });

  const resumeDigest = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/email-digest/resume");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-digest/preferences"] });
      toast({
        title: "Digests resumed",
        description: "Email digests have been resumed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resume digests.",
        variant: "destructive",
      });
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async (digestType: 'daily' | 'weekly') => {
      const res = await apiRequest("POST", "/api/email-digest/test", { digestType });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test email sent",
        description: data.message || "Check your inbox!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDigestToggle = (field: keyof EmailDigestPreferences, value: boolean) => {
    const updateData: Partial<EmailDigestPreferences> = { ...digestPrefs, [field]: value };
    // When enabling a digest, make sure email is populated from user profile
    if (value && !digestPrefs?.emailAddress && user?.email) {
      updateData.emailAddress = user.email;
    }
    updateDigestPrefs.mutate(updateData);
  };

  const handleDigestChange = (field: keyof EmailDigestPreferences, value: string | number) => {
    updateDigestPrefs.mutate({ ...digestPrefs, [field]: value });
  };

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
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
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

        <Collapsible open={notificationSettingsOpen} onOpenChange={setNotificationSettingsOpen}>
          <Card className="p-4">
            <CollapsibleTrigger asChild>
              <button 
                className="w-full flex items-center justify-between hover-elevate active-elevate-2 rounded -m-2 p-2"
                data-testid="button-toggle-notification-settings"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Notification Settings</h3>
                </div>
                {notificationSettingsOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-4">
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
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={digestSettingsOpen} onOpenChange={setDigestSettingsOpen}>
          <Card className="p-4">
            <CollapsibleTrigger asChild>
              <button 
                className="w-full flex items-center justify-between hover-elevate active-elevate-2 rounded -m-2 p-2"
                data-testid="button-toggle-digest-settings"
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold">Email Digest Settings</h3>
                </div>
                {digestSettingsOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-4">
              {digestPrefs?.pausedUntil && new Date(digestPrefs.pausedUntil) > new Date() && (
            <Alert className="mb-4" data-testid="alert-digest-paused">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Digests Paused</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Paused until {new Date(digestPrefs.pausedUntil).toLocaleDateString()}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resumeDigest.mutate()}
                  disabled={resumeDigest.isPending}
                  data-testid="button-resume-digest"
                >
                  {resumeDigest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Resume
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="digest-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="digest-email"
                type="email"
                placeholder="your@email.com"
                value={digestPrefs?.emailAddress || user?.email || ''}
                onChange={(e) => handleDigestChange('emailAddress', e.target.value)}
                onBlur={(e) => e.target.value && handleDigestChange('emailAddress', e.target.value)}
                disabled={digestLoading || updateDigestPrefs.isPending}
                data-testid="input-digest-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="digest-timezone" className="text-sm font-medium">
                Timezone
              </Label>
              <Select
                value={digestPrefs?.timezone || 'America/New_York'}
                onValueChange={(value) => handleDigestChange('timezone', value)}
                disabled={digestLoading || updateDigestPrefs.isPending}
              >
                <SelectTrigger id="digest-timezone" className="w-full min-h-[48px]" data-testid="select-digest-timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="daily-digest" className="text-sm font-medium cursor-pointer">
                  Daily Sales Digest
                </Label>
              </div>
              <Switch
                id="daily-digest"
                checked={digestPrefs?.dailyDigestEnabled ?? false}
                onCheckedChange={(checked) => handleDigestToggle('dailyDigestEnabled', checked)}
                disabled={digestLoading || updateDigestPrefs.isPending}
                data-testid="switch-daily-digest"
              />
            </div>

            {digestPrefs?.dailyDigestEnabled && (
              <div className="space-y-2 pl-8">
                <Label htmlFor="daily-time" className="text-sm font-medium">
                  Daily Send Time
                </Label>
                <Select
                  value={digestPrefs?.dailySendTime || '06:00'}
                  onValueChange={(value) => handleDigestChange('dailySendTime', value)}
                  disabled={digestLoading || updateDigestPrefs.isPending}
                >
                  <SelectTrigger id="daily-time" className="w-full min-h-[48px]" data-testid="select-daily-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => sendTestEmail.mutate('daily')}
                  disabled={sendTestEmail.isPending}
                  data-testid="button-test-daily"
                >
                  {sendTestEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test Daily Digest
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <CalendarClock className="w-5 h-5 text-muted-foreground" />
                <Label htmlFor="weekly-digest" className="text-sm font-medium cursor-pointer">
                  Weekly Sales Digest
                </Label>
              </div>
              <Switch
                id="weekly-digest"
                checked={digestPrefs?.weeklyDigestEnabled ?? false}
                onCheckedChange={(checked) => handleDigestToggle('weeklyDigestEnabled', checked)}
                disabled={digestLoading || updateDigestPrefs.isPending}
                data-testid="switch-weekly-digest"
              />
            </div>

            {digestPrefs?.weeklyDigestEnabled && (
              <div className="space-y-4 pl-8">
                <div className="space-y-2">
                  <Label htmlFor="weekly-day" className="text-sm font-medium">
                    Send On
                  </Label>
                  <Select
                    value={digestPrefs?.weeklySendDay || 'monday'}
                    onValueChange={(value) => handleDigestChange('weeklySendDay', value)}
                    disabled={digestLoading || updateDigestPrefs.isPending}
                  >
                    <SelectTrigger id="weekly-day" className="w-full min-h-[48px]" data-testid="select-weekly-day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly-time" className="text-sm font-medium">
                    Weekly Send Time
                  </Label>
                  <Select
                    value={digestPrefs?.weeklySendTime || '06:00'}
                    onValueChange={(value) => handleDigestChange('weeklySendTime', value)}
                    disabled={digestLoading || updateDigestPrefs.isPending}
                  >
                    <SelectTrigger id="weekly-time" className="w-full min-h-[48px]" data-testid="select-weekly-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => sendTestEmail.mutate('weekly')}
                  disabled={sendTestEmail.isPending}
                  data-testid="button-test-weekly"
                >
                  {sendTestEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test Weekly Digest
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between min-h-[48px]">
              <div className="flex items-center gap-3 flex-1">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="immediate-digest" className="text-sm font-medium cursor-pointer">
                    Instant Alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when important updates accumulate
                  </p>
                </div>
              </div>
              <Switch
                id="immediate-digest"
                checked={digestPrefs?.immediateDigestEnabled ?? false}
                onCheckedChange={(checked) => handleDigestToggle('immediateDigestEnabled', checked)}
                disabled={digestLoading || updateDigestPrefs.isPending}
                data-testid="switch-immediate-digest"
              />
            </div>

            {digestPrefs?.immediateDigestEnabled && (
              <div className="space-y-2 pl-8">
                <Label className="text-sm text-muted-foreground">
                  Send when {digestPrefs?.immediateThreshold || 5}+ updates accumulate (during business hours)
                </Label>
              </div>
            )}

            {(digestPrefs?.dailyDigestEnabled || digestPrefs?.weeklyDigestEnabled || digestPrefs?.immediateDigestEnabled) && 
             !(digestPrefs?.pausedUntil && new Date(digestPrefs.pausedUntil) > new Date()) && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => pauseDigest.mutate(7)}
                  disabled={pauseDigest.isPending}
                  data-testid="button-pause-digest"
                >
                  {pauseDigest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                  Pause digests for 7 days
                </Button>
              </div>
            )}

            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4" />
                Content Options
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-4 space-y-3 pl-6">
                {[
                  { key: 'includeAppointments', label: 'Appointments' },
                  { key: 'includeFollowups', label: 'Follow-ups Due' },
                  { key: 'includeStaleDeals', label: 'Stale Deals' },
                  { key: 'includePipelineSummary', label: 'Pipeline Summary' },
                  { key: 'includeRecentWins', label: 'Recent Wins' },
                  { key: 'includeAiTips', label: 'AI Sales Tips' },
                  { key: 'includeQuarterlyCheckins', label: 'Quarterly Check-ins' },
                  { key: 'includeNewReferrals', label: 'New Referrals' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                    <Switch
                      id={key}
                      checked={(digestPrefs as any)?.[key] ?? true}
                      onCheckedChange={(checked) => handleDigestToggle(key as keyof EmailDigestPreferences, checked)}
                      disabled={digestLoading || updateDigestPrefs.isPending}
                      data-testid={`switch-${key}`}
                    />
                  </div>
                ))}
              </div>
            </details>

              {digestPrefs?.totalEmailsSent !== undefined && digestPrefs.totalEmailsSent > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <History className="w-4 h-4" />
                  <span>{digestPrefs.totalEmailsSent} emails sent</span>
                </div>
              )}
            </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
            
            {hasFeature("brochure_inventory") && (
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
            )}
            
            {hasFeature("referral_tracking") && (
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
            )}
            
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
    </div>
  );
}
