import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { usePushNotifications } from "@/hooks/use-push-notifications";
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
  ArrowLeft,
  Search,
  MapPin,
  Sparkles,
  Building2,
  Phone,
  Globe,
  Loader2,
  Check,
  X,
  Plus,
  ChevronRight,
  TrendingUp,
  Utensils,
  ShoppingBag,
  Briefcase,
  Car,
  HeartPulse,
  Ticket,
  Home,
  User,
  GraduationCap,
  Truck,
  Zap,
  Grid3x3,
  AlertCircle,
  Navigation,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  List,
  Info,
  Eye,
  Trash2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MCCCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface MCCCode {
  code: string;
  title: string;
  level: number;
  category: string;
  searchTerms: string[];
}

interface DiscoveredBusiness {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  businessType: string;
  mccCode: string;
  confidence: number;
  hoursOfOperation: string | null;
  ownerName: string | null;
  yearEstablished: string | null;
  description: string | null;
}

interface SearchResult {
  businesses: DiscoveredBusiness[];
  totalFound: number;
  duplicatesSkipped: number;
  searchId: string;
}

interface ProspectSearchJob {
  id: number;
  agentId: string;
  organizationId: number | null;
  zipCode: string;
  locationDisplay: string | null;
  businessTypes: string[] | null;
  businessTypesDisplay: string | null;
  radiusMiles: number;
  maxResults: number;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  results: DiscoveredBusiness[] | null;
  resultsCount: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

const categoryIcons: Record<string, any> = {
  food: Utensils,
  retail: ShoppingBag,
  services: Briefcase,
  automotive: Car,
  healthcare: HeartPulse,
  entertainment: Ticket,
  home: Home,
  personal: User,
  education: GraduationCap,
  transportation: Truck,
  utilities: Zap,
  other: Grid3x3,
};

export default function ProspectFinderPage() {
  const [zipCode, setZipCode] = useState("");
  const [selectedMCCCodes, setSelectedMCCCodes] = useState<string[]>([]);
  const [radius, setRadius] = useState("10");
  const [maxResults, setMaxResults] = useState("25");
  const [showMCCSheet, setShowMCCSheet] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedBusinesses, setClaimedBusinesses] = useState<Set<string>>(new Set());
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const { toast } = useToast();
  
  // Push notifications for background search alerts
  const { isSubscribed, isSupported } = usePushNotifications();
  const queryClient = useQueryClient();

  const { data: mccData, isLoading: loadingMCC } = useQuery<{
    categories: MCCCategory[];
    codes: MCCCode[];
  }>({
    queryKey: ["/api/prospects/mcc-codes"],
  });

