import { useState, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
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

export function RoleplayCoach({ dropId, businessName, businessType, onClose }: RoleplayCoachProps) {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/roleplay/sessions", {
        dropId,
        scenario,
        mode,
        customObjections: customObjections.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([]);
      toast({
        title: mode === "coaching" ? "Coaching session started" : "Role-play started",
        description: mode === "coaching" 
          ? "Ask me anything about sales techniques or what to say!"
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
    onSuccess: (data) => {
      if (data.audio) {
        const audioSrc = `data:${data.format};base64,${data.audio}`;
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    },
    onError: (error: Error) => {
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
      onClose?.();
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setFeedback(null);
    setShowFeedback(false);
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
                </DialogTitle>
                <DialogDescription>
                  {businessName ? `Practice for: ${businessName}` : "Practice your sales skills with AI"}
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
              <div className="p-4 space-y-4 overflow-auto">
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

                <Button
                  className="w-full"
                  onClick={() => startSessionMutation.mutate()}
                  disabled={startSessionMutation.isPending}
                  data-testid="button-start-roleplay"
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
            ) : showFeedback && feedback ? (
              <div className="p-4 space-y-4 overflow-auto">
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

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={mode === "coaching" ? "Ask a question or describe a situation..." : "Type your response..."}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="min-h-[60px] resize-none"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                      className="self-end"
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}
