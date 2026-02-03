/**
 * Digest Preferences Component
 * ============================
 * 
 * UI for managing email digest preferences.
 * 
 * INSTALLATION:
 *   Copy to: client/src/components/DigestPreferences.tsx
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Mail,
  Clock,
  Calendar,
  Globe,
  Bell,
  BellOff,
  Pause,
  Play,
  Send,
  Eye,
  History,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

type DigestFrequency = 'immediate' | 'daily' | 'weekly' | 'none';

interface DigestPreferences {
  userId: number;
  frequency: DigestFrequency;
  preferredTime: string;
  preferredDay?: number;
  timezone: string;
  emailEnabled: boolean;
  categories: string[];
  lastDigestSent?: string;
  pausedUntil?: string;
}

interface DigestHistoryItem {
  id: number;
  notificationCount: number;
  categories: string[];
  frequency: string;
  reason: string;
  success: boolean;
  error?: string;
  sentAt: string;
}

interface DigestPreview {
  notifications: any[];
  notificationCount: number;
  aggregated: {
    total: number;
    categories: string[];
  };
  content: {
    subject: string;
    preheader: string;
    sections: any[];
  };
}

// ============================================
// API HOOKS
// ============================================

function useDigestPreferences() {
  return useQuery<DigestPreferences>({
    queryKey: ['digestPreferences'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/digest/preferences');
      return response.json();
    },
  });
}

function useUpdatePreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (preferences: Partial<DigestPreferences>) => {
      const response = await apiRequest('PUT', '/api/digest/preferences', preferences);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestPreferences'] });
    },
  });
}

function useTimezones() {
  return useQuery<Array<{ value: string; label: string }>>({
    queryKey: ['timezones'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/digest/timezones');
      return response.json();
    },
  });
}

function useCategories() {
  return useQuery<Array<{ value: string; label: string; description: string }>>({
    queryKey: ['digestCategories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/digest/categories');
      return response.json();
    },
  });
}

function useDigestHistory() {
  return useQuery<{ history: DigestHistoryItem[] }>({
    queryKey: ['digestHistory'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/digest/history');
      return response.json();
    },
  });
}

function useDigestPreview() {
  return useQuery<DigestPreview>({
    queryKey: ['digestPreview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/digest/preview');
      return response.json();
    },
    enabled: false, // Only fetch on demand
  });
}

function useSendDigest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/digest/send-now');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestHistory'] });
      queryClient.invalidateQueries({ queryKey: ['digestPreview'] });
    },
  });
}

function usePauseDigest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (days: number) => {
      const response = await apiRequest('POST', '/api/digest/pause', { days });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestPreferences'] });
    },
  });
}

function useResumeDigest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/digest/resume');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digestPreferences'] });
    },
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DigestPreferences() {
  const { data: preferences, isLoading } = useDigestPreferences();
  const { data: timezones } = useTimezones();
  const { data: categories } = useCategories();
  const updatePreferences = useUpdatePreferences();
  
  const [localPrefs, setLocalPrefs] = useState<Partial<DigestPreferences>>({});
  
  // Merge local changes with server data
  const currentPrefs = { ...preferences, ...localPrefs };
  
  const handleChange = (key: keyof DigestPreferences, value: any) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = async () => {
    await updatePreferences.mutateAsync(localPrefs);
    setLocalPrefs({});
  };
  
  const hasChanges = Object.keys(localPrefs).length > 0;
  const isPaused = preferences?.pausedUntil && new Date(preferences.pausedUntil) > new Date();
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Pause Banner */}
      {isPaused && (
        <Alert>
          <Pause className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Digests paused until{' '}
              {new Date(preferences!.pausedUntil!).toLocaleDateString()}
            </span>
            <ResumeButton />
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Digest Settings
              </CardTitle>
              <CardDescription>
                Control how and when you receive notification digests
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="email-enabled" className="text-sm">
                Digests enabled
              </Label>
              <Switch
                id="email-enabled"
                checked={currentPrefs.emailEnabled}
                onCheckedChange={(checked) => handleChange('emailEnabled', checked)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Frequency Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Digest Frequency</Label>
            <RadioGroup
              value={currentPrefs.frequency}
              onValueChange={(value) => handleChange('frequency', value)}
              disabled={!currentPrefs.emailEnabled}
            >
              <div className="grid grid-cols-2 gap-4">
                <FrequencyOption
                  value="immediate"
                  label="Immediate"
                  description="When 5+ notifications accumulate"
                  icon={Bell}
                  disabled={!currentPrefs.emailEnabled}
                />
                <FrequencyOption
                  value="daily"
                  label="Daily"
                  description="Once per day at your preferred time"
                  icon={Clock}
                  disabled={!currentPrefs.emailEnabled}
                />
                <FrequencyOption
                  value="weekly"
                  label="Weekly"
                  description="Once per week on your preferred day"
                  icon={Calendar}
                  disabled={!currentPrefs.emailEnabled}
                />
                <FrequencyOption
                  value="none"
                  label="None"
                  description="Don't send email digests"
                  icon={BellOff}
                  disabled={!currentPrefs.emailEnabled}
                />
              </div>
            </RadioGroup>
          </div>
          
          {/* Time and Day Selection */}
          {currentPrefs.frequency !== 'none' && currentPrefs.frequency !== 'immediate' && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {/* Preferred Time */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preferred Time</Label>
                  <Select
                    value={currentPrefs.preferredTime}
                    onValueChange={(value) => handleChange('preferredTime', value)}
                    disabled={!currentPrefs.emailEnabled}
                  >
                    <SelectTrigger>
                      <Clock className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Preferred Day (weekly only) */}
                {currentPrefs.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Preferred Day</Label>
                    <Select
                      value={String(currentPrefs.preferredDay ?? 1)}
                      onValueChange={(value) => handleChange('preferredDay', parseInt(value))}
                      disabled={!currentPrefs.emailEnabled}
                    >
                      <SelectTrigger>
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Timezone */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Timezone</Label>
            <Select
              value={currentPrefs.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger>
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones?.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Categories */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Notification Categories</Label>
            <p className="text-sm text-muted-foreground">
              Select which types of notifications to include in digests.
              Leave all unchecked to include everything.
            </p>
            <div className="space-y-2">
              {categories?.map((cat) => (
                <div key={cat.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={`cat-${cat.value}`}
                    checked={currentPrefs.categories?.includes(cat.value)}
                    onCheckedChange={(checked) => {
                      const current = currentPrefs.categories || [];
                      const updated = checked
                        ? [...current, cat.value]
                        : current.filter(c => c !== cat.value);
                      handleChange('categories', updated);
                    }}
                  />
                  <div className="grid gap-1">
                    <Label htmlFor={`cat-${cat.value}`} className="font-medium">
                      {cat.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <PauseButton disabled={isPaused || !currentPrefs.emailEnabled} />
            <PreviewButton />
            <SendNowButton />
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={() => setLocalPrefs({})}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updatePreferences.isPending}
            >
              {updatePreferences.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* History Section */}
      <DigestHistorySection />
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function FrequencyOption({
  value,
  label,
  description,
  icon: Icon,
  disabled,
}: {
  value: string;
  label: string;
  description: string;
  icon: any;
  disabled?: boolean;
}) {
  return (
    <Label
      className={cn(
        'flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5'
      )}
    >
      <RadioGroupItem value={value} disabled={disabled} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </Label>
  );
}

function PauseButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState('7');
  const pause = usePauseDigest();
  
  const handlePause = async () => {
    await pause.mutateAsync(parseInt(days));
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pause Email Digests</DialogTitle>
          <DialogDescription>
            Temporarily stop receiving digest emails
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pause for</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePause} disabled={pause.isPending}>
            {pause.isPending ? 'Pausing...' : 'Pause Digests'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumeButton() {
  const resume = useResumeDigest();
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => resume.mutate()}
      disabled={resume.isPending}
    >
      <Play className="h-4 w-4 mr-2" />
      Resume
    </Button>
  );
}

function PreviewButton() {
  const [open, setOpen] = useState(false);
  const { data, refetch, isLoading, isFetching } = useDigestPreview();
  
  const handleOpen = () => {
    setOpen(true);
    refetch();
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleOpen}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Digest Preview</DialogTitle>
          <DialogDescription>
            Preview of what your next digest would contain
          </DialogDescription>
        </DialogHeader>
        
        {isLoading || isFetching ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data?.notificationCount === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No pending notifications
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{data?.content?.subject}</p>
              <p className="text-sm text-muted-foreground">
                {data?.content?.preheader}
              </p>
            </div>
            
            <div className="space-y-3">
              {data?.content?.sections?.map((section, i) => (
                <div key={i}>
                  <h4 className="font-medium text-sm">{section.title}</h4>
                  <div className="mt-1 space-y-1">
                    {section.items.slice(0, 3).map((item: any, j: number) => (
                      <div key={j} className="text-sm text-muted-foreground">
                        • {item.title}
                      </div>
                    ))}
                    {section.items.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{section.items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Total: {data?.notificationCount} notifications
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SendNowButton() {
  const send = useSendDigest();
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleSend = async () => {
    try {
      await send.mutateAsync();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // Error handled by mutation
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      disabled={send.isPending}
    >
      {send.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : showSuccess ? (
        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
      ) : (
        <Send className="h-4 w-4 mr-2" />
      )}
      {showSuccess ? 'Sent!' : 'Send Now'}
    </Button>
  );
}

function DigestHistorySection() {
  const { data, isLoading } = useDigestHistory();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Digest History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data?.history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No digests sent yet
          </p>
        ) : (
          <div className="space-y-2">
            {data?.history.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  {item.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {item.notificationCount} notifications
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.sentAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {item.reason}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPERS
// ============================================

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour = String(h).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      const value = `${hour}:${minute}`;
      const label = formatTime(h, m);
      options.push({ value, label });
    }
  }
  return options;
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = String(minute).padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

export default DigestPreferences;
