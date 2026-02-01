import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Sparkles, 
  Download, 
  Mail, 
  Eye, 
  FileText, 
  Store, 
  Utensils, 
  Car, 
  Scissors, 
  Truck, 
  Building2,
  Loader2,
  Check,
  Search,
  Wand2,
  AlertCircle,
  Clock,
  CheckCircle2,
  BookmarkPlus,
  BookmarkCheck
} from "lucide-react";
import type { MarketingTemplate, OrganizationMember } from "@shared/schema";

interface MarketingTemplateData {
  id: number;
  name: string;
  description: string;
  industry: string;
  thumbnailUrl: string;
  pdfUrl?: string;
}

const INDUSTRY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  liquor_stores: { label: "Liquor Stores", icon: <Store className="w-4 h-4" /> },
  restaurants_bars: { label: "Restaurants & Bars", icon: <Utensils className="w-4 h-4" /> },
  pizzerias: { label: "Pizzerias", icon: <Utensils className="w-4 h-4" /> },
  food_trucks: { label: "Food Trucks", icon: <Truck className="w-4 h-4" /> },
  automotive: { label: "Automotive", icon: <Car className="w-4 h-4" /> },
  veterinarians: { label: "Veterinarians", icon: <Building2 className="w-4 h-4" /> },
  salons_spas: { label: "Salons & Spas", icon: <Scissors className="w-4 h-4" /> },
  rock_gravel: { label: "Rock & Gravel", icon: <Building2 className="w-4 h-4" /> },
  b2b_level23: { label: "B2B / Level 2&3", icon: <Building2 className="w-4 h-4" /> },
  pos_hotsauce: { label: "HotSauce POS", icon: <FileText className="w-4 h-4" /> },
  merchant_cash_advance: { label: "Cash Advance", icon: <Building2 className="w-4 h-4" /> },
  general: { label: "General", icon: <FileText className="w-4 h-4" /> },
};

const MARKETING_INDUSTRIES = Object.keys(INDUSTRY_LABELS);

interface FlyerGenerationJob {
  jobId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: {
    headline: string;
    subhead: string;
    bullets: string[];
    ctaText: string;
    ctaSubtext?: string;
  };
  heroImageUrl?: string;
  finalFlyerUrl?: string;
  errorMessage?: string;
  savedToLibrary?: boolean;
}

const STATIC_TEMPLATES: MarketingTemplateData[] = [
  { id: 1, name: "Liquor Stores Dual Pricing", description: "Perfect for liquor stores looking to eliminate processing fees", industry: "liquor_stores", thumbnailUrl: "/marketing/liquor-stores.png", pdfUrl: "/marketing/liquor-stores.pdf" },
  { id: 2, name: "Restaurants & Bars", description: "For restaurants and bars ready to save on credit card fees", industry: "restaurants_bars", thumbnailUrl: "/marketing/restaurants-bars.png" },
  { id: 3, name: "Pizzerias", description: "Tailored messaging for pizzerias and delivery businesses", industry: "pizzerias", thumbnailUrl: "/marketing/pizzerias.png" },
  { id: 4, name: "Food Trucks", description: "Mobile-friendly solutions for food truck operators", industry: "food_trucks", thumbnailUrl: "/marketing/food-trucks.png" },
  { id: 5, name: "Automotive Industry", description: "For auto repair shops and car dealerships", industry: "automotive", thumbnailUrl: "/marketing/automotive.png" },
  { id: 6, name: "Veterinarians", description: "Specialized for veterinary clinics and animal hospitals", industry: "veterinarians", thumbnailUrl: "/marketing/veterinarians.png" },
  { id: 7, name: "Salons & Spas", description: "Beauty and wellness industry focused flyer", industry: "salons_spas", thumbnailUrl: "/marketing/salons-spas.png" },
  { id: 8, name: "Rock & Gravel Businesses", description: "For construction materials and aggregate suppliers", industry: "rock_gravel", thumbnailUrl: "/marketing/rock-gravel.png" },
  { id: 9, name: "Level 2 & 3 Processing (B2B)", description: "Lower rates for businesses accepting corporate cards", industry: "b2b_level23", thumbnailUrl: "/marketing/b2b-level23.png" },
  { id: 10, name: "HotSauce POS", description: "Restaurant POS system with dual pricing built-in", industry: "pos_hotsauce", thumbnailUrl: "/marketing/hotsauce-pos.png" },
  { id: 11, name: "Merchant Cash Advance", description: "Fast funding for business owners", industry: "merchant_cash_advance", thumbnailUrl: "/marketing/cash-advance.png" },
  { id: 12, name: "Who is PCBancard?", description: "General company overview flyer", industry: "general", thumbnailUrl: "/marketing/pcbancard-intro.png" },
];

