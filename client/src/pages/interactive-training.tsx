import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ListenButton } from "@/components/ListenButton";
import { DictationInput } from "@/components/DictationInput";
import { RequireFeature } from "@/contexts/PermissionContext";
import {
  ChevronLeft,
  Send,
  Loader2,
  Users,
  Target,
  MessageSquare,
  BarChart3,
  Sparkles,
  X,
  Check,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Coffee,
  Wrench,
  Utensils,
  Scissors,
  Store,
  Shirt,
  Sandwich,
  Car,
  Pizza,
  Smartphone,
  Dumbbell,
  Flower,
  Egg,
  Gift,
  Beer,
  Landmark,
  Building,
  BadgeDollarSign,
  TrendingUp,
  ThumbsUp,
  ArrowRight,
  Zap,
  StopCircle,
} from "lucide-react";
import {
  MERCHANT_PERSONAS,
  OBJECTION_BANK,
  SCENARIOS,
  PRESENTATION_STAGES,
  type MerchantPersona,
  type Objection,
  type Scenario,
} from "@/data/interactive-training-data";

type TrainingMode = 'menu' | 'roleplay' | 'objection' | 'scenario' | 'analyzer';
type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard' | 'Expert';

function PersonaIcon({ icon, className = "w-5 h-5" }: { icon: MerchantPersona['icon']; className?: string }) {
  const iconMap: Record<MerchantPersona['icon'], React.ComponentType<{ className?: string }>> = {
    'coffee': Coffee,
    'wrench': Wrench,
    'utensils': Utensils,
    'scissors': Scissors,
    'store': Store,
    'shirt': Shirt,
    'sandwich': Sandwich,
    'car': Car,
    'pizza': Pizza,
    'smartphone': Smartphone,
    'shirt-folded': Shirt,
    'dumbbell': Dumbbell,
    'flower': Flower,
    'egg-fried': Egg,
    'badge-dollar': BadgeDollarSign,
    'gift': Gift,
    'beer': Beer,
    'landmark': Landmark,
    'building': Building,
  };
  const IconComponent = iconMap[icon] || Users;
  return <IconComponent className={className} />;
}

interface Message {
  role: 'user' | 'merchant' | 'system';
  content: string;
  timestamp: Date;
}

export default function InteractiveTrainingPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<TrainingMode>('menu');
  const [selectedPersona, setSelectedPersona] = useState<MerchantPersona | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');

  const filteredPersonas = difficultyFilter === 'all'
    ? MERCHANT_PERSONAS
    : MERCHANT_PERSONAS.filter(p => p.difficulty === difficultyFilter);

  const handleSelectPersona = (persona: MerchantPersona) => {
    setSelectedPersona(persona);
    setMode('roleplay');
  };

  const handleBack = () => {
    if (mode === 'roleplay' && selectedPersona) {
      setSelectedPersona(null);
    }
    setMode('menu');
  };

  return (
    <RequireFeature feature="interactive_ai_training" showLocked>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/coach">
              <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Back to Coach — return to AI coaching hub">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg" data-testid="text-page-title">
              Interactive AI Training
            </h1>
          </div>
        </header>

        <main className={`container mx-auto px-4 py-6 ${mode === 'menu' ? 'max-w-6xl' : 'max-w-5xl lg:max-w-[90%] xl:max-w-[85%]'}`}>
        {mode === 'menu' && (
          <TrainingMenu 
            onSelectMode={setMode} 
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={setDifficultyFilter}
            filteredPersonas={filteredPersonas}
            onSelectPersona={handleSelectPersona}
          />
        )}
        {mode === 'roleplay' && selectedPersona && (
          <RoleplaySimulator persona={selectedPersona} onBack={handleBack} />
        )}
        {mode === 'objection' && (
          <ObjectionGauntlet onBack={handleBack} />
        )}
        {mode === 'scenario' && (
          <ScenarioTrainer onBack={handleBack} />
        )}
        {mode === 'analyzer' && (
          <DeliveryAnalyzer onBack={handleBack} />
        )}
      </main>
      </div>
    </RequireFeature>
  );
}

interface TrainingMenuProps {
  onSelectMode: (mode: TrainingMode) => void;
  difficultyFilter: DifficultyFilter;
  setDifficultyFilter: (filter: DifficultyFilter) => void;
  filteredPersonas: MerchantPersona[];
  onSelectPersona: (persona: MerchantPersona) => void;
}

