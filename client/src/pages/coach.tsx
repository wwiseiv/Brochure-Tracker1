import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { HamburgerMenu } from "@/components/BottomNav";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare,
  Mic,
  Volume2,
  Send,
  Play,
  Pause,
  Award,
  Target,
  Lightbulb,
  CheckCircle,
  Loader2,
  Users,
  ArrowLeft,
  Trash2,
  ChevronDown,
  Calendar,
  History,
  X,
  Flame,
  Quote,
  Sparkles,
  ChevronUp,
  GraduationCap,
  ChevronRight,
  FileSignature,
  FileText,
  Cpu,
} from "lucide-react";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RoleplayScenario, RoleplaySession, UserPermissions } from "@shared/schema";
import { format } from "date-fns";
import { ListenButton } from "@/components/ListenButton";
import { AdviceExportToolbar } from "@/components/AdviceExportToolbar";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
}

interface SessionFeedback {
  overallScore: number;
  strengths: string[];
  areasToImprove: string[];
  nepqUsage: string;
  objectionHandling: string;
  rapportBuilding: string;
  topTip: string;
  psychographicAdaptation?: string;
  emotionalDriversUsed?: string[];
  tonalEffectiveness?: string;
  correctiveScript?: string;
  analysis?: {
    psychographicType: string;
    psychographicConfidence: number;
    linguisticMarkers: string[];
    driversUsed: string[];
    driverEffectiveness: number;
    missedOpportunities: string[];
    tonePattern: string[];
    tonalAppropriateness: number;
    tonalSuggestions: string[];
  };
}

interface Persona {
  id: number;
  name: string;
  businessType: string | null;
  personality: string | null;
  difficultyLevel: string;
  isGeneral: boolean;
}

interface SessionWithMessages extends RoleplaySession {
  messages?: { id: number; role: string; content: string }[];
}

interface DailyEdgeContent {
  id: number;
  belief: string;
  contentType: string;
  content: string;
  source?: string;
  dayOfCycle: number;
}

interface DailyEdgeToday {
  todaysBelief: string;
  content: {
    quote?: DailyEdgeContent;
    insight?: DailyEdgeContent;
    challenge?: DailyEdgeContent;
    iconic_story?: DailyEdgeContent;
    journey_motivator?: DailyEdgeContent;
  };
}

interface DailyEdgeProgress {
  totalViewed: number;
  challengesCompleted: number;
  streak: {
    current: number;
    longest: number;
  };
  beliefs: {
    belief: string;
    totalContent: number;
    viewedContent: number;
    completedChallenges: number;
  }[];
}

const BELIEF_COLORS: Record<string, string> = {
  fulfilment: "#7C5CFC",
  control: "#10B981",
  resilience: "#F59E0B",
  influence: "#EC4899",
  communication: "#3B82F6",
};

const BELIEF_LABELS: Record<string, string> = {
  fulfilment: "Fulfilment",
  control: "Control",
  resilience: "Resilience",
  influence: "Influence",
  communication: "Communication",
};

function CircularProgress({ 
  progress, 
  size = 60, 
  strokeWidth = 6,
  color = "#7C5CFC",
  label
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-muted stroke-current"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-xs text-muted-foreground text-center max-w-[60px] truncate">
        {label}
      </span>
      <span className="text-xs font-medium">{Math.round(progress)}%</span>
    </div>
  );
}

interface DailyEdgeChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

