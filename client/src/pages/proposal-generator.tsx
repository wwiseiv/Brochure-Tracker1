import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProposalJobStep, ProposalJobStatus, ProposalJobStepStatus, PricingComparison, MerchantScrapedData, SalespersonInfo } from "@shared/schema";
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Loader2,
  CheckCircle,
  DollarSign,
  CreditCard,
  Building2,
  TrendingDown,
  Sparkles,
  FileCheck,
  Monitor,
  X,
  Zap,
  Presentation,
  ExternalLink,
  User,
  ChevronDown,
  Store,
  AlertTriangle,
  Globe,
  Clock,
  XCircle,
  Circle,
  PlayCircle,
  Image as ImageIcon,
  FileOutput,
  CheckCircle2
} from "lucide-react";

interface ParsedProposal {
  merchantName: string;
  preparedFor: string;
  proposalType: "dual_pricing" | "interchange_plus" | "both";
  cardVolumes: {
    visa: { volume: number; transactions: number };
    mastercard: { volume: number; transactions: number };
    discover: { volume: number; transactions: number };
    amex: { volume: number; transactions: number };
  };
  currentCosts: {
    monthlyProcessingFees: number;
    monthlyStatementFee: number;
    monthlyPCIFee: number;
    otherFees: number;
    totalMonthly: number;
  };
  proposedCosts: {
    dualPricing: {
      monthlyProcessingFees: number;
      monthlyFees: number;
      totalMonthly: number;
    };
    interchangePlus: {
      monthlyProcessingFees: number;
      monthlyFees: number;
      totalMonthly: number;
    };
  };
  savings: {
    dualPricingMonthly: number;
    dualPricingAnnual: number;
    interchangePlusMonthly: number;
    interchangePlusAnnual: number;
  };
}

interface EquipmentProduct {
  id: number;
  name: string;
  type: string;
  description: string;
  features: string[];
  priceRange: string;
}

interface Proposal {
  id: number;
  merchantName: string;
  proposalType: string;
  status: string;
  createdAt: string;
  parsedData: ParsedProposal;
  selectedEquipment: EquipmentProduct | null;
}

interface ServerParsedProposal {
  merchantName: string;
  preparedDate?: string | null;
  agentName?: string | null;
  agentTitle?: string | null;
  currentState: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: {
      visa: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      mastercard: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      discover: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      amex: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
    };
    fees: { statementFee: number; pciNonCompliance: number; creditPassthrough: number; otherFees: number; batchHeader: number };
    totalMonthlyCost: number;
    effectiveRatePercent: number;
  };
  optionInterchangePlus?: {
    discountRatePercent: number;
    perTransactionFee: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };
  optionDualPricing?: {
    merchantDiscountRate: number;
    perTransactionFee: number;
    monthlyProgramFee: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };
  proposalType: string;
  extractionWarnings?: string[];
  extractionStatus?: "success" | "partial" | "needs_review";
}

