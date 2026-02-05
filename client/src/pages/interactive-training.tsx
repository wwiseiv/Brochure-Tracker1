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
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg" data-testid="text-page-title">
              Interactive AI Training
            </h1>
          </div>
        </header>

        <main className="container max-w-6xl mx-auto px-4 py-6">
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
          <Button variant="ghost" onClick={() => setShowPersonas(false)} data-testid="button-back-menu">
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const roleplayMutation = useMutation({
    mutationFn: async (data: { personaId: string; userMessage: string; history: Message[] }) => {
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
      setSessionStats(prev => ({ ...prev, exchanges: prev.exchanges + 1 }));
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
    setInput('');
    setIsLoading(true);

    roleplayMutation.mutate({
      personaId: persona.id,
      userMessage: input.trim(),
      history: messages
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-roleplay">
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
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Coaching
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

    setScore(prev => prev + Math.max(1, Math.min(10, responseScore)));
    setCompleted(prev => [...prev, currentObjection.id]);
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
  };

  const isComplete = currentIndex === objections.length - 1 && showFeedback;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-objection">
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

            {!isComplete ? (
              <Button
                onClick={nextObjection}
                className="w-full bg-orange-500 hover:bg-orange-600"
                data-testid="button-next-objection"
              >
                Next Objection
              </Button>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold mb-2">Gauntlet Complete!</h3>
                <p className="text-muted-foreground mb-4">Final Score: {score} points</p>
                <Button onClick={resetGauntlet} className="bg-orange-500 hover:bg-orange-600">
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

  const currentScenario = SCENARIOS[currentIndex];
  const isComplete = currentIndex === SCENARIOS.length - 1 && selectedOption !== null;

  const handleSelect = (optionIndex: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIndex);
    setTotalScore(prev => prev + currentScenario.options[optionIndex].points);
    setCompleted(prev => prev + 1);
  };

  const nextScenario = () => {
    if (currentIndex < SCENARIOS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
    }
  };

  const resetTrainer = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setTotalScore(0);
    setCompleted(0);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-scenario">
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

        {selectedOption !== null && (
          <div className="border-t border-border p-6">
            {!isComplete ? (
              <Button
                onClick={nextScenario}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
                data-testid="button-next-scenario"
              >
                Next Scenario
              </Button>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold mb-2">Training Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  Final Score: {totalScore} / {SCENARIOS.length * 10} points
                </p>
                <Button onClick={resetTrainer} className="bg-cyan-500 hover:bg-cyan-600">
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

function DeliveryAnalyzer({ onBack }: DeliveryAnalyzerProps) {
  const { toast } = useToast();
  const [presentationText, setPresentationText] = useState('');
  const [analysis, setAnalysis] = useState<{
    detectedStages: { id: number; name: string; found: boolean; excerpts: string[] }[];
    feedback: string;
    score: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analysisMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/training/analyze-delivery", { text });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setIsAnalyzing(false);
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
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} data-testid="button-back-analyzer">
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
              <Button variant="outline" onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {analysis && (
          <div className="border-t border-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Stage Detection Results</h3>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Coverage Score</p>
                <p className="text-2xl font-bold text-purple-500">{analysis.score}%</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {analysis.detectedStages.map(stage => (
                <Card
                  key={stage.id}
                  className={`p-3 ${stage.found ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {stage.found ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">Stage {stage.id}: {stage.name}</span>
                  </div>
                  {stage.found && stage.excerpts.length > 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      {stage.excerpts[0]}
                    </p>
                  )}
                </Card>
              ))}
            </div>

            {analysis.feedback && (
              <Card className="p-4 bg-purple-500/10 border-purple-500/30">
                <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Feedback
                  </span>
                  <ListenButton text={analysis.feedback} data-testid="button-listen-feedback" />
                </h4>
                <p className="text-sm whitespace-pre-wrap">{analysis.feedback}</p>
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