function DailyEdgeSection() {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<DailyEdgeChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isDailyEdgeRecording, setIsDailyEdgeRecording] = useState(false);
  const [isDailyEdgeTranscribing, setIsDailyEdgeTranscribing] = useState(false);
  const dailyEdgeMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dailyEdgeAudioChunksRef = useRef<Blob[]>([]);
  
  const { data: todayData, isLoading: todayLoading } = useQuery<DailyEdgeToday>({
    queryKey: ["/api/daily-edge/today"],
  });
  
  const { data: progressData, isLoading: progressLoading } = useQuery<DailyEdgeProgress>({
    queryKey: ["/api/daily-edge/progress"],
  });
  
  const { data: myPermissions } = useQuery<UserPermissions>({
    queryKey: ["/api/me/permissions"],
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);
  
  const handleOpenChat = () => {
    // Add initial greeting if first time opening
    if (chatMessages.length === 0 && todayData?.content) {
      const beliefLabel = BELIEF_LABELS[todayData.todaysBelief] || todayData.todaysBelief;
      setChatMessages([{
        id: 1,
        role: "assistant",
        content: `Today we're focused on **${beliefLabel}** — one of the 5 Destination Beliefs that distinguish top sales performers.\n\n${todayData.content.quote ? `I love today's quote: "${todayData.content.quote.content}"\n\n` : ""}What's on your mind? You can ask me to explain today's content more deeply, share how it applies to real sales situations, or discuss any challenges you're facing.`
      }]);
    }
    setIsChatOpen(true);
  };
  
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending || !todayData) return;
    
    const userMessage: DailyEdgeChatMessage = {
      id: Date.now(),
      role: "user",
      content: chatInput.trim()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsSending(true);
    
    try {
      const response = await apiRequest("POST", "/api/daily-edge/chat", {
        messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content })),
        todaysBelief: todayData.todaysBelief,
        todaysContent: {
          quote: todayData.content.quote ? { content: todayData.content.quote.content, source: todayData.content.quote.source } : null,
          insight: todayData.content.insight ? { content: todayData.content.insight.content } : null,
          challenge: todayData.content.challenge ? { content: todayData.content.challenge.content } : null
        }
      });
      
      const data = await response.json();
      
      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response
      }]);
    } catch (error) {
      toast({
        title: "Failed to get response",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const startDailyEdgeRecording = async () => {
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
      dailyEdgeMediaRecorderRef.current = mediaRecorder;
      dailyEdgeAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          dailyEdgeAudioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        const audioBlob = new Blob(dailyEdgeAudioChunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeDailyEdgeAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsDailyEdgeRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  };

  const stopDailyEdgeRecording = () => {
    if (dailyEdgeMediaRecorderRef.current && isDailyEdgeRecording) {
      dailyEdgeMediaRecorderRef.current.stop();
      setIsDailyEdgeRecording(false);
    }
  };

  const transcribeDailyEdgeAudio = async (audioBlob: Blob) => {
    setIsDailyEdgeTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Transcription failed");
      
      const data = await response.json();
      if (data.text) {
        setChatInput(data.text);
      } else {
        toast({
          title: "No speech detected",
          description: "Please try speaking again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: "Please try again or type your message",
        variant: "destructive",
      });
    } finally {
      setIsDailyEdgeTranscribing(false);
    }
  };
  
  const viewContentMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const res = await apiRequest("POST", "/api/daily-edge/view", { contentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-edge/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark as viewed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const completeChallengemutation = useMutation({
    mutationFn: async (contentId: number) => {
      const res = await apiRequest("POST", "/api/daily-edge/challenge-complete", { contentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-edge/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-edge/today"] });
      toast({
        title: "Challenge completed!",
        description: "Great job! Keep up the momentum.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleMarkViewed = (content: DailyEdgeContent | undefined) => {
    if (content && !viewContentMutation.isPending) {
      viewContentMutation.mutate(content.id);
    }
  };
  
  const handleCompleteChallenge = (content: DailyEdgeContent | undefined) => {
    if (content && !completeChallengemutation.isPending) {
      completeChallengemutation.mutate(content.id);
    }
  };
  
  if (todayLoading || progressLoading) {
    return (
      <Card className="m-4">
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }
  
  if (!todayData?.content) {
    return null;
  }
  
  const { quote, insight, challenge } = todayData.content;
  const beliefColor = BELIEF_COLORS[todayData.todaysBelief] || "#7C5CFC";
  const beliefLabel = BELIEF_LABELS[todayData.todaysBelief] || todayData.todaysBelief;
  
  return (
    <div className="mx-4 mt-4 mb-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="overflow-hidden border-2" style={{ borderColor: beliefColor + "40" }}>
          <CollapsibleTrigger asChild>
            <button
              className="w-full p-4 text-left flex items-center justify-between"
              data-testid="daily-edge-toggle"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: beliefColor + "20" }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: beliefColor }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Daily Edge</h3>
                  <p className="text-xs text-muted-foreground">
                    Today's Focus: {beliefLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {progressData?.streak && progressData.streak.current > 0 && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Flame className="w-4 h-4" />
                    <span className="text-sm font-medium">{progressData.streak.current}</span>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4 border-t pt-4">
              {quote && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: beliefColor + "10" }}
                  onClick={() => handleMarkViewed(quote)}
                  data-testid="daily-edge-quote"
                >
                  <div className="flex items-start gap-2">
                    <Quote className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: beliefColor }} />
                    <div>
                      <p className="text-sm italic">"{quote.content}"</p>
                      {quote.source && (
                        <p className="text-xs text-muted-foreground mt-1">— {quote.source}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {insight && (
                <div 
                  className="p-3 rounded-lg bg-muted"
                  onClick={() => handleMarkViewed(insight)}
                  data-testid="daily-edge-insight"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <div>
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Research Insight</p>
                      <p className="text-sm">{insight.content}</p>
                      {insight.source && (
                        <p className="text-xs text-muted-foreground mt-1">Source: {insight.source}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {challenge && (
                <div 
                  className="p-3 rounded-lg border-2"
                  style={{ borderColor: beliefColor + "40" }}
                  data-testid="daily-edge-challenge"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="daily-challenge"
                      className="mt-0.5"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleCompleteChallenge(challenge);
                        }
                      }}
                      disabled={completeChallengemutation.isPending}
                      data-testid="checkbox-complete-challenge"
                    />
                    <div className="flex-1">
                      <label htmlFor="daily-challenge" className="text-xs font-medium flex items-center gap-1" style={{ color: beliefColor }}>
                        <Target className="w-3 h-3" />
                        Today's Challenge
                      </label>
                      <p className="text-sm mt-1">{challenge.content}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {progressData?.beliefs && progressData.beliefs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Your Belief Progress</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-between sm:overflow-visible">
                    {progressData.beliefs.map((bp) => {
                      const progress = bp.totalContent > 0 
                        ? (bp.viewedContent / bp.totalContent) * 100 
                        : 0;
                      return (
                        <CircularProgress
                          key={bp.belief}
                          progress={progress}
                          color={BELIEF_COLORS[bp.belief] || "#7C5CFC"}
                          label={BELIEF_LABELS[bp.belief] || bp.belief}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {progressData && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {progressData.totalViewed} viewed
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {progressData.challengesCompleted} challenges
                    </span>
                  </div>
                  {progressData.streak && progressData.streak.longest > 0 && (
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" />
                      Best: {progressData.streak.longest} days
                    </span>
                  )}
                </div>
              )}
              
              <Button
                onClick={handleOpenChat}
                className="w-full mt-3"
                variant="outline"
                style={{ borderColor: beliefColor + "60", color: beliefColor }}
                data-testid="button-discuss-daily-edge"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Discuss This with AI Coach
              </Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div 
            className="flex items-center justify-between p-4 border-b"
            style={{ backgroundColor: beliefColor + "10" }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: beliefColor + "20" }}
              >
                <Sparkles className="w-5 h-5" style={{ color: beliefColor }} />
              </div>
              <div>
                <h2 className="font-semibold">Daily Edge Coach</h2>
                <p className="text-xs text-muted-foreground">
                  Discussing: {BELIEF_LABELS[todayData.todaysBelief] || todayData.todaysBelief}
                </p>
              </div>
            </div>
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                  data-testid="button-close-daily-edge-chat"
                >
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close chat</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
          
          <div className="border-t p-4 backdrop-blur-sm bg-background/80">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isDailyEdgeRecording ? "Listening..." : isDailyEdgeTranscribing ? "Transcribing..." : "Ask about today's content, how to apply it, or share a challenge..."}
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isDailyEdgeRecording || isDailyEdgeTranscribing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                data-testid="input-daily-edge-chat"
              />
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={isDailyEdgeRecording ? "destructive" : "outline"}
                    onClick={isDailyEdgeRecording ? stopDailyEdgeRecording : startDailyEdgeRecording}
                    disabled={isSending || isDailyEdgeTranscribing}
                    className={`h-11 w-11 flex-shrink-0 ${isDailyEdgeRecording ? "animate-pulse" : ""}`}
                    data-testid="button-mic-daily-edge"
                  >
                    {isDailyEdgeTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isDailyEdgeRecording ? "Stop recording" : "Record voice message"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={700}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isSending || isDailyEdgeRecording || isDailyEdgeTranscribing}
                    size="icon"
                    className="h-11 w-11 flex-shrink-0"
                    data-testid="button-send-daily-edge"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionHistoryCard({ 
  session, 
  isExpanded, 
  onToggle, 
  onDelete,
  isDeleting,
  getScenarioLabel,
  parseFeedback
}: { 
  session: RoleplaySession; 
  isExpanded: boolean; 
  onToggle: (expanded: boolean) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  getScenarioLabel: (value: string) => string;
  parseFeedback: (feedbackStr: string | null) => SessionFeedback | null;
}) {
  const { data: sessionDetails } = useQuery<SessionWithMessages>({
    queryKey: ['/api/roleplay/sessions', session.id],
    enabled: isExpanded,
  });

  const sessionFeedback = parseFeedback(session.feedback);
  const sessionMessages = sessionDetails?.messages || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            className="w-full p-3 text-left flex items-center gap-3 min-h-[72px]"
            data-testid={`session-card-${session.id}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant={session.mode === "coaching" ? "secondary" : "default"}>
                  {session.mode === "coaching" ? "Coaching" : "Roleplay"}
                </Badge>
                <Badge variant="outline">
                  {getScenarioLabel(session.scenario)}
                </Badge>
                {session.performanceScore && (
                  <Badge variant="outline" className="bg-primary/10">
                    Score: {session.performanceScore}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(session.createdAt), "MMM d, yyyy h:mm a")}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 border-t pt-3 space-y-3">
            {sessionMessages.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                <div className="text-xs font-medium text-muted-foreground">Conversation:</div>
                {sessionMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-2 rounded-lg text-xs ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sessionFeedback && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Session Feedback:</span>
                  <AdviceExportToolbar
                    content={[
                      // Conversation Transcript
                      sessionMessages.length > 0 ? `CONVERSATION TRANSCRIPT\n${"=".repeat(50)}\n${sessionMessages.map(msg => 
                        msg.role === "user" 
                          ? `Agent: ${msg.content}` 
                          : `Prospect: ${msg.content}`
                      ).join("\n\n")}\n\n` : "",
                      // Feedback Section
                      `${"=".repeat(50)}\nPERFORMANCE FEEDBACK\n${"=".repeat(50)}\n`,
                      `Overall Score: ${sessionFeedback.overallScore}/100`,
                      sessionFeedback.strengths?.length ? `\nStrengths:\n${sessionFeedback.strengths.map(s => `• ${s}`).join("\n")}` : "",
                      sessionFeedback.areasToImprove?.length ? `\nAreas to Improve:\n${sessionFeedback.areasToImprove.map(a => `• ${a}`).join("\n")}` : "",
                      sessionFeedback.topTip ? `\nTop Tip:\n${sessionFeedback.topTip}` : "",
                      sessionFeedback.nepqUsage ? `\nNEPQ Technique Usage:\n${sessionFeedback.nepqUsage}` : ""
                    ].filter(Boolean).join("\n")}
                    title="Role-Play Session Feedback"
                    subtitle={`Score: ${sessionFeedback.overallScore}/100 - ${format(new Date(session.createdAt), "MMM d, yyyy")}`}
                    variant="dropdown"
                  />
                </div>
                {sessionFeedback.topTip && (
                  <div className="text-sm">
                    <span className="font-medium">Top Tip:</span>{" "}
                    <span className="text-muted-foreground">{sessionFeedback.topTip}</span>
                  </div>
                )}
                {sessionFeedback.strengths && sessionFeedback.strengths.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-green-600">Strengths:</span>{" "}
                    <span className="text-muted-foreground">{sessionFeedback.strengths.join(", ")}</span>
                  </div>
                )}
              </div>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full h-11"
                  data-testid={`button-delete-session-${session.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this coaching/roleplay session and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(session.id)}
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

const scenarioOptions: { value: RoleplayScenario; label: string; description: string }[] = [
  { 
    value: "cold_approach", 
    label: "Cold Approach", 
    description: "Practice your initial approach to a business owner who's never heard of you" 
  },
  { 
    value: "objection_handling", 
    label: "Objection Handling", 
    description: "Handle common objections like 'I need to think about it' or 'Too expensive'" 
  },
  { 
    value: "closing", 
    label: "Closing", 
    description: "Practice closing techniques with a warm prospect who's almost ready" 
  },
  { 
    value: "follow_up", 
    label: "Follow-up Visit", 
    description: "Re-engage a prospect you met last week who said they'd 'think about it'" 
  },
  { 
    value: "general_practice", 
    label: "General Practice", 
    description: "Free-form practice with a realistic business owner" 
  },
];

type SessionMode = "roleplay" | "coaching";
type DifficultyLevel = "beginner" | "intermediate" | "advanced";

const difficultyOptions: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: "beginner", label: "Beginner", description: "Easier prospect, more forgiving" },
  { value: "intermediate", label: "Intermediate", description: "Balanced challenge" },
  { value: "advanced", label: "Advanced", description: "Tough prospect, realistic challenges" },
];

export default function CoachPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("new");
  const [mode, setMode] = useState<SessionMode>("coaching");
  const [scenario, setScenario] = useState<RoleplayScenario>("cold_approach");
  const [customObjections, setCustomObjections] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("intermediate");
  const [coachingHint, setCoachingHint] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isObjectionsRecording, setIsObjectionsRecording] = useState(false);
  const [isObjectionsTranscribing, setIsObjectionsTranscribing] = useState(false);
  const objectionsMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const objectionsAudioChunksRef = useRef<Blob[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  const { data: myPermissions } = useQuery<UserPermissions>({
    queryKey: ["/api/me/permissions"],
  });

  // Fetch personas for roleplay mode
  const { data: personasData, isLoading: isLoadingPersonas } = useQuery<{ personas: Persona[] }>({
    queryKey: ["/api/roleplay/personas"],
    enabled: mode === "roleplay",
  });

  // Sort personas: General personas first, then by difficulty
  const sortedPersonas = personasData?.personas ? [...personasData.personas].sort((a, b) => {
    if (a.isGeneral !== b.isGeneral) return a.isGeneral ? -1 : 1;
    const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
    return (difficultyOrder[a.difficultyLevel] || 0) - (difficultyOrder[b.difficultyLevel] || 0);
  }) : [];

  const handleBack = () => {
    navigate("/");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<RoleplaySession[]>({
    queryKey: ["/api/roleplay/sessions"],
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/sessions", {
        scenario,
        mode,
        customObjections: customObjections.trim() || undefined,
        difficulty: mode === "roleplay" ? difficulty : undefined,
        personaId: mode === "roleplay" && selectedPersonaId ? selectedPersonaId : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([]);
      setCoachingHint(null);
      toast({
        title: mode === "coaching" ? "Coaching session started" : "Role-play started",
        description: mode === "coaching" 
          ? "Ask me anything about sales techniques or what to say!"
          : `Begin your approach! (${difficulty} difficulty)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/roleplay/sessions/${sessionId}/message`, {
        message,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const newMessage: Message = {
        id: data.messageId,
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, newMessage]);
      // Display coaching hint if available
      if (data.coachingHint) {
        setCoachingHint(data.coachingHint);
      } else {
        setCoachingHint(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const speakMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", `/api/roleplay/sessions/${sessionId}/speak`, {
        text,
      });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.audio && audioRef.current) {
        try {
          const audioSrc = `data:${data.format};base64,${data.audio}`;
          audioRef.current.src = audioSrc;
          setIsPlaying(true);
          await audioRef.current.play();
        } catch (playError) {
          console.error("Audio play failed:", playError);
          setIsPlaying(false);
          toast({
            title: "Audio playback blocked",
            description: "Tap the Listen button to hear the response",
            variant: "default",
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error("Speak mutation error:", error);
      toast({
        title: "Failed to generate speech",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/roleplay/sessions/${sessionId}/end`);
      return res.json();
    },
    onSuccess: (data) => {
      setFeedback(data.feedback);
      setShowFeedback(true);
      queryClient.invalidateQueries({ queryKey: ["/api/roleplay/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/roleplay/sessions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Session deleted",
        description: "The session has been removed from your history",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roleplay/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAllSessionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/roleplay/sessions");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "History cleared",
        description: `${data.deletedCount} session(s) have been deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/roleplay/sessions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear history",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (autoPlayVoice && sessionId && messages.length > 0 && !isPlaying && !speakMutation.isPending) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && lastMessage.id !== lastSpokenMessageId) {
        setLastSpokenMessageId(lastMessage.id);
        speakMutation.mutate(lastMessage.content);
      }
    }
  }, [messages, autoPlayVoice, sessionId, isPlaying, lastSpokenMessageId]);

  const startRecording = async () => {
    if (!sessionId) {
      toast({
        title: "Start a session first",
        description: "Please start a coaching or role-play session before using voice input",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best supported audio format
      // Priority: webm (Chrome/Firefox) > mp4 (Safari) > default (let browser decide)
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        options.mimeType = "audio/aac";
      }
      // If no mimeType set, MediaRecorder will use browser default
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          await transcribeAudio(audioBlob);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      // Determine extension based on blob MIME type
      let ext = "m4a"; // Default to m4a which works well with Whisper
      const blobType = audioBlob.type.toLowerCase();
      if (blobType.includes("webm")) {
        ext = "webm";
      } else if (blobType.includes("mp4") || blobType.includes("aac") || blobType.includes("m4a")) {
        ext = "m4a";
      } else if (blobType.includes("mpeg") || blobType.includes("mp3")) {
        ext = "mp3";
      } else if (blobType.includes("wav")) {
        ext = "wav";
      } else if (blobType.includes("ogg")) {
        ext = "ogg";
      }
      formData.append("audio", audioBlob, `recording.${ext}`);
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcription failed");
      }
      
      const data = await response.json();
      if (data.text && data.text.trim()) {
        const userMessage: Message = {
          id: Date.now(),
          role: "user",
          content: data.text.trim(),
        };
        setMessages((prev) => [...prev, userMessage]);
        sendMessageMutation.mutate(data.text.trim());
      } else {
        toast({
          title: "No speech detected",
          description: "Please try speaking again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: "Could not transcribe your audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startObjectionsRecording = async () => {
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
      objectionsMediaRecorderRef.current = mediaRecorder;
      objectionsAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          objectionsAudioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        const audioBlob = new Blob(objectionsAudioChunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeObjectionsAudio(audioBlob);
      };
      
      mediaRecorder.start();
      setIsObjectionsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  };

  const stopObjectionsRecording = () => {
    if (objectionsMediaRecorderRef.current && isObjectionsRecording) {
      objectionsMediaRecorderRef.current.stop();
      setIsObjectionsRecording(false);
    }
  };

  const transcribeObjectionsAudio = async (audioBlob: Blob) => {
    setIsObjectionsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Transcription failed");
      
      const data = await response.json();
      if (data.text) {
        setCustomObjections(prev => prev ? `${prev}\n${data.text}` : data.text);
      } else {
        toast({
          title: "No speech detected",
          description: "Please try speaking again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: "Please try again or type your objections",
        variant: "destructive",
      });
    } finally {
      setIsObjectionsTranscribing(false);
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputMessage.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    sendMessageMutation.mutate(inputMessage.trim());
    setInputMessage("");
  };

  const handleSpeak = (text: string) => {
    if (!sessionId) return;
    speakMutation.mutate(text);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setFeedback(null);
    setShowFeedback(false);
    setLastSpokenMessageId(null);
  };

  const getScenarioLabel = (value: string) => {
    return scenarioOptions.find(s => s.value === value)?.label || value;
  };

  const parseFeedback = (feedbackStr: string | null): SessionFeedback | null => {
    if (!feedbackStr) return null;
    try {
      return JSON.parse(feedbackStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <HamburgerMenu />
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Sales Coach
            </h1>
          </div>
          {sessionId && !showFeedback && (
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => endSessionMutation.mutate()}
                  disabled={endSessionMutation.isPending}
                  data-testid="button-end-session"
                >
                  {endSessionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "End Session"
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>End coaching session</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <div className="max-w-4xl mx-auto">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="new" data-testid="tab-new-session">
                <Play className="w-4 h-4 mr-2" />
                New Session
              </TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="new" className="flex-1 flex flex-col m-0">
          {!sessionId ? (
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto">
                <DailyEdgeSection />
              <div className="p-4 space-y-3">
              {/* Presentation Training Link */}
              <Link href="/presentation-training" className="block">
                <Card className="p-4 hover-elevate cursor-pointer border-primary/30 bg-primary/5" data-testid="card-presentation-training">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Teach Me the Presentation</div>
                        <div className="text-sm text-muted-foreground">Master the PCBancard Dual Pricing presentation</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>

              {/* Proposal Generator Link - only show if user has permission */}
              {myPermissions?.canAccessProposals !== false && (
                <Link href="/proposal-generator" className="block">
                  <Card className="p-4 hover-elevate cursor-pointer border-primary/30 bg-primary/5" data-testid="card-proposal-generator">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">Proposal Generator</div>
                          <div className="text-sm text-muted-foreground">Create professional sales proposals</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              )}

              {/* Statement Analyzer Link - only show if user has permission */}
              {myPermissions?.canAccessProposals !== false && (
                <Link href="/statement-analyzer" className="block">
                  <Card className="p-4 hover-elevate cursor-pointer border-primary/30 bg-primary/5" data-testid="card-statement-analyzer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">Statement Analyzer</div>
                          <div className="text-sm text-muted-foreground">Analyze fees & generate talking points</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              )}

              {/* EquipIQ Link - only show if user has permission */}
              {myPermissions?.canAccessEquipIQ !== false && (
                <Link href="/equipiq" className="block">
                  <Card className="p-4 hover-elevate cursor-pointer border-primary/30 bg-primary/5" data-testid="card-equipiq">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Cpu className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">EquipIQ</div>
                          <div className="text-sm text-muted-foreground">AI equipment advisor with 63+ products</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              )}

              {/* 2026 Sales Process Guide */}
              <Link href="/sales-process" className="block">
                <Card className="p-4 hover-elevate cursor-pointer border-green-500/30 bg-green-500/5" data-testid="card-sales-process">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold">2026 Sales Process</div>
                        <div className="text-sm text-muted-foreground">Prospecting to Close - Scripts & Objections</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>

              <div>
                <label className="text-sm font-medium mb-2 block">What would you like to do?</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setMode("coaching")}
                    className={`p-3 rounded-lg border-2 text-left transition-colors min-h-[88px] ${
                      mode === "coaching"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="mode-coaching"
                  >
                    <div className="font-medium flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Get Coaching
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Ask questions, get advice on what to say
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("roleplay")}
                    className={`p-3 rounded-lg border-2 text-left transition-colors min-h-[88px] ${
                      mode === "roleplay"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    data-testid="mode-roleplay"
                  >
                    <div className="font-medium flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Practice Role-Play
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Practice on a simulated business owner
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {mode === "coaching" ? "What topic do you want coaching on?" : "Select Scenario"}
                </label>
                <div className="space-y-2">
                  {scenarioOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setScenario(option.value)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors min-h-[64px] ${
                        scenario === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`scenario-${option.value}`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {mode === "roleplay" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {difficultyOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDifficulty(option.value)}
                        className={`p-2 rounded-lg border-2 text-center transition-colors ${
                          difficulty === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`difficulty-${option.value}`}
                      >
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "roleplay" && sortedPersonas.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Practice Persona (Optional)
                  </label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose a specific business owner persona to practice with, or leave unselected for a random persona.
                  </p>
                  {isLoadingPersonas ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => setSelectedPersonaId(null)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                          selectedPersonaId === null
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid="persona-random"
                      >
                        <div className="font-medium text-sm">Random Persona</div>
                        <div className="text-xs text-muted-foreground">AI will generate a persona based on the scenario</div>
                      </button>
                      {sortedPersonas.map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => setSelectedPersonaId(persona.id)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                            selectedPersonaId === persona.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid={`persona-${persona.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{persona.name}</div>
                            <Badge variant={
                              persona.difficultyLevel === "easy" ? "outline" :
                              persona.difficultyLevel === "hard" ? "destructive" : "secondary"
                            } className="text-xs">
                              {persona.difficultyLevel}
                            </Badge>
                          </div>
                          {persona.businessType && (
                            <div className="text-xs text-muted-foreground mt-1 capitalize">
                              {persona.businessType} business
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {scenario === "objection_handling" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Custom Objections (optional)
                  </label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={isObjectionsRecording ? "Listening..." : isObjectionsTranscribing ? "Transcribing..." : "Enter specific objections you want to practice, e.g., 'I'm happy with my current processor' or 'Your fees are too high'"}
                      value={customObjections}
                      onChange={(e) => setCustomObjections(e.target.value)}
                      className="min-h-[80px] flex-1"
                      disabled={isObjectionsRecording || isObjectionsTranscribing}
                      data-testid="input-custom-objections"
                    />
                    <Button
                      size="icon"
                      variant={isObjectionsRecording ? "destructive" : "outline"}
                      onClick={isObjectionsRecording ? stopObjectionsRecording : startObjectionsRecording}
                      disabled={isObjectionsTranscribing}
                      className={`h-11 w-11 flex-shrink-0 self-start ${isObjectionsRecording ? "animate-pulse" : ""}`}
                      data-testid="button-mic-objections"
                    >
                      {isObjectionsTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                className="w-full h-12"
                onClick={() => startSessionMutation.mutate()}
                disabled={startSessionMutation.isPending}
                data-testid="button-start-session"
              >
                {startSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    {mode === "coaching" ? (
                      <>
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Start Coaching Session
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Role-Play
                      </>
                    )}
                  </>
                )}
              </Button>
              </div>
            </div>
            </div>
          ) : showFeedback && feedback ? (
            <div className="p-4 space-y-4 overflow-auto flex-1 max-w-4xl mx-auto w-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-1">Session Complete!</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-3xl font-bold">{feedback.overallScore}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Progress value={feedback.overallScore} className="h-3 mb-4" />
                <AdviceExportToolbar
                  content={[
                    // Conversation Transcript
                    messages.length > 0 ? `CONVERSATION TRANSCRIPT\n${"=".repeat(50)}\n${messages.map(msg => 
                      msg.role === "user" 
                        ? `Agent: ${msg.content}` 
                        : `Prospect: ${msg.content}`
                    ).join("\n\n")}\n\n` : "",
                    // Feedback Section
                    `${"=".repeat(50)}\nPERFORMANCE FEEDBACK\n${"=".repeat(50)}\n`,
                    `Overall Score: ${feedback.overallScore}/100`,
                    feedback.strengths?.length ? `\nStrengths:\n${feedback.strengths.map(s => `• ${s}`).join("\n")}` : "",
                    feedback.areasToImprove?.length ? `\nAreas to Improve:\n${feedback.areasToImprove.map(a => `• ${a}`).join("\n")}` : "",
                    feedback.topTip ? `\nTop Tip:\n${feedback.topTip}` : "",
                    feedback.nepqUsage ? `\nNEPQ Technique Usage:\n${feedback.nepqUsage}` : "",
                    feedback.objectionHandling ? `\nObjection Handling:\n${feedback.objectionHandling}` : "",
                    feedback.rapportBuilding ? `\nRapport Building:\n${feedback.rapportBuilding}` : ""
                  ].filter(Boolean).join("\n")}
                  title="Role-Play Session Feedback"
                  subtitle={`Score: ${feedback.overallScore}/100`}
                  variant="inline"
                  className="justify-center mt-2"
                />
              </div>

              <div className="grid gap-4">
                {feedback.strengths && feedback.strengths.length > 0 && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">Strengths</span>
                      </div>
                      <ListenButton text={feedback.strengths.join(". ")} size="sm" data-testid="listen-feedback-strengths" />
                    </div>
                    <ul className="text-sm space-y-1">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {feedback.areasToImprove && feedback.areasToImprove.length > 0 && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-amber-700">Areas to Improve</span>
                      </div>
                      <ListenButton text={feedback.areasToImprove.join(". ")} size="sm" data-testid="listen-feedback-improve" />
                    </div>
                    <ul className="text-sm space-y-1">
                      {feedback.areasToImprove.map((a, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-600">•</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {feedback.topTip && (
                  <Card className="p-3 bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="font-medium">Top Tip</span>
                      </div>
                      <ListenButton text={feedback.topTip} size="sm" data-testid="listen-feedback-tip" />
                    </div>
                    <p className="text-sm">{feedback.topTip}</p>
                  </Card>
                )}

                {feedback.nepqUsage && (
                  <Card className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-700">NEPQ Technique Usage</span>
                      </div>
                      <ListenButton text={feedback.nepqUsage} size="sm" data-testid="listen-feedback-nepq" />
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.nepqUsage}</p>
                  </Card>
                )}

                {/* Enhanced Analysis: Psychographic Adaptation */}
                {feedback.psychographicAdaptation && (
                  <Card className="p-3 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-700 dark:text-purple-400">Psychographic Adaptation</span>
                      {feedback.analysis?.psychographicType && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {feedback.analysis.psychographicType} ({Math.round(feedback.analysis.psychographicConfidence > 1 ? feedback.analysis.psychographicConfidence : feedback.analysis.psychographicConfidence * 100)}%)
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.psychographicAdaptation}</p>
                    {feedback.analysis?.linguisticMarkers && feedback.analysis.linguisticMarkers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {feedback.analysis.linguisticMarkers.map((marker, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{marker}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* Enhanced Analysis: Emotional Drivers */}
                {feedback.emotionalDriversUsed && feedback.emotionalDriversUsed.length > 0 && (
                  <Card className="p-3 border-rose-200 dark:border-rose-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span className="font-medium text-rose-700 dark:text-rose-400">Emotional Drivers Used</span>
                      {feedback.analysis?.driverEffectiveness !== undefined && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {Math.round(feedback.analysis.driverEffectiveness > 1 ? feedback.analysis.driverEffectiveness : feedback.analysis.driverEffectiveness * 100)}% effective
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {feedback.emotionalDriversUsed.map((driver, i) => (
                        <Badge key={i} variant="secondary" className="text-xs capitalize">{driver}</Badge>
                      ))}
                    </div>
                    {feedback.analysis?.missedOpportunities && feedback.analysis.missedOpportunities.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-amber-600 mb-1">Missed Opportunities:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {feedback.analysis.missedOpportunities.map((opp, i) => (
                            <li key={i}>• {opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}

                {/* Enhanced Analysis: Tonal Effectiveness */}
                {feedback.tonalEffectiveness && (
                  <Card className="p-3 border-teal-200 dark:border-teal-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-teal-700 dark:text-teal-400">Tonal Effectiveness</span>
                      {feedback.analysis?.tonalAppropriateness !== undefined && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {Math.round(feedback.analysis.tonalAppropriateness > 1 ? feedback.analysis.tonalAppropriateness : feedback.analysis.tonalAppropriateness * 100)}% appropriate
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{feedback.tonalEffectiveness}</p>
                    {feedback.analysis?.tonePattern && feedback.analysis.tonePattern.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {feedback.analysis.tonePattern.map((tone, i) => (
                          <Badge key={i} variant="secondary" className="text-xs capitalize">{tone}</Badge>
                        ))}
                      </div>
                    )}
                    {feedback.analysis?.tonalSuggestions && feedback.analysis.tonalSuggestions.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs font-medium text-teal-600 mb-1">Suggestions:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {feedback.analysis.tonalSuggestions.map((sug, i) => (
                            <li key={i}>• {sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                )}

                {/* Corrective Script */}
                {feedback.correctiveScript && (
                  <Card className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium text-indigo-700 dark:text-indigo-400">Try This Instead</span>
                    </div>
                    <p className="text-sm italic text-indigo-800 dark:text-indigo-200">"{feedback.correctiveScript}"</p>
                  </Card>
                )}
              </div>

              <Button className="w-full h-12" onClick={handleNewSession} data-testid="button-new-session">
                Practice Again
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-4">
                <div className="max-w-4xl mx-auto space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {mode === "coaching" ? (
                      <>
                        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Ask me anything!</p>
                        <p className="text-sm mt-1">
                          Examples: "What should I say when I walk in?" or "How do I handle the 'too expensive' objection?"
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Start the conversation!</p>
                        <p className="text-sm mt-1">
                          Imagine you just walked into this business...
                        </p>
                      </>
                    )}
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.role === "assistant" && (
                        <Tooltip delayDuration={700}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => handleSpeak(msg.content)}
                              disabled={speakMutation.isPending || isPlaying}
                              data-testid="button-speak"
                            >
                              {speakMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : isPlaying ? (
                                <Pause className="w-3 h-3 mr-1" />
                              ) : (
                                <Volume2 className="w-3 h-3 mr-1" />
                              )}
                              {isPlaying ? "Playing..." : "Listen"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Listen to response</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Coaching Hint Display */}
              {coachingHint && mode === "roleplay" && (
                <div className="px-4 pb-2">
                  <div className="max-w-4xl mx-auto p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-0.5">Coach's Tip</div>
                        <p className="text-sm text-amber-800 dark:text-amber-200">{coachingHint}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-auto -mt-1 -mr-1"
                        onClick={() => setCoachingHint(null)}
                        data-testid="button-dismiss-hint"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="max-w-4xl mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tap mic to speak, or type below</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span>Auto-play voice</span>
                    <Switch
                      checked={autoPlayVoice}
                      onCheckedChange={setAutoPlayVoice}
                      data-testid="switch-autoplay"
                    />
                  </label>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Textarea
                      placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : mode === "coaching" ? "Ask a question or describe a situation..." : "Type your response..."}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      maxLength={4950}
                      className="min-h-[60px] resize-none"
                      disabled={isRecording || isTranscribing}
                      data-testid="input-message"
                    />
                    <div className={`text-xs text-right ${inputMessage.length > 4800 ? "text-destructive" : "text-muted-foreground"}`}>
                      {inputMessage.length.toLocaleString()} / 4,950
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Tooltip delayDuration={700}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={isRecording ? "destructive" : "outline"}
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isTranscribing || sendMessageMutation.isPending}
                          data-testid="button-mic"
                          className={isRecording ? "animate-pulse" : ""}
                        >
                          {isTranscribing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRecording ? "Stop recording" : "Start voice recording"}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip delayDuration={700}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          onClick={handleSend}
                          disabled={!inputMessage.trim() || sendMessageMutation.isPending || isRecording || isTranscribing}
                          data-testid="button-send"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send message</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 flex flex-col m-0">
          <div className="p-4 flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No session history yet</p>
                <p className="text-sm mt-1">Start a coaching or roleplay session to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionHistoryCard
                    key={session.id}
                    session={session}
                    isExpanded={expandedSessionId === session.id}
                    onToggle={(open) => setExpandedSessionId(open ? session.id : null)}
                    onDelete={(id) => deleteSessionMutation.mutate(id)}
                    isDeleting={deleteSessionMutation.isPending}
                    getScenarioLabel={getScenarioLabel}
                    parseFeedback={parseFeedback}
                  />
                ))}
              </div>
            )}
            </div>
          </div>
          
          {sessions.length > 0 && (
            <div className="p-4 border-t max-w-4xl mx-auto w-full">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-destructive"
                    disabled={deleteAllSessionsMutation.isPending}
                    data-testid="button-clear-all-history"
                  >
                    {deleteAllSessionsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {sessions.length} coaching and roleplay sessions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-clear-all">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAllSessionsMutation.mutate()}
                      data-testid="button-confirm-clear-all"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        onError={() => setIsPlaying(false)}
        playsInline 
        preload="auto" 
        className="hidden" 
      />
    </div>
  );
}