interface ProposalJobResponse {
  id: number;
  status: string;
  currentStep: string | null;
  steps: ProposalJobStepStatus[];
  merchantWebsiteUrl: string | null;
  merchantScrapedData: MerchantScrapedData | null;
  salespersonInfo: SalespersonInfo | null;
  pricingComparison: PricingComparison | null;
  generatedImages: { heroBanner?: string; comparisonBackground?: string; trustVisual?: string } | null;
  selectedEquipmentId: number | null;
  outputFormat: string | null;
  proposalId: number | null;
  pdfUrl: string | null;
  docxUrl: string | null;
  errors: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const STEP_LABELS: Record<ProposalJobStep, { label: string; icon: typeof FileText }> = {
  parsing_documents: { label: "Parsing Documents", icon: FileText },
  scraping_website: { label: "Scraping Website", icon: Globe },
  extracting_pricing: { label: "Extracting Pricing", icon: DollarSign },
  generating_images: { label: "Generating Images", icon: ImageIcon },
  building_document: { label: "Building Document", icon: FileOutput },
  finalizing: { label: "Finalizing", icon: CheckCircle2 },
};

const ALL_STEPS: ProposalJobStep[] = [
  "parsing_documents",
  "scraping_website",
  "extracting_pricing",
  "generating_images",
  "building_document",
  "finalizing",
];

function transformParsedData(server: ServerParsedProposal): ParsedProposal {
  const cardBreakdown = server.currentState?.cardBreakdown || {
    visa: { volume: 0, transactions: 0 },
    mastercard: { volume: 0, transactions: 0 },
    discover: { volume: 0, transactions: 0 },
    amex: { volume: 0, transactions: 0 },
  };
  
  const currentCosts = server.currentState || { totalMonthlyCost: 0 };
  const fees = server.currentState?.fees || {};
  
  return {
    merchantName: server.merchantName || "Unknown Merchant",
    preparedFor: server.merchantName || "Unknown Merchant",
    proposalType: server.proposalType as "dual_pricing" | "interchange_plus" | "both",
    cardVolumes: {
      visa: { volume: cardBreakdown.visa?.volume || 0, transactions: cardBreakdown.visa?.transactions || 0 },
      mastercard: { volume: cardBreakdown.mastercard?.volume || 0, transactions: cardBreakdown.mastercard?.transactions || 0 },
      discover: { volume: cardBreakdown.discover?.volume || 0, transactions: cardBreakdown.discover?.transactions || 0 },
      amex: { volume: cardBreakdown.amex?.volume || 0, transactions: cardBreakdown.amex?.transactions || 0 },
    },
    currentCosts: {
      monthlyProcessingFees: (cardBreakdown.visa?.totalCost || 0) + 
        (cardBreakdown.mastercard?.totalCost || 0) + 
        (cardBreakdown.discover?.totalCost || 0) + 
        (cardBreakdown.amex?.totalCost || 0),
      monthlyStatementFee: fees.statementFee || 0,
      monthlyPCIFee: fees.pciNonCompliance || 0,
      otherFees: (fees.otherFees || 0) + (fees.creditPassthrough || 0) + (fees.batchHeader || 0),
      totalMonthly: currentCosts.totalMonthlyCost || 0,
    },
    proposedCosts: {
      dualPricing: {
        monthlyProcessingFees: server.optionDualPricing?.totalMonthlyCost || 0,
        monthlyFees: server.optionDualPricing?.monthlyProgramFee || 0,
        totalMonthly: server.optionDualPricing?.totalMonthlyCost || 0,
      },
      interchangePlus: {
        monthlyProcessingFees: server.optionInterchangePlus?.totalMonthlyCost || 0,
        monthlyFees: 0,
        totalMonthly: server.optionInterchangePlus?.totalMonthlyCost || 0,
      },
    },
    savings: {
      dualPricingMonthly: server.optionDualPricing?.monthlySavings || 0,
      dualPricingAnnual: server.optionDualPricing?.annualSavings || 0,
      interchangePlusMonthly: server.optionInterchangePlus?.monthlySavings || 0,
      interchangePlusAnnual: server.optionInterchangePlus?.annualSavings || 0,
    },
  };
}

export default function ProposalGeneratorPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedProposal | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentProduct | null>(null);
  const [generatedProposalId, setGeneratedProposalId] = useState<number | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "equipment" | "generated">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRenderer, setSelectedRenderer] = useState<"replit" | "gamma">("replit");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx" | "pptx">("pdf");
  const [gammaUrl, setGammaUrl] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Agent Information (REQUIRED)
  const [agentFirstName, setAgentFirstName] = useState("");
  const [agentLastName, setAgentLastName] = useState("");
  const [agentTitle, setAgentTitle] = useState("Account Executive");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");

  // Merchant Information (OPTIONAL)
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [industryGuess, setIndustryGuess] = useState("");
  const [currentProcessor, setCurrentProcessor] = useState("");
  const [repNotes, setRepNotes] = useState("");

  // Form section states
  const [agentInfoOpen, setAgentInfoOpen] = useState(true);
  const [merchantInfoOpen, setMerchantInfoOpen] = useState(false);

  // Form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Extraction warnings from PDF parsing
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);

  // Agentic workflow state
  const [workflowMode, setWorkflowMode] = useState<"manual" | "agentic">("manual");
  const [agenticStep, setAgenticStep] = useState<"input" | "progress" | "complete">("input");
  const [dualPricingFile, setDualPricingFile] = useState<File | null>(null);
  const [interchangePlusFile, setInterchangePlusFile] = useState<File | null>(null);
  const [merchantWebsiteUrl, setMerchantWebsiteUrl] = useState("");
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<ProposalJobResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateAgentInfo = () => {
    const errors: Record<string, string> = {};
    if (!agentFirstName.trim()) errors.agentFirstName = "First name is required";
    if (!agentLastName.trim()) errors.agentLastName = "Last name is required";
    if (!agentPhone.trim()) errors.agentPhone = "Phone number is required";
    if (!agentEmail.trim()) errors.agentEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) errors.agentEmail = "Invalid email format";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getIntakeFormData = () => ({
    agent: {
      firstName: agentFirstName,
      lastName: agentLastName,
      title: agentTitle,
      phone: agentPhone,
      email: agentEmail,
    },
    merchant: {
      businessName,
      ownerName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessWebsite,
      industryGuess,
      currentProcessor,
      repNotes,
    },
  });

  const { data: proposals, isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: equipment } = useQuery<EquipmentProduct[]>({
    queryKey: ["/api/equipiq/products"],
  });
  
  const { data: myPermissions, isLoading: permissionsLoading } = useQuery<{ canAccessProposals?: boolean }>({
    queryKey: ["/api/me/permissions"],
  });

  const parseMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const allResults: any[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/proposals/parse", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to parse PDF" }));
          throw new Error(errorData.error || errorData.message || `Failed to parse ${file.name}`);
        }
        const result = await res.json();
        allResults.push({ data: result.data || result, fileName: file.name });
      }
      return allResults;
    },
    onSuccess: (results) => {
      if (results.length > 0) {
        const serverData = results[0].data as ServerParsedProposal;
        const transformedData = transformParsedData(serverData);
        setParsedData(transformedData);
        
        if (serverData.extractionWarnings && serverData.extractionWarnings.length > 0) {
          setExtractionWarnings(serverData.extractionWarnings);
        } else {
          setExtractionWarnings([]);
        }
        
        setStep("review");
        toast({
          title: "PDFs Parsed Successfully",
          description: `Extracted data from ${results.length} file${results.length > 1 ? 's' : ''}`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error Parsing PDF",
        description: error instanceof Error ? error.message : "Failed to parse the PDF file",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { 
      parsedData: ParsedProposal; 
      selectedTerminalId?: number; 
      useAI?: boolean;
      renderer?: "replit" | "gamma";
      format?: "pdf" | "docx" | "pptx";
      intakeData?: ReturnType<typeof getIntakeFormData>;
    }) => {
      const res = await apiRequest("POST", "/api/proposals/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedProposalId(data.id);
      if (data.gammaUrl) {
        setGammaUrl(data.gammaUrl);
      }
      if (data.fallback) {
        setUsedFallback(true);
        toast({
          title: "Used Fallback Renderer",
          description: data.fallbackReason || "Gamma was unavailable, generated with local renderer instead",
        });
      }
      setStep("generated");
      toast({
        title: "Proposal Generated",
        description: "Your professional proposal is ready for download!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Generating Proposal",
        description: error instanceof Error ? error.message : "Failed to generate proposal",
        variant: "destructive",
      });
    },
  });

  // Agentic build mutation
  const startBuildMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (dualPricingFile) {
        formData.append("dualPricingFile", dualPricingFile);
      }
      if (interchangePlusFile) {
        formData.append("interchangePlusFile", interchangePlusFile);
      }
      if (merchantWebsiteUrl) {
        formData.append("merchantWebsiteUrl", merchantWebsiteUrl);
      }
      formData.append("salespersonName", `${agentFirstName} ${agentLastName}`.trim());
      formData.append("salespersonTitle", agentTitle);
      formData.append("salespersonEmail", agentEmail);
      formData.append("salespersonPhone", agentPhone);
      formData.append("outputFormat", "pdf");

      const res = await fetch("/api/proposals/build", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to start build" }));
        throw new Error(errorData.error || errorData.message || "Failed to start build");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setAgenticStep("progress");
      setIsPolling(true);
      toast({
        title: "Build Started",
        description: "Your proposal is being generated...",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Starting Build",
        description: error instanceof Error ? error.message : "Failed to start build",
        variant: "destructive",
      });
    },
  });

  // Poll for job status
  const pollJobStatus = async (jobId: number) => {
    try {
      const res = await fetch(`/api/proposals/build/${jobId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch job status");
      }
      const data: ProposalJobResponse = await res.json();
      setJobStatus(data);

      if (data.status === "completed" || data.status === "failed") {
        setIsPolling(false);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (data.status === "completed") {
          setAgenticStep("complete");
          toast({
            title: "Proposal Complete!",
            description: "Your professional proposal is ready for download.",
          });
        } else {
          toast({
            title: "Build Failed",
            description: data.errors?.join(", ") || "An error occurred during generation",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error polling job status:", error);
    }
  };

  // Start/stop polling
  useEffect(() => {
    if (isPolling && currentJobId) {
      pollJobStatus(currentJobId);
      pollingIntervalRef.current = setInterval(() => {
        pollJobStatus(currentJobId);
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isPolling, currentJobId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleStartBuild = () => {
    if (!validateAgentInfo()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required salesperson information",
        variant: "destructive",
      });
      return;
    }
    if (!dualPricingFile && !interchangePlusFile) {
      toast({
        title: "Missing Files",
        description: "Please upload at least one cost analysis file",
        variant: "destructive",
      });
      return;
    }
    startBuildMutation.mutate();
  };

  const resetAgenticWorkflow = () => {
    setAgenticStep("input");
    setDualPricingFile(null);
    setInterchangePlusFile(null);
    setMerchantWebsiteUrl("");
    setCurrentJobId(null);
    setJobStatus(null);
    setIsPolling(false);
    setAgentFirstName("");
    setAgentLastName("");
    setAgentTitle("Account Executive");
    setAgentPhone("");
    setAgentEmail("");
    setFormErrors({});
  };

  const getStepStatus = (stepName: ProposalJobStep): ProposalJobStatus => {
    if (!jobStatus?.steps) return "pending";
    const stepInfo = jobStatus.steps.find(s => s.step === stepName);
    return stepInfo?.status || "pending";
  };

  const getStepMessage = (stepName: ProposalJobStep): string => {
    if (!jobStatus?.steps) return "";
    const stepInfo = jobStatus.steps.find(s => s.step === stepName);
    return stepInfo?.message || "";
  };

  const getCurrentStepMessage = (): string => {
    if (!jobStatus?.currentStep) return "Starting...";
    const stepInfo = jobStatus.steps?.find(s => s.step === jobStatus.currentStep);
    return stepInfo?.message || "Processing...";
  };

  const getProgressPercent = (): number => {
    if (!jobStatus?.steps) return 0;
    const completedSteps = jobStatus.steps.filter(s => s.status === "completed").length;
    return Math.round((completedSteps / ALL_STEPS.length) * 100);
  };

  const supportedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const isValidFile = (file: File) => {
    const validType = supportedMimeTypes.includes(file.type) || 
      /\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name);
    return validType && file.size > 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(isValidFile);
    const emptyFiles = files.filter(f => f.size === 0);
    const invalidTypeFiles = files.filter(f => f.size > 0 && !isValidFile(f));
    
    if (emptyFiles.length > 0) {
      toast({
        title: "Empty files skipped",
        description: `${emptyFiles.length} file(s) with 0 bytes were not added`,
        variant: "destructive",
      });
    }
    
    if (invalidTypeFiles.length > 0) {
      toast({
        title: "Unsupported files skipped",
        description: `${invalidTypeFiles.length} file(s) with unsupported format were not added`,
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(isValidFile);
    const emptyFiles = files.filter(f => f.size === 0);
    const invalidTypeFiles = files.filter(f => f.size > 0 && !isValidFile(f));
    
    if (emptyFiles.length > 0) {
      toast({
        title: "Empty files skipped",
        description: `${emptyFiles.length} file(s) with 0 bytes were not added`,
        variant: "destructive",
      });
    }
    
    if (invalidTypeFiles.length > 0) {
      toast({
        title: "Unsupported files skipped",
        description: `${invalidTypeFiles.length} file(s) with unsupported format were not added`,
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleParse = () => {
    if (!validateAgentInfo()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required agent information",
        variant: "destructive",
      });
      setAgentInfoOpen(true);
      return;
    }
    if (uploadedFiles.length > 0) {
      parseMutation.mutate(uploadedFiles);
    }
  };

  const handleGenerate = (useAI: boolean) => {
    if (parsedData) {
      setUsedFallback(false);
      setGammaUrl(null);
      generateMutation.mutate({
        parsedData,
        selectedTerminalId: selectedEquipment?.id,
        useAI,
        renderer: selectedRenderer,
        format: outputFormat,
        intakeData: getIntakeFormData(),
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTotalVolume = () => {
    if (!parsedData?.cardVolumes) return 0;
    return (
      parsedData.cardVolumes.visa.volume +
      parsedData.cardVolumes.mastercard.volume +
      parsedData.cardVolumes.discover.volume +
      parsedData.cardVolumes.amex.volume
    );
  };

  const getStepIcon = (status: ProposalJobStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const renderAgenticInputStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Salesperson Information
            <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
          </CardTitle>
          <CardDescription>
            Your contact information for the proposal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="John"
                value={agentFirstName}
                onChange={(e) => setAgentFirstName(e.target.value)}
                className={formErrors.agentFirstName ? "border-destructive" : ""}
                data-testid="input-agentic-first-name"
              />
              {formErrors.agentFirstName && (
                <p className="text-xs text-destructive">{formErrors.agentFirstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Smith"
                value={agentLastName}
                onChange={(e) => setAgentLastName(e.target.value)}
                className={formErrors.agentLastName ? "border-destructive" : ""}
                data-testid="input-agentic-last-name"
              />
              {formErrors.agentLastName && (
                <p className="text-xs text-destructive">{formErrors.agentLastName}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Account Executive"
              value={agentTitle}
              onChange={(e) => setAgentTitle(e.target.value)}
              data-testid="input-agentic-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
                className={formErrors.agentPhone ? "border-destructive" : ""}
                data-testid="input-agentic-phone"
              />
              {formErrors.agentPhone && (
                <p className="text-xs text-destructive">{formErrors.agentPhone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                placeholder="john.smith@company.com"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                className={formErrors.agentEmail ? "border-destructive" : ""}
                data-testid="input-agentic-email"
              />
              {formErrors.agentEmail && (
                <p className="text-xs text-destructive">{formErrors.agentEmail}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Merchant Website
            <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Enter the merchant's website URL to automatically scrape business information and generate custom branding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="url"
            placeholder="https://www.merchantwebsite.com"
            value={merchantWebsiteUrl}
            onChange={(e) => setMerchantWebsiteUrl(e.target.value)}
            data-testid="input-merchant-website"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Cost Analysis Files
            <Badge variant="destructive" className="ml-2 text-xs">At least one required</Badge>
          </CardTitle>
          <CardDescription>
            Upload the Dual Pricing and/or Interchange Plus cost analysis PDFs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="font-medium">Dual Pricing Analysis</Label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dualPricingFile ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 0) {
                      setDualPricingFile(file);
                    }
                  }}
                  className="hidden"
                  id="dual-pricing-upload"
                  data-testid="input-dual-pricing-file"
                />
                {dualPricingFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium truncate max-w-[150px]">{dualPricingFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(dualPricingFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDualPricingFile(null)}
                      data-testid="button-remove-dual-pricing"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="dual-pricing-upload" className="cursor-pointer block py-4">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF only</p>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-medium">Interchange Plus Analysis</Label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                interchangePlusFile ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 0) {
                      setInterchangePlusFile(file);
                    }
                  }}
                  className="hidden"
                  id="interchange-plus-upload"
                  data-testid="input-interchange-plus-file"
                />
                {interchangePlusFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium truncate max-w-[150px]">{interchangePlusFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(interchangePlusFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInterchangePlusFile(null)}
                      data-testid="button-remove-interchange-plus"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="interchange-plus-upload" className="cursor-pointer block py-4">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF only</p>
                  </label>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleStartBuild}
        disabled={startBuildMutation.isPending || (!dualPricingFile && !interchangePlusFile)}
        data-testid="button-start-build"
      >
        {startBuildMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting Build...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Proposal with AI
          </>
        )}
      </Button>
    </div>
  );

  const renderAgenticProgressStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            Building Your Proposal
          </CardTitle>
          <CardDescription>
            {getCurrentStepMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={getProgressPercent()} className="h-2" data-testid="progress-bar" />
          <p className="text-sm text-muted-foreground text-center">{getProgressPercent()}% Complete</p>

          <div className="space-y-3 mt-6">
            {ALL_STEPS.map((stepName) => {
              const status = getStepStatus(stepName);
              const message = getStepMessage(stepName);
              const stepInfo = STEP_LABELS[stepName];
              const StepIcon = stepInfo.icon;
              
              return (
                <div
                  key={stepName}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    status === "running" ? "bg-primary/5 border border-primary/20" :
                    status === "completed" ? "bg-green-500/5" :
                    status === "failed" ? "bg-destructive/5" : "bg-muted/30"
                  }`}
                  data-testid={`step-${stepName}`}
                >
                  {getStepIcon(status)}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${
                      status === "running" ? "text-primary" :
                      status === "completed" ? "text-green-600 dark:text-green-400" :
                      status === "failed" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {stepInfo.label}
                    </p>
                    {message && (
                      <p className="text-sm text-muted-foreground truncate">{message}</p>
                    )}
                  </div>
                  <StepIcon className={`w-4 h-4 ${
                    status === "running" ? "text-primary" :
                    status === "completed" ? "text-green-500" :
                    status === "failed" ? "text-destructive" : "text-muted-foreground"
                  }`} />
                </div>
              );
            })}
          </div>

          {jobStatus?.errors && jobStatus.errors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {jobStatus.errors.map((err, i) => (
                    <li key={i} className="text-sm">{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderAgenticCompleteStep = () => {
    const pricing = jobStatus?.pricingComparison;
    const merchant = jobStatus?.merchantScrapedData;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-center">Proposal Generated!</CardTitle>
            <CardDescription className="text-center">
              Your professional proposal is ready for download.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agenticJobId && (
              <a
                href={`/api/proposals/build/${agenticJobId}/download`}
                download
                className="block"
                data-testid="download-agentic-pdf"
              >
                <Button variant="outline" className="w-full h-auto py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div className="text-left">
                      <p className="font-medium">Download PDF</p>
                      <p className="text-sm text-muted-foreground">Professional PDF document</p>
                    </div>
                  </div>
                </Button>
              </a>
            )}
            
            {jobStatus?.docxUrl && (
              <a
                href={jobStatus.docxUrl}
                download
                className="block"
                data-testid="download-agentic-docx"
              >
                <Button variant="outline" className="w-full h-auto py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">Download Word</p>
                      <p className="text-sm text-muted-foreground">Editable DOCX document</p>
                    </div>
                  </div>
                </Button>
              </a>
            )}

            {!agenticJobId && !jobStatus?.docxUrl && jobStatus?.proposalId && (
              <>
                <a
                  href={`/api/proposals/${jobStatus.proposalId}/download/pdf`}
                  download
                  className="block"
                  data-testid="download-agentic-pdf"
                >
                  <Button variant="outline" className="w-full h-auto py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-red-500" />
                      <div className="text-left">
                        <p className="font-medium">Download PDF</p>
                        <p className="text-sm text-muted-foreground">Professional PDF document</p>
                      </div>
                    </div>
                  </Button>
                </a>
                <a
                  href={`/api/proposals/${jobStatus.proposalId}/download/docx`}
                  download
                  className="block"
                  data-testid="download-agentic-docx"
                >
                  <Button variant="outline" className="w-full h-auto py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div className="text-left">
                        <p className="font-medium">Download Word</p>
                        <p className="text-sm text-muted-foreground">Editable DOCX document</p>
                      </div>
                    </div>
                  </Button>
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {merchant && (merchant.businessName || merchant.address || merchant.phone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Merchant Information
              </CardTitle>
              <CardDescription>Scraped from website</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {merchant.businessName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Business Name</p>
                    <p className="font-medium">{merchant.businessName}</p>
                  </div>
                )}
                {merchant.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{merchant.industry}</p>
                  </div>
                )}
                {merchant.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{merchant.address}</p>
                  </div>
                )}
                {merchant.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{merchant.phone}</p>
                  </div>
                )}
                {merchant.businessDescription && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{merchant.businessDescription}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {pricing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Pricing Comparison
              </CardTitle>
              <CardDescription>Side-by-side cost analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4"></th>
                      <th className="text-right py-2 px-4">Current</th>
                      {pricing.dualPricing && (
                        <th className={`text-right py-2 px-4 ${pricing.recommendedOption === "dual_pricing" ? "text-primary font-bold" : ""}`}>
                          Dual Pricing
                          {pricing.recommendedOption === "dual_pricing" && (
                            <Badge variant="default" className="ml-2 text-xs">Recommended</Badge>
                          )}
                        </th>
                      )}
                      {pricing.interchangePlus && (
                        <th className={`text-right py-2 px-4 ${pricing.recommendedOption === "interchange_plus" ? "text-primary font-bold" : ""}`}>
                          Interchange+
                          {pricing.recommendedOption === "interchange_plus" && (
                            <Badge variant="default" className="ml-2 text-xs">Recommended</Badge>
                          )}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4">Monthly Volume</td>
                      <td className="text-right py-2 px-4">{formatCurrency(pricing.currentProcessor.monthlyVolume)}</td>
                      {pricing.dualPricing && <td className="text-right py-2 px-4">-</td>}
                      {pricing.interchangePlus && <td className="text-right py-2 px-4">-</td>}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">Monthly Fees</td>
                      <td className="text-right py-2 px-4">{formatCurrency(pricing.currentProcessor.monthlyFees)}</td>
                      {pricing.dualPricing && (
                        <td className="text-right py-2 px-4">{formatCurrency(pricing.dualPricing.monthlyFees)}</td>
                      )}
                      {pricing.interchangePlus && (
                        <td className="text-right py-2 px-4">{formatCurrency(pricing.interchangePlus.monthlyFees)}</td>
                      )}
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4">Annual Cost</td>
                      <td className="text-right py-2 px-4">{formatCurrency(pricing.currentProcessor.annualCost)}</td>
                      {pricing.dualPricing && (
                        <td className="text-right py-2 px-4">{formatCurrency(pricing.dualPricing.monthlyFees * 12)}</td>
                      )}
                      {pricing.interchangePlus && (
                        <td className="text-right py-2 px-4">{formatCurrency(pricing.interchangePlus.monthlyFees * 12)}</td>
                      )}
                    </tr>
                    <tr className="bg-green-500/5">
                      <td className="py-2 pr-4 font-medium">Monthly Savings</td>
                      <td className="text-right py-2 px-4">-</td>
                      {pricing.dualPricing && (
                        <td className="text-right py-2 px-4 text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(pricing.dualPricing.monthlySavings)}
                        </td>
                      )}
                      {pricing.interchangePlus && (
                        <td className="text-right py-2 px-4 text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(pricing.interchangePlus.monthlySavings)}
                        </td>
                      )}
                    </tr>
                    <tr className="bg-green-500/10">
                      <td className="py-2 pr-4 font-bold">Annual Savings</td>
                      <td className="text-right py-2 px-4">-</td>
                      {pricing.dualPricing && (
                        <td className="text-right py-2 px-4 text-green-600 dark:text-green-400 font-bold text-lg">
                          {formatCurrency(pricing.dualPricing.annualSavings)}
                        </td>
                      )}
                      {pricing.interchangePlus && (
                        <td className="text-right py-2 px-4 text-green-600 dark:text-green-400 font-bold text-lg">
                          {formatCurrency(pricing.interchangePlus.annualSavings)}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={resetAgenticWorkflow}
          data-testid="button-new-agentic-proposal"
        >
          Create Another Proposal
        </Button>
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <Collapsible open={agentInfoOpen} onOpenChange={setAgentInfoOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="toggle-agent-info">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Agent Information
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </CardTitle>
              <ChevronDown className={`w-5 h-5 transition-transform ${agentInfoOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CardDescription>
              Your contact information for the proposal
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-first-name">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agent-first-name"
                    placeholder="John"
                    value={agentFirstName}
                    onChange={(e) => setAgentFirstName(e.target.value)}
                    className={formErrors.agentFirstName ? "border-destructive" : ""}
                    data-testid="input-agent-first-name"
                  />
                  {formErrors.agentFirstName && (
                    <p className="text-xs text-destructive">{formErrors.agentFirstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-last-name">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agent-last-name"
                    placeholder="Smith"
                    value={agentLastName}
                    onChange={(e) => setAgentLastName(e.target.value)}
                    className={formErrors.agentLastName ? "border-destructive" : ""}
                    data-testid="input-agent-last-name"
                  />
                  {formErrors.agentLastName && (
                    <p className="text-xs text-destructive">{formErrors.agentLastName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-title">Title</Label>
                <Input
                  id="agent-title"
                  placeholder="Account Executive"
                  value={agentTitle}
                  onChange={(e) => setAgentTitle(e.target.value)}
                  data-testid="input-agent-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agent-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    className={formErrors.agentPhone ? "border-destructive" : ""}
                    data-testid="input-agent-phone"
                  />
                  {formErrors.agentPhone && (
                    <p className="text-xs text-destructive">{formErrors.agentPhone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agent-email"
                    type="email"
                    placeholder="john.smith@company.com"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    className={formErrors.agentEmail ? "border-destructive" : ""}
                    data-testid="input-agent-email"
                  />
                  {formErrors.agentEmail && (
                    <p className="text-xs text-destructive">{formErrors.agentEmail}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card>
        <Collapsible open={merchantInfoOpen} onOpenChange={setMerchantInfoOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="toggle-merchant-info">
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                Merchant Information
                <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
              </CardTitle>
              <ChevronDown className={`w-5 h-5 transition-transform ${merchantInfoOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CardDescription>
              Pre-fill merchant details if known (can be extracted from PDF)
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    placeholder="ABC Restaurant LLC"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    data-testid="input-business-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-name">Owner Name</Label>
                  <Input
                    id="owner-name"
                    placeholder="Jane Doe"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    data-testid="input-owner-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-address">Business Address</Label>
                <Input
                  id="business-address"
                  placeholder="123 Main St, City, State 12345"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  data-testid="input-business-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Business Phone</Label>
                  <Input
                    id="business-phone"
                    type="tel"
                    placeholder="(555) 987-6543"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    data-testid="input-business-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-email">Business Email</Label>
                  <Input
                    id="business-email"
                    type="email"
                    placeholder="info@abcrestaurant.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    data-testid="input-business-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-website">
                  Business Website
                  <span className="text-xs text-muted-foreground ml-2">(triggers research)</span>
                </Label>
                <Input
                  id="business-website"
                  type="url"
                  placeholder="https://www.abcrestaurant.com"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  data-testid="input-business-website"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry-guess">Industry Type</Label>
                  <Input
                    id="industry-guess"
                    placeholder="Restaurant, Retail, Medical, etc."
                    value={industryGuess}
                    onChange={(e) => setIndustryGuess(e.target.value)}
                    data-testid="input-industry-guess"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-processor">Current Processor</Label>
                  <Select value={currentProcessor} onValueChange={setCurrentProcessor}>
                    <SelectTrigger id="current-processor" data-testid="select-current-processor">
                      <SelectValue placeholder="Select processor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="toast">Toast</SelectItem>
                      <SelectItem value="clover">Clover</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="firstdata">First Data</SelectItem>
                      <SelectItem value="worldpay">Worldpay</SelectItem>
                      <SelectItem value="heartland">Heartland</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-notes">Rep Notes</Label>
                <Textarea
                  id="rep-notes"
                  placeholder="Additional notes about the merchant, their pain points, or specific needs..."
                  value={repNotes}
                  onChange={(e) => setRepNotes(e.target.value)}
                  rows={3}
                  data-testid="input-rep-notes"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload Pricing PDF
          </CardTitle>
          <CardDescription>
            Upload a Dual Pricing or Interchange Plus proposal PDF to extract merchant data and generate a professional proposal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            data-testid="upload-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              multiple
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <FileText className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-lg font-medium mb-2">
                {isDragging 
                  ? "Drop your files here" 
                  : uploadedFiles.length > 0 
                    ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} selected` 
                    : "Click to upload or drag files here"}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, Word, and Excel files
              </p>
            </label>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button 
                onClick={handleParse}
                disabled={parseMutation.isPending}
                className="w-full mt-4"
                data-testid="button-parse-pdf"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse {uploadedFiles.length} PDF{uploadedFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {proposals && proposals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Previously generated proposals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposals.slice(0, 5).map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`proposal-item-${proposal.id}`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{proposal.merchantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={proposal.status === "completed" ? "default" : "secondary"}>
                      {proposal.status}
                    </Badge>
                    <a
                      href={`/api/proposals/${proposal.id}/download/pdf`}
                      download
                      className="text-primary hover:underline"
                      data-testid={`download-proposal-${proposal.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {extractionWarnings.length > 0 && (
        <Alert variant="warning" data-testid="alert-extraction-warnings">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Extraction Warnings</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Some data may need manual review:</p>
            <ul className="list-disc list-inside space-y-1">
              {extractionWarnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">You can still proceed, but please verify the extracted values are accurate.</p>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Merchant Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Business Name</Label>
              <p className="text-lg font-medium">{parsedData?.merchantName || parsedData?.preparedFor || "Unknown"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Proposal Type</Label>
              <Badge variant="outline" className="mt-1">
                {parsedData?.proposalType === "dual_pricing" ? "Dual Pricing" : 
                 parsedData?.proposalType === "interchange_plus" ? "Interchange Plus" : "Both"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Card Volume Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Visa</p>
              <p className="text-lg font-semibold">{formatCurrency(parsedData?.cardVolumes?.visa?.volume || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Mastercard</p>
              <p className="text-lg font-semibold">{formatCurrency(parsedData?.cardVolumes?.mastercard?.volume || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Discover</p>
              <p className="text-lg font-semibold">{formatCurrency(parsedData?.cardVolumes?.discover?.volume || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Amex</p>
              <p className="text-lg font-semibold">{formatCurrency(parsedData?.cardVolumes?.amex?.volume || 0)}</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Total Monthly Volume</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(getTotalVolume())}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Cost Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Current Costs</p>
              <p className="text-2xl font-bold">{formatCurrency(parsedData?.currentCosts?.totalMonthly || 0)}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            <div className="p-4 rounded-lg border border-primary bg-primary/5">
              <p className="text-sm font-medium text-muted-foreground mb-2">Dual Pricing</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(parsedData?.proposedCosts?.dualPricing?.totalMonthly || 0)}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Interchange Plus</p>
              <p className="text-2xl font-bold">{formatCurrency(parsedData?.proposedCosts?.interchangePlus?.totalMonthly || 0)}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-green-500" />
            Estimated Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-muted-foreground mb-2">Dual Pricing Savings</p>
              <p className="text-3xl font-bold text-green-500">{formatCurrency(parsedData?.savings?.dualPricingMonthly || 0)}</p>
              <p className="text-sm text-muted-foreground">per month / {formatCurrency(parsedData?.savings?.dualPricingAnnual || 0)} per year</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground mb-2">Interchange Plus Savings</p>
              <p className="text-3xl font-bold">{formatCurrency(parsedData?.savings?.interchangePlusMonthly || 0)}</p>
              <p className="text-sm text-muted-foreground">per month / {formatCurrency(parsedData?.savings?.interchangePlusAnnual || 0)} per year</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => {
            setStep("upload");
            setParsedData(null);
            setUploadedFiles([]);
          }}
          data-testid="button-back-upload"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          className="flex-1"
          onClick={() => setStep("equipment")}
          data-testid="button-continue-equipment"
        >
          Continue to Equipment Selection
        </Button>
      </div>
    </div>
  );

  const renderEquipmentStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Terminal Selection
          </CardTitle>
          <CardDescription>
            Choose a recommended terminal for the merchant (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedEquipment === null ? "border-primary bg-primary/5" : "hover-elevate"
              }`}
              onClick={() => setSelectedEquipment(null)}
              data-testid="equipment-none"
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedEquipment === null ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {selectedEquipment === null && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium">No Equipment</p>
                  <p className="text-sm text-muted-foreground">Generate proposal without equipment recommendation</p>
                </div>
              </div>
            </div>

            {equipment?.filter(eq => eq.type === "countertop" || eq.type === "wireless").slice(0, 6).map((eq) => (
              <div
                key={eq.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedEquipment?.id === eq.id ? "border-primary bg-primary/5" : "hover-elevate"
                }`}
                onClick={() => setSelectedEquipment(eq)}
                data-testid={`equipment-${eq.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedEquipment?.id === eq.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {selectedEquipment?.id === eq.id && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{eq.name}</p>
                      <Badge variant="outline">{eq.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{eq.description}</p>
                    {eq.priceRange && (
                      <p className="text-sm font-medium text-primary mt-1">{eq.priceRange}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" />
            Output Method
          </CardTitle>
          <CardDescription>
            Choose how to generate your proposal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedRenderer === "replit" ? "border-primary bg-primary/5" : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedRenderer("replit");
                if (outputFormat === "pptx") setOutputFormat("pdf");
              }}
              data-testid="renderer-replit"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedRenderer === "replit" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Replit Native</p>
                  <p className="text-sm text-muted-foreground">Fast DOCX or PDF generation</p>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>• Editable Word document</p>
                <p>• No external API needed</p>
                <p>• Instant generation</p>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedRenderer === "gamma" ? "border-primary bg-primary/5" : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedRenderer("gamma");
                setOutputFormat("pdf");
              }}
              data-testid="renderer-gamma"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedRenderer === "gamma" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Presentation className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Gamma Presentation</p>
                  <p className="text-sm text-muted-foreground">AI-designed presentation</p>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>• Professional design</p>
                <p>• Animated slides</p>
                <p>• PDF or PPTX export</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label className="mb-2 block">Output Format</Label>
            <Select
              value={outputFormat}
              onValueChange={(val) => setOutputFormat(val as "pdf" | "docx" | "pptx")}
            >
              <SelectTrigger data-testid="select-format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                {selectedRenderer === "replit" && (
                  <SelectItem value="docx">Word Document (DOCX)</SelectItem>
                )}
                {selectedRenderer === "gamma" && (
                  <SelectItem value="pptx">PowerPoint (PPTX)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => setStep("review")}
          data-testid="button-back-review"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          variant="outline"
          onClick={() => handleGenerate(false)}
          disabled={generateMutation.isPending}
          data-testid="button-generate-basic"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          Basic Proposal
        </Button>
        <Button
          className="flex-1"
          onClick={() => handleGenerate(true)}
          disabled={generateMutation.isPending}
          data-testid="button-generate-ai"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI Enhancement
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderGeneratedStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-center">Proposal Generated!</CardTitle>
          <CardDescription className="text-center">
            Your professional proposal for {parsedData?.merchantName || parsedData?.preparedFor} is ready for download.
          </CardDescription>
          {usedFallback && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Gamma was unavailable, generated with local renderer instead
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href={`/api/proposals/${generatedProposalId}/download/pdf`}
              download
              className="block"
              data-testid="download-pdf"
            >
              <Button variant="outline" className="w-full h-auto py-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium">Download PDF</p>
                    <p className="text-sm text-muted-foreground">Professional PDF document</p>
                  </div>
                </div>
              </Button>
            </a>
            <a
              href={`/api/proposals/${generatedProposalId}/download/docx`}
              download
              className="block"
              data-testid="download-docx"
            >
              <Button variant="outline" className="w-full h-auto py-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Download Word</p>
                    <p className="text-sm text-muted-foreground">Editable DOCX document</p>
                  </div>
                </div>
              </Button>
            </a>
          </div>

          {gammaUrl && (
            <a
              href={gammaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              data-testid="open-gamma"
            >
              <Button variant="outline" className="w-full h-auto py-4">
                <div className="flex items-center gap-3">
                  <Presentation className="w-8 h-8 text-purple-500" />
                  <div className="text-left flex-1">
                    <p className="font-medium">Open in Gamma</p>
                    <p className="text-sm text-muted-foreground">Edit in Gamma's design platform</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setStep("upload");
              setParsedData(null);
              setUploadedFiles([]);
              setSelectedEquipment(null);
              setGeneratedProposalId(null);
              setAgentFirstName("");
              setAgentLastName("");
              setAgentTitle("Account Executive");
              setAgentPhone("");
              setAgentEmail("");
              setBusinessName("");
              setOwnerName("");
              setBusinessAddress("");
              setBusinessPhone("");
              setBusinessEmail("");
              setBusinessWebsite("");
              setIndustryGuess("");
              setCurrentProcessor("");
              setRepNotes("");
              setFormErrors({});
              setAgentInfoOpen(true);
              setMerchantInfoOpen(false);
            }}
            data-testid="button-new-proposal"
          >
            Create Another Proposal
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Check permission - show access denied if user doesn't have access
  if (!permissionsLoading && myPermissions?.canAccessProposals === false) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container flex items-center gap-4 h-14 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/coach")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Proposal Generator</h1>
              <p className="text-xs text-muted-foreground">Create professional proposals</p>
            </div>
          </div>
        </header>
        <main className="container px-4 py-6 max-w-2xl">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the Proposal Generator.
              Contact your administrator to request access.
            </p>
            <Button onClick={() => navigate("/coach")} data-testid="button-return-coach">
              Return to Coach
            </Button>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-4 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/coach")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Proposal Generator</h1>
            <p className="text-xs text-muted-foreground">Create professional proposals</p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-2xl">
        <Tabs value={workflowMode} onValueChange={(v) => setWorkflowMode(v as "manual" | "agentic")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agentic" data-testid="tab-agentic">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Workflow
            </TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual">
              <FileText className="w-4 h-4 mr-2" />
              Manual Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="agentic" className="mt-6">
            {agenticStep === "input" && renderAgenticInputStep()}
            {agenticStep === "progress" && renderAgenticProgressStep()}
            {agenticStep === "complete" && renderAgenticCompleteStep()}
          </TabsContent>
          
          <TabsContent value="manual" className="mt-6">
            <div className="flex items-center justify-center gap-2 mb-8">
              {["upload", "review", "equipment", "generated"].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : ["upload", "review", "equipment", "generated"].indexOf(step) > i
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-8 h-0.5 ${
                        ["upload", "review", "equipment", "generated"].indexOf(step) > i
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {step === "upload" && renderUploadStep()}
            {step === "review" && renderReviewStep()}
            {step === "equipment" && renderEquipmentStep()}
            {step === "generated" && renderGeneratedStep()}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