export default function MarketingMaterialsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplateData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  
  const [repName, setRepName] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repEmail, setRepEmail] = useState("");

  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [genIndustry, setGenIndustry] = useState<string>("");
  const [genPrompt, setGenPrompt] = useState("");
  const [genRepName, setGenRepName] = useState("");
  const [genRepPhone, setGenRepPhone] = useState("");
  const [genRepEmail, setGenRepEmail] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [lastCompletedJobId, setLastCompletedJobId] = useState<number | null>(null);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);

  const { data: memberInfo } = useQuery<OrganizationMember>({
    queryKey: ["/api/me/member"],
  });

  const { data: generationJobs = [], refetch: refetchJobs } = useQuery<FlyerGenerationJob[]>({
    queryKey: ["/api/marketing/jobs"],
    refetchInterval: isPolling ? 3000 : false,
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      industry: string; 
      prompt: string; 
      repName: string; 
      repPhone: string; 
      repEmail: string; 
    }) => {
      const response = await apiRequest("POST", "/api/marketing/generate", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Generation started!",
        description: "Your custom flyer is being created. This may take 30-60 seconds.",
      });
      setGenerateSheetOpen(false);
      setGenPrompt("");
      setGenIndustry("");
      setIsPolling(true);
      refetchJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveToLibraryMutation = useMutation({
    mutationFn: async (jobId: number) => {
      setSavingJobId(jobId);
      const response = await apiRequest("POST", `/api/marketing/jobs/${jobId}/save-to-library`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Saved to library!",
        description: "This flyer is now available as a template for future use.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/jobs"] });
      setSavingJobId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save flyer to library.",
        variant: "destructive",
      });
      setSavingJobId(null);
    },
  });

  useEffect(() => {
    if (isPolling && generationJobs.length > 0) {
      const hasActiveJobs = generationJobs.some(
        job => job.status === 'pending' || job.status === 'processing'
      );
      
      if (!hasActiveJobs) {
        setIsPolling(false);
      }

      const newlyCompletedJob = generationJobs.find(
        job => job.status === 'completed' && job.jobId !== lastCompletedJobId
      );
      if (newlyCompletedJob && lastCompletedJobId !== newlyCompletedJob.jobId) {
        setLastCompletedJobId(newlyCompletedJob.jobId);
        toast({
          title: "Flyer ready!",
          description: "Your custom flyer has been generated successfully.",
        });
      }
    }
  }, [generationJobs, isPolling, lastCompletedJobId, toast]);

  const openGenerateSheet = () => {
    if (memberInfo) {
      setGenRepName(`${memberInfo.firstName || ""} ${memberInfo.lastName || ""}`.trim());
      setGenRepPhone(memberInfo.phone || "");
      setGenRepEmail(memberInfo.email || "");
    }
    setGenerateSheetOpen(true);
  };

  const handleGenerateSubmit = () => {
    if (!genPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the flyer you want to create.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      industry: genIndustry,
      prompt: genPrompt.trim(),
      repName: genRepName,
      repPhone: genRepPhone,
      repEmail: genRepEmail,
    });
  };

  const handleDownloadGeneratedFlyer = (job: FlyerGenerationJob) => {
    if (!job.finalFlyerUrl) return;
    
    const link = document.createElement("a");
    link.href = job.finalFlyerUrl;
    link.download = `custom-flyer-${job.jobId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your custom flyer is being downloaded.",
    });
  };

  const getJobStatusBadge = (status: FlyerGenerationJob['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-status-pending">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-status-processing">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-600" data-testid="badge-status-completed">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1" data-testid="badge-status-failed">
            <AlertCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
    }
  };

  const templates = STATIC_TEMPLATES;

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || t.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  const uniqueIndustries = Array.from(new Set(templates.map(t => t.industry)));

  const handleSelectTemplate = (template: MarketingTemplateData) => {
    setSelectedTemplate(template);
    if (memberInfo) {
      setRepName(`${memberInfo.firstName || ""} ${memberInfo.lastName || ""}`.trim());
      setRepPhone(memberInfo.phone || "");
      setRepEmail(memberInfo.email || "");
    }
    setSheetOpen(true);
  };

  const handleDownload = () => {
    if (!selectedTemplate) return;
    
    const link = document.createElement("a");
    link.href = selectedTemplate.thumbnailUrl;
    link.download = `${selectedTemplate.name.replace(/\s+/g, "-").toLowerCase()}-flyer.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: "Your marketing flyer is being downloaded.",
    });
  };

  const handleEmailCopy = () => {
    const emailBody = `Hi,

I wanted to share some information about how PCBancard can help your business eliminate credit card processing fees with our Dual Pricing Program.

Please see the attached flyer for more details.

Best regards,
${repName}
${repPhone}
${repEmail}`;
    
    navigator.clipboard.writeText(emailBody);
    toast({
      title: "Email Body Copied",
      description: "Paste this into your email and attach the downloaded flyer.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="page-title">Marketing Materials</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="space-y-4">
          <p className="text-muted-foreground">
            Select a professional flyer template to share with prospects. Download and personalize with your contact info.
          </p>
          
          <Button 
            size="lg"
            className="w-full gap-2"
            onClick={openGenerateSheet}
            data-testid="button-create-with-ai"
          >
            <Wand2 className="w-5 h-5" />
            Create with AI
          </Button>
        </section>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-templates"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedIndustry === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedIndustry("all")}
              data-testid="filter-all"
            >
              All
            </Badge>
            {uniqueIndustries.map((industry) => {
              const config = INDUSTRY_LABELS[industry];
              return (
                <Badge
                  key={industry}
                  variant={selectedIndustry === industry ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                  onClick={() => setSelectedIndustry(industry)}
                  data-testid={`filter-${industry}`}
                >
                  {config?.icon}
                  {config?.label || industry}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTemplates.map((template) => {
            const industryConfig = INDUSTRY_LABELS[template.industry];
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover-elevate"
                onClick={() => handleSelectTemplate(template)}
                data-testid={`template-card-${template.id}`}
              >
                <div className="aspect-[3/4] relative bg-muted rounded-t-md overflow-hidden">
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    data-testid={`template-image-${template.id}`}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-1" data-testid={`template-name-${template.id}`}>{template.name}</h3>
                  <Badge variant="secondary" data-testid={`template-industry-${template.id}`}>
                    {industryConfig?.label || template.industry}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12" data-testid="empty-state">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2" data-testid="empty-state-title">No templates found</h3>
            <p className="text-sm text-muted-foreground" data-testid="empty-state-description">
              Try adjusting your search or filter.
            </p>
          </div>
        )}

        {generationJobs.length > 0 && (
          <section className="space-y-4" data-testid="section-my-generated-flyers">
            <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="heading-my-generated-flyers">
              <Wand2 className="w-5 h-5 text-primary" />
              My Generated Flyers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generationJobs.map((job) => (
                <Card key={job.jobId} className="p-4 space-y-3" data-testid={`job-card-${job.jobId}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate" data-testid={`job-title-${job.jobId}`}>
                      Flyer #{job.jobId}
                    </span>
                    {getJobStatusBadge(job.status)}
                  </div>

                  {job.status === 'processing' && (
                    <div className="flex items-center gap-3 py-4" data-testid={`job-processing-${job.jobId}`}>
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <div className="text-sm text-muted-foreground">
                        Generating your custom flyer...
                        <br />
                        <span className="text-xs">This may take 30-60 seconds</span>
                      </div>
                    </div>
                  )}

                  {job.status === 'pending' && (
                    <div className="flex items-center gap-3 py-4" data-testid={`job-pending-${job.jobId}`}>
                      <Clock className="w-6 h-6 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Waiting to start...
                      </div>
                    </div>
                  )}

                  {job.status === 'completed' && job.finalFlyerUrl && (
                    <div className="space-y-3">
                      <div 
                        className="aspect-[3/4] rounded-md overflow-hidden bg-muted border"
                        data-testid={`job-thumbnail-container-${job.jobId}`}
                      >
                        <img
                          src={job.finalFlyerUrl}
                          alt={`Generated Flyer #${job.jobId}`}
                          className="w-full h-full object-cover"
                          data-testid={`job-thumbnail-${job.jobId}`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => handleDownloadGeneratedFlyer(job)}
                          data-testid={`button-download-job-${job.jobId}`}
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                        <Button
                          variant={job.savedToLibrary ? "secondary" : "outline"}
                          className="gap-2"
                          onClick={() => saveToLibraryMutation.mutate(job.jobId)}
                          disabled={job.savedToLibrary || savingJobId === job.jobId}
                          data-testid={`button-save-library-${job.jobId}`}
                        >
                          {job.savedToLibrary ? (
                            <>
                              <BookmarkCheck className="w-4 h-4" />
                              Saved
                            </>
                          ) : savingJobId === job.jobId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {job.status === 'failed' && (
                    <div className="flex items-start gap-3 py-2 text-destructive" data-testid={`job-failed-${job.jobId}`}>
                      <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        {job.errorMessage || "Generation failed. Please try again."}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="sheet-title">{selectedTemplate?.name}</SheetTitle>
            <SheetDescription data-testid="sheet-description">{selectedTemplate?.description}</SheetDescription>
          </SheetHeader>

          {selectedTemplate && (
            <div className="mt-6 space-y-6">
              <div 
                className="aspect-[3/4] rounded-lg overflow-hidden border cursor-pointer"
                onClick={() => setPreviewOpen(true)}
                data-testid="sheet-preview-image-container"
              >
                <img
                  src={selectedTemplate.thumbnailUrl}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover"
                  data-testid="sheet-preview-image"
                />
              </div>

              <Tabs defaultValue="download" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="download" data-testid="tab-download">Download</TabsTrigger>
                  <TabsTrigger value="email" data-testid="tab-email">Email</TabsTrigger>
                </TabsList>

                <TabsContent value="download" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Download this flyer to share with prospects. Print it or send it digitally.
                  </p>
                  <Button 
                    className="w-full gap-2" 
                    onClick={handleDownload}
                    data-testid="button-download-flyer"
                  >
                    <Download className="w-4 h-4" />
                    Download Flyer
                  </Button>
                </TabsContent>

                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repName">Your Name</Label>
                      <Input
                        id="repName"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        placeholder="John Smith"
                        data-testid="input-rep-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repPhone">Your Phone</Label>
                      <Input
                        id="repPhone"
                        value={repPhone}
                        onChange={(e) => setRepPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        data-testid="input-rep-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repEmail">Your Email</Label>
                      <Input
                        id="repEmail"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        placeholder="john@pcbancard.com"
                        data-testid="input-rep-email"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full gap-2" 
                      onClick={handleDownload}
                      data-testid="button-download-before-email"
                    >
                      <Download className="w-4 h-4" />
                      1. Download Flyer First
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={handleEmailCopy}
                      data-testid="button-copy-email"
                    >
                      <Mail className="w-4 h-4" />
                      2. Copy Email Body
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    After copying, open your email app, paste the body, and attach the downloaded flyer.
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="w-full sm:max-w-4xl p-0" side="bottom">
          <div className="h-[85vh] overflow-auto p-4">
            <div className="flex justify-end mb-4">
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)} data-testid="button-close-fullscreen">
                Close
              </Button>
            </div>
            {selectedTemplate && (
              <img
                src={selectedTemplate.thumbnailUrl}
                alt={selectedTemplate.name}
                className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                data-testid="fullscreen-preview-image"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={generateSheetOpen} onOpenChange={setGenerateSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="generate-sheet-title">
              <span className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Create Custom Flyer
              </span>
            </SheetTitle>
            <SheetDescription data-testid="generate-sheet-description">
              Use AI to generate a personalized marketing flyer for any industry or business type.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="genIndustry">Industry</Label>
              <Select value={genIndustry} onValueChange={setGenIndustry}>
                <SelectTrigger data-testid="select-industry">
                  <SelectValue placeholder="Select an industry (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {MARKETING_INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry} data-testid={`select-industry-${industry}`}>
                      {INDUSTRY_LABELS[industry]?.label || industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="genPrompt">What kind of flyer do you need?</Label>
              <Textarea
                id="genPrompt"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="e.g., Create a flyer for marina and boat repair businesses"
                className="min-h-[100px]"
                data-testid="input-prompt"
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-sm">Your Contact Info</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="genRepName">Your Name</Label>
                  <Input
                    id="genRepName"
                    value={genRepName}
                    onChange={(e) => setGenRepName(e.target.value)}
                    placeholder="John Smith"
                    data-testid="input-gen-rep-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genRepPhone">Your Phone</Label>
                  <Input
                    id="genRepPhone"
                    value={genRepPhone}
                    onChange={(e) => setGenRepPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    data-testid="input-gen-rep-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genRepEmail">Your Email</Label>
                  <Input
                    id="genRepEmail"
                    value={genRepEmail}
                    onChange={(e) => setGenRepEmail(e.target.value)}
                    placeholder="john@pcbancard.com"
                    data-testid="input-gen-rep-email"
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleGenerateSubmit}
              disabled={generateMutation.isPending}
              data-testid="button-generate-flyer"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Flyer
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Generation takes 30-60 seconds. You'll be notified when your flyer is ready.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
