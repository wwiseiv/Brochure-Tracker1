import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDictation } from "@/hooks/use-dictation";
import { apiRequest } from "@/lib/queryClient";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Play,
  RotateCcw,
  ChevronRight,
  Target,
  MessageSquare,
  Users,
  Handshake,
  Calendar,
  FileText,
  CheckCircle,
  Loader2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

interface Message {
  id: number;
  role: "user" | "merchant";
  content: string;
}

interface StageInfo {
  id: number;
  name: string;
  title: string;
  goal: string;
  objectives: string[];
  icon: React.ReactNode;
}

const STAGES: StageInfo[] = [
  {
    id: 1,
    name: "Prospect",
    title: "Prospect for the Appointment",
    goal: "Get the appointment scheduled and gather statements",
    objectives: [
      "Drop in with Dual Pricing Flyer or Video Brochure",
      "Use the drop-in-the-door pitch",
      "Set appointment for 15-minute presentation",
      "Enroll prospect in 3-part email series"
    ],
    icon: <Target className="w-5 h-5" />
  },
  {
    id: 2,
    name: "Discovery",
    title: "Discovery & Presentation",
    goal: "Understand merchant needs and collect processing statement",
    objectives: [
      "Ask discovery questions",
      "Walk through Pitch Book and Dual Pricing program",
      "Collect one-month processing statement",
      "Set appointment to return with proposal"
    ],
    icon: <Users className="w-5 h-5" />
  },
  {
    id: 3,
    name: "Close",
    title: "Close & Follow-up",
    goal: "Present savings and close the deal",
    objectives: [
      "Walk through custom proposal showing savings",
      "Compare Traditional, Surcharging, and Dual Pricing",
      "Collect required documents",
      "Complete e-signature application"
    ],
    icon: <Handshake className="w-5 h-5" />
  }
];

