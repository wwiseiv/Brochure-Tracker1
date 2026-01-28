import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { DropDetailSkeleton } from "@/components/LoadingState";
import { BottomNav } from "@/components/BottomNav";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RoleplayCoach } from "@/components/RoleplayCoach";
import { DropMeetingRecorder } from "@/components/DropMeetingRecorder";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Calendar,
  Clock,
  FileText,
  Mic,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  Building2,
  User,
  Pencil,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  Snowflake,
  ThermometerSun,
  Lightbulb,
  AlertTriangle,
  ListChecks,
  Zap,
  Mail,
  MessageSquare,
  Wand2,
  Copy,
  Check,
} from "lucide-react";
import { format, formatDistanceToNow, addDays } from "date-fns";
import type { DropWithBrochure, BusinessType, OutcomeType, AiSummary, LeadScore, FollowUpSequence, FollowUpStep, FollowUpActionType } from "@shared/schema";
import { BUSINESS_TYPES } from "@shared/schema";

const editDropSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  contactName: z.string().optional(),
  businessPhone: z.string().optional(),
  address: z.string().optional(),
  textNotes: z.string().optional(),
  followUpDays: z.string(),
});

type EditDropFormData = z.infer<typeof editDropSchema>;

const outcomeOptions: { value: OutcomeType; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "signed", label: "Signed - Converted!", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "interested_appointment", label: "Interested - Set Appointment", icon: CalendarPlus, color: "text-blue-600" },
  { value: "interested_later", label: "Interested - Follow Up Later", icon: RefreshCw, color: "text-amber-600" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-gray-600" },
  { value: "closed", label: "Business Closed", icon: AlertCircle, color: "text-red-600" },
  { value: "not_found", label: "Couldn't Find Brochure", icon: AlertCircle, color: "text-gray-600" },
];

