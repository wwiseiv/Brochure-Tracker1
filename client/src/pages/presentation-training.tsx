import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BottomNav } from "@/components/BottomNav";
import { DictationInput } from "@/components/DictationInput";
import { ListenButton } from "@/components/ListenButton";
import {
  GraduationCap,
  BookOpen,
  Brain,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  X,
  Send,
  Play,
  Sparkles,
} from "lucide-react";
import type {
  PresentationModule,
  PresentationLesson,
  PresentationProgress,
} from "@shared/schema";

interface ModuleWithLessons extends PresentationModule {
  lessons: (PresentationLesson & { progress: PresentationProgress | null })[];
}

interface LessonWithDetails extends PresentationLesson {
  progress: PresentationProgress | null;
  quizzes?: {
    id: number;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string | null;
  }[];
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function PresentationTrainingPage() {
  const { toast } = useToast();
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [practiceResponse, setPracticeResponse] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);

  const { data: modules, isLoading: modulesLoading } = useQuery<ModuleWithLessons[]>({
    queryKey: ["/api/presentation/modules"],
  });

  const { data: currentLesson, isLoading: lessonLoading } = useQuery<LessonWithDetails>({
    queryKey: ["/api/presentation/lessons", selectedLessonId],
    enabled: !!selectedLessonId,
  });

  interface SavedPracticeResponse {
    id: number;
    lessonId: number;
    practiceResponse: string;
    aiFeedback: string | null;
    feedbackScore: number | null;
    strengths: string[] | null;
    improvements: string[] | null;
    createdAt: string;
  }

