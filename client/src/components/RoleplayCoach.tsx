import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder, createAudioFilename } from "@/hooks/use-audio-recorder";
import { AudioCompatibilityBanner } from "@/components/AudioCompatibility";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageSquare,
  Mic,
  Volume2,
  Send,
  X,
  Play,
  Pause,
  Award,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";
import type { RoleplayScenario } from "@shared/schema";

interface RoleplayCoachProps {
  dropId?: number;
  dealId?: number;
  merchantId?: number;
  businessName?: string;
  businessType?: string;
  onClose?: () => void;
}

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
}

interface Persona {
  id: number;
  name: string;
  businessType: string | null;
  personality: string | null;
  difficultyLevel: string;
  isGeneral: boolean;
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

export function RoleplayCoach({ dropId, dealId, merchantId, businessName, businessType, onClose }: RoleplayCoachProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<SessionMode>("coaching");
  const [scenario, setScenario] = useState<RoleplayScenario>("cold_approach");
  const [customObjections, setCustomObjections] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice recording state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState<number | null>(null);
  
  // Merchant intelligence state
  const [isGeneratingIntelligence, setIsGeneratingIntelligence] = useState(false);
  const [hasIntelligence, setHasIntelligence] = useState(false);
  
  // Persona selection state
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);

  // Transcribe audio and send to session (defined before hook to use in callback)
  const transcribeAudioRef = useRef<((blob: Blob) => Promise<void>) | null>(null);