export default function DropDetailPage() {
  const [, params] = useRoute("/drops/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [showOutcomeDialog, setShowOutcomeDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeType | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isScoreOpen, setIsScoreOpen] = useState(true);
  
  // Email drafter state
  const [showEmailDrafter, setShowEmailDrafter] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [polishedEmail, setPolishedEmail] = useState("");
  const [emailPurpose, setEmailPurpose] = useState("");
  const [emailTone, setEmailTone] = useState("professional");
  const [emailContext, setEmailContext] = useState("");
  const [emailKeyPoints, setEmailKeyPoints] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);

  interface SequenceWithSteps extends FollowUpSequence {
    steps?: FollowUpStep[];
  }

  const dropId = params?.id;

  const { data: drop, isLoading } = useQuery<DropWithBrochure>({
    queryKey: ["/api/drops", dropId],
    enabled: !!dropId,
  });

  const { data: aiSummary, isLoading: isSummaryLoading } = useQuery<AiSummary | null>({
    queryKey: ["/api/drops", dropId, "summary"],
    enabled: !!dropId,
  });

  const { data: leadScore, isLoading: isScoreLoading } = useQuery<LeadScore | null>({
    queryKey: ["/api/drops", dropId, "score"],
    enabled: !!dropId,
  });

  const { data: sequences } = useQuery<SequenceWithSteps[]>({
    queryKey: ["/api/sequences"],
  });

  const startSequenceMutation = useMutation({
    mutationFn: async (sequenceId: number) => {
      const response = await apiRequest("POST", `/api/drops/${dropId}/sequence`, { sequenceId });
      return response.json();
    },
    onSuccess: () => {
      setShowSequenceDialog(false);
      toast({
        title: "Sequence started!",
        description: "Follow-up sequence is now active for this drop.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start sequence",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/drops/${dropId}/summary`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId, "summary"] });
      toast({
        title: "Summary generated!",
        description: "AI analysis is now available.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate summary",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const calculateScoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/drops/${dropId}/score`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId, "score"] });
      toast({
        title: "Lead score calculated!",
        description: "Score and factors are now available.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to calculate score",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const polishEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email/polish", {
        draft: emailDraft,
        tone: emailTone,
        context: emailContext,
        businessName: drop?.businessName,
        contactName: drop?.contactName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setPolishedEmail(data.polishedEmail);
      toast({ title: "Email polished!" });
    },
    onError: (error) => {
      toast({
        title: "Failed to polish email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/email/generate", {
        purpose: emailPurpose,
        tone: emailTone,
        keyPoints: emailKeyPoints,
        businessName: drop?.businessName,
        contactName: drop?.contactName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      toast({ title: "Email generated!" });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePolishEmail = () => {
    polishEmailMutation.mutate();
  };

  const handleGenerateEmail = () => {
    generateEmailMutation.mutate();
  };

  const copyEmailToClipboard = async () => {
    await navigator.clipboard.writeText(generatedEmail);
    setEmailCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const form = useForm<EditDropFormData>({
    resolver: zodResolver(editDropSchema),
    defaultValues: {
      businessName: "",
      businessType: "",
      contactName: "",
      businessPhone: "",
      address: "",
      textNotes: "",
      followUpDays: "0",
    },
  });

  useEffect(() => {
    if (drop && showEditDialog) {
      const daysUntilPickup = drop.pickupScheduledFor 
        ? Math.max(0, Math.ceil((new Date(drop.pickupScheduledFor).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      
      form.reset({
        businessName: drop.businessName || "",
        businessType: drop.businessType || "",
        contactName: drop.contactName || "",
        businessPhone: drop.businessPhone || "",
        address: drop.address || "",
        textNotes: drop.textNotes || "",
        followUpDays: daysUntilPickup.toString(),
      });
    }
  }, [drop, showEditDialog, form]);

  const editDropMutation = useMutation({
    mutationFn: async (data: EditDropFormData) => {
      const followUpDays = parseInt(data.followUpDays);
      const pickupScheduledFor = followUpDays > 0 
        ? addDays(new Date(), followUpDays).toISOString() 
        : null;
      
      const response = await apiRequest("PATCH", `/api/drops/${dropId}`, {
        businessName: data.businessName,
        businessType: data.businessType,
        contactName: data.contactName || null,
        businessPhone: data.businessPhone || null,
        address: data.address || null,
        textNotes: data.textNotes || null,
        pickupScheduledFor,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId] });
      setShowEditDialog(false);
      toast({
        title: "Drop updated!",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = (data: EditDropFormData) => {
    editDropMutation.mutate(data);
  };

  const updateDropMutation = useMutation({
    mutationFn: async (data: { status: string; outcome?: string | null; outcomeNotes?: string | null }) => {
      const response = await apiRequest("PATCH", `/api/drops/${dropId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drops", dropId] });
      setShowOutcomeDialog(false);
      toast({
        title: "Pickup logged!",
        description: "Drop status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleLogOutcome = () => {
    if (!selectedOutcome) return;
    
    const finalStatus = selectedOutcome === "signed" ? "converted" : "picked_up";
    
    updateDropMutation.mutate({
      status: finalStatus,
      outcome: selectedOutcome,
      outcomeNotes,
    });
  };

  const openInMaps = () => {
    if (!drop?.latitude || !drop?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${drop.latitude},${drop.longitude}`;
    window.open(url, "_blank");
  };

  const callBusiness = () => {
    if (!drop?.businessPhone) return;
    window.location.href = `tel:${drop.businessPhone}`;
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Details</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto">
          <DropDetailSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Not Found</span>
          </div>
        </header>
        <main className="container max-w-md mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Drop not found</h2>
          <p className="text-muted-foreground mb-6">This drop may have been deleted or doesn't exist.</p>
          <Button className="min-h-touch" onClick={() => navigate("/")} data-testid="button-go-to-dashboard">Go to Dashboard</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Drop Details</span>
          </div>
          {drop.status === "pending" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditDialog(true)}
              data-testid="button-edit"
            >
              <Pencil className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BusinessTypeIcon 
              type={(drop.businessType as BusinessType) || "other"} 
              className="w-6 h-6 text-primary"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold" data-testid="text-business-name">
                {drop.businessName || "Unknown Business"}
              </h1>
              <StatusBadge status={drop.status as any} outcome={drop.outcome as any} />
            </div>
            <p className="text-sm text-muted-foreground">
              {businessTypeLabels[(drop.businessType as BusinessType) || "other"]}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {drop.address && (
            <Card className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate" data-testid="text-address">{drop.address}</span>
              </div>
              {drop.latitude && drop.longitude && (
                <Button 
                  variant="ghost" 
                  onClick={openInMaps}
                  className="flex-shrink-0 min-h-touch gap-1"
                  data-testid="button-open-maps"
                >
                  <ExternalLink className="w-4 h-4" />
                  Maps
                </Button>
              )}
            </Card>
          )}

          {drop.businessPhone && (
            <Card className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm" data-testid="text-phone">{drop.businessPhone}</span>
              </div>
              <Button 
                variant="ghost" 
                onClick={callBusiness}
                className="min-h-touch gap-1"
                data-testid="button-call"
              >
                <Phone className="w-4 h-4" />
                Call
              </Button>
            </Card>
          )}

          {drop.contactName && (
            <Card className="p-3 flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm" data-testid="text-contact">{drop.contactName}</span>
            </Card>
          )}
        </div>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Brochure Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Brochure ID</p>
              <p className="font-mono font-medium" data-testid="text-brochure-id">{drop.brochureId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dropped</p>
              <p className="font-medium">{format(new Date(drop.droppedAt), "MMM d, h:mm a")}</p>
            </div>
            {drop.pickupScheduledFor && (
              <div>
                <p className="text-muted-foreground">Pickup Due</p>
                <p className="font-medium">{format(new Date(drop.pickupScheduledFor), "MMM d, yyyy")}</p>
              </div>
            )}
            {drop.pickedUpAt && (
              <div>
                <p className="text-muted-foreground">Picked Up</p>
                <p className="font-medium">{format(new Date(drop.pickedUpAt), "MMM d, h:mm a")}</p>
              </div>
            )}
          </div>
        </Card>

        {drop.voiceNoteUrl && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4" />
              Voice Note
            </h3>
            <VoiceRecorder
              existingAudioUrl={drop.voiceNoteUrl}
              onRecordingComplete={() => {}}
            />
            {drop.voiceTranscript && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Transcript</p>
                <p className="text-sm">{drop.voiceTranscript}</p>
              </div>
            )}
          </Card>
        )}

        <Card className="p-4">
          <Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
            <CollapsibleTrigger className="w-full" data-testid="button-toggle-summary">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Summary
                  {aiSummary?.hotLead && (
                    <Badge variant="destructive" className="ml-2 gap-1" data-testid="badge-hot-lead">
                      <Flame className="w-3 h-3" />
                      Hot Lead
                    </Badge>
                  )}
                </h3>
                {isSummaryOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {isSummaryLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : aiSummary ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={
                        aiSummary.sentiment === "positive" ? "default" :
                        aiSummary.sentiment === "negative" ? "destructive" : "secondary"
                      }
                      className={
                        aiSummary.sentiment === "positive" ? "bg-emerald-600 hover:bg-emerald-700" :
                        aiSummary.sentiment === "neutral" ? "bg-gray-500 hover:bg-gray-600" : ""
                      }
                      data-testid="badge-sentiment"
                    >
                      {aiSummary.sentiment === "positive" ? "Positive" : 
                       aiSummary.sentiment === "negative" ? "Negative" : "Neutral"}
                    </Badge>
                  </div>

                  {aiSummary.summary && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Summary</p>
                      <p className="text-sm" data-testid="text-ai-summary">{aiSummary.summary}</p>
                    </div>
                  )}

                  {aiSummary.keyTakeaways && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Key Takeaways
                      </p>
                      <div className="flex flex-wrap gap-2" data-testid="list-takeaways">
                        {(JSON.parse(aiSummary.keyTakeaways) as string[]).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSummary.objections && JSON.parse(aiSummary.objections).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Objections
                      </p>
                      <div className="flex flex-wrap gap-2" data-testid="list-objections">
                        {(JSON.parse(aiSummary.objections) as string[]).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSummary.nextSteps && JSON.parse(aiSummary.nextSteps).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <ListChecks className="w-3 h-3" />
                        Next Steps
                      </p>
                      <ul className="text-sm space-y-1" data-testid="list-next-steps">
                        {(JSON.parse(aiSummary.nextSteps) as string[]).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    {(drop.textNotes || drop.voiceTranscript) 
                      ? "Generate an AI-powered summary of your notes"
                      : "Add notes or a voice recording to generate a summary"
                    }
                  </p>
                  <Button
                    onClick={() => generateSummaryMutation.mutate()}
                    disabled={generateSummaryMutation.isPending || (!drop.textNotes && !drop.voiceTranscript)}
                    className="min-h-touch"
                    data-testid="button-generate-summary"
                  >
                    {generateSummaryMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="p-4">
          <Collapsible open={isScoreOpen} onOpenChange={setIsScoreOpen}>
            <CollapsibleTrigger className="w-full" data-testid="button-toggle-score">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Lead Score
                  {leadScore && (
                    <Badge 
                      variant={leadScore.tier === "hot" ? "destructive" : "secondary"}
                      className={
                        leadScore.tier === "hot" ? "gap-1" :
                        leadScore.tier === "warm" ? "bg-amber-500 hover:bg-amber-600 gap-1" :
                        "bg-blue-500 hover:bg-blue-600 gap-1"
                      }
                      data-testid="badge-tier"
                    >
                      {leadScore.tier === "hot" && <Flame className="w-3 h-3" />}
                      {leadScore.tier === "warm" && <ThermometerSun className="w-3 h-3" />}
                      {leadScore.tier === "cold" && <Snowflake className="w-3 h-3" />}
                      {leadScore.tier.charAt(0).toUpperCase() + leadScore.tier.slice(1)}
                    </Badge>
                  )}
                </h3>
                {isScoreOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {isScoreLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : leadScore ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" data-testid="text-score-value">
                        Score: {leadScore.score}/100
                      </span>
                      {leadScore.predictedConversion && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(leadScore.predictedConversion * 100)}% conversion probability
                        </span>
                      )}
                    </div>
                    <Progress 
                      value={leadScore.score} 
                      className={
                        leadScore.tier === "hot" ? "[&>div]:bg-red-500" :
                        leadScore.tier === "warm" ? "[&>div]:bg-amber-500" :
                        "[&>div]:bg-blue-500"
                      }
                      data-testid="progress-score"
                    />
                  </div>

                  {leadScore.factors && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Scoring Factors</p>
                      <div className="flex flex-wrap gap-2" data-testid="list-factors">
                        {(JSON.parse(leadScore.factors) as string[]).map((factor, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Calculate an AI-powered lead score for this merchant
                  </p>
                  <Button
                    onClick={() => calculateScoreMutation.mutate()}
                    disabled={calculateScoreMutation.isPending}
                    className="min-h-touch"
                    data-testid="button-calculate-score"
                  >
                    {calculateScoreMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Calculate Lead Score
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {drop.textNotes && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              Notes
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-notes">
              {drop.textNotes}
            </p>
          </Card>
        )}

        {drop.outcomeNotes && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              Outcome Notes
            </h3>
            <p className="text-sm text-muted-foreground">{drop.outcomeNotes}</p>
          </Card>
        )}

        {drop.status === "pending" && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4" />
              Record Pickup Meeting
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Record your conversation during the pickup visit. The recording will be analyzed by AI and sent to the office for coaching review.
            </p>
            <DropMeetingRecorder drop={drop} />
          </Card>
        )}

        {drop.status === "pending" && (
          <Card className="p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" />
              Prep for Visit
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Practice your pitch with our AI role-play coach before visiting this business.
            </p>
            <RoleplayCoach
              dropId={drop.id}
              businessName={drop.businessName || undefined}
              businessType={drop.businessType || undefined}
            />
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Drafter
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailDrafter(!showEmailDrafter)}
              data-testid="button-toggle-email-drafter"
            >
              {showEmailDrafter ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {!showEmailDrafter ? (
            <div 
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
              onClick={() => setShowEmailDrafter(true)}
              data-testid="card-email-drafter-collapsed"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">AI Email Drafter</p>
                <p className="text-sm text-muted-foreground">
                  Polish your draft or generate professional emails
                </p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="polish" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="polish" className="min-h-touch gap-2" data-testid="tab-polish">
                  <Wand2 className="w-4 h-4" />
                  Polish Draft
                </TabsTrigger>
                <TabsTrigger value="generate" className="min-h-touch gap-2" data-testid="tab-generate">
                  <Sparkles className="w-4 h-4" />
                  Generate New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="polish" className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Draft Email</Label>
                  <Textarea
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="Write your email in your own words - AI will polish it professionally..."
                    rows={4}
                    data-testid="textarea-email-draft"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={emailTone} onValueChange={setEmailTone}>
                      <SelectTrigger data-testid="select-polish-tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Context (optional)</Label>
                    <Input
                      value={emailContext}
                      onChange={(e) => setEmailContext(e.target.value)}
                      placeholder="e.g., First meeting"
                      data-testid="input-email-context"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePolishEmail}
                  disabled={polishEmailMutation.isPending || !emailDraft.trim()}
                  className="w-full min-h-touch gap-2"
                  data-testid="button-polish-email"
                >
                  {polishEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Polishing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Polish Email
                    </>
                  )}
                </Button>

                {polishedEmail && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Polished Email
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePolishEmail}
                          disabled={polishEmailMutation.isPending}
                          data-testid="button-repolish"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await navigator.clipboard.writeText(polishedEmail);
                            setEmailCopied(true);
                            toast({ title: "Copied to clipboard!" });
                            setTimeout(() => setEmailCopied(false), 2000);
                          }}
                          data-testid="button-copy-polished"
                        >
                          {emailCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <Card className="p-3 bg-primary/5 border-primary/20">
                      <p className="text-sm whitespace-pre-wrap">{polishedEmail}</p>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="generate" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a professional email for {drop.businessName}
                  {drop.contactName && ` (${drop.contactName})`}
                </p>

                <div className="space-y-2">
                  <Label>Email Purpose</Label>
                  <Select value={emailPurpose} onValueChange={setEmailPurpose}>
                    <SelectTrigger data-testid="select-email-purpose">
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="follow-up">Follow-up after visit</SelectItem>
                      <SelectItem value="introduction">Introduction / First contact</SelectItem>
                      <SelectItem value="thank-you">Thank you message</SelectItem>
                      <SelectItem value="reminder">Reminder about our meeting</SelectItem>
                      <SelectItem value="proposal">Proposal / Offer</SelectItem>
                      <SelectItem value="appointment">Schedule appointment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={emailTone} onValueChange={setEmailTone}>
                      <SelectTrigger data-testid="select-email-tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Key Points</Label>
                    <Input
                      value={emailKeyPoints}
                      onChange={(e) => setEmailKeyPoints(e.target.value)}
                      placeholder="Important points..."
                      data-testid="input-email-key-points"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateEmail}
                  disabled={!emailPurpose || generateEmailMutation.isPending}
                  className="w-full min-h-touch gap-2"
                  data-testid="button-generate-email"
                >
                  {generateEmailMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Email
                    </>
                  )}
                </Button>

                {generatedEmail && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Generated Email
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateEmail}
                          disabled={generateEmailMutation.isPending}
                          data-testid="button-regenerate"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyEmailToClipboard}
                          data-testid="button-copy-email"
                        >
                          {emailCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <Card className="p-3 bg-primary/5 border-primary/20">
                      <p className="text-sm whitespace-pre-wrap">{generatedEmail}</p>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </main>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="container max-w-md mx-auto space-y-2">
          {drop.status === "pending" ? (
            <>
              <Button
                className="w-full min-h-touch-lg text-lg font-semibold"
                onClick={() => {
                  setSelectedOutcome(null);
                  setOutcomeNotes("");
                  setShowOutcomeDialog(true);
                }}
                data-testid="button-log-outcome"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Log Pickup Outcome
              </Button>
              {sequences && sequences.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full min-h-touch"
                  onClick={() => setShowSequenceDialog(true)}
                  data-testid="button-start-sequence"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Start Follow-up Sequence
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full min-h-touch-lg text-lg font-semibold"
              onClick={() => {
                setSelectedOutcome(drop.outcome as OutcomeType || null);
                setOutcomeNotes(drop.outcomeNotes || "");
                setShowOutcomeDialog(true);
              }}
              data-testid="button-update-outcome"
            >
              <Pencil className="w-5 h-5 mr-2" />
              Update Outcome
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showOutcomeDialog} onOpenChange={setShowOutcomeDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{drop.status === "pending" ? "Log Pickup Outcome" : "Update Outcome"}</DialogTitle>
            <DialogDescription>
              {drop.status === "pending" 
                ? "What happened when you followed up on this brochure?"
                : "Change the outcome for this drop, or reopen it to schedule another visit."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {outcomeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOutcome === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedOutcome(option.value)}
                  className={`w-full min-h-touch p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid={`outcome-${option.value}`}
                >
                  <Icon className={`w-5 h-5 ${option.color}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Any additional notes about this pickup..."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="resize-none"
              data-testid="textarea-outcome-notes"
            />
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 min-h-touch"
                onClick={() => setShowOutcomeDialog(false)}
                data-testid="button-cancel-outcome"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 min-h-touch"
                onClick={handleLogOutcome}
                disabled={!selectedOutcome || updateDropMutation.isPending}
                data-testid="button-confirm-outcome"
              >
                {updateDropMutation.isPending ? "Saving..." : "Confirm"}
              </Button>
            </div>
            {drop.status !== "pending" && (
              <Button
                variant="ghost"
                className="w-full min-h-touch text-muted-foreground"
                onClick={() => {
                  updateDropMutation.mutate({
                    status: "pending",
                    outcome: null,
                    outcomeNotes: null,
                  });
                }}
                disabled={updateDropMutation.isPending}
                data-testid="button-reopen-drop"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reopen Drop (Set Back to Pending)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Drop</DialogTitle>
            <DialogDescription>
              Update the details for this drop.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Business Name
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter business name" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-business-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-touch" data-testid="select-edit-business-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {businessTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Contact Name
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Person you spoke with" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-contact-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Business Phone
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-business-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Business address" 
                        className="min-h-touch"
                        {...field} 
                        data-testid="input-edit-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="textNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any notes about this drop..."
                        className="min-h-[100px] resize-none"
                        {...field} 
                        data-testid="textarea-edit-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Reschedule Follow-up
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="min-h-touch" data-testid="select-edit-follow-up">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Keep current date</SelectItem>
                        <SelectItem value="1">1 day from now</SelectItem>
                        <SelectItem value="2">2 days from now</SelectItem>
                        <SelectItem value="3">3 days from now</SelectItem>
                        <SelectItem value="4">4 days from now</SelectItem>
                        <SelectItem value="5">5 days from now</SelectItem>
                      </SelectContent>
                    </Select>
                    {parseInt(form.watch("followUpDays") || "0") > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        New pickup date:{" "}
                        <span className="font-medium text-foreground">
                          {format(
                            addDays(new Date(), parseInt(form.watch("followUpDays") || "0")),
                            "EEEE, MMM d"
                          )}
                        </span>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 min-h-touch"
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 min-h-touch"
                  disabled={editDropMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editDropMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Start Follow-up Sequence
            </DialogTitle>
            <DialogDescription>
              Choose an automated sequence to start for this drop.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            {sequences?.filter(s => s.isActive).map((sequence) => (
              <button
                key={sequence.id}
                onClick={() => startSequenceMutation.mutate(sequence.id)}
                disabled={startSequenceMutation.isPending}
                className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 text-left transition-colors hover-elevate"
                data-testid={`sequence-option-${sequence.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{sequence.name}</h4>
                    {sequence.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {sequence.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {(!sequences || sequences.filter(s => s.isActive).length === 0) && (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No active sequences available</p>
              </div>
            )}
          </div>

          {startSequenceMutation.isPending && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Starting sequence...</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSequenceDialog(false)}
              data-testid="button-cancel-sequence"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
