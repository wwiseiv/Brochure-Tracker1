import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  Building2,
  Phone,
  Globe,
  Loader2,
  MapPin,
  ChevronRight,
  Flame,
  Thermometer,
  Snowflake,
  Clock,
  DollarSign,
  Plus,
  LayoutList,
  LayoutGrid,
  Mail,
  User,
  Mic,
  Square,
  Navigation,
  ExternalLink,
  Calendar,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Presentation,
  Calculator,
  Send,
  FileSignature,
  Wrench,
  MessageSquare,
  Check,
  ClipboardList,
  Paperclip,
  PhoneOutgoing,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Video,
  Users,
  FileQuestion,
} from "lucide-react";
import { format } from "date-fns";
import type { Deal, DealActivity, DealAttachment } from "@shared/schema";
import { Label } from "@/components/ui/label";

const DEAL_STAGE_CONFIG: Record<string, { label: string; color: string; icon: any; phase: string }> = {
  prospect: { label: "Prospect", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300", icon: Search, phase: "Prospecting" },
  cold_call: { label: "Cold Call", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Phone, phase: "Prospecting" },
  appointment_set: { label: "Appt Set", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300", icon: Calendar, phase: "Prospecting" },
  presentation_made: { label: "Presented", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: Presentation, phase: "Active Selling" },
  proposal_sent: { label: "Proposal", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: FileText, phase: "Active Selling" },
  statement_analysis: { label: "Analysis", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300", icon: Calculator, phase: "Active Selling" },
  negotiating: { label: "Negotiating", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: MessageSquare, phase: "Active Selling" },
  follow_up: { label: "Follow-Up", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock, phase: "Active Selling" },
  documents_sent: { label: "Docs Sent", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: Send, phase: "Closing" },
  documents_signed: { label: "Signed", color: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300", icon: FileSignature, phase: "Closing" },
  sold: { label: "Won", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: Check, phase: "Closing" },
  dead: { label: "Lost", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle, phase: "Closing" },
  installation_scheduled: { label: "Install", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", icon: Wrench, phase: "Post-Sale" },
  active_merchant: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: Building2, phase: "Post-Sale" },
};

const PHASES = ["All", "Prospecting", "Active Selling", "Closing", "Post-Sale"] as const;

const TEMPERATURE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  hot: { label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: Flame },
  warm: { label: "Warm", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Thermometer },
  cold: { label: "Cold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Snowflake },
};

interface PipelineCounts {
  [stage: string]: number;
}

export default function DealPipelinePage() {
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [temperatureFilter, setTemperatureFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editingStage, setEditingStage] = useState("");
  const [editingNotes, setEditingNotes] = useState("");

  const [isRecordingNotes, setIsRecordingNotes] = useState(false);
  const [isTranscribingNotes, setIsTranscribingNotes] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpMethod, setFollowUpMethod] = useState<string>("");
  const [followUpOutcome, setFollowUpOutcome] = useState<string>("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pipelineCounts, isLoading: loadingCounts } = useQuery<PipelineCounts>({
    queryKey: ["/api/deals/pipeline-counts"],
  });

  const { data: dealsData, isLoading: loadingDeals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const { data: activitiesData, isLoading: loadingActivities, refetch: refetchActivities } = useQuery<DealActivity[]>({
    queryKey: ["/api/deals", selectedDeal?.id, "activities"],
    queryFn: async () => {
      if (!selectedDeal?.id) return [];
      const res = await fetch(`/api/deals/${selectedDeal.id}/activities`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
    enabled: !!selectedDeal?.id,
  });

  const { data: attachmentsData, isLoading: loadingAttachments, refetch: refetchAttachments } = useQuery<DealAttachment[]>({
    queryKey: ["/api/deals", selectedDeal?.id, "attachments"],
    queryFn: async () => {
      if (!selectedDeal?.id) return [];
      const res = await fetch(`/api/deals/${selectedDeal.id}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: !!selectedDeal?.id,
  });

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Deal> }) => {
      const response = await apiRequest("PATCH", `/api/deals/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/pipeline-counts"] });
      toast({ title: "Deal updated" });
    },
    onError: () => {
      toast({ title: "Failed to update deal", variant: "destructive" });
    },
  });

  const changeStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const response = await apiRequest("PATCH", `/api/deals/${id}/stage`, { stage });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/pipeline-counts"] });
      toast({ title: "Stage updated" });
    },
    onError: () => {
      toast({ title: "Failed to change stage", variant: "destructive" });
    },
  });

  const recordFollowUpMutation = useMutation({
    mutationFn: async (data: { id: number; method: string; outcome: string; notes: string; nextFollowUpAt?: string }) => {
      const response = await apiRequest("POST", `/api/deals/${data.id}/follow-up`, {
        method: data.method,
        outcome: data.outcome,
        notes: data.notes,
        nextFollowUpAt: data.nextFollowUpAt || null,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals/pipeline-counts"] });
      if (selectedDeal) {
        refetchActivities();
      }
      setShowFollowUpForm(false);
      setFollowUpMethod("");
      setFollowUpOutcome("");
      setFollowUpNotes("");
      setNextFollowUpDate("");
      toast({ title: "Follow-up recorded" });
    },
    onError: () => {
      toast({ title: "Failed to record follow-up", variant: "destructive" });
    },
  });

  const handleRecordFollowUp = () => {
    if (!selectedDeal || !followUpMethod || !followUpOutcome) {
      toast({ title: "Please select method and outcome", variant: "destructive" });
      return;
    }
    recordFollowUpMutation.mutate({
      id: selectedDeal.id,
      method: followUpMethod,
      outcome: followUpOutcome,
      notes: followUpNotes,
      nextFollowUpAt: nextFollowUpDate || undefined,
    });
  };

  const handleOpenDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setEditingStage(deal.currentStage);
    setEditingNotes(deal.notes || "");
  };

  const handleSaveChanges = () => {
    if (!selectedDeal) return;
    
    if (editingStage !== selectedDeal.currentStage) {
      changeStageMutation.mutate({ id: selectedDeal.id, stage: editingStage });
    }
    
    if (editingNotes !== (selectedDeal.notes || "")) {
      updateDealMutation.mutate({
        id: selectedDeal.id,
        updates: { notes: editingNotes },
      });
    }
  };

  const startRecordingNotes = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || "audio/webm" 
        });
        await transcribeNotesAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecordingNotes(true);
      toast({ title: "Recording...", description: "Speak now to dictate your notes" });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice dictation",
        variant: "destructive",
      });
    }
  };

  const stopRecordingNotes = () => {
    if (mediaRecorderRef.current && isRecordingNotes) {
      mediaRecorderRef.current.stop();
      setIsRecordingNotes(false);
    }
  };

  const cleanupRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingNotes(false);
    setIsTranscribingNotes(false);
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const transcribeNotesAudio = async (audioBlob: Blob) => {
    setIsTranscribingNotes(true);
    try {
      const formData = new FormData();
      let ext = "webm";
      const blobType = audioBlob.type.toLowerCase();
      if (blobType.includes("mp4") || blobType.includes("m4a")) {
        ext = "m4a";
      }
      formData.append("audio", audioBlob, `notes.${ext}`);
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Transcription failed");
      }
      
      const data = await response.json();
      if (data.text) {
        setEditingNotes(prev => prev ? `${prev}\n\n${data.text}` : data.text);
        toast({ title: "Transcription complete!" });
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: "Please try again or type your notes manually",
        variant: "destructive",
      });
    } finally {
      setIsTranscribingNotes(false);
    }
  };

  const getStagesForPhase = (phase: string): string[] => {
    if (phase === "All") return Object.keys(DEAL_STAGE_CONFIG);
    return Object.entries(DEAL_STAGE_CONFIG)
      .filter(([_, config]) => config.phase === phase)
      .map(([stage]) => stage);
  };

  const filteredDeals = (dealsData || []).filter((deal) => {
    const matchesSearch = deal.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTemperature = temperatureFilter === "all" || deal.temperature === temperatureFilter;
    const matchesPhase = phaseFilter === "All" || DEAL_STAGE_CONFIG[deal.currentStage]?.phase === phaseFilter;
    return matchesSearch && matchesTemperature && matchesPhase && !deal.archived;
  });

  const totalDeals = filteredDeals.length;
  const totalEstimatedValue = filteredDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.estimatedCommission || "0") || 0);
  }, 0);
  const dealsNeedingFollowUp = filteredDeals.filter(deal => {
    if (!deal.nextFollowUpAt) return false;
    return new Date(deal.nextFollowUpAt) <= new Date();
  }).length;

  const isLoading = loadingCounts || loadingDeals;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderTemperatureBadge = (temperature: string) => {
    const config = TEMPERATURE_CONFIG[temperature] || TEMPERATURE_CONFIG.cold;
    const Icon = config.icon;
    return (
      <Badge className={`text-xs ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderStageBadge = (stage: string) => {
    const config = DEAL_STAGE_CONFIG[stage] || DEAL_STAGE_CONFIG.prospect;
    const Icon = config.icon;
    return (
      <Badge className={`text-xs ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderDealCard = (deal: Deal) => {
    const hasUpcomingFollowUp = deal.nextFollowUpAt && new Date(deal.nextFollowUpAt) > new Date();
    const isOverdueFollowUp = deal.nextFollowUpAt && new Date(deal.nextFollowUpAt) <= new Date();

    return (
      <Card
        key={deal.id}
        className="p-4 cursor-pointer hover-elevate"
        onClick={() => handleOpenDeal(deal)}
        data-testid={`deal-card-${deal.id}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold truncate">{deal.businessName}</h3>
              {renderTemperatureBadge(deal.temperature)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {renderStageBadge(deal.currentStage)}
              {deal.estimatedCommission && (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {formatCurrency(parseFloat(deal.estimatedCommission))}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>

        {deal.businessCity && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="w-3 h-3" />
            {deal.businessCity}, {deal.businessState}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {deal.contactName && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {deal.contactName}
            </span>
          )}
          {isOverdueFollowUp && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-3 h-3" />
              Follow-up overdue
            </span>
          )}
          {hasUpcomingFollowUp && !isOverdueFollowUp && (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="w-3 h-3" />
              Follow-up: {format(new Date(deal.nextFollowUpAt!), "MMM d")}
            </span>
          )}
          {deal.appointmentDate && (
            <span className="flex items-center gap-1 text-blue-600">
              <Calendar className="w-3 h-3" />
              Appt: {format(new Date(deal.appointmentDate), "MMM d")}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {deal.businessPhone && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${deal.businessPhone}`, "_self");
              }}
              data-testid={`button-call-${deal.id}`}
            >
              <Phone className="w-4 h-4 mr-1" />
              Call
            </Button>
          )}
          {deal.businessAddress && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                const address = `${deal.businessAddress}, ${deal.businessCity}, ${deal.businessState} ${deal.businessZip}`;
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
              }}
              data-testid={`button-directions-${deal.id}`}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Navigate
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderKanbanView = () => {
    const visibleStages = getStagesForPhase(phaseFilter);

    return (
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-4" style={{ minWidth: `${visibleStages.length * 280}px` }}>
          {visibleStages.map((stage) => {
            const stageDeals = filteredDeals.filter(d => d.currentStage === stage);
            const config = DEAL_STAGE_CONFIG[stage];
            const count = pipelineCounts?.[stage] || stageDeals.length;

            return (
              <div
                key={stage}
                className="flex-shrink-0 w-[260px] bg-muted/50 rounded-lg p-3"
                data-testid={`stage-column-${stage}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      className="p-3 cursor-pointer hover-elevate"
                      onClick={() => handleOpenDeal(deal)}
                      data-testid={`deal-card-${deal.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm truncate flex-1">{deal.businessName}</h4>
                        {renderTemperatureBadge(deal.temperature)}
                      </div>
                      {deal.estimatedCommission && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                          {formatCurrency(parseFloat(deal.estimatedCommission))}
                        </p>
                      )}
                      {deal.nextFollowUpAt && new Date(deal.nextFollowUpAt) <= new Date() && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Follow-up overdue
                        </p>
                      )}
                    </Card>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No deals</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="pipeline-page">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Deal Pipeline</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("kanban")}
              data-testid="button-kanban-view"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{totalDeals}</p>
                <p className="text-xs text-muted-foreground">Total Deals</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEstimatedValue)}</p>
                <p className="text-xs text-muted-foreground">Pipeline Value</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{dealsNeedingFollowUp}</p>
                <p className="text-xs text-muted-foreground">Need Follow-Up</p>
              </Card>
            </div>

            <div className="overflow-x-auto -mx-4 px-4 pb-2">
              <div className="flex gap-2" style={{ minWidth: "fit-content" }}>
                {PHASES.map((phase) => (
                  <Button
                    key={phase}
                    variant={phaseFilter === phase ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPhaseFilter(phase)}
                    data-testid={`stage-filter-${phase.toLowerCase().replace(" ", "-")}`}
                  >
                    {phase}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-pipeline"
                />
              </div>
              <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
                <SelectTrigger className="w-[120px]" data-testid="select-temperature-filter">
                  <Thermometer className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Temps</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredDeals.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Deals Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || temperatureFilter !== "all" || phaseFilter !== "All"
                    ? "Try adjusting your filters"
                    : "Create your first deal to get started"}
                </p>
                <Link href="/deals/new">
                  <Button className="gap-2" data-testid="button-create-deal">
                    <Plus className="w-4 h-4" />
                    Create Deal
                  </Button>
                </Link>
              </div>
            ) : viewMode === "kanban" ? (
              renderKanbanView()
            ) : (
              <div className="space-y-3">
                {filteredDeals.map(renderDealCard)}
              </div>
            )}
          </>
        )}
      </main>

      <Link href="/deals/new">
        <Button
          className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-30"
          size="icon"
          data-testid="add-deal-fab"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </Link>

      <Sheet open={!!selectedDeal} onOpenChange={(open) => {
        if (!open) {
          cleanupRecording();
          setSelectedDeal(null);
        }
      }}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0" data-testid="deal-sheet">
          {selectedDeal && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
                <SheetTitle className="flex items-center gap-2">
                  {selectedDeal.businessName}
                  {renderTemperatureBadge(selectedDeal.temperature)}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-2 flex-wrap">
                  {selectedDeal.businessPhone && (
                    <Button
                      className="flex-1"
                      onClick={() => window.open(`tel:${selectedDeal.businessPhone}`, "_self")}
                      data-testid="button-detail-call"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  )}
                  {selectedDeal.businessEmail && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`mailto:${selectedDeal.businessEmail}`, "_self")}
                      data-testid="button-detail-email"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                  )}
                  {selectedDeal.businessAddress && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const address = `${selectedDeal.businessAddress}, ${selectedDeal.businessCity}, ${selectedDeal.businessState} ${selectedDeal.businessZip}`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
                      }}
                      data-testid="button-detail-directions"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Business Information</h4>
                  {selectedDeal.businessAddress && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>
                        {selectedDeal.businessAddress}
                        {selectedDeal.businessCity && `, ${selectedDeal.businessCity}`}
                        {selectedDeal.businessState && `, ${selectedDeal.businessState}`}
                        {selectedDeal.businessZip && ` ${selectedDeal.businessZip}`}
                      </span>
                    </div>
                  )}
                  {selectedDeal.businessPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${selectedDeal.businessPhone}`} className="text-primary">
                        {selectedDeal.businessPhone}
                      </a>
                    </div>
                  )}
                  {selectedDeal.businessEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedDeal.businessEmail}`} className="text-primary">
                        {selectedDeal.businessEmail}
                      </a>
                    </div>
                  )}
                  {selectedDeal.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={selectedDeal.website.startsWith('http') ? selectedDeal.website : `https://${selectedDeal.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1"
                      >
                        Visit Website
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {(selectedDeal.contactName || selectedDeal.contactPhone || selectedDeal.contactEmail) && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Contact Information</h4>
                    {selectedDeal.contactName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{selectedDeal.contactName}</span>
                        {selectedDeal.contactPreferredMethod && (
                          <Badge variant="outline" className="text-xs">
                            Prefers {selectedDeal.contactPreferredMethod}
                          </Badge>
                        )}
                      </div>
                    )}
                    {selectedDeal.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <a href={`tel:${selectedDeal.contactPhone}`} className="text-primary">
                          {selectedDeal.contactPhone}
                        </a>
                      </div>
                    )}
                    {selectedDeal.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${selectedDeal.contactEmail}`} className="text-primary">
                          {selectedDeal.contactEmail}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Deal Information</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Stage</p>
                      {renderStageBadge(selectedDeal.currentStage)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Temperature</p>
                      {renderTemperatureBadge(selectedDeal.temperature)}
                    </div>
                    {selectedDeal.estimatedMonthlyVolume && (
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Monthly Volume</p>
                        <p className="font-medium">{formatCurrency(parseFloat(selectedDeal.estimatedMonthlyVolume))}</p>
                      </div>
                    )}
                    {selectedDeal.estimatedCommission && (
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Commission</p>
                        <p className="font-medium text-green-600">{formatCurrency(parseFloat(selectedDeal.estimatedCommission))}</p>
                      </div>
                    )}
                    {selectedDeal.dealProbability !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Probability</p>
                        <p className="font-medium">{selectedDeal.dealProbability}%</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Follow-ups</p>
                      <p className="font-medium">{selectedDeal.followUpAttemptCount} / {selectedDeal.maxFollowUpAttempts}</p>
                    </div>
                  </div>
                </div>

                <Card className="p-4 space-y-3" data-testid="follow-up-section">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhoneOutgoing className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-sm">Record Follow-Up</h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedDeal.followUpAttemptCount} of {selectedDeal.maxFollowUpAttempts}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                      data-testid="button-toggle-followup"
                    >
                      {showFollowUpForm ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {showFollowUpForm && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label className="text-xs">Method</Label>
                        <Select value={followUpMethod} onValueChange={setFollowUpMethod}>
                          <SelectTrigger data-testid="select-followup-method">
                            <SelectValue placeholder="Select method..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="visit">Visit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Outcome</Label>
                        <Select value={followUpOutcome} onValueChange={setFollowUpOutcome}>
                          <SelectTrigger data-testid="select-followup-outcome">
                            <SelectValue placeholder="Select outcome..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_answer">No Answer</SelectItem>
                            <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                            <SelectItem value="spoke_interested">Spoke - Interested</SelectItem>
                            <SelectItem value="spoke_needs_time">Spoke - Needs Time</SelectItem>
                            <SelectItem value="spoke_objection">Spoke - Objection</SelectItem>
                            <SelectItem value="spoke_ready">Spoke - Ready</SelectItem>
                            <SelectItem value="not_interested">Not Interested</SelectItem>
                            <SelectItem value="callback_scheduled">Callback Scheduled</SelectItem>
                            <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          placeholder="Add follow-up notes..."
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          rows={2}
                          data-testid="textarea-followup-notes"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <CalendarPlus className="w-3 h-3" />
                          Next Follow-up Date (optional)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={nextFollowUpDate}
                          onChange={(e) => setNextFollowUpDate(e.target.value)}
                          data-testid="input-next-followup-date"
                        />
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={handleRecordFollowUp}
                        disabled={recordFollowUpMutation.isPending || !followUpMethod || !followUpOutcome}
                        data-testid="button-submit-followup"
                      >
                        {recordFollowUpMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Record Follow-Up
                      </Button>
                    </div>
                  )}
                </Card>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Change Stage</h4>
                  <Select value={editingStage} onValueChange={setEditingStage}>
                    <SelectTrigger data-testid="change-stage-button">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEAL_STAGE_CONFIG).map(([stage, config]) => {
                        const StageIcon = config.icon;
                        return (
                          <SelectItem key={stage} value={stage}>
                            <div className="flex items-center gap-2">
                              <StageIcon className="w-4 h-4" />
                              {config.label}
                              <span className="text-xs text-muted-foreground">({config.phase})</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Notes</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={isRecordingNotes ? stopRecordingNotes : startRecordingNotes}
                      disabled={isTranscribingNotes}
                      className={isRecordingNotes ? "text-red-500" : ""}
                      data-testid="button-dictate-notes"
                    >
                      {isTranscribingNotes ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isRecordingNotes ? (
                        <>
                          <Square className="w-4 h-4 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-1" />
                          Dictate
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Add notes about this deal..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>

                <div className="space-y-3" data-testid="activity-timeline-section">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-sm">Activity Timeline</h4>
                  </div>
                  
                  {loadingActivities ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : activitiesData && activitiesData.length > 0 ? (
                    <div className="relative pl-4 border-l-2 border-muted space-y-4">
                      {activitiesData
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((activity) => {
                          const getActivityIcon = (activityType: string) => {
                            switch (activityType) {
                              case "call": return <Phone className="w-3 h-3" />;
                              case "email": return <Mail className="w-3 h-3" />;
                              case "text": return <MessageSquare className="w-3 h-3" />;
                              case "visit": return <MapPin className="w-3 h-3" />;
                              case "meeting": return <Users className="w-3 h-3" />;
                              case "proposal_sent": return <FileText className="w-3 h-3" />;
                              case "presentation": return <Presentation className="w-3 h-3" />;
                              case "meeting_recording": return <Video className="w-3 h-3" />;
                              case "follow_up": return <PhoneOutgoing className="w-3 h-3" />;
                              case "stage_change": return <TrendingUp className="w-3 h-3" />;
                              default: return <ClipboardList className="w-3 h-3" />;
                            }
                          };
                          
                          return (
                            <div key={activity.id} className="relative" data-testid={`activity-item-${activity.id}`}>
                              <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                {getActivityIcon(activity.activityType)}
                              </div>
                              <div className="ml-2">
                                <p className="text-sm">{activity.description || activity.activityType.replace(/_/g, " ")}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span>{format(new Date(activity.createdAt), "MMM d, h:mm a")}</span>
                                  {activity.followUpOutcome && (
                                    <>
                                      <span>•</span>
                                      <Badge variant="outline" className="text-xs py-0">
                                        {activity.followUpOutcome.replace(/_/g, " ")}
                                      </Badge>
                                    </>
                                  )}
                                  {activity.agentName && (
                                    <>
                                      <span>•</span>
                                      <span>{activity.agentName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No activities recorded yet</p>
                  )}
                </div>

                <div className="space-y-3" data-testid="attachments-section">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-sm">Attachments</h4>
                  </div>
                  
                  {loadingAttachments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : attachmentsData && attachmentsData.length > 0 ? (
                    <div className="space-y-2">
                      {attachmentsData.map((attachment) => {
                        const getAttachmentIcon = (attachmentType: string) => {
                          switch (attachmentType) {
                            case "proposal": return <FileText className="w-4 h-4 text-blue-500" />;
                            case "statement": return <Calculator className="w-4 h-4 text-green-500" />;
                            case "esign_document": return <FileSignature className="w-4 h-4 text-purple-500" />;
                            case "meeting_recording": return <Video className="w-4 h-4 text-red-500" />;
                            case "brochure_drop": return <Send className="w-4 h-4 text-orange-500" />;
                            default: return <FileQuestion className="w-4 h-4 text-muted-foreground" />;
                          }
                        };
                        
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                            data-testid={`attachment-item-${attachment.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {getAttachmentIcon(attachment.attachmentType)}
                              <div>
                                <p className="text-sm font-medium truncate max-w-[180px]">{attachment.name || "Untitled"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {attachment.attachmentType.replace(/_/g, " ")} • {format(new Date(attachment.createdAt), "MMM d")}
                                </p>
                              </div>
                            </div>
                            {attachment.url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(attachment.url!, "_blank", "noopener,noreferrer")}
                                data-testid={`button-view-attachment-${attachment.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">No attachments</p>
                  )}
                </div>

                {selectedDeal.appointmentDate && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Appointment</h4>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(selectedDeal.appointmentDate), "MMMM d, yyyy 'at' h:mm a")}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Created {format(new Date(selectedDeal.createdAt), "MMM d, yyyy")}</span>
                  {selectedDeal.stageEnteredAt && (
                    <>
                      <span>•</span>
                      <span>In stage since {format(new Date(selectedDeal.stageEnteredAt), "MMM d")}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t p-4 flex-shrink-0">
                <Button
                  className="w-full"
                  onClick={handleSaveChanges}
                  disabled={updateDealMutation.isPending || changeStageMutation.isPending}
                  data-testid="button-save-changes"
                >
                  {(updateDealMutation.isPending || changeStageMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