  // Audio recording with browser compatibility using the new hook
  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (transcribeAudioRef.current) {
      await transcribeAudioRef.current(blob);
    }
  }, []);

  const handleRecordingError = useCallback((error: Error) => {
    toast({
      title: "Recording failed",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const {
    isRecording,
    start: startAudioRecorder,
    stop: stopAudioRecorder,
    browserSupport,
    error: recorderError,
  } = useAudioRecorder({
    onStop: handleRecordingComplete,
    onError: handleRecordingError,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch personas for roleplay mode
  const { data: personasData, isLoading: isLoadingPersonas } = useQuery<{ personas: Persona[] }>({
    queryKey: ["/api/roleplay/personas"],
    enabled: mode === "roleplay" && isOpen,
  });

  // Sort personas: General personas first, then by difficulty
  const sortedPersonas = personasData?.personas ? [...personasData.personas].sort((a, b) => {
    if (a.isGeneral !== b.isGeneral) return a.isGeneral ? -1 : 1;
    const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
    return (difficultyOrder[a.difficultyLevel as keyof typeof difficultyOrder] || 0) - 
           (difficultyOrder[b.difficultyLevel as keyof typeof difficultyOrder] || 0);
  }) : [];

  // Generate merchant intelligence before starting session
  const generateIntelligenceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/merchant-intelligence/generate", {
        dealId,
        merchantId,
        dropId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.status === 'cached' || data.status === 'processing') {
        setHasIntelligence(true);
      }
    },
    onError: () => {
      // Continue without intelligence - it's optional
      console.log('Intelligence generation failed, continuing without context');
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/sessions", {
        dropId,
        dealId,
        merchantId,
        scenario,
        mode,
        customObjections: customObjections.trim() || undefined,
        personaId: mode === "roleplay" && selectedPersonaId ? selectedPersonaId : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([]);
      setHasIntelligence(data.hasIntelligence || false);
      toast({
        title: mode === "coaching" ? "Coaching session started" : "Role-play started",
        description: mode === "coaching" 
          ? "Ask me anything about sales techniques or what to say!"
          : data.hasIntelligence 
            ? "Begin your approach! Using merchant intelligence for realistic practice..."
            : "Begin your approach! The prospect is waiting...",
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
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-play AI response after receiving it (only once per message)
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
    
    if (!browserSupport.isFullySupported) {
      toast({
        title: "Recording not supported",
        description: `Your browser (${browserSupport.browserName}) has limited audio recording support. ${browserSupport.limitations.join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    
    await startAudioRecorder();
  };

  const stopRecording = () => {
    if (isRecording) {
      stopAudioRecorder();
    }
  };

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      const filename = createAudioFilename("roleplay_recording", audioBlob.type);
      formData.append("audio", audioBlob, filename);
      
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Transcription error:", errorData);
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
  }, [toast, sendMessageMutation]);

  // Update the ref with the latest transcribeAudio function
  useEffect(() => {
    transcribeAudioRef.current = transcribeAudio;
  }, [transcribeAudio]);

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

  const handleClose = () => {
    if (sessionId && !showFeedback) {
      endSessionMutation.mutate();
    } else {
      setIsOpen(false);
      setSessionId(null);
      setMessages([]);
      setFeedback(null);
      setShowFeedback(false);
      setIsGeneratingIntelligence(false);
      setHasIntelligence(false);
      onClose?.();
    }
  };
  
  // Start session with intelligence generation
  const handleStartSession = async () => {
    // Only generate intelligence if we have a deal, merchant, or drop
    if (dealId || merchantId || dropId) {
      setIsGeneratingIntelligence(true);
      try {
        await generateIntelligenceMutation.mutateAsync();
      } catch (error) {
        // Continue without intelligence
      }
      setIsGeneratingIntelligence(false);
    }
    
    // Start the actual session
    startSessionMutation.mutate();
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setFeedback(null);
    setShowFeedback(false);
    setSelectedPersonaId(null);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full"
        data-testid="button-roleplay-coach"
      >
        <Users className="w-4 h-4 mr-2" />
        Practice Role-Play
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Sales Role-Play Coach
                  {hasIntelligence && sessionId && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      Context-Aware
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {businessName ? `Practice for: ${businessName}` : "Practice your sales skills with AI"}
                  {hasIntelligence && sessionId && (
                    <span className="block text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Using merchant website and transcript intelligence
                    </span>
                  )}
                </DialogDescription>
              </div>
              {sessionId && !showFeedback && (
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
                    "End & Get Feedback"
                  )}
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {!sessionId ? (
              <div className="p-4 space-y-4 overflow-auto pb-24">
                <div>
                  <label className="text-sm font-medium mb-2 block">What would you like to do?</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setMode("coaching")}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
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
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
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
                        className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
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

                {scenario === "objection_handling" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Custom Objections (optional)
                    </label>
                    <Textarea
                      placeholder="Enter specific objections you want to practice, e.g., 'I'm happy with my current processor' or 'Your fees are too high'"
                      value={customObjections}
                      onChange={(e) => setCustomObjections(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-custom-objections"
                    />
                  </div>
                )}

                {mode === "roleplay" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Prospect Persona (optional)
                    </label>
                    <Select
                      value={selectedPersonaId?.toString() || "default"}
                      onValueChange={(value) => setSelectedPersonaId(value === "default" ? null : parseInt(value))}
                    >
                      <SelectTrigger data-testid="select-persona">
                        <SelectValue placeholder={isLoadingPersonas ? "Loading personas..." : "Select a persona..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use default (scenario-based)</SelectItem>
                        {sortedPersonas.map((persona) => (
                          <SelectItem key={persona.id} value={persona.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{persona.name}</span>
                              {persona.isGeneral && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  General
                                </Badge>
                              )}
                              <Badge 
                                variant={
                                  persona.difficultyLevel === "hard" ? "destructive" :
                                  persona.difficultyLevel === "medium" ? "default" : "secondary"
                                }
                                className="text-xs px-1 py-0"
                              >
                                {persona.difficultyLevel}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a specific business owner type for realistic practice. The "General" persona covers all industries.
                    </p>
                  </div>
                )}

                {businessName && (
                  <Card className="p-3 bg-muted/50">
                    <p className="text-sm">
                      <span className="font-medium">Context:</span> You're about to visit{" "}
                      <span className="font-semibold">{businessName}</span>
                      {businessType && ` (${businessType})`}. 
                      {mode === "coaching" 
                        ? " The AI coach will give advice tailored to this type of business."
                        : " The AI will role-play as this business owner based on typical challenges for their industry."}
                    </p>
                  </Card>
                )}

                <AudioCompatibilityBanner 
                  support={browserSupport} 
                  showOnlyIfIssues={true}
                  compact={true}
                />

                <Button
                  className="w-full"
                  onClick={handleStartSession}
                  disabled={startSessionMutation.isPending || isGeneratingIntelligence}
                  data-testid="button-start-roleplay"
                >
                  {isGeneratingIntelligence ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gathering merchant intelligence...
                    </>
                  ) : startSessionMutation.isPending ? (
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
            ) : showFeedback && feedback ? (
              <div className="p-4 space-y-4 overflow-auto pb-24">
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
                </div>

                <div className="grid gap-4">
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <Card className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">Strengths</span>
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
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-amber-700">Areas to Improve</span>
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
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <span className="font-medium">Top Tip</span>
                      </div>
                      <p className="text-sm">{feedback.topTip}</p>
                    </Card>
                  )}

                  {feedback.nepqUsage && (
                    <Card className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-700">NEPQ Technique Usage</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.nepqUsage}</p>
                    </Card>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    Close
                  </Button>
                  <Button className="flex-1" onClick={handleNewSession} data-testid="button-new-session">
                    Practice Again
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-4 space-y-3">
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

                <div className="p-4 border-t space-y-2">
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
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!inputMessage.trim() || sendMessageMutation.isPending || isRecording || isTranscribing}
                        data-testid="button-send"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <audio ref={audioRef} onEnded={handleAudioEnded} playsInline preload="auto" className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