  const { data: savedResponses, isLoading: responsesLoading } = useQuery<{ responses: SavedPracticeResponse[] }>({
    queryKey: ["/api/presentation/practice-responses", selectedLessonId],
    queryFn: async () => {
      const res = await fetch(`/api/presentation/practice-responses/${selectedLessonId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch practice responses");
      return res.json();
    },
    enabled: !!selectedLessonId,
  });

  const savePracticeResponseMutation = useMutation({
    mutationFn: async (data: { lessonId: number; practiceResponse: string; aiFeedback: string }) => {
      const res = await apiRequest("POST", "/api/presentation/practice-responses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentation/practice-responses", selectedLessonId] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentation/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentation/lessons", selectedLessonId] });
    },
    onError: () => {
      toast({
        title: "Failed to save response",
        description: "Your response was not saved. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const res = await apiRequest("POST", `/api/presentation/progress/${lessonId}`, {
        completed: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentation/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presentation/lessons", selectedLessonId] });
      toast({
        title: "Lesson completed!",
        description: "Great progress! Keep going.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (modules && modules.length > 0 && !selectedLessonId) {
      const firstModule = modules[0];
      if (firstModule.lessons.length > 0) {
        setSelectedLessonId(firstModule.lessons[0].id);
        setExpandedModules(new Set([firstModule.id]));
      }
    }
  }, [modules, selectedLessonId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const selectLesson = (lessonId: number) => {
    setSelectedLessonId(lessonId);
    setPracticeResponse("");
    setPracticeFeedback(null);
    setSidebarOpen(false);
  };
  
  const getPracticeFeedback = async () => {
    if (!practiceResponse.trim() || !currentLesson || isGettingFeedback) return;
    
    setIsGettingFeedback(true);
    setPracticeFeedback(null);
    
    try {
      const res = await apiRequest("POST", "/api/presentation/practice-feedback", {
        lessonId: currentLesson.id,
        practicePrompt: currentLesson.practicePrompt,
        userResponse: practiceResponse.trim(),
        lessonTitle: currentLesson.title,
        scriptText: currentLesson.scriptText?.slice(0, 500),
      });
      const data = await res.json();
      setPracticeFeedback(data.feedback);
      
      savePracticeResponseMutation.mutate({
        lessonId: currentLesson.id,
        practiceResponse: practiceResponse.trim(),
        aiFeedback: data.feedback,
      });
      
      toast({
        title: "Feedback received!",
        description: "Your practice response has been saved.",
      });
    } catch (error) {
      toast({
        title: "Failed to get feedback",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const getModuleProgress = (module: ModuleWithLessons) => {
    const completedCount = module.lessons.filter((l) => l.progress?.completed).length;
    return { completed: completedCount, total: module.lessons.length };
  };

  const findAdjacentLessons = () => {
    if (!modules || !selectedLessonId) return { prev: null, next: null };
    
    const allLessons = modules.flatMap((m) => m.lessons);
    const currentIndex = allLessons.findIndex((l) => l.id === selectedLessonId);
    
    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
    };
  };

  const { prev, next } = findAdjacentLessons();

  const copyScript = () => {
    if (currentLesson?.scriptText) {
      navigator.clipboard.writeText(currentLesson.scriptText);
      toast({
        title: "Script copied!",
        description: "The script has been copied to your clipboard.",
      });
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || isAsking) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: aiQuestion.trim(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setAiQuestion("");
    setIsAsking(true);

    try {
      const lessonContext = currentLesson
        ? `Current Lesson: "${currentLesson.title}"\nScript: ${currentLesson.scriptText?.slice(0, 500)}...`
        : "";

      const res = await apiRequest("POST", "/api/presentation/ask", {
        question: userMessage.content,
        lessonContext,
      });
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch (error) {
      toast({
        title: "Failed to get response",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAsking(false);
    }
  };

  const parseCommonMistakes = (text: string | null): string[] => {
    if (!text) return [];
    return text.split("\n").filter((line) => line.trim().length > 0);
  };

  if (modulesLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="font-semibold text-lg">Teach Me the Presentation</h1>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const renderModulesList = () => (
    <div className="p-4 space-y-2">
      {modules?.map((module) => {
        const progress = getModuleProgress(module);
        const isExpanded = expandedModules.has(module.id);
        const isCurrentModule = module.lessons.some(
          (l) => l.id === selectedLessonId
        );

        return (
          <Collapsible
            key={module.id}
            open={isExpanded}
            onOpenChange={() => toggleModule(module.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isCurrentModule
                    ? "bg-primary/10 border border-primary/30"
                    : "hover-elevate bg-muted/50"
                }`}
                data-testid={`module-trigger-${module.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Module {module.moduleNumber}
                      </span>
                      {progress.completed === progress.total && progress.total > 0 && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{module.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress.completed}/{progress.total} lessons completed
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <Progress
                  value={(progress.completed / Math.max(progress.total, 1)) * 100}
                  className="h-1 mt-2"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 mt-1 space-y-1">
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson.id)}
                    className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      lesson.id === selectedLessonId
                        ? "bg-primary text-primary-foreground"
                        : "hover-elevate"
                    }`}
                    data-testid={`lesson-button-${lesson.id}`}
                  >
                    {lesson.progress?.completed ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <Play className="w-4 h-4 flex-shrink-0 opacity-50" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h1 className="font-semibold text-lg" data-testid="text-page-title">
              Teach Me the Presentation
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-toggle-sidebar"
          >
            <BookOpen className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Modules</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            {renderModulesList()}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <div className="container max-w-6xl mx-auto flex">
        <aside
          className="hidden lg:block w-72 shrink-0 border-r border-border bg-card"
          data-testid="sidebar-modules"
        >
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            {renderModulesList()}
          </ScrollArea>
        </aside>

        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {lessonLoading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : currentLesson ? (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    Lesson {currentLesson.lessonNumber}
                  </Badge>
                  <h2 className="text-2xl font-bold" data-testid="text-lesson-title">
                    {currentLesson.title}
                  </h2>
                </div>
                {!currentLesson.progress?.completed && (
                  <Button
                    onClick={() => markCompleteMutation.mutate(currentLesson.id)}
                    disabled={markCompleteMutation.isPending}
                    className="gap-2"
                    data-testid="button-mark-complete"
                  >
                    {markCompleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Mark Complete
                  </Button>
                )}
                {currentLesson.progress?.completed && (
                  <Badge variant="outline" className="gap-1.5 text-green-600 border-green-300">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Completed
                  </Badge>
                )}
              </div>

              <Card className="p-4 bg-primary/5 border-primary/20" data-testid="section-what-youll-learn">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold flex-1">What You'll Learn</h3>
                  <ListenButton
                    text={currentLesson.psychology 
                      ? `Master the "${currentLesson.title}" technique and understand the psychology behind it. Learn when to apply this approach and avoid common pitfalls that can derail your presentation.`
                      : `In this lesson, you'll learn the key elements of "${currentLesson.title}" and how to effectively deliver this part of the presentation to maximize engagement and conversion.`
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentLesson.psychology 
                    ? `Master the "${currentLesson.title}" technique and understand the psychology behind it. Learn when to apply this approach and avoid common pitfalls that can derail your presentation.`
                    : `In this lesson, you'll learn the key elements of "${currentLesson.title}" and how to effectively deliver this part of the presentation to maximize engagement and conversion.`
                  }
                </p>
              </Card>

              {currentLesson.scriptText && (
                <Card className="p-4" data-testid="section-script">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">The Script</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <ListenButton text={currentLesson.scriptText} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyScript}
                        className="gap-1.5"
                        data-testid="button-copy-script"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {currentLesson.scriptText}
                  </div>
                </Card>
              )}

              {currentLesson.psychology && (
                <Card className="p-4" data-testid="section-psychology">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold flex-1">Why It Works</h3>
                    {currentLesson.mechanism && (
                      <Badge variant="secondary">
                        {currentLesson.mechanism}
                      </Badge>
                    )}
                    <ListenButton text={currentLesson.psychology} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentLesson.psychology}
                  </p>
                </Card>
              )}

              {currentLesson.timing && (
                <Card className="p-4" data-testid="section-timing">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold flex-1">When to Use This</h3>
                    <ListenButton text={currentLesson.timing} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentLesson.timing}
                  </p>
                </Card>
              )}

              {currentLesson.commonMistakes && (
                <Card className="p-4" data-testid="section-mistakes">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold flex-1">Common Mistakes</h3>
                    <ListenButton text={currentLesson.commonMistakes} />
                  </div>
                  <ul className="space-y-2">
                    {parseCommonMistakes(currentLesson.commonMistakes).map((mistake, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {currentLesson.practicePrompt && (
                <Card className="p-4" data-testid="section-practice">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold flex-1">Practice This</h3>
                    <ListenButton text={currentLesson.practicePrompt} />
                  </div>
                  <p className="text-sm mb-4 font-medium">{currentLesson.practicePrompt}</p>
                  <DictationInput
                    value={practiceResponse}
                    onChange={setPracticeResponse}
                    placeholder="Record or type your practice response..."
                    multiline
                    rows={4}
                  />
                  <Button
                    onClick={getPracticeFeedback}
                    disabled={!practiceResponse.trim() || isGettingFeedback}
                    className="mt-4 gap-2 w-full"
                    data-testid="button-get-feedback"
                  >
                    {isGettingFeedback ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isGettingFeedback ? "Getting Feedback..." : "Get AI Feedback"}
                  </Button>
                  
                  {practiceFeedback && (
                    <Card className="mt-4 p-4 bg-primary/5 border-primary/20">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold flex-1">AI Feedback</h4>
                        <ListenButton text={practiceFeedback} />
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {practiceFeedback}
                      </div>
                    </Card>
                  )}
                  
                  {responsesLoading && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Loading previous attempts...</span>
                      </div>
                    </div>
                  )}
                  
                  {!responsesLoading && savedResponses?.responses && savedResponses.responses.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium text-muted-foreground">Previous Attempts ({savedResponses.responses.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {savedResponses.responses.slice(0, 3).map((response) => (
                          <Card key={response.id} className="p-3 bg-muted/30" data-testid={`card-practice-response-${response.id}`}>
                            <div className="text-xs text-muted-foreground mb-2">
                              {new Date(response.createdAt).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <p className="text-sm mb-2 line-clamp-2">{response.practiceResponse}</p>
                            {response.aiFeedback && (
                              <details className="group">
                                <summary className="text-xs text-primary cursor-pointer hover:underline">
                                  View feedback
                                </summary>
                                <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-primary/20 pl-3">
                                  {response.aiFeedback}
                                </div>
                              </details>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <div className="flex items-center justify-between pt-4 border-t gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => prev && selectLesson(prev.id)}
                  disabled={!prev}
                  className="gap-2"
                  data-testid="button-prev-lesson"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  onClick={() => next && selectLesson(next.id)}
                  disabled={!next}
                  className="gap-2"
                  data-testid="button-next-lesson"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No lesson selected</h2>
              <p className="text-sm text-muted-foreground">
                Select a lesson from the sidebar to get started.
              </p>
            </div>
          )}
        </main>
      </div>

      <Button
        className="fixed bottom-24 right-4 z-30 gap-2 shadow-lg"
        onClick={() => setAiChatOpen(true)}
        data-testid="button-ask-ai"
      >
        <MessageSquare className="w-4 h-4" />
        Ask AI
      </Button>

      {aiChatOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Presentation Coach</h2>
                <p className="text-xs text-muted-foreground">
                  Ask about scripts, psychology, or objections
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAiChatOpen(false)}
              data-testid="button-close-ai-chat"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">How can I help?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Ask me anything about the presentation, psychology behind the scripts,
                    or how to handle objections.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Why is the 90-Day Promise effective?",
                      "How do I handle 'I need to think about it'?",
                      "Explain loss aversion in the script",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiQuestion(suggestion);
                        }}
                        data-testid={`suggestion-${suggestion.slice(0, 20)}`}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                    data-testid={`chat-message-${msg.role}-${msg.id}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-card">
            <div className="max-w-2xl mx-auto flex gap-2">
              <div className="flex-1">
                <DictationInput
                  value={aiQuestion}
                  onChange={setAiQuestion}
                  placeholder="Ask a question about the presentation..."
                />
              </div>
              <Button
                onClick={handleAskAI}
                disabled={!aiQuestion.trim() || isAsking}
                size="icon"
                data-testid="button-send-ai-question"
              >
                {isAsking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