function TrainingMenu({ onSelectMode, difficultyFilter, setDifficultyFilter, filteredPersonas, onSelectPersona }: TrainingMenuProps) {
  const [showPersonas, setShowPersonas] = useState(false);

  if (showPersonas) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowPersonas(false)} data-testid="button-back-menu" title="Back to Menu — return to training mode selection">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'Easy', 'Medium', 'Hard', 'Expert'] as const).map((level) => (
              <Button
                key={level}
                size="sm"
                variant={difficultyFilter === level ? 'default' : 'outline'}
                onClick={() => setDifficultyFilter(level)}
                className={difficultyFilter === level ? getDifficultyColor(level) : ''}
                data-testid={`button-filter-${level.toLowerCase()}`}
              >
                {level === 'all' ? 'All Levels' : level}
              </Button>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-bold">Select a Merchant</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonas.map((persona) => (
            <Card
              key={persona.id}
              className="p-4 cursor-pointer hover-elevate transition-all"
              onClick={() => onSelectPersona(persona)}
              data-testid={`card-persona-${persona.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PersonaIcon icon={persona.icon} className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="secondary" className={getDifficultyBadgeClass(persona.difficulty)}>
                  {persona.difficulty}
                </Badge>
              </div>
              <h3 className="font-bold mb-1">{persona.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{persona.title} • {persona.businessType}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{persona.personality}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Practice Makes Perfect</h2>
        <p className="text-muted-foreground">
          Choose a training mode to sharpen your sales skills with AI-powered feedback and realistic merchant scenarios.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card
          className="p-6 cursor-pointer hover-elevate transition-all border-primary/20"
          onClick={() => setShowPersonas(true)}
          data-testid="card-mode-roleplay"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              AI Roleplay
            </Badge>
          </div>
          <h3 className="text-xl font-bold mb-2">Live Roleplay Simulator</h3>
          <p className="text-muted-foreground text-sm">
            Practice against 20 unique AI merchant personas. Each has different personalities, objection styles, and weak points to discover.
          </p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover-elevate transition-all border-orange-500/20"
          onClick={() => onSelectMode('objection')}
          data-testid="card-mode-objection"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
              Rapid Fire
            </Badge>
          </div>
          <h3 className="text-xl font-bold mb-2">Objection Gauntlet</h3>
          <p className="text-muted-foreground text-sm">
            Handle 12 common objections back-to-back. Learn the best responses and key principles for each challenge.
          </p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover-elevate transition-all border-cyan-500/20"
          onClick={() => onSelectMode('scenario')}
          data-testid="card-mode-scenario"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
            </div>
            <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500">
              Situational
            </Badge>
          </div>
          <h3 className="text-xl font-bold mb-2">Scenario Trainer</h3>
          <p className="text-muted-foreground text-sm">
            "What would you do?" situational training. Make decisions and get immediate feedback on your choices.
          </p>
        </Card>

        <Card
          className="p-6 cursor-pointer hover-elevate transition-all border-purple-500/20"
          onClick={() => onSelectMode('analyzer')}
          data-testid="card-mode-analyzer"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
              AI Analysis
            </Badge>
          </div>
          <h3 className="text-xl font-bold mb-2">Delivery Analyzer</h3>
          <p className="text-muted-foreground text-sm">
            Practice your full presentation. AI detects which stages you hit and coaches your delivery in real-time.
          </p>
        </Card>
      </div>
    </div>
  );
}

interface RoleplaySimulatorProps {
  persona: MerchantPersona;
  onBack: () => void;
}

function RoleplaySimulator({ persona, onBack }: RoleplaySimulatorProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'merchant', content: persona.openingLine, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({ exchanges: 0, startTime: new Date() });
  const [showCoaching, setShowCoaching] = useState(false);
  const [coachingFeedback, setCoachingFeedback] = useState<string | null>(null);
  const [isGettingCoaching, setIsGettingCoaching] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [trustScore, setTrustScore] = useState(50);
  const [trustHistory, setTrustHistory] = useState<any[]>([]);
  const [moodBand, setMoodBand] = useState<string>('warming');
  const [moodLabel, setMoodLabel] = useState<string>('Warming Up');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    apiRequest("POST", "/api/training/sessions", {
      mode: 'roleplay',
      personaId: persona.id,
      difficulty: persona.difficulty,
    }).then(res => res.json()).then(data => {
      setSessionId(data.id);
      apiRequest("POST", `/api/training/sessions/${data.id}/messages`, {
        role: 'assistant',
        content: persona.openingLine,
      }).catch(() => {});
    }).catch(err => console.log('Failed to create session:', err));
  }, []);

  const roleplayMutation = useMutation({
    mutationFn: async (data: { personaId: string; userMessage: string; history: Message[]; trustScore: number; messageIndex: number }) => {
      const res = await apiRequest("POST", "/api/training/roleplay", data);
      return res.json();
    },
    onSuccess: (data) => {
      const merchantResponse: Message = {
        role: 'merchant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, merchantResponse]);
      if (sessionId) {
        apiRequest("POST", `/api/training/sessions/${sessionId}/messages`, {
          role: 'assistant', content: data.response,
        }).catch(() => {});
      }
      setSessionStats(prev => ({ ...prev, exchanges: prev.exchanges + 1 }));
      
      if (data.trust) {
        setTrustScore(data.trust.newScore);
        setMoodBand(data.trust.moodBand);
        setMoodLabel(data.trust.moodLabel);
        setTrustHistory(prev => [...prev, {
          trustDelta: data.trust.delta,
          newScore: data.trust.newScore,
          moodBand: data.trust.moodBand,
          deceptionDeployed: data.trust.deceptionDeployed,
          deceptionCaught: data.trust.deceptionCaught,
        }]);
      }
      
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to get response",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const coachingMutation = useMutation({
    mutationFn: async (data: { personaId: string; messages: Message[] }) => {
      const res = await apiRequest("POST", "/api/training/coaching", data);
      return res.json();
    },
    onSuccess: (data) => {
      setCoachingFeedback(data.feedback);
      setIsGettingCoaching(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to get coaching",
        description: error.message,
        variant: "destructive",
      });
      setIsGettingCoaching(false);
    }
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (sessionId) {
      apiRequest("POST", `/api/training/sessions/${sessionId}/messages`, {
        role: 'user', content: input.trim(),
      }).catch(() => {});
    }
    setInput('');
    setIsLoading(true);

    roleplayMutation.mutate({
      personaId: persona.id,
      userMessage: input.trim(),
      history: messages,
      trustScore: trustScore,
      messageIndex: sessionStats.exchanges,
    });
  };

  const requestCoaching = () => {
    setShowCoaching(true);
    setCoachingFeedback(null);
    setIsGettingCoaching(true);
    coachingMutation.mutate({
      personaId: persona.id,
      messages: messages
    });
  };

  const getElapsedTime = () => {
    const diff = Math.floor((new Date().getTime() - sessionStats.startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const endSession = async () => {
    if (!sessionId || sessionCompleted || isEndingSession) return;
    setIsEndingSession(true);

    const elapsed = Math.floor((new Date().getTime() - sessionStats.startTime.getTime()) / 1000);

    try {
      const res = await apiRequest("POST", `/api/training/sessions/${sessionId}/complete`, {
        turnCount: sessionStats.exchanges,
        durationSeconds: elapsed,
      });
      const data = await res.json();
      setSessionSummary(data);

      if (data.xpResult?.xpAwarded > 0) {
        toast({
          title: `+${data.xpResult.xpAwarded} XP earned!`,
          description: data.xpResult.leveledUp
            ? `Level up! You're now Level ${data.xpResult.newLevel}!`
            : data.xpResult.dailyCapped
              ? 'Daily XP cap reached'
              : `${data.xpResult.newTotal.toLocaleString()} total XP`,
        });
      }

      if (data.xpResult?.ladderTitle && data.xpResult?.ladderLevel > 0) {
        toast({
          title: `${data.xpResult.ladderTitle}`,
          description: `Progression Level ${data.xpResult.ladderLevel} achieved!`,
        });
      }

      setSessionCompleted(true);
    } catch (err) {
      console.log('Failed to complete session');
    } finally {
      setIsEndingSession(false);
    }
  };

  useEffect(() => {
    if (sessionStats.exchanges >= 15 && !sessionCompleted && sessionId) {
      endSession();
    }
  }, [sessionStats.exchanges]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-roleplay" aria-label="Exit roleplay — return to training menu">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <PersonaIcon icon={persona.icon} className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold">{persona.name}</h2>
            <p className="text-sm text-muted-foreground">{persona.businessType}</p>
          </div>
          <Badge className={getDifficultyBadgeClass(persona.difficulty)}>
            {persona.difficulty}
          </Badge>
        </div>

          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              moodBand === 'engaged' ? 'bg-green-500' :
              moodBand === 'warming' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="text-sm font-medium" data-testid="text-mood-label">{moodLabel}</span>
          </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-mono text-primary">{getElapsedTime()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Exchanges</p>
            <p className="font-mono text-primary">{sessionStats.exchanges}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={requestCoaching}
            disabled={isGettingCoaching || messages.length < 2}
            data-testid="button-get-coaching"
            title="Get Coaching — receive AI feedback on your current conversation"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Coaching
          </Button>
          <Button
            variant="default"
            onClick={endSession}
            disabled={isEndingSession || sessionCompleted || sessionStats.exchanges < 2}
            data-testid="button-end-session"
            title="End Session — finish roleplay and get performance summary with XP"
          >
            {isEndingSession ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ending...</>
            ) : (
              <><StopCircle className="w-4 h-4 mr-2" />End Session</>
            )}
          </Button>
        </div>
      </div>

      <Card className="bg-muted/30 p-3 mb-4">
        <div className="flex gap-4 text-sm flex-wrap">
          <div>
            <span className="text-muted-foreground">Personality: </span>
            <span>{persona.personality}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Objection Style: </span>
            <span>{persona.objectionStyle}</span>
          </div>
        </div>
      </Card>

      {sessionCompleted && sessionSummary ? (
        <Card className="flex-1 overflow-auto p-6 space-y-6" data-testid="card-session-summary">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
            <p className="text-muted-foreground">
              {sessionStats.exchanges} exchanges with {persona.name}
            </p>
          </div>

          {sessionSummary.aiFeedback?.overallScore !== undefined && (
            <div className="text-center">
              <div className={`text-5xl font-bold mb-2 ${
                sessionSummary.aiFeedback.overallScore >= 80 ? 'text-green-500' :
                sessionSummary.aiFeedback.overallScore >= 60 ? 'text-yellow-500' :
                sessionSummary.aiFeedback.overallScore >= 40 ? 'text-orange-500' : 'text-red-500'
              }`}>{sessionSummary.aiFeedback.overallScore}%</div>
              <p className="text-sm text-muted-foreground">Performance Score</p>
              {sessionSummary.xpResult?.xpAwarded > 0 && (
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400" data-testid="badge-xp-earned">
                  +{sessionSummary.xpResult.xpAwarded} XP
                </Badge>
              )}
            </div>
          )}

          {sessionSummary.aiFeedback?.techniqueScores && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(sessionSummary.aiFeedback.techniqueScores).map(([key, value]: [string, any]) => (
                <Card key={key} className="p-3 text-center">
                  <div className="text-xl font-bold">{value}/10</div>
                  <div className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                </Card>
              ))}
            </div>
          )}

          {sessionSummary.aiFeedback?.strengths?.length > 0 && (
            <Card className="p-4 bg-green-500/10 border-green-500/30">
              <h4 className="font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                Strengths
              </h4>
              <ul className="text-sm space-y-1">
                {sessionSummary.aiFeedback.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sessionSummary.aiFeedback?.improvements?.length > 0 && (
            <Card className="p-4 bg-orange-500/10 border-orange-500/30">
              <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Areas to Improve
              </h4>
              <ul className="text-sm space-y-1">
                {sessionSummary.aiFeedback.improvements.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sessionSummary.aiFeedback?.summary && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Coach Summary
              </h4>
              <p className="text-sm">{sessionSummary.aiFeedback.summary}</p>
            </Card>
          )}

          {sessionSummary.aiFeedback?.nextStep && (
            <p className="text-sm text-muted-foreground text-center italic">
              Recommended next: {sessionSummary.aiFeedback.nextStep}
            </p>
          )}

          {trustHistory.length > 0 && (
            <div className="space-y-4" data-testid="trust-debrief">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Trust Building Assessment</h3>
                <div className={`text-4xl font-bold mb-1 ${
                  trustScore >= 66 ? 'text-green-500' :
                  trustScore >= 36 ? 'text-yellow-500' :
                  'text-red-500'
                }`}>{trustScore}/100</div>
                <p className="text-sm text-muted-foreground">Final Trust Score</p>
              </div>

              <Card className="p-4">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trust Progression
                </h4>
                <div className="flex items-end gap-1 h-32">
                  {trustHistory.map((h: any, i: number) => {
                    const height = Math.max(4, (h.newScore / 100) * 100);
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all ${
                          h.newScore >= 66 ? 'bg-green-500/70' :
                          h.newScore >= 36 ? 'bg-yellow-500/70' :
                          'bg-red-500/70'
                        }`}
                        style={{ height: `${height}%` }}
                        title={`Exchange ${i+1}: ${h.newScore}/100 (${h.trustDelta >= 0 ? '+' : ''}${h.trustDelta})`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Start</span>
                  <span>End</span>
                </div>
              </Card>

              {trustHistory.some((h: any) => h.deceptionDeployed) && (
                <Card className="p-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Deception Tests
                  </h4>
                  <div className="space-y-2">
                    {trustHistory.filter((h: any) => h.deceptionDeployed).map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-1 text-sm">
                        <span className="capitalize">{(h.deceptionType || 'unknown').replace(/_/g, ' ')}</span>
                        {h.deceptionCaught ? (
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Caught</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">Missed</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Caught {trustHistory.filter((h: any) => h.deceptionDeployed && h.deceptionCaught).length} of {trustHistory.filter((h: any) => h.deceptionDeployed).length} deception attempts
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <h4 className="font-bold mb-3">Mood Journey</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {trustHistory.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        h.moodBand === 'engaged' ? 'bg-green-500' :
                        h.moodBand === 'warming' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      {i < trustHistory.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} data-testid="button-back-to-menu">
              Back to Menu
            </Button>
          </div>
        </Card>
      ) : (
      <>
      <div className="flex gap-4 flex-1 min-h-0">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {msg.role === 'merchant' && (
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <PersonaIcon icon={persona.icon} className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">{persona.name}</span>
                      </div>
                      <ListenButton text={msg.content} data-testid={`button-listen-message-${idx}`} />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PersonaIcon icon={persona.icon} className="w-4 h-4 text-muted-foreground" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {showCoaching && (
          <Card className="w-80 flex-shrink-0 p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Coach
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCoaching(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {isGettingCoaching ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Analyzing conversation...</p>
              </div>
            ) : coachingFeedback ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Coach Feedback</span>
                  <ListenButton text={coachingFeedback} data-testid="button-listen-coaching" />
                </div>
                <div className="prose prose-sm dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">{coachingFeedback}</div>
                </div>

                <Card className="p-3 bg-primary/5 border-primary/20">
                  <h4 className="font-medium text-primary text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Weak Points to Target
                  </h4>
                  <ul className="text-sm space-y-1">
                    {persona.weakPoints.map((wp, i) => (
                      <li key={i} className="text-muted-foreground">• {wp}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            ) : null}
          </Card>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <DictationInput
          value={input}
          onChange={setInput}
          placeholder="Type or speak your response..."
          multiline
          rows={2}
          className="flex-1"
          data-testid="input-message"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-6"
          data-testid="button-send"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      </>
      )}
    </div>
  );
}

interface ObjectionGauntletProps {
  onBack: () => void;
}

function ObjectionGauntlet({ onBack }: ObjectionGauntletProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [aiScoring, setAiScoring] = useState<{[key: string]: any}>({});
  const [scoringInProgress, setScoringInProgress] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    apiRequest("POST", "/api/training/sessions", {
      mode: 'gauntlet',
    }).then(res => res.json()).then(data => {
      setSessionId(data.id);
    }).catch(err => console.log('Failed to create gauntlet session'));
  }, []);

  const [objections] = useState(() =>
    [...OBJECTION_BANK].sort(() => Math.random() - 0.5)
  );

  const currentObjection = objections[currentIndex];

  const handleSubmit = () => {
    setShowFeedback(true);
    let responseScore = 5;
    const lowerResponse = userResponse.toLowerCase();

    currentObjection.keyPrinciples.forEach(principle => {
      const keywords = principle.toLowerCase().split(' ').slice(0, 2);
      if (keywords.some(kw => lowerResponse.includes(kw))) {
        responseScore += 1;
      }
    });

    currentObjection.commonMistakes.forEach(mistake => {
      const keywords = mistake.toLowerCase().split(' ').slice(0, 2);
      if (keywords.some(kw => lowerResponse.includes(kw))) {
        responseScore -= 1;
      }
    });

    const keywordScore = Math.max(1, Math.min(10, responseScore));
    setScore(prev => prev + keywordScore);
    setCompleted(prev => [...prev, currentObjection.id]);

    const objectionId = currentObjection.id;
    setScoringInProgress(true);
    apiRequest("POST", "/api/training/gauntlet/score", {
      objectionId: objectionId,
      objectionText: currentObjection.objection,
      userResponse: userResponse,
      bestResponse: currentObjection.bestResponse,
      keyPrinciples: currentObjection.keyPrinciples,
    }).then(res => res.json()).then(data => {
      setAiScoring(prev => ({ ...prev, [objectionId]: data }));
      if (data.aiScore !== null) {
        setScore(prev => prev - keywordScore + data.aiScore);
      }
      if (sessionId) {
        apiRequest("POST", `/api/training/sessions/${sessionId}/gauntlet-response`, {
          objectionId: objectionId,
          objectionText: currentObjection.objection,
          userResponse: userResponse,
          keywordScore: keywordScore,
          aiScore: data.aiScore,
          aiFeedback: data.aiFeedback,
        }).catch(() => {});
      }
    }).catch(() => {
      console.log('AI scoring unavailable, using keyword score');
      if (sessionId) {
        apiRequest("POST", `/api/training/sessions/${sessionId}/gauntlet-response`, {
          objectionId: objectionId,
          objectionText: currentObjection.objection,
          userResponse: userResponse,
          keywordScore: keywordScore,
        }).catch(() => {});
      }
    }).finally(() => {
      setScoringInProgress(false);
    });
  };

  const nextObjection = () => {
    if (currentIndex < objections.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserResponse('');
      setShowFeedback(false);
    }
  };

  const resetGauntlet = () => {
    setCurrentIndex(0);
    setUserResponse('');
    setShowFeedback(false);
    setScore(0);
    setCompleted([]);
    setAiScoring({});
    setScoringInProgress(false);
    apiRequest("POST", "/api/training/sessions", { mode: 'gauntlet' })
      .then(res => res.json())
      .then(data => setSessionId(data.id))
      .catch(() => {});
  };

  const isComplete = currentIndex === objections.length - 1 && showFeedback;

  useEffect(() => {
    if (isComplete && sessionId) {
      const avgScore = completed.length > 0 ? Math.round((score / (completed.length * 10)) * 100) : 0;
      apiRequest("POST", `/api/training/sessions/${sessionId}/complete`, {
        scorePercent: avgScore,
        objectionsAttempted: completed.length,
        objectionsPassed: completed.length,
        perfectRun: avgScore >= 90,
      }).catch(() => {});
    }
  }, [isComplete]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-objection" title="Back to Menu — return to training mode selection">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="font-mono text-orange-500">{completed.length} / {objections.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="font-mono text-orange-500">{score}</p>
          </div>
        </div>
      </div>

      <Progress value={(completed.length / objections.length) * 100} className="mb-6 h-2" />

      <Card className="overflow-hidden">
        <div className="bg-orange-500/10 border-b border-orange-500/20 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">
              {currentObjection.category}
            </Badge>
            <Badge className={getDifficultyBadgeClass(currentObjection.difficulty)}>
              {currentObjection.difficulty}
            </Badge>
          </div>
          <h2 className="text-xl font-bold mb-2">Merchant says:</h2>
          <p className="text-lg text-orange-600 dark:text-orange-400 flex items-start gap-2">
            <ListenButton text={currentObjection.objection} />
            "{currentObjection.objection}"
          </p>
        </div>

        <div className="p-6">
          <label className="block text-sm text-muted-foreground mb-2">Your Response:</label>
          <DictationInput
            value={userResponse}
            onChange={setUserResponse}
            disabled={showFeedback}
            placeholder="How would you respond to this objection? (Speak or type)"
            multiline
            rows={4}
            className="mb-4"
            data-testid="input-objection-response"
          />

          {!showFeedback && (
            <Button
              onClick={handleSubmit}
              disabled={!userResponse.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600"
              data-testid="button-submit-objection"
              title="Submit Response — get AI scoring and see the best approach"
            >
              Submit Response
            </Button>
          )}
        </div>

        {showFeedback && (
          <div className="border-t border-border p-6 space-y-4">
            <Card className="p-4 bg-green-500/10 border-green-500/30">
              <h3 className="font-bold text-green-600 dark:text-green-400 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Best Response Approach:
                </span>
                <ListenButton text={currentObjection.bestResponse} data-testid="button-listen-best-response" />
              </h3>
              <p className="text-sm">{currentObjection.bestResponse}</p>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-4 bg-cyan-500/10 border-cyan-500/30">
                <h4 className="font-medium text-cyan-600 dark:text-cyan-400 mb-2">Key Principles:</h4>
                <ul className="text-sm space-y-1">
                  {currentObjection.keyPrinciples.map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-4 bg-red-500/10 border-red-500/30">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Common Mistakes:
                </h4>
                <ul className="text-sm space-y-1">
                  {currentObjection.commonMistakes.map((m, i) => (
                    <li key={i}>• {m}</li>
                  ))}
                </ul>
              </Card>
            </div>

            {aiScoring[currentObjection.id] && (
              <Card className="p-4 bg-blue-500/10 border-blue-500/30" data-testid="card-ai-coach-analysis">
                <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4" />
                  AI Coach Analysis
                  <Badge variant="secondary" className="ml-auto" data-testid="badge-ai-score">
                    {aiScoring[currentObjection.id].aiScore}/10
                  </Badge>
                </h3>

                {aiScoring[currentObjection.id].aiScores && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3" data-testid="grid-ai-criteria-scores">
                    {[
                      { label: 'Acknowledge', key: 'acknowledge' },
                      { label: 'Question', key: 'question' },
                      { label: 'Reframe', key: 'reframe' },
                      { label: 'Next Step', key: 'nextStep' },
                    ].map(item => (
                      <div key={item.key} className="text-center p-2 rounded bg-muted/50" data-testid={`score-criteria-${item.key}`}>
                        <div className="text-lg font-bold">{aiScoring[currentObjection.id].aiScores[item.key]}/10</div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {aiScoring[currentObjection.id].aiFeedback && (
                  <p className="text-sm mb-2" data-testid="text-ai-feedback">{aiScoring[currentObjection.id].aiFeedback}</p>
                )}

                {aiScoring[currentObjection.id].aiImproved && (
                  <div className="mt-2 p-2 rounded bg-blue-500/5 border border-blue-500/20" data-testid="card-ai-improved">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Improved approach:</p>
                    <p className="text-sm italic">{aiScoring[currentObjection.id].aiImproved}</p>
                  </div>
                )}
              </Card>
            )}

            {scoringInProgress && !aiScoring[currentObjection.id] && (
              <Card className="p-4 bg-blue-500/5 border-blue-500/20 flex items-center gap-3" data-testid="card-ai-scoring-loading">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">AI analyzing your response...</span>
              </Card>
            )}

            {!isComplete ? (
              <Button
                onClick={nextObjection}
                className="w-full bg-orange-500 hover:bg-orange-600"
                data-testid="button-next-objection"
                title="Next Objection — advance to the next challenge"
              >
                Next Objection
              </Button>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold mb-2">Gauntlet Complete!</h3>
                <p className="text-muted-foreground mb-4">Final Score: {score} points</p>
                {/* XP earned will show via toast notification */}
                <Button onClick={resetGauntlet} className="bg-orange-500 hover:bg-orange-600" title="Try Again — restart the objection gauntlet with fresh challenges">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

interface ScenarioTrainerProps {
  onBack: () => void;
}

function ScenarioTrainer({ onBack }: ScenarioTrainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<{[key: string]: string}>({});
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);

  useEffect(() => {
    apiRequest("POST", "/api/training/sessions", {
      mode: 'scenario',
    }).then(res => res.json()).then(data => {
      setSessionId(data.id);
    }).catch(err => console.log('Failed to create scenario session'));
  }, []);

  const currentScenario = SCENARIOS[currentIndex];
  const isComplete = currentIndex === SCENARIOS.length - 1 && selectedOption !== null;

  useEffect(() => {
    if (isComplete && sessionId) {
      const maxScore = SCENARIOS.length * 10;
      const scorePercent = Math.round((totalScore / maxScore) * 100);
      apiRequest("POST", `/api/training/sessions/${sessionId}/complete`, {
        scorePercent,
        scoreDetails: { totalScore, maxScore, scenariosCompleted: completed },
      }).catch(() => {});
    }
  }, [isComplete]);

  const handleSelect = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    setTotalScore(prev => prev + currentScenario.options[optionIndex].points);
    setCompleted(prev => prev + 1);

    setFeedbackLoading(true);
    apiRequest("POST", "/api/training/scenario/feedback", {
      scenarioTitle: currentScenario.title,
      scenarioSetup: currentScenario.setup,
      question: currentScenario.question,
      selectedOption: currentScenario.options[optionIndex].text,
      allOptions: currentScenario.options,
      stage: currentScenario.stage,
    }).then(res => res.json()).then(data => {
      if (data.aiFeedback) {
        setAiFeedback(prev => ({ ...prev, [currentScenario.id]: data.aiFeedback }));
      }
    }).catch(err => {
      console.log('AI feedback unavailable');
    }).finally(() => {
      setFeedbackLoading(false);
    });
  };

  const nextScenario = () => {
    if (currentIndex < SCENARIOS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setFeedbackLoading(false);
    }
  };

  const resetTrainer = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setTotalScore(0);
    setCompleted(0);
    setAiFeedback({});
    setFeedbackLoading(false);
    apiRequest("POST", "/api/training/sessions", { mode: 'scenario' })
      .then(res => res.json())
      .then(data => setSessionId(data.id))
      .catch(() => {});
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-scenario" title="Back to Menu — return to training mode selection">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="font-mono text-cyan-500">{completed} / {SCENARIOS.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="font-mono text-cyan-500">{totalScore}</p>
          </div>
        </div>
      </div>

      <Progress value={(completed / SCENARIOS.length) * 100} className="mb-6 h-2" />

      <Card className="overflow-hidden">
        <div className="bg-cyan-500/10 border-b border-cyan-500/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{currentScenario.title}</h2>
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-500">
              {currentScenario.stage}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-4">{currentScenario.setup}</p>
          <p className="font-semibold text-lg">{currentScenario.question}</p>
        </div>

        <div className="p-6 space-y-3">
          {currentScenario.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const showResult = selectedOption !== null;
            const isBest = showResult && option.points === Math.max(...currentScenario.options.map(o => o.points));

            return (
              <Card
                key={idx}
                className={`p-4 cursor-pointer transition-all ${
                  showResult
                    ? isSelected
                      ? isBest
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-orange-500 bg-orange-500/10'
                      : isBest
                        ? 'border-green-500/50 bg-green-500/5'
                        : ''
                    : 'hover-elevate'
                }`}
                onClick={() => handleSelect(idx)}
                data-testid={`option-${idx}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    showResult && isBest ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{option.text}</p>
                    {showResult && (
                      <p className={`text-sm mt-2 ${isBest ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {option.feedback}
                        <span className="ml-2 font-mono">({option.points} pts)</span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {selectedOption !== null && aiFeedback[currentScenario.id] && (
          <Card className="p-4 bg-blue-500/10 border-blue-500/30 mx-6 mb-4" data-testid="scenario-ai-feedback">
            <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Coach Insight
            </h4>
            <p className="text-sm">{aiFeedback[currentScenario.id]}</p>
          </Card>
        )}

        {selectedOption !== null && feedbackLoading && !aiFeedback[currentScenario.id] && (
          <Card className="p-4 bg-blue-500/5 border-blue-500/20 mx-6 mb-4 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">AI analyzing your choice...</span>
          </Card>
        )}

        {selectedOption !== null && (
          <div className="border-t border-border p-6">
            {!isComplete ? (
              <Button
                onClick={nextScenario}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
                data-testid="button-next-scenario"
                title="Next Scenario — proceed to the next situational training"
              >
                Next Scenario
              </Button>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold mb-2">Training Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  Final Score: {totalScore} / {SCENARIOS.length * 10} points
                </p>
                <Button onClick={resetTrainer} className="bg-cyan-500 hover:bg-cyan-600" title="Try Again — restart all scenarios from the beginning">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

interface DeliveryAnalyzerProps {
  onBack: () => void;
}

interface StageAnalysis {
  id: number;
  name: string;
  found: boolean;
  excerpts: string[];
  strength?: 'missing' | 'weak' | 'adequate' | 'strong' | 'exceptional';
  improvement?: string;
}

interface AnalysisResult {
  detectedStages: StageAnalysis[];
  feedback: string;
  score: number;
  psychographicAnalysis?: {
    primaryAppeal: string;
    missingAppeals?: string[];
    recommendation?: string;
  };
  emotionalArc?: {
    problemAgitation: number;
    hopeInjection: number;
    proofStacking: number;
    safetyNet: number;
    overallFlow?: string;
  };
  topStrengths?: string[];
  criticalGaps?: string[];
  nextStepDrill?: string;
  isPartialResult?: boolean;
}

function DeliveryAnalyzer({ onBack }: DeliveryAnalyzerProps) {
  const { toast } = useToast();
  const [presentationText, setPresentationText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const sessionIdRef = useRef<number | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/training/analyze-delivery", { text });
      return res.json();
    },
    onSuccess: (data: AnalysisResult) => {
      // Merge AI feedback with local stage detection (don't overwrite)
      setAnalysis(prev => {
        if (!prev) return data;
        
        // Merge AI-detected stages with strength/improvement data
        const mergedStages = (data.detectedStages && data.detectedStages.length > 0)
          ? data.detectedStages
          : prev.detectedStages.map(stage => {
              const aiStage = data.detectedStages?.find(s => s.id === stage.id);
              return aiStage ? { ...stage, ...aiStage } : stage;
            });

        return {
          ...prev,
          ...data,
          detectedStages: mergedStages,
          feedback: data.feedback || prev.feedback,
          score: data.score !== undefined ? data.score : prev.score,
        };
      });
      setIsAnalyzing(false);

      if (sessionIdRef.current) {
        const stagesHit = (data.detectedStages || []).filter((s: any) => s.found).length;
        const totalStages = (data.detectedStages || []).length || 8;
        apiRequest("POST", `/api/training/sessions/${sessionIdRef.current}/complete`, {
          scorePercent: data.score || Math.round((stagesHit / totalStages) * 100),
          stagesDetected: data.detectedStages,
          coveragePercent: Math.round((stagesHit / totalStages) * 100),
          aiFeedback: { feedback: data.feedback, psychographic: data.psychographicAnalysis, emotionalArc: data.emotionalArc },
        }).catch(() => {});
      }
      
      // Notify user if partial results
      if (data.isPartialResult) {
        toast({
          title: "Partial Analysis",
          description: "Some analysis features may be limited. Try a longer presentation for more detailed feedback.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  });

  const handleAnalyze = () => {
    if (!presentationText.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    apiRequest("POST", "/api/training/sessions", { mode: 'delivery_analyzer' })
      .then(res => res.json())
      .then(data => { sessionIdRef.current = data.id; })
      .catch(() => {});

    const detectedStages = PRESENTATION_STAGES.map(stage => {
      const lowerText = presentationText.toLowerCase();
      const found = stage.keywords.some(kw => lowerText.includes(kw.toLowerCase()));
      const excerpts: string[] = [];
      
      if (found) {
        stage.keywords.forEach(kw => {
          const idx = lowerText.indexOf(kw.toLowerCase());
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(presentationText.length, idx + kw.length + 30);
            excerpts.push('...' + presentationText.slice(start, end) + '...');
          }
        });
      }

      return { id: stage.id, name: stage.name, found, excerpts: excerpts.slice(0, 2) };
    });

    const stagesHit = detectedStages.filter(s => s.found).length;
    const score = Math.round((stagesHit / PRESENTATION_STAGES.length) * 100);

    analysisMutation.mutate(presentationText);

    setAnalysis({
      detectedStages,
      feedback: '',
      score
    });
  };

  const reset = () => {
    setPresentationText('');
    setAnalysis(null);
    sessionIdRef.current = null;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-analyzer" title="Back to Menu — return to training mode selection">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Menu
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-purple-500/10 border-b border-purple-500/20 p-6">
          <h2 className="text-2xl font-bold mb-2">Delivery Analyzer</h2>
          <p className="text-muted-foreground">
            Type or paste your presentation script below. The AI will analyze which of the 8 presentation stages you covered and provide feedback on your delivery.
          </p>
        </div>

        <div className="p-6">
          <DictationInput
            value={presentationText}
            onChange={setPresentationText}
            placeholder="Enter your presentation script here... (Speak or type)

Example: 'Ever close the month—staring at the deposit screen, adding it up twice—and still feel that quiet knot in your stomach?'"
            multiline
            rows={8}
            disabled={isAnalyzing}
            data-testid="input-presentation"
          />

          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={!presentationText.trim() || isAnalyzing}
              className="flex-1 bg-purple-500 hover:bg-purple-600"
              data-testid="button-analyze"
              title="Analyze Delivery — AI evaluates which presentation stages you covered"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analyze Delivery
                </>
              )}
            </Button>
            {analysis && (
              <Button variant="outline" onClick={reset} title="Reset — clear your script and start a new analysis">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {analysis && (
          <div className="border-t border-border p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-xl font-bold">Comprehensive Analysis</h3>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className={`text-2xl font-bold ${
                  analysis.score >= 80 ? 'text-green-500' : 
                  analysis.score >= 60 ? 'text-yellow-500' : 
                  analysis.score >= 40 ? 'text-orange-500' : 'text-red-500'
                }`}>{analysis.score}%</p>
              </div>
            </div>

            {/* Psychographic Analysis */}
            {analysis.psychographicAnalysis && (
              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Psychographic Appeal
                </h4>
                <p className="text-sm mb-2">
                  <span className="font-medium">Primary Target:</span> {analysis.psychographicAnalysis.primaryAppeal} personalities
                </p>
                {analysis.psychographicAnalysis.missingAppeals && analysis.psychographicAnalysis.missingAppeals.length > 0 && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Consider adding appeal for:</span> {analysis.psychographicAnalysis.missingAppeals.join(', ')}
                  </p>
                )}
                {analysis.psychographicAnalysis.recommendation && (
                  <p className="text-sm italic">{analysis.psychographicAnalysis.recommendation}</p>
                )}
              </Card>
            )}

            {/* Emotional Arc */}
            {analysis.emotionalArc && (
              <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Emotional Arc Analysis
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { label: 'Problem Agitation', value: analysis.emotionalArc.problemAgitation },
                    { label: 'Hope Injection', value: analysis.emotionalArc.hopeInjection },
                    { label: 'Proof Stacking', value: analysis.emotionalArc.proofStacking },
                    { label: 'Safety Net', value: analysis.emotionalArc.safetyNet },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <div className="text-lg font-bold">{item.value}/5</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
                {analysis.emotionalArc.overallFlow && (
                  <p className="text-sm italic">{analysis.emotionalArc.overallFlow}</p>
                )}
              </Card>
            )}

            {/* Stage Detection with Strength Indicators */}
            <div>
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Stage Coverage ({analysis.detectedStages.filter(s => s.found).length}/{analysis.detectedStages.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {analysis.detectedStages.map(stage => {
                  const strengthColors: Record<string, string> = {
                    exceptional: 'border-green-500 bg-green-500/10',
                    strong: 'border-green-400/70 bg-green-500/5',
                    adequate: 'border-yellow-500/70 bg-yellow-500/5',
                    weak: 'border-orange-500/70 bg-orange-500/5',
                    missing: 'border-red-500/50 bg-red-500/5',
                  };
                  const strengthClass = stage.strength 
                    ? strengthColors[stage.strength] 
                    : (stage.found ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5');
                  
                  return (
                    <Card key={stage.id} className={`p-3 ${strengthClass}`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {stage.found ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">Stage {stage.id}: {stage.name}</span>
                        </div>
                        {stage.strength && stage.strength !== 'missing' && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {stage.strength}
                          </Badge>
                        )}
                      </div>
                      {stage.excerpts && stage.excerpts.length > 0 && (
                        <p className="text-xs text-muted-foreground italic mb-1">
                          "{stage.excerpts[0]}"
                        </p>
                      )}
                      {stage.improvement && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Tip: {stage.improvement}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Gaps */}
            {(analysis.topStrengths?.length || analysis.criticalGaps?.length) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {analysis.topStrengths && analysis.topStrengths.length > 0 && (
                  <Card className="p-4 bg-green-500/10 border-green-500/30">
                    <h4 className="font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4" />
                      Your Strengths
                    </h4>
                    <ul className="text-sm space-y-1">
                      {analysis.topStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {analysis.criticalGaps && analysis.criticalGaps.length > 0 && (
                  <Card className="p-4 bg-orange-500/10 border-orange-500/30">
                    <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Areas to Develop
                    </h4>
                    <ul className="text-sm space-y-1">
                      {analysis.criticalGaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {/* Next Step Drill */}
            {analysis.nextStepDrill && (
              <Card className="p-4 bg-indigo-500/10 border-indigo-500/30">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Your Next Practice Drill
                </h4>
                <p className="text-sm">{analysis.nextStepDrill}</p>
              </Card>
            )}

            {/* AI Coaching Narrative */}
            {analysis.feedback && (
              <Card className="p-4 bg-purple-500/10 border-purple-500/30">
                <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Coach Feedback
                  </span>
                  <ListenButton text={analysis.feedback} data-testid="button-listen-feedback" />
                </h4>
                <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                  {analysis.feedback}
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function getDifficultyColor(level: DifficultyFilter): string {
  switch (level) {
    case 'Easy': return 'bg-green-500 hover:bg-green-600';
    case 'Medium': return 'bg-yellow-500 hover:bg-yellow-600';
    case 'Hard': return 'bg-orange-500 hover:bg-orange-600';
    case 'Expert': return 'bg-red-500 hover:bg-red-600';
    default: return '';
  }
}

function getDifficultyBadgeClass(difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'): string {
  switch (difficulty) {
    case 'Easy': return 'bg-green-500/20 text-green-600 dark:text-green-400';
    case 'Medium': return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
    case 'Hard': return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
    case 'Expert': return 'bg-red-500/20 text-red-600 dark:text-red-400';
  }
}
