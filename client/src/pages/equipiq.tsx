import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BottomNav } from "@/components/BottomNav";
import { 
  Bot, 
  Send, 
  Search, 
  ChevronRight,
  ExternalLink,
  Package,
  Building2,
  Lightbulb,
  GraduationCap,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2,
  Trophy,
  Sparkles,
  Monitor,
  Wifi,
  Smartphone,
  CreditCard,
  Globe,
  Zap,
  Mic
} from "lucide-react";

interface Vendor {
  id: number;
  vendorId: string;
  name: string;
  company: string | null;
  website: string | null;
  description: string | null;
  targetMarket: string | null;
  pricingModel: string | null;
  support: string | null;
  keyDifferentiators: string[] | null;
}

interface Product {
  id: number;
  vendorId: string;
  category: string;
  type: string;
  name: string;
  model: string | null;
  description: string | null;
  features: string[] | null;
  bestFor: string[] | null;
  priceRange: string | null;
  url: string | null;
  imageUrl: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const typeIcons: Record<string, typeof Monitor> = {
  countertop: Monitor,
  wireless: Wifi,
  mobile: Smartphone,
  pin_pad: CreditCard,
  pos_system: Monitor,
  gateway: Globe,
  virtual_terminal: Globe,
  software: Zap,
  all_in_one: Package,
  mobile_reader: Smartphone,
  mobile_app: Smartphone,
  feature: Sparkles,
  kiosk: Monitor,
  workstation: Monitor,
  next_gen: Zap,
  pos_software: Monitor,
  integration: Zap,
  loyalty: Sparkles,
  vault: CreditCard,
  invoicing: Globe,
  recurring: Globe,
  pricing: CreditCard,
  fraud: Zap,
  security: Zap,
  marketing: Sparkles,
  batch: Globe,
  b2b: Building2,
};

export default function EquipIQPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm EquipIQ, your AI equipment advisor. Tell me about your merchant's business and I'll recommend the perfect payment solution. What type of business are you helping today?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [quizVendor, setQuizVendor] = useState<string>("all");
  const [quizDifficulty, setQuizDifficulty] = useState<string>("beginner");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/equipiq/vendors"],
  });

  const productsUrl = selectedVendor 
    ? `/api/equipiq/products?vendor=${selectedVendor}`
    : "/api/equipiq/products";
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [productsUrl],
  });

  const recommendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/equipiq/recommend", {
        message,
        conversationHistory: chatMessages,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get recommendation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/equipiq/quiz/generate", {
        vendorId: quizVendor === "all" ? null : quizVendor,
        difficulty: quizDifficulty,
        questionCount: 5,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setQuizQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizScore(0);
      setQuizComplete(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveQuizResultMutation = useMutation({
    mutationFn: async (result: { vendorId: string | null; difficulty: string; totalQuestions: number; correctAnswers: number; score: number }) => {
      const res = await apiRequest("POST", "/api/equipiq/quiz-results", result);
      return res.json();
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim() || recommendMutation.isPending) return;
    
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    recommendMutation.mutate(userMessage);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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
      let ext = "m4a";
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
        const transcribedText = data.text.trim();
        setChatMessages(prev => [...prev, { role: "user", content: transcribedText }]);
        recommendMutation.mutate(transcribedText);
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
      setIsTranscribing(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === quizQuestions[currentQuestionIndex].correctIndex) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
      const score = (quizScore / quizQuestions.length) * 100;
      saveQuizResultMutation.mutate({
        vendorId: quizVendor === "all" ? null : quizVendor,
        difficulty: quizDifficulty,
        totalQuestions: quizQuestions.length,
        correctAnswers: quizScore + (selectedAnswer === quizQuestions[currentQuestionIndex].correctIndex ? 1 : 0),
        score,
      });
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query) ||
      p.vendorId.toLowerCase().includes(query)
    );
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const vendor = vendors.find(v => v.vendorId === product.vendorId);
    const vendorName = vendor?.name || product.vendorId;
    if (!acc[vendorName]) {
      acc[vendorName] = [];
    }
    acc[vendorName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const getTypeIcon = (type: string) => {
    const Icon = typeIcons[type] || Package;
    return Icon;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-6 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">EquipIQ</h1>
              <p className="text-sm text-muted-foreground">AI Equipment Advisor</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="chat" data-testid="tab-chat">
              <Bot className="w-4 h-4 mr-2" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="browse" data-testid="tab-browse">
              <Package className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="learn" data-testid="tab-learn">
              <GraduationCap className="w-4 h-4 mr-2" />
              Learn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <Card className="h-[calc(100vh-320px)] min-h-[300px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Equipment Advisor
                </CardTitle>
                <CardDescription>
                  Describe your merchant's needs and I'll recommend the best solution
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-4 pb-4">
                    {chatMessages.map((message, i) => (
                      <div
                        key={i}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-2 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          data-testid={`chat-message-${i}`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {recommendMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isRecording ? "Listening..." : isTranscribing ? "Transcribing..." : "Describe the merchant's needs..."}
                      onKeyDown={(e) => e.key === "Enter" && !isRecording && !isTranscribing && handleSendMessage()}
                      disabled={recommendMutation.isPending || isRecording || isTranscribing}
                      data-testid="chat-input"
                    />
                    <Button
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={recommendMutation.isPending || isTranscribing}
                      className={isRecording ? "animate-pulse" : ""}
                      data-testid="button-mic"
                    >
                      {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || recommendMutation.isPending || isRecording || isTranscribing}
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse" className="mt-0">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="pl-9"
                    data-testid="search-products"
                  />
                </div>
                <Select value={selectedVendor || "all"} onValueChange={(v) => setSelectedVendor(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[140px]" data-testid="select-vendor">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v.vendorId} value={v.vendorId}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vendorsLoading || productsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-6">
                    {Object.entries(groupedProducts).map(([vendorName, vendorProducts]) => (
                      <div key={vendorName}>
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-4 h-4 text-primary" />
                          <h3 className="font-semibold">{vendorName}</h3>
                          <Badge variant="secondary" className="text-xs">{vendorProducts.length}</Badge>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {vendorProducts.map(product => {
                            const Icon = getTypeIcon(product.type);
                            return (
                              <Card
                                key={product.id}
                                className="cursor-pointer hover-elevate"
                                onClick={() => setSelectedProduct(product)}
                                data-testid={`product-card-${product.id}`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    {product.imageUrl ? (
                                      <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                                        <img 
                                          src={product.imageUrl} 
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                          }}
                                        />
                                        <div className="hidden w-full h-full flex items-center justify-center bg-primary/10">
                                          <Icon className="w-6 h-6 text-primary" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Icon className="w-5 h-5 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm truncate">{product.name}</h4>
                                        {product.model && (
                                          <Badge variant="outline" className="text-xs shrink-0">{product.model}</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {product.description}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs capitalize">
                                          {product.type.replace(/_/g, " ")}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs capitalize">
                                          {product.category}
                                        </Badge>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(groupedProducts).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No products found matching your search.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          <TabsContent value="learn" className="mt-0">
            {!isQuizMode ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Equipment Knowledge Quiz
                    </CardTitle>
                    <CardDescription>
                      Test your knowledge of payment equipment and earn mastery
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Vendor Focus</label>
                        <Select value={quizVendor} onValueChange={setQuizVendor}>
                          <SelectTrigger data-testid="select-quiz-vendor">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Vendors</SelectItem>
                            {vendors.map(v => (
                              <SelectItem key={v.vendorId} value={v.vendorId}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
                        <Select value={quizDifficulty} onValueChange={setQuizDifficulty}>
                          <SelectTrigger data-testid="select-quiz-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setIsQuizMode(true);
                        generateQuizMutation.mutate();
                      }}
                      disabled={generateQuizMutation.isPending}
                      data-testid="button-start-quiz"
                    >
                      {generateQuizMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Questions...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start Quiz
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Vendor Overview
                    </CardTitle>
                    <CardDescription>
                      Quick reference for all payment solution vendors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vendors.map(vendor => (
                        <div key={vendor.vendorId} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{vendor.name}</h4>
                            {vendor.website && (
                              <a
                                href={vendor.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm flex items-center gap-1"
                              >
                                Visit <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{vendor.description}</p>
                          {vendor.keyDifferentiators && vendor.keyDifferentiators.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {vendor.keyDifferentiators.slice(0, 3).map((diff, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{diff}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsQuizMode(false);
                        setQuizQuestions([]);
                      }}
                      data-testid="button-exit-quiz"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Exit
                    </Button>
                    {!quizComplete && quizQuestions.length > 0 && (
                      <Badge variant="secondary">
                        Question {currentQuestionIndex + 1} of {quizQuestions.length}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {generateQuizMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">Generating quiz questions...</p>
                    </div>
                  ) : quizComplete ? (
                    <div className="text-center py-8">
                      <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Quiz Complete!</h3>
                      <p className="text-3xl font-bold text-primary mb-4">
                        {quizScore + (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctIndex ? 1 : 0)}/{quizQuestions.length}
                      </p>
                      <p className="text-muted-foreground mb-6">
                        {((quizScore + (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctIndex ? 1 : 0)) / quizQuestions.length) >= 0.8
                          ? "Excellent work! You really know your equipment!"
                          : ((quizScore + (selectedAnswer === quizQuestions[currentQuestionIndex]?.correctIndex ? 1 : 0)) / quizQuestions.length) >= 0.6
                          ? "Good job! Keep learning to improve."
                          : "Keep studying! You'll get better with practice."}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setIsQuizMode(false)}
                          data-testid="button-back-to-learn"
                        >
                          Back to Learn
                        </Button>
                        <Button
                          onClick={() => generateQuizMutation.mutate()}
                          data-testid="button-try-again"
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  ) : quizQuestions.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">
                        {quizQuestions[currentQuestionIndex].question}
                      </h3>
                      <div className="space-y-2">
                        {quizQuestions[currentQuestionIndex].options.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnswerSelect(i)}
                            disabled={showExplanation}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                              showExplanation
                                ? i === quizQuestions[currentQuestionIndex].correctIndex
                                  ? "bg-green-100 dark:bg-green-900/30 border-green-500"
                                  : i === selectedAnswer
                                  ? "bg-red-100 dark:bg-red-900/30 border-red-500"
                                  : "opacity-50"
                                : "hover:bg-muted hover:border-primary"
                            }`}
                            data-testid={`quiz-option-${i}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm ${
                                showExplanation && i === quizQuestions[currentQuestionIndex].correctIndex
                                  ? "bg-green-500 text-white border-green-500"
                                  : showExplanation && i === selectedAnswer && i !== quizQuestions[currentQuestionIndex].correctIndex
                                  ? "bg-red-500 text-white border-red-500"
                                  : ""
                              }`}>
                                {showExplanation && i === quizQuestions[currentQuestionIndex].correctIndex ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : showExplanation && i === selectedAnswer && i !== quizQuestions[currentQuestionIndex].correctIndex ? (
                                  <XCircle className="w-4 h-4" />
                                ) : (
                                  String.fromCharCode(65 + i)
                                )}
                              </div>
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {showExplanation && (
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Explanation:</p>
                          <p className="text-sm text-muted-foreground">
                            {quizQuestions[currentQuestionIndex].explanation}
                          </p>
                        </div>
                      )}
                      {showExplanation && (
                        <Button
                          className="w-full"
                          onClick={handleNextQuestion}
                          data-testid="button-next-question"
                        >
                          {currentQuestionIndex < quizQuestions.length - 1 ? "Next Question" : "See Results"}
                        </Button>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProduct && (() => {
                const Icon = getTypeIcon(selectedProduct.type);
                return <Icon className="w-5 h-5 text-primary" />;
              })()}
              {selectedProduct?.name}
            </DialogTitle>
            {selectedProduct?.model && (
              <DialogDescription>Model: {selectedProduct.model}</DialogDescription>
            )}
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.imageUrl && (
                <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
              
              {selectedProduct.features && selectedProduct.features.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Key Features</h4>
                  <ul className="space-y-1">
                    {selectedProduct.features.map((feature, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedProduct.bestFor && selectedProduct.bestFor.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Best For</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedProduct.bestFor.map((use, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{use}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="capitalize">
                  {selectedProduct.type.replace(/_/g, " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedProduct.category}
                </Badge>
              </div>

              {selectedProduct.url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedProduct.url!, "_blank")}
                  data-testid="button-view-product"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Vendor Site
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
