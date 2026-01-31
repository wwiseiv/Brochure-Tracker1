import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessTypeIcon, businessTypeLabels } from "@/components/BusinessTypeIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  FileText,
  ChevronRight,
  Navigation,
  Edit2,
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarPlus,
  RefreshCw,
  Mic,
  Play,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Check,
  Square,
  Wand2,
  FileSignature,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { MeetingRecorder } from "@/components/MeetingRecorder";
import type { Merchant, DropWithBrochure, BusinessType, OutcomeType, DropStatus, MeetingRecording, VoiceNote } from "@shared/schema";

const outcomeIcons: Record<OutcomeType, typeof CheckCircle2> = {
  signed: CheckCircle2,
  interested_appointment: CalendarPlus,
  interested_later: RefreshCw,
  not_interested: XCircle,
  closed: AlertCircle,
  not_found: AlertCircle,
};

const outcomeLabels: Record<OutcomeType, string> = {
  signed: "Signed",
  interested_appointment: "Appointment Set",
  interested_later: "Follow Up Later",
  not_interested: "Not Interested",
  closed: "Business Closed",
  not_found: "Not Found",
};

const outcomeColors: Record<OutcomeType, string> = {
  signed: "text-emerald-600",
  interested_appointment: "text-blue-600",
  interested_later: "text-amber-600",
  not_interested: "text-gray-600",
  closed: "text-red-600",
  not_found: "text-gray-600",
};

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