  const { data: jobsData, isLoading: loadingJobs } = useQuery<{ jobs: ProspectSearchJob[] }>({
    queryKey: ["/api/prospect-finder/jobs"],
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs || [];
      const hasPendingJobs = jobs.some(job => job.status === "pending" || job.status === "processing");
      return hasPendingJobs ? 5000 : false;
    },
  });

  const jobs = jobsData?.jobs || [];
  const hasPendingJobs = jobs.some(job => job.status === "pending" || job.status === "processing");

  const startBackgroundSearchMutation = useMutation({
    mutationFn: async () => {
      const businessTypesDisplay = selectedMCCDetails.map(m => m.title).join(", ");
      const response = await apiRequest("POST", "/api/prospect-finder/jobs", {
        location: zipCode,
        businessTypes: selectedMCCCodes,
        businessTypesDisplay,
        radiusMiles: parseInt(radius),
        maxResults: parseInt(maxResults),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Search started!",
        description: "We'll notify you when your prospect list is ready. You can navigate away.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prospect-finder/jobs"] });
      setZipCode("");
      setSelectedMCCCodes([]);
      setRadius("10");
      setMaxResults("25");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start search",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", `/api/prospect-finder/jobs/${jobId}/retry`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Retrying search",
        description: "We'll notify you when results are ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prospect-finder/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to retry",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("DELETE", `/api/prospect-finder/jobs/${jobId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Search job removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prospect-finder/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/prospects/search", {
        zipCode,
        mccCodes: selectedMCCCodes,
        radius: parseInt(radius),
        maxResults: parseInt(maxResults),
      });
      return await response.json() as SearchResult;
    },
    onSuccess: (data) => {
      setSearchResults(data);
      setShowResults(true);
      if (data.businesses.length === 0) {
        toast({
          title: "No businesses found",
          description: "Try expanding your search criteria or radius.",
        });
      } else {
        toast({
          title: `Found ${data.totalFound} businesses`,
          description: data.duplicatesSkipped > 0 
            ? `${data.duplicatesSkipped} already in your pipeline` 
            : "Ready to claim!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Search failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (business: DiscoveredBusiness) => {
      const response = await apiRequest("POST", "/api/prospects/claim", { business });
      return await response.json();
    },
    onSuccess: (data, business) => {
      setClaimedBusinesses((prev) => new Set(Array.from(prev).concat(business.name)));
      queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prospects/pipeline"] });
      toast({
        title: "Prospect claimed!",
        description: `${business.name} added to your pipeline`,
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Please try again";
      const isAlreadyClaimed = message.toLowerCase().includes("already been claimed");
      toast({
        title: isAlreadyClaimed ? "Already claimed" : "Failed to claim",
        description: isAlreadyClaimed 
          ? "This business was claimed by another agent" 
          : message,
        variant: "destructive",
      });
    },
  });

  const convertToDealMutation = useMutation({
    mutationFn: async (prospect: DiscoveredBusiness) => {
      const response = await apiRequest("POST", "/api/deals/convert-from-prospect", {
        businessName: prospect.name,
        businessAddress: prospect.address,
        businessCity: prospect.city,
        businessState: prospect.state,
        businessZip: prospect.zipCode,
        businessPhone: prospect.phone,
        businessEmail: prospect.email,
        website: prospect.website,
        contactName: prospect.ownerName,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Converted to Deal!",
        description: `${data.businessName} has been added to your deal pipeline.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion failed",
        description: error.message || "Failed to convert prospect to deal",
        variant: "destructive",
      });
    },
  });

  const handleClaim = async (business: DiscoveredBusiness) => {
    setClaimingId(business.name);
    try {
      await claimMutation.mutateAsync(business);
    } finally {
      setClaimingId(null);
    }
  };

  const handleViewJobResults = (job: ProspectSearchJob) => {
    if (job.status === "completed" && job.results) {
      setActiveJobId(job.id);
      setSearchResults({
        businesses: job.results,
        totalFound: job.resultsCount || job.results.length,
        duplicatesSkipped: 0,
        searchId: `job-${job.id}`,
      });
      setShowResults(true);
    }
  };

  const groupedMCCCodes = useMemo(() => {
    if (!mccData) return {};
    return mccData.codes.reduce((acc, code) => {
      if (!acc[code.category]) acc[code.category] = [];
      acc[code.category].push(code);
      return acc;
    }, {} as Record<string, MCCCode[]>);
  }, [mccData]);

  const toggleMCCCode = (code: string) => {
    setSelectedMCCCodes((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const selectedMCCDetails = useMemo(() => {
    if (!mccData) return [];
    return mccData.codes.filter((c) => selectedMCCCodes.includes(c.code));
  }, [mccData, selectedMCCCodes]);

  const getCategoryIcon = (categoryId: string) => {
    const IconComponent = categoryIcons[categoryId] || Grid3x3;
    return IconComponent;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return { label: "High", variant: "default" as const };
    if (confidence >= 0.7) return { label: "Medium", variant: "secondary" as const };
    return { label: "Low", variant: "outline" as const };
  };

  const getJobStatusDisplay = (job: ProspectSearchJob) => {
    switch (job.status) {
      case "pending":
      case "processing":
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
          label: "Searching...",
          variant: "secondary" as const,
        };
      case "completed":
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          label: `${job.resultsCount || 0} found`,
          variant: "default" as const,
        };
      case "failed":
        return {
          icon: <XCircle className="w-4 h-4 text-destructive" />,
          label: "Failed",
          variant: "destructive" as const,
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 text-muted-foreground" />,
          label: "Unknown",
          variant: "outline" as const,
        };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const canSearch = zipCode.length >= 5 && selectedMCCCodes.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button variant="ghost" size="icon" data-testid="button-back">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go back</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h1 className="text-lg font-semibold">Prospect Finder</h1>
            </div>
          </div>
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white cursor-help">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Uses AI to find real local businesses</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Searches run in the background - you'll get a notification when results are ready.
          </AlertDescription>
        </Alert>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Find Local Businesses</h2>
              <p className="text-sm text-muted-foreground">
                AI discovers businesses in your territory
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  placeholder="Enter ZIP code"
                  className="pl-10"
                  maxLength={5}
                  data-testid="input-zip-code"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Business Types ({selectedMCCCodes.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedMCCDetails.slice(0, 4).map((mcc) => {
                  const IconComponent = getCategoryIcon(mcc.category);
                  return (
                    <Tooltip key={mcc.code} delayDuration={700}>
                      <TooltipTrigger asChild>
                        <Badge
                          className="cursor-pointer bg-primary text-primary-foreground"
                          onClick={() => toggleMCCCode(mcc.code)}
                          data-testid={`badge-mcc-${mcc.code}`}
                        >
                          <IconComponent className="w-3 h-3 mr-1" />
                          {mcc.title.length > 20 ? mcc.title.slice(0, 20) + "..." : mcc.title}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove this business type</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {selectedMCCDetails.length > 4 && (
                  <Badge variant="secondary">
                    +{selectedMCCDetails.length - 4} more
                  </Badge>
                )}
                <Tooltip delayDuration={700}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-dashed"
                      onClick={() => setShowMCCSheet(true)}
                      data-testid="button-add-business-types"
                    >
                      <Plus className="w-3 h-3" />
                      {selectedMCCCodes.length === 0 ? "Select Types" : "Add More"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select additional business types</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Radius
                </label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger data-testid="select-radius">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="15">15 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Results
                </label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger data-testid="select-results">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 businesses</SelectItem>
                    <SelectItem value="25">25 businesses</SelectItem>
                    <SelectItem value="50">50 businesses</SelectItem>
                    <SelectItem value="100">100 businesses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Button
                  className="w-full gap-2"
                  disabled={!canSearch || startBackgroundSearchMutation.isPending}
                  onClick={() => startBackgroundSearchMutation.mutate()}
                  data-testid="button-search-prospects"
                >
                  {startBackgroundSearchMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting search...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Find Prospects
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start a background search for businesses</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <List className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">My Searches</h2>
              <p className="text-sm text-muted-foreground">
                {hasPendingJobs ? "Searches in progress..." : "Your recent search results"}
              </p>
            </div>
            {hasPendingJobs && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Active
              </Badge>
            )}
          </div>

          {isSupported && !isSubscribed && hasPendingJobs && (
            <div className="mb-4 p-3 rounded-lg border bg-muted/30">
              <NotificationPermissionPrompt 
                context="prospect searches"
                onClose={() => {}}
              />
            </div>
          )}

          {isSubscribed && hasPendingJobs && (
            <Alert className="mb-4 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300 text-sm">
                You'll receive a notification when searches complete.
              </AlertDescription>
            </Alert>
          )}

          {loadingJobs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No searches yet. Start one above!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 10).map((job) => {
                const statusDisplay = getJobStatusDisplay(job);
                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate cursor-pointer"
                    onClick={() => job.status === "completed" && handleViewJobResults(job)}
                    data-testid={`job-item-${job.id}`}
                  >
                    <div className="flex-shrink-0">
                      {statusDisplay.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {job.zipCode}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {job.radiusMiles}mi
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {job.businessTypesDisplay || "Various types"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(job.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {job.status === "completed" && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewJobResults(job);
                              }}
                              data-testid={`button-view-results-${job.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View search results</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {job.status === "failed" && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryJobMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                retryJobMutation.mutate(job.id);
                              }}
                              data-testid={`button-retry-${job.id}`}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Retry
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Retry this search</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {(job.status === "pending" || job.status === "processing") && (
                        <Badge variant="secondary" className="text-xs">
                          {statusDisplay.label}
                        </Badge>
                      )}
                      <Tooltip delayDuration={700}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={deleteJobMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteJobMutation.mutate(job.id);
                            }}
                            data-testid={`button-delete-${job.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete this search</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Link href="/prospects/pipeline">
          <Card className="p-4 hover-elevate cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium">My Pipeline</p>
                  <p className="text-sm text-muted-foreground">View claimed prospects</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </main>

      <Sheet open={showMCCSheet} onOpenChange={setShowMCCSheet}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Select Business Types</SheetTitle>
          </SheetHeader>
          
          {loadingMCC ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {mccData?.categories.map((category) => {
                const IconComponent = getCategoryIcon(category.id);
                const codes = groupedMCCCodes[category.id] || [];
                if (codes.length === 0) return null;
                
                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category.color + "20" }}
                      >
                        <IconComponent
                          className="w-4 h-4"
                          style={{ color: category.color }}
                        />
                      </div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {codes.filter(c => selectedMCCCodes.includes(c.code)).length}/{codes.length}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {codes.map((mcc) => {
                        const isSelected = selectedMCCCodes.includes(mcc.code);
                        return (
                          <Badge
                            key={mcc.code}
                            variant={isSelected ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              isSelected ? "bg-primary" : "hover:bg-muted"
                            }`}
                            onClick={() => toggleMCCCode(mcc.code)}
                            data-testid={`mcc-option-${mcc.code}`}
                          >
                            {isSelected && <Check className="w-3 h-3 mr-1" />}
                            {mcc.title.length > 30 ? mcc.title.slice(0, 30) + "..." : mcc.title}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              className="w-full"
              onClick={() => setShowMCCSheet(false)}
              data-testid="button-done-mcc"
            >
              Done ({selectedMCCCodes.length} selected)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showResults} onOpenChange={(open) => {
        setShowResults(open);
        if (!open) {
          setActiveJobId(null);
        }
      }}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0 sticky top-0 bg-background z-10">
            <div className="flex items-center justify-between">
              <SheetTitle>
                Search Results ({searchResults?.businesses.length || 0})
              </SheetTitle>
              {searchResults && searchResults.duplicatesSkipped > 0 && (
                <Badge variant="secondary">
                  {searchResults.duplicatesSkipped} already claimed
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div 
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-24" 
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
          {searchResults?.businesses.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Results Found</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Try expanding your search radius or selecting different business types.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults?.businesses.map((business) => {
                const isClaimed = claimedBusinesses.has(business.name);
                const isClaiming = claimingId === business.name;
                const confidenceBadge = getConfidenceBadge(business.confidence);
                const fullAddress = `${business.address}, ${business.city}, ${business.state} ${business.zipCode}`;
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

                return (
                  <Card key={`${business.name}-${business.zipCode}`} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{business.name}</h3>
                          <Badge variant={confidenceBadge.variant} className="text-xs">
                            {confidenceBadge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fullAddress}
                        </p>
                        {business.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {business.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-2">
                      <Badge variant="outline" className="text-xs">
                        {business.businessType}
                      </Badge>
                      {business.yearEstablished && (
                        <Badge variant="secondary" className="text-xs">
                          Est. {business.yearEstablished}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm mb-3">
                      {business.ownerName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>Owner: {business.ownerName}</span>
                        </div>
                      )}
                      {business.hoursOfOperation && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{business.hoursOfOperation}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mb-3">
                      <Tooltip delayDuration={700}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
                            data-testid={`button-directions-${business.name.replace(/\s+/g, "-")}`}
                          >
                            <Navigation className="w-4 h-4 mr-1" />
                            Directions
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Get directions to this business</p>
                        </TooltipContent>
                      </Tooltip>
                      {business.phone && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              data-testid={`button-call-${business.name.replace(/\s+/g, "-")}`}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Call
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Call this business</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {business.website && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(business.website!, "_blank", "noopener,noreferrer")}
                            >
                              <Globe className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visit website</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {business.email && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`mailto:${business.email}`, "_self")}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send email</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {isClaimed ? (
                      <div className="flex gap-2">
                        <div className="flex-1 flex items-center justify-center text-sm font-medium text-green-600 dark:text-green-500">
                          <Check className="w-4 h-4 mr-1" />
                          Claimed
                        </div>
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={convertingId === business.name}
                              onClick={() => {
                                setConvertingId(business.name);
                                convertToDealMutation.mutate(business, {
                                  onSettled: () => setConvertingId(null),
                                });
                              }}
                              data-testid={`button-convert-deal-${business.name.replace(/\s+/g, "-")}`}
                            >
                              {convertingId === business.name ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              )}
                              Convert to Deal
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add to deal pipeline</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <Tooltip delayDuration={700}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            className="w-full"
                            variant="default"
                            disabled={isClaiming}
                            onClick={() => handleClaim(business)}
                            data-testid={`button-claim-${business.name.replace(/\s+/g, "-")}`}
                          >
                            {isClaiming ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Claim Prospect
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add this business to your pipeline</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