export function InteractiveSalesRoleplay() {
  const { toast } = useToast();
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [autoPlayTTS, setAutoPlayTTS] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [lastSpokenMsgId, setLastSpokenMsgId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdCounter = useRef(0);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: dictationSupported,
    error: dictationError,
    clearTranscript
  } = useDictation({
    continuous: true,
    appendToExisting: true,
    onTranscript: (text) => setInputText(text)
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlayingAudio(false);
    audioRef.current.onerror = () => setIsPlayingAudio(false);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, stageId }: { message: string; stageId: number }) => {
      const res = await apiRequest("POST", "/api/sales-roleplay/message", {
        message,
        stageId,
        conversationHistory: messages.map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content
        }))
      });
      return res.json();
    },
    onSuccess: (data) => {
      const newMsg: Message = {
        id: ++messageIdCounter.current,
        role: "merchant",
        content: data.response
      };
      setMessages(prev => [...prev, newMsg]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to get response",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const speakMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tts", { text });
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.audio && audioRef.current) {
        try {
          const audioSrc = `data:${data.format};base64,${data.audio}`;
          audioRef.current.src = audioSrc;
          setIsPlayingAudio(true);
          await audioRef.current.play();
        } catch (playError) {
          console.error("Audio play failed:", playError);
          setIsPlayingAudio(false);
        }
      }
    }
  });

  useEffect(() => {
    if (autoPlayTTS && messages.length > 0 && !isPlayingAudio && !speakMutation.isPending) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "merchant" && lastMsg.id !== lastSpokenMsgId) {
        setLastSpokenMsgId(lastMsg.id);
        speakMutation.mutate(lastMsg.content);
      }
    }
  }, [messages, autoPlayTTS, isPlayingAudio, lastSpokenMsgId]);

  const handleStartStage = (stageId: number) => {
    setSelectedStage(stageId);
    setSessionActive(true);
    setMessages([]);
    messageIdCounter.current = 0;
    setLastSpokenMsgId(null);

    const stage = STAGES.find(s => s.id === stageId);
    const merchantGreeting = getMerchantGreeting(stageId);
    
    const greeting: Message = {
      id: ++messageIdCounter.current,
      role: "merchant",
      content: merchantGreeting
    };
    setMessages([greeting]);
    
    toast({
      title: `${stage?.name} Stage Started`,
      description: "Practice your approach. The merchant is waiting..."
    });
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedStage) return;

    const userMsg: Message = {
      id: ++messageIdCounter.current,
      role: "user",
      content: inputText.trim()
    };
    setMessages(prev => [...prev, userMsg]);
    
    sendMessageMutation.mutate({ 
      message: inputText.trim(), 
      stageId: selectedStage 
    });
    
    setInputText("");
    clearTranscript();
  };

  const handleToggleDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(inputText);
    }
  };

  const handleResetSession = () => {
    setSessionActive(false);
    setSelectedStage(null);
    setMessages([]);
    setInputText("");
    clearTranscript();
    setLastSpokenMsgId(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(false);
  };

  const handlePlayMessage = (text: string) => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      speakMutation.mutate(text);
    }
  };

  if (!sessionActive) {
    return (
      <Card className="p-4" data-testid="interactive-roleplay-stage-selector">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Interactive Sales Practice</h2>
            <p className="text-sm text-muted-foreground">
              Practice each stage with an AI merchant - speak your responses out loud
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-4 text-sm">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">How this helps you</p>
              <p className="text-blue-600 dark:text-blue-400 mt-1">
                Practice formulating your words in real-time. Listen to the AI merchant's response, 
                think through your reply, and speak it out loud - just like you would in the field.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {STAGES.map((stage) => (
            <Card
              key={stage.id}
              className="p-4 cursor-pointer hover-elevate transition-all border-2 hover:border-primary/50"
              onClick={() => handleStartStage(stage.id)}
              data-testid={`button-start-stage-${stage.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    stage.id === 1 ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" :
                    stage.id === 2 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {stage.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stage.title}</span>
                      <Badge variant="outline" className="text-xs">Stage {stage.id}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{stage.goal}</p>
                    <ul className="mt-2 space-y-1">
                      {stage.objectives.slice(0, 2).map((obj, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    );
  }

  const currentStage = STAGES.find(s => s.id === selectedStage);

  return (
    <Card className="flex flex-col h-[600px]" data-testid="interactive-roleplay-session">
      <div className="p-4 border-b flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            selectedStage === 1 ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30" :
            selectedStage === 2 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" :
            "bg-green-100 text-green-600 dark:bg-green-900/30"
          }`}>
            {currentStage?.icon}
          </div>
          <div>
            <div className="font-semibold text-sm">{currentStage?.name} Practice</div>
            <div className="text-xs text-muted-foreground">{currentStage?.goal}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Auto-read:</span>
            <Switch
              checked={autoPlayTTS}
              onCheckedChange={setAutoPlayTTS}
              aria-label="Toggle auto-read AI responses"
              data-testid="switch-auto-tts"
            />
            {autoPlayTTS ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetSession}
            data-testid="button-reset-session"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "merchant" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => handlePlayMessage(msg.content)}
                    data-testid="button-play-message"
                  >
                    {isPlayingAudio && lastSpokenMsgId === msg.id ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {msg.role === "user" ? "You (Sales Rep)" : "AI Merchant"}
              </div>
            </div>
          </div>
        ))}
        {sendMessageMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Merchant is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t space-y-3">
        {dictationError && (
          <p className="text-xs text-destructive">{dictationError}</p>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening... speak now" : "Type or use the microphone to speak"}
              className={`min-h-[60px] resize-none pr-12 ${isListening ? "border-primary ring-1 ring-primary" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              data-testid="textarea-user-input"
            />
            {dictationSupported && (
              <Button
                variant={isListening ? "default" : "ghost"}
                size="icon"
                className={`absolute right-2 top-2 ${isListening ? "animate-pulse bg-red-500 hover:bg-red-600" : ""}`}
                onClick={handleToggleDictation}
                data-testid="button-dictation"
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {isListening && (
              <span className="flex items-center gap-1 text-primary">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording...
              </span>
            )}
          </div>
          <div>
            {speakMutation.isPending && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating audio...
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function getMerchantGreeting(stageId: number): string {
  switch (stageId) {
    case 1:
      return "Hi there. I'm pretty busy right now, what do you need? I've got a restaurant to run here.";
    case 2:
      return "Okay, you're the payment processing person right? I've got about 15 minutes. What did you want to show me?";
    case 3:
      return "So you said you'd have a proposal for me today? Let's see what you've got. I have to admit, I'm still not sure about making any changes.";
    default:
      return "Hello, can I help you?";
  }
}