function VisitCard({ drop }: { drop: DropWithBrochure }) {
  const OutcomeIcon = drop.outcome ? outcomeIcons[drop.outcome as OutcomeType] : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={drop.status as DropStatus} />
            {drop.outcome && OutcomeIcon && (
              <span className={`flex items-center gap-1 text-xs ${outcomeColors[drop.outcome as OutcomeType]}`}>
                <OutcomeIcon className="w-3 h-3" />
                {outcomeLabels[drop.outcome as OutcomeType]}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(drop.droppedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
          {drop.textNotes && (
            <p className="text-sm mt-2 line-clamp-2">{drop.textNotes}</p>
          )}
        </div>
        <a href={`/drops/${drop.id}`}>
          <Button variant="ghost" size="icon" data-testid={`button-view-drop-${drop.id}`}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </a>
      </div>
    </Card>
  );
}

export default function MerchantDetailPage() {
  const [, params] = useRoute("/merchants/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  const merchantId = params?.id;

  const { data: merchant, isLoading: merchantLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchants", merchantId],
    enabled: !!merchantId,
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<DropWithBrochure[]>({
    queryKey: ["/api/merchants", merchantId, "drops"],
    enabled: !!merchantId,
  });

  const { data: recordings, isLoading: recordingsLoading } = useQuery<MeetingRecording[]>({
    queryKey: ["/api/merchants", merchantId, "recordings"],
    enabled: !!merchantId,
  });

  const { data: voiceNotes, isLoading: voiceNotesLoading } = useQuery<VoiceNote[]>({
    queryKey: ["/api/merchants", merchantId, "voice-notes"],
    enabled: !!merchantId,
  });

  // Fetch proposals and analyses for this merchant
  const { data: merchantWork, isLoading: workLoading } = useQuery<{
    proposals: Array<{ id: number; merchantName: string; status: string; pdfUrl?: string | null; docxUrl?: string | null; createdAt: string }>;
    analyses: Array<{ id: number; processorName?: string | null; extractedData?: { merchantName?: string; totalVolume?: number } | null; createdAt: string }>;
  }>({
    queryKey: ["/api/merchants", merchantId, "work"],
    enabled: !!merchantId,
  });

  const [expandedRecording, setExpandedRecording] = useState<number | null>(null);
  
  // Voice recording for notes
  const [isRecordingNotes, setIsRecordingNotes] = useState(false);
  const [isTranscribingNotes, setIsTranscribingNotes] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const [copiedVoiceNoteId, setCopiedVoiceNoteId] = useState<number | null>(null);

  // Email drafter state
  const [showEmailDrafter, setShowEmailDrafter] = useState(false);
  const [emailPurpose, setEmailPurpose] = useState("");
  const [emailTone, setEmailTone] = useState("professional");
  const [emailKeyPoints, setEmailKeyPoints] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  // Polish email state
  const [emailDraft, setEmailDraft] = useState("");
  const [polishedEmail, setPolishedEmail] = useState("");
  const [emailContext, setEmailContext] = useState("");

  const updateMerchantMutation = useMutation({
    mutationFn: async (data: Partial<Merchant>) => {
      const response = await apiRequest("PATCH", `/api/merchants/${merchantId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId] });
      setShowNotesDialog(false);
      toast({
        title: "Notes updated",
        description: "Merchant notes have been saved.",
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

  const generateEmailMutation = useMutation({
    mutationFn: async (data: { businessName: string; contactName: string; purpose: string; keyPoints: string; tone: string; businessType?: string; agentNotes?: string }) => {
      const res = await apiRequest("POST", "/api/email/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedEmail(data.email);
      toast({
        title: "Email generated!",
        description: "Your email has been created. Tap to copy.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate email",
        variant: "destructive",
      });
    },
  });

  const polishEmailMutation = useMutation({
    mutationFn: async (data: { draft: string; tone: string; context: string }) => {
      const res = await apiRequest("POST", "/api/email/polish", data);
      return res.json();
    },
    onSuccess: (data) => {
      setPolishedEmail(data.polishedEmail);
      toast({
        title: "Email polished!",
        description: "Your email has been professionally refined.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to polish email",
        variant: "destructive",
      });
    },
  });

  const saveVoiceNoteMutation = useMutation({
    mutationFn: async (data: { transcription: string; durationSeconds?: number }) => {
      const res = await apiRequest("POST", `/api/merchants/${merchantId}/voice-notes`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId, "voice-notes"] });
    },
    onError: (error) => {
      console.error("Failed to save voice note:", error);
    },
  });

  const handlePolishEmail = () => {
    if (!emailDraft.trim()) {
      toast({
        title: "Draft required",
        description: "Please write a draft email first.",
        variant: "destructive",
      });
      return;
    }
    polishEmailMutation.mutate({ draft: emailDraft, tone: emailTone, context: emailContext });
  };

  const handleGenerateEmail = () => {
    if (!merchant || !emailPurpose) {
      toast({
        title: "Missing information",
        description: "Please select an email purpose.",
        variant: "destructive",
      });
      return;
    }
    generateEmailMutation.mutate({
      businessName: merchant.businessName,
      contactName: merchant.contactName || "",
      purpose: emailPurpose,
      keyPoints: emailKeyPoints,
      tone: emailTone,
      businessType: merchant.businessType || undefined,
      agentNotes: merchant.notes || undefined,
    });
  };

  const copyEmailToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedEmail);
      setEmailCopied(true);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please select and copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenNotesDialog = () => {
    setEditedNotes(merchant?.notes || "");
    setShowNotesDialog(true);
  };

  const handleSaveNotes = () => {
    updateMerchantMutation.mutate({ notes: editedNotes });
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
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const durationSeconds = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || "audio/webm" 
        });
        await transcribeNotesAudio(audioBlob, durationSeconds);
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

  const transcribeNotesAudio = async (audioBlob: Blob, durationSeconds?: number) => {
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
        setEditedNotes(prev => prev ? `${prev}\n\n${data.text}` : data.text);
        
        // Save transcription to voice notes history
        saveVoiceNoteMutation.mutate({
          transcription: data.text,
          durationSeconds,
        });
        
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

  const handleCall = () => {
    if (merchant?.businessPhone) {
      window.location.href = `tel:${merchant.businessPhone}`;
    }
  };

  const handleDirections = () => {
    if (merchant?.latitude && merchant?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${merchant.latitude},${merchant.longitude}`,
        "_blank"
      );
    } else if (merchant?.address) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(merchant.address)}`,
        "_blank"
      );
    }
  };

  const leadScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const conversionRate = merchant && merchant.totalDrops && merchant.totalDrops > 0
    ? Math.round(((merchant.totalConversions || 0) / merchant.totalDrops) * 100)
    : 0;

  if (merchantLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/merchants")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Merchant Details</span>
          </div>
        </header>
        <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
          <DetailSkeleton />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/merchants")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Merchant Not Found</span>
          </div>
        </header>
        <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-12 text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Merchant not found</h2>
          <p className="text-muted-foreground mb-6">
            This merchant may have been removed or doesn't exist.
          </p>
          <Button 
            className="min-h-touch" 
            onClick={() => navigate("/merchants")}
            data-testid="button-go-to-merchants"
          >
            Go to Merchants
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/merchants")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold truncate flex-1">{merchant.businessName}</span>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BusinessTypeIcon 
              type={merchant.businessType as BusinessType || "other"} 
              className="w-8 h-8 text-primary" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{merchant.businessName}</h1>
              {merchant.status === "converted" ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Converted
                </Badge>
              ) : merchant.status === "lost" ? (
                <Badge variant="outline" className="text-muted-foreground">
                  Lost
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  Prospect
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {merchant.businessType
                ? businessTypeLabels[merchant.businessType as BusinessType]
                : "Business"}
            </p>
            {merchant.contactName && (
              <p className="text-sm text-muted-foreground mt-1">
                Contact: {merchant.contactName}
              </p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{merchant.totalDrops || 0}</div>
            <div className="text-xs text-muted-foreground">Total Drops</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {merchant.totalConversions || 0}
            </div>
            <div className="text-xs text-muted-foreground">Conversions</div>
          </Card>
          <Card className="p-3 text-center">
            <div className={`text-2xl font-bold ${leadScoreColor(merchant.leadScore)}`}>
              {merchant.leadScore ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground">Lead Score</div>
          </Card>
        </div>

        {conversionRate > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-medium">Conversion Rate</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(conversionRate, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {conversionRate}% ({merchant.totalConversions || 0} of {merchant.totalDrops || 0})
            </p>
          </Card>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Contact Info</h2>
          <Card className="divide-y divide-border">
            {merchant.businessPhone && (
              <div className="flex items-center gap-3 p-4">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{merchant.businessPhone}</p>
                  <p className="text-sm text-muted-foreground">Phone</p>
                </div>
              </div>
            )}
            {merchant.email && (
              <div className="flex items-center gap-3 p-4">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium truncate">{merchant.email}</p>
                  <p className="text-sm text-muted-foreground">Email</p>
                </div>
              </div>
            )}
            {merchant.address && (
              <div className="flex items-center gap-3 p-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{merchant.address}</p>
                  <p className="text-sm text-muted-foreground">Address</p>
                </div>
              </div>
            )}
            {merchant.lastVisitAt && (
              <div className="flex items-center gap-3 p-4">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">
                    {format(new Date(merchant.lastVisitAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last Visit ({formatDistanceToNow(new Date(merchant.lastVisitAt), { addSuffix: true })})
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Notes</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleOpenNotesDialog}
              data-testid="button-edit-notes"
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <Card className="p-4">
            {merchant.notes ? (
              <p className="text-sm whitespace-pre-wrap">{merchant.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No notes yet. Tap Edit to add notes about this merchant.
              </p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Voice Note History</h2>
          {voiceNotesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : voiceNotes && voiceNotes.length > 0 ? (
            <div className="space-y-2">
              {voiceNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className="p-3"
                  data-testid={`card-voice-note-${note.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Mic className="w-3 h-3 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          {note.durationSeconds && ` • ${Math.floor(note.durationSeconds / 60)}:${(note.durationSeconds % 60).toString().padStart(2, '0')}`}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.transcription}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(note.transcription);
                        setCopiedVoiceNoteId(note.id);
                        toast({ title: "Copied to clipboard!" });
                        setTimeout(() => setCopiedVoiceNoteId(null), 2000);
                      }}
                      data-testid={`button-copy-voice-note-${note.id}`}
                    >
                      {copiedVoiceNoteId === note.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground italic text-center">
                No voice notes yet. Use "Dictate Notes" to record and transcribe voice notes.
              </p>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Record Meeting</h2>
          <MeetingRecorder merchant={merchant} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Email Drafter</h2>
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
            <Card 
              className="p-4 hover-elevate cursor-pointer"
              onClick={() => setShowEmailDrafter(true)}
              data-testid="card-email-drafter-collapsed"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">AI Email Drafter</p>
                  <p className="text-sm text-muted-foreground">
                    Polish your draft or generate professional emails for {merchant.businessName}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
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
                      {merchant.email && (
                        <Button
                          variant="outline"
                          className="w-full min-h-touch gap-2"
                          onClick={() => {
                            window.location.href = `mailto:${merchant.email}?body=${encodeURIComponent(polishedEmail)}`;
                          }}
                          data-testid="button-send-polished"
                        >
                          <Mail className="w-4 h-4" />
                          Open in Email App
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="generate" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a professional email for {merchant.businessName}
                    {merchant.contactName && ` (${merchant.contactName})`}
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
                      {merchant.email && (
                        <Button
                          variant="outline"
                          className="w-full min-h-touch gap-2"
                          onClick={() => {
                            window.location.href = `mailto:${merchant.email}?body=${encodeURIComponent(generatedEmail)}`;
                          }}
                          data-testid="button-send-email"
                        >
                          <Mail className="w-4 h-4" />
                          Open in Email App
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">E-Sign Documents</h2>
          <Card 
            className="p-4 hover-elevate cursor-pointer" 
            data-testid="card-esign-for-merchant"
            onClick={() => navigate(`/esign?merchantId=${merchantId}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileSignature className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Send Documents for E-Signature</p>
                <p className="text-sm text-muted-foreground">
                  Merchant applications, equipment agreements, and compliance forms
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Past Recordings</h2>
          {recordingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : recordings && recordings.length > 0 ? (
            <div className="space-y-3">
              {recordings.map((recording) => {
                const isExpanded = expandedRecording === recording.id;
                const durationMin = recording.durationSeconds 
                  ? Math.floor(recording.durationSeconds / 60) 
                  : 0;
                const durationSec = recording.durationSeconds 
                  ? recording.durationSeconds % 60 
                  : 0;
                const durationFormatted = `${durationMin}:${durationSec.toString().padStart(2, "0")}`;
                
                const sentimentColor = recording.sentiment === "positive" 
                  ? "text-emerald-600" 
                  : recording.sentiment === "negative" 
                    ? "text-red-600" 
                    : "text-muted-foreground";

                const isCompleted = recording.status === "completed";
                const isProcessing = recording.status === "processing";
                const isFailed = recording.status === "failed";

                return (
                  <Card key={recording.id} className="overflow-visible" data-testid={`card-recording-${recording.id}`}>
                    <button
                      className="w-full p-4 text-left hover-elevate active-elevate-2"
                      onClick={() => setExpandedRecording(isExpanded ? null : recording.id)}
                      data-testid={`button-toggle-recording-${recording.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isProcessing ? "bg-amber-100 dark:bg-amber-900/30" :
                          isFailed ? "bg-red-100 dark:bg-red-900/30" :
                          "bg-purple-100 dark:bg-purple-900/30"
                        }`}>
                          {isProcessing ? (
                            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                          ) : (
                            <Mic className={`w-5 h-5 ${isFailed ? "text-red-600" : "text-purple-600"}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm flex items-center gap-2">
                            {format(new Date(recording.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {isProcessing && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Processing
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                Failed
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{durationFormatted}</span>
                            {recording.sentiment && isCompleted && (
                              <span className={sentimentColor}>
                                {recording.sentiment.charAt(0).toUpperCase() + recording.sentiment.slice(1)}
                              </span>
                            )}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        {recording.aiSummary && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">AI Summary</h4>
                            <p className="text-sm text-muted-foreground">{recording.aiSummary}</p>
                          </div>
                        )}
                        
                        {recording.keyTakeaways && recording.keyTakeaways.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Key Takeaways</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {recording.keyTakeaways.map((takeaway, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{takeaway}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {recording.recordingUrl && (
                          <div className="flex gap-2">
                            <a
                              href={recording.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <Button 
                                variant="outline" 
                                className="w-full gap-2 min-h-touch"
                                data-testid={`button-listen-recording-${recording.id}`}
                              >
                                <Play className="w-4 h-4" />
                                Listen
                              </Button>
                            </a>
                            <a
                              href={`/api/meeting-recordings/${recording.id}/download`}
                              className="flex-1"
                            >
                              <Button 
                                variant="outline" 
                                className="w-full gap-2 min-h-touch"
                                data-testid={`button-download-recording-${recording.id}`}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Mic className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No recordings yet. Tap "Record Meeting" above to start.
              </p>
            </Card>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Proposals & Analyses</h2>
          {workLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : merchantWork && (merchantWork.proposals.length > 0 || merchantWork.analyses.length > 0) ? (
            <div className="space-y-3">
              {merchantWork.proposals.map((proposal) => (
                <Card key={`proposal-${proposal.id}`} className="p-4" data-testid={`card-proposal-${proposal.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileSignature className="w-4 h-4 text-primary" />
                        <span className="font-medium">Proposal</span>
                        <Badge variant={proposal.status === 'generated' ? 'default' : 'secondary'}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {proposal.pdfUrl && (
                        <a href={proposal.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" data-testid={`button-view-proposal-pdf-${proposal.id}`}>
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </a>
                      )}
                      {proposal.docxUrl && (
                        <a href={proposal.docxUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" data-testid={`button-view-proposal-word-${proposal.id}`}>
                            <FileText className="w-4 h-4 mr-1" />
                            Word
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {merchantWork.analyses.map((analysis) => (
                <Card key={`analysis-${analysis.id}`} className="p-4" data-testid={`card-analysis-${analysis.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Statement Analysis</span>
                        {analysis.processorName && (
                          <Badge variant="outline">{analysis.processorName}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(analysis.createdAt), "MMM d, yyyy")}
                        {analysis.extractedData?.totalVolume && (
                          <span className="ml-2">
                            • Volume: ${analysis.extractedData.totalVolume.toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <a href={`/statement-analyzer?id=${analysis.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-view-analysis-${analysis.id}`}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <FileSignature className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No proposals or analyses linked to this merchant yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Create proposals and analyses in the Coach section, then link them here.
              </p>
            </Card>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Visit History</h2>
          {visitsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : visits && visits.length > 0 ? (
            <div className="space-y-3">
              {visits.map((visit) => (
                <VisitCard key={visit.id} drop={visit} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No visit history for this merchant yet.
              </p>
            </Card>
          )}
        </section>
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-4 z-40 safe-area-inset-bottom">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 min-h-touch gap-2"
            onClick={handleCall}
            disabled={!merchant.businessPhone}
            data-testid="button-call-merchant"
          >
            <Phone className="w-4 h-4" />
            Call
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-h-touch gap-2"
            onClick={handleDirections}
            disabled={!merchant.address && !merchant.latitude}
            data-testid="button-get-directions"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </Button>
        </div>
      </div>

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={isRecordingNotes ? "destructive" : "outline"}
                size="sm"
                onClick={isRecordingNotes ? stopRecordingNotes : startRecordingNotes}
                disabled={isTranscribingNotes}
                className="gap-2"
                data-testid="button-record-notes"
              >
                {isTranscribingNotes ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transcribing...
                  </>
                ) : isRecordingNotes ? (
                  <>
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Dictate Notes
                  </>
                )}
              </Button>
              {isRecordingNotes && (
                <span className="text-sm text-red-600 animate-pulse">Recording...</span>
              )}
            </div>
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder="Add notes about this merchant..."
              rows={6}
              data-testid="textarea-merchant-notes"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
              className="min-h-touch"
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateMerchantMutation.isPending || isRecordingNotes || isTranscribingNotes}
              className="min-h-touch gap-2"
              data-testid="button-save-notes"
            >
              {updateMerchantMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
