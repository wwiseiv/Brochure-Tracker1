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
import { DictationInput } from "@/components/DictationInput";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProposalJobStep, ProposalJobStatus, ProposalJobStepStatus, PricingComparison, MerchantScrapedData, SalespersonInfo, Deal } from "@shared/schema";
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
  CheckCircle2,
  Search,
  Filter,
  Package,
  Cpu,
  FileSpreadsheet,
  File
} from "lucide-react";
import PricingConfiguration, { PricingConfig, DEFAULT_PRICING_CONFIG } from "@/components/PricingConfiguration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  vendorId: string;
  category: string;
  type: string;
  name: string;
  model?: string;
  description: string;
  features: string[];
  bestFor?: string[];
  priceRange: string;
  url?: string;
  imageUrl?: string;
}

interface EquipmentVendor {
  id: number;
  vendorId: string;
  name: string;
  logoUrl?: string;
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

interface StatementUploadedFile {
  file: File;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  preview?: string;
  objectPath?: string;
}

interface StatementExtractedData {
  merchantName?: string;
  processorName?: string;
  statementPeriod?: string;
  totalVolume?: number;
  totalTransactions?: number;
  totalFees?: number;
  merchantType?: string;
  fees?: {
    interchange?: number;
    assessments?: number;
    monthlyFees?: number;
    pciFees?: number;
    statementFees?: number;
    batchFees?: number;
    equipmentFees?: number;
    otherFees?: number;
  };
  confidence: number;
  extractionNotes: string[];
}

const STATEMENT_ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv";

const STEP_LABELS: Record<ProposalJobStep, { label: string; icon: typeof FileText }> = {
  parsing_documents: { label: "Parsing Documents", icon: FileText },
  scraping_website: { label: "Scraping Website", icon: Globe },
  extracting_pricing: { label: "Extracting Pricing", icon: DollarSign },
  ai_analysis: { label: "AI Analysis", icon: Sparkles },
  generating_images: { label: "Generating Images", icon: ImageIcon },
  building_document: { label: "Building Document", icon: FileOutput },
  finalizing: { label: "Finalizing", icon: CheckCircle2 },
};

const ALL_STEPS: ProposalJobStep[] = [
  "parsing_documents",
  "scraping_website",
  "extracting_pricing",
  "ai_analysis",
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
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentProduct[]>([]);
  const [generatedProposalId, setGeneratedProposalId] = useState<number | null>(null);
  
  // Equipment selection filters
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState<"all" | "hardware" | "software">("all");
  const [equipmentVendorFilter, setEquipmentVendorFilter] = useState<string>("all");
  const [step, setStep] = useState<"upload" | "review" | "equipment" | "generated">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRenderer, setSelectedRenderer] = useState<"replit" | "gamma" | "claude">("claude");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx" | "pptx">("pdf");
  const [gammaUrl, setGammaUrl] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isGeneratingClaude, setIsGeneratingClaude] = useState(false);

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
  
  // Pricing configuration
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

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

  // Merchant Statement upload state
  const [statementFiles, setStatementFiles] = useState<StatementUploadedFile[]>([]);
  const [statementExtractedData, setStatementExtractedData] = useState<StatementExtractedData | null>(null);
  const [statementExtractionStep, setStatementExtractionStep] = useState<"idle" | "uploading" | "extracting" | "done">("idle");
  const [statementIsDragging, setStatementIsDragging] = useState(false);
  const statementFileInputRef = useRef<HTMLInputElement>(null);
  const [dualPricingIsDragging, setDualPricingIsDragging] = useState(false);
  const [interchangePlusIsDragging, setInterchangePlusIsDragging] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string>("");

  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

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

  const { data: vendors } = useQuery<EquipmentVendor[]>({
    queryKey: ["/api/equipiq/vendors"],
  });
  
  const { data: myPermissions, isLoading: permissionsLoading } = useQuery<{ canAccessProposals?: boolean }>({
    queryKey: ["/api/me/permissions"],
  });

  // Filter equipment based on search, category, and vendor
  const filteredEquipment = equipment?.filter(eq => {
    const matchesSearch = !equipmentSearch || 
      eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      eq.description?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
      eq.type.toLowerCase().includes(equipmentSearch.toLowerCase());
    const matchesCategory = equipmentCategory === "all" || eq.category === equipmentCategory;
    const matchesVendor = equipmentVendorFilter === "all" || eq.vendorId === equipmentVendorFilter;
    return matchesSearch && matchesCategory && matchesVendor;
  }) || [];

  // Group filtered equipment by vendor for display
  const equipmentByVendor = filteredEquipment.reduce((acc, eq) => {
    const vendorName = vendors?.find(v => v.vendorId === eq.vendorId)?.name || eq.vendorId;
    if (!acc[vendorName]) acc[vendorName] = [];
    acc[vendorName].push(eq);
    return acc;
  }, {} as Record<string, EquipmentProduct[]>);

  const toggleEquipmentSelection = (eq: EquipmentProduct) => {
    setSelectedEquipment(prev => {
      const isSelected = prev.some(e => e.id === eq.id);
      if (isSelected) {
        return prev.filter(e => e.id !== eq.id);
      } else {
        return [...prev, eq];
      }
    });
  };

  const parseMutation = useMutation({
    mutationFn: async (files: File[]) => {
      // Step 1: Upload files to Object Storage (same approach as Statement Analyzer)
      const uploadedFileData: Array<{ path: string; mimeType: string; name: string }> = [];
      
      for (const file of files) {
        // Request presigned upload URL
        const urlResponse = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/pdf"
          })
        });
        
        if (!urlResponse.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }
        
        const { uploadURL, objectPath } = await urlResponse.json();
        
        // Upload file to Object Storage
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/pdf" }
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        uploadedFileData.push({
          path: objectPath,
          mimeType: file.type || "application/pdf",
          name: file.name
        });
      }
      
      // Step 2: Parse files from Object Storage
      const res = await fetch("/api/proposals/parse-from-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ files: uploadedFileData })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to parse PDF" }));
        throw new Error(errorData.error || errorData.message || "Failed to parse files");
      }
      
      const result = await res.json();
      return [{ data: result.data || result, fileName: files[0]?.name || "document.pdf" }];
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
      selectedTerminalIds?: number[];
      selectedEquipmentDetails?: EquipmentProduct[];
      useAI?: boolean;
      renderer?: "replit" | "gamma" | "claude";
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
      // Salesperson info
      formData.append("salespersonName", `${agentFirstName} ${agentLastName}`.trim());
      formData.append("salespersonTitle", agentTitle);
      formData.append("salespersonEmail", agentEmail);
      formData.append("salespersonPhone", agentPhone);
      // Merchant info (from form)
      if (businessName) formData.append("merchantBusinessName", businessName);
      if (ownerName) formData.append("merchantOwnerName", ownerName);
      if (businessAddress) formData.append("merchantAddress", businessAddress);
      if (businessPhone) formData.append("merchantPhone", businessPhone);
      if (businessEmail) formData.append("merchantEmail", businessEmail);
      if (businessWebsite) formData.append("merchantWebsite", businessWebsite);
      if (industryGuess) formData.append("merchantIndustry", industryGuess);
      if (repNotes) formData.append("repNotes", repNotes);
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
          
          if (selectedDealId && currentJobId) {
            try {
              const merchantName = businessName || data.merchantScrapedData?.businessName || "Unknown Merchant";
              await apiRequest("POST", `/api/deals/${selectedDealId}/attachments`, {
                attachmentType: "proposal",
                externalId: String(currentJobId),
                name: `Proposal - ${merchantName}`,
                notes: "Generated from Proposal Generator",
              });
              toast({
                title: "Proposal Complete!",
                description: "Your proposal is ready and linked to the deal.",
              });
            } catch (error) {
              toast({
                title: "Proposal Complete!",
                description: "Your proposal is ready but failed to link to deal.",
              });
            }
          } else {
            toast({
              title: "Proposal Complete!",
              description: "Your professional proposal is ready for download.",
            });
          }
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

  // Statement file handling helpers
  const getStatementFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif"].includes(ext || "")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (file.type === "application/pdf" || ext === "pdf") {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (["xlsx", "xls", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleStatementFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: StatementUploadedFile[] = files.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false
    }));

    setStatementFiles(prev => [...prev, ...newFiles]);
    
    if (statementFileInputRef.current) {
      statementFileInputRef.current.value = "";
    }
  };

  const handleStatementDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatementIsDragging(true);
  };

  const handleStatementDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatementIsDragging(false);
  };

  const handleStatementDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatementIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const acceptedExtensions = STATEMENT_ACCEPTED_FILE_TYPES.split(",");
    const validFiles = files.filter(file => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      return acceptedExtensions.includes(ext) || file.type.startsWith("image/");
    });

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, Excel, CSV, or image files",
        variant: "destructive"
      });
      return;
    }

    const newFiles: StatementUploadedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false
    }));

    setStatementFiles(prev => [...prev, ...newFiles]);
  };

  const removeStatementFile = (index: number) => {
    setStatementFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAndExtractStatement = async () => {
    if (statementFiles.length === 0) return;

    setStatementExtractionStep("uploading");
    
    const fileData: Array<{ path: string; mimeType: string; name: string }> = [];

    for (let i = 0; i < statementFiles.length; i++) {
      const uploadFile = statementFiles[i];
      
      setStatementFiles(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], uploading: true };
        return updated;
      });

      try {
        const urlResponse = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: uploadFile.file.name,
            size: uploadFile.file.size,
            contentType: uploadFile.file.type || "application/octet-stream"
          })
        });

        if (!urlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await urlResponse.json();

        await fetch(uploadURL, {
          method: "PUT",
          body: uploadFile.file,
          headers: { "Content-Type": uploadFile.file.type || "application/octet-stream" }
        });

        setStatementFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: false, uploaded: true, objectPath };
          return updated;
        });

        fileData.push({
          path: objectPath,
          mimeType: uploadFile.file.type || "application/octet-stream",
          name: uploadFile.file.name
        });

      } catch (error) {
        setStatementFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: false, error: "Upload failed" };
          return updated;
        });
      }
    }

    if (fileData.length > 0) {
      setStatementExtractionStep("extracting");
      try {
        const response = await fetch("/api/proposal-intelligence/extract-statement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ files: fileData })
        });
        
        if (!response.ok) {
          throw new Error("Extraction failed");
        }
        
        const data = await response.json();
        if (data.success && data.extracted) {
          setStatementExtractedData(data.extracted);
          setStatementExtractionStep("done");
          toast({
            title: "Data Extracted",
            description: `Confidence: ${data.extracted.confidence}%. Review and use the data below.`
          });
        } else {
          throw new Error("No data extracted");
        }
      } catch (error) {
        setStatementExtractionStep("idle");
        toast({
          title: "Extraction Failed",
          description: error instanceof Error ? error.message : "Failed to extract data",
          variant: "destructive"
        });
      }
    } else {
      setStatementExtractionStep("idle");
      toast({
        title: "Upload Failed",
        description: "No files could be uploaded",
        variant: "destructive"
      });
    }
  };

  const applyExtractedStatementData = () => {
    if (!statementExtractedData) return;
    
    if (statementExtractedData.merchantName) {
      setBusinessName(statementExtractedData.merchantName);
    }
    if (statementExtractedData.processorName) {
      setCurrentProcessor(statementExtractedData.processorName);
    }
    
    toast({
      title: "Data Applied",
      description: "Merchant information has been populated from the statement."
    });
  };

  const clearStatementUpload = () => {
    statementFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setStatementFiles([]);
    setStatementExtractedData(null);
    setStatementExtractionStep("idle");
  };

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

  const handleGenerate = async (useAI: boolean) => {
    if (!parsedData) return;
    
    setUsedFallback(false);
    setGammaUrl(null);
    
    // For Claude renderer, call the direct Claude endpoint which generates and downloads in one step
    if (selectedRenderer === "claude") {
      setIsGeneratingClaude(true);
      try {
        const response = await fetch("/api/proposals/generate-claude-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            parsedData,
            format: outputFormat,
            agentName: `${agentFirstName} ${agentLastName}`.trim() || "PCBancard Representative",
            agentTitle: agentTitle || "Account Executive",
            agentEmail,
            agentPhone,
            businessName: businessName || parsedData.merchantName,
            businessAddress,
            businessDescription: repNotes,
            merchantWebsiteUrl: merchantWebsiteUrl || undefined,
            selectedEquipment: selectedEquipment.map(eq => ({
              name: eq.name,
              description: eq.description || eq.features?.join(", ") || "",
              price: eq.priceRange || "",
            })),
          }),
        });
        
        // Check content type to determine if it's JSON error or binary success
        const contentType = response.headers.get("Content-Type") || "";
        
        if (!response.ok) {
          let errorMessage = "Failed to generate document";
          if (contentType.includes("application/json")) {
            try {
              const err = await response.json();
              errorMessage = err.error || errorMessage;
            } catch {
              errorMessage = `Server error: ${response.status}`;
            }
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
        
        // Download the file
        const blob = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `PCBancard_Proposal.${outputFormat}`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setStep("generated");
        toast({
          title: "Proposal Generated",
          description: `Your Claude AI proposal has been downloaded as ${outputFormat.toUpperCase()}!`,
        });
      } catch (error) {
        toast({
          title: "Error Generating Proposal",
          description: error instanceof Error ? error.message : "Failed to generate Claude proposal",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingClaude(false);
      }
      return;
    }
    
    // For other renderers, use the standard mutation
    generateMutation.mutate({
      parsedData,
      selectedTerminalIds: selectedEquipment.map(eq => eq.id),
      selectedEquipmentDetails: selectedEquipment,
      useAI,
      renderer: selectedRenderer,
      format: outputFormat,
      intakeData: getIntakeFormData(),
    });
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
            <Building2 className="w-5 h-5 text-primary" />
            Link to Deal
            <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Link this proposal to an existing deal in your pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedDealId} onValueChange={setSelectedDealId}>
            <SelectTrigger data-testid="select-link-deal">
              <SelectValue placeholder="Select a deal to link..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No deal selected</SelectItem>
              {deals?.map((deal) => (
                <SelectItem key={deal.id} value={String(deal.id)}>
                  {deal.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Merchant Statement
            <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Upload a merchant processing statement to automatically extract pricing data with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statementExtractionStep !== "done" && (
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                statementIsDragging 
                  ? "border-primary bg-primary/10" 
                  : "hover:border-primary/50 hover:bg-muted/30"
              }`}
              onClick={() => statementFileInputRef.current?.click()}
              onDragOver={handleStatementDragOver}
              onDragEnter={handleStatementDragOver}
              onDragLeave={handleStatementDragLeave}
              onDrop={handleStatementDrop}
              data-testid="statement-dropzone"
            >
              <input
                ref={statementFileInputRef}
                type="file"
                accept={STATEMENT_ACCEPTED_FILE_TYPES}
                multiple
                onChange={handleStatementFileSelect}
                className="hidden"
                data-testid="input-statement-file"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {statementIsDragging ? "Drop files here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, Excel, CSV, or Images (multiple pages supported)
                  </p>
                </div>
              </div>
            </div>
          )}

          {statementFiles.length > 0 && statementExtractionStep !== "done" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Files to analyze ({statementFiles.length})</p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearStatementUpload}
                  className="text-muted-foreground hover:text-destructive"
                  data-testid="button-clear-statement-files"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {statementFiles.map((f, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    data-testid={`statement-file-item-${i}`}
                  >
                    {f.preview ? (
                      <img src={f.preview} alt="" className="h-10 w-10 object-cover rounded" />
                    ) : (
                      getStatementFileIcon(f.file)
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(f.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {f.uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {f.uploaded && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {f.error && <XCircle className="h-4 w-4 text-red-500" />}
                    {!f.uploading && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); removeStatementFile(i); }}
                        data-testid={`button-remove-statement-file-${i}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {statementExtractionStep === "uploading" && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Uploading files...</p>
                  <Progress value={
                    (statementFiles.filter(f => f.uploaded).length / statementFiles.length) * 100
                  } />
                </div>
              )}

              {statementExtractionStep === "extracting" && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI is extracting data from your statement...</span>
                </div>
              )}

              {statementExtractionStep === "idle" && (
                <Button 
                  className="w-full" 
                  onClick={uploadAndExtractStatement}
                  disabled={statementFiles.length === 0}
                  data-testid="button-extract-statement"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract Data with AI
                </Button>
              )}
            </div>
          )}

          {statementExtractionStep === "done" && statementExtractedData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800 dark:text-green-300">
                      Data Extracted Successfully
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Confidence: {statementExtractedData.confidence}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {statementExtractedData.merchantName && (
                  <div>
                    <p className="text-muted-foreground">Merchant Name</p>
                    <p className="font-medium">{statementExtractedData.merchantName}</p>
                  </div>
                )}
                {statementExtractedData.processorName && (
                  <div>
                    <p className="text-muted-foreground">Processor</p>
                    <p className="font-medium">{statementExtractedData.processorName}</p>
                  </div>
                )}
                {statementExtractedData.totalVolume !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Monthly Volume</p>
                    <p className="font-medium">{formatCurrency(statementExtractedData.totalVolume)}</p>
                  </div>
                )}
                {statementExtractedData.totalTransactions !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Transactions</p>
                    <p className="font-medium">{statementExtractedData.totalTransactions.toLocaleString()}</p>
                  </div>
                )}
                {statementExtractedData.totalFees !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Total Fees</p>
                    <p className="font-medium">{formatCurrency(statementExtractedData.totalFees)}</p>
                  </div>
                )}
                {statementExtractedData.statementPeriod && (
                  <div>
                    <p className="text-muted-foreground">Statement Period</p>
                    <p className="font-medium">{statementExtractedData.statementPeriod}</p>
                  </div>
                )}
              </div>

              {statementExtractedData.extractionNotes && statementExtractedData.extractionNotes.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Notes:</p>
                  <ul className="list-disc list-inside">
                    {statementExtractedData.extractionNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={applyExtractedStatementData}
                  className="flex-1"
                  data-testid="button-use-extracted-data"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Use This Data
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearStatementUpload}
                  data-testid="button-clear-extracted-data"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Cost Analysis Files
            {statementExtractedData ? (
              <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>
            ) : (
              <Badge variant="destructive" className="ml-2 text-xs">At least one required</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {statementExtractedData 
              ? "Optionally upload Dual Pricing and/or Interchange Plus PDFs for more detailed analysis"
              : "Upload the Dual Pricing and/or Interchange Plus cost analysis PDFs"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="font-medium">Dual Pricing Analysis</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  dualPricingFile 
                    ? "border-primary bg-primary/5" 
                    : dualPricingIsDragging 
                      ? "border-primary bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDualPricingIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDualPricingIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDualPricingIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === "application/pdf") {
                    setDualPricingFile(file);
                  } else if (file) {
                    toast({
                      title: "Invalid File",
                      description: "Please upload a PDF file",
                      variant: "destructive"
                    });
                  }
                }}
                onClick={() => !dualPricingFile && document.getElementById("dual-pricing-upload")?.click()}
                data-testid="dropzone-dual-pricing"
              >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setDualPricingFile(null);
                      }}
                      data-testid="button-remove-dual-pricing"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-4">
                    <FileText className={`w-8 h-8 mx-auto mb-2 ${dualPricingIsDragging ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{dualPricingIsDragging ? "Drop file here" : "Drag & drop or click to upload"}</p>
                    <p className="text-xs text-muted-foreground">PDF only</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-medium">Interchange Plus Analysis</Label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  interchangePlusFile 
                    ? "border-primary bg-primary/5" 
                    : interchangePlusIsDragging 
                      ? "border-primary bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInterchangePlusIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInterchangePlusIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInterchangePlusIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && file.type === "application/pdf") {
                    setInterchangePlusFile(file);
                  } else if (file) {
                    toast({
                      title: "Invalid File",
                      description: "Please upload a PDF file",
                      variant: "destructive"
                    });
                  }
                }}
                onClick={() => !interchangePlusFile && document.getElementById("interchange-plus-upload")?.click()}
                data-testid="dropzone-interchange-plus"
              >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setInterchangePlusFile(null);
                      }}
                      data-testid="button-remove-interchange-plus"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-4">
                    <FileText className={`w-8 h-8 mx-auto mb-2 ${interchangePlusIsDragging ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{interchangePlusIsDragging ? "Drop file here" : "Drag & drop or click to upload"}</p>
                    <p className="text-xs text-muted-foreground">PDF only</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky footer with action button */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40">
        <div className="max-w-2xl mx-auto">
          {(!dualPricingFile && !interchangePlusFile && !statementExtractedData) && (
            <p className="text-sm text-center text-muted-foreground mb-2">
              Upload a statement or at least one pricing PDF to continue
            </p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleStartBuild}
            disabled={startBuildMutation.isPending || (!dualPricingFile && !interchangePlusFile && !statementExtractedData)}
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
      </div>
      
      {/* Spacer for the sticky footer */}
      <div className="h-24" />
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
            {currentJobId && (
              <a
                href={`/api/proposals/build/${currentJobId}/download`}
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

            {!currentJobId && !jobStatus?.docxUrl && jobStatus?.proposalId && (
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
                {merchant.businessDescription && 
                  !merchant.businessDescription.toLowerCase().includes('{meta') &&
                  !merchant.businessDescription.toLowerCase().includes('{description}') &&
                  !merchant.businessDescription.toLowerCase().includes('meta description') &&
                  merchant.businessDescription.toLowerCase() !== 'undefined' &&
                  merchant.businessDescription.toLowerCase() !== 'none' &&
                  merchant.businessDescription.toLowerCase() !== 'n/a' &&
                  merchant.businessDescription.length > 10 && (
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
                  <Select value={industryGuess} onValueChange={setIndustryGuess}>
                    <SelectTrigger id="industry-guess" data-testid="select-industry-guess">
                      <SelectValue placeholder="Select industry..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_repair">Auto Repair / Automotive</SelectItem>
                      <SelectItem value="restaurant">Restaurant / Food Service</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="healthcare">Healthcare / Medical</SelectItem>
                      <SelectItem value="professional">Professional Services</SelectItem>
                      <SelectItem value="construction">Construction / Trades</SelectItem>
                      <SelectItem value="salon">Salon / Spa / Beauty</SelectItem>
                      <SelectItem value="fitness">Fitness / Gym</SelectItem>
                      <SelectItem value="lodging">Hotel / Lodging</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                <DictationInput
                  id="rep-notes"
                  data-testid="input-rep-notes"
                  value={repNotes}
                  onChange={setRepNotes}
                  placeholder="Additional notes about the merchant, their pain points, or specific needs..."
                  multiline
                  rows={3}
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

      {/* Sticky footer with guidance for Manual Upload */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-40">
        <div className="max-w-2xl mx-auto">
          {uploadedFiles.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">
              Upload a pricing PDF above to get started
            </p>
          ) : (
            <Button 
              onClick={handleParse}
              disabled={parseMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-parse-pdf-footer"
            >
              {parseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse {uploadedFiles.length} PDF{uploadedFiles.length > 1 ? 's' : ''} and Continue
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Spacer for sticky footer */}
      <div className="h-20" />
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
          <CardDescription>Click on any value to edit it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Current Costs</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-lg font-bold pl-8"
                  value={parsedData?.currentCosts?.totalMonthly || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setParsedData(prev => {
                      if (!prev) return null;
                      const dualPricingCost = prev.proposedCosts?.dualPricing?.totalMonthly || 0;
                      const icPlusCost = prev.proposedCosts?.interchangePlus?.totalMonthly || 0;
                      return {
                        ...prev,
                        currentCosts: { ...prev.currentCosts, totalMonthly: value },
                        savings: {
                          dualPricingMonthly: value - dualPricingCost,
                          dualPricingAnnual: (value - dualPricingCost) * 12,
                          interchangePlusMonthly: value - icPlusCost,
                          interchangePlusAnnual: (value - icPlusCost) * 12,
                        }
                      };
                    });
                  }}
                  data-testid="input-current-costs"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">per month</p>
            </div>
            <div className="p-4 rounded-lg border border-primary bg-primary/5">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Dual Pricing</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-primary">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-lg font-bold text-primary pl-8 border-primary"
                  value={parsedData?.proposedCosts?.dualPricing?.totalMonthly || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setParsedData(prev => {
                      if (!prev) return null;
                      const currentCost = prev.currentCosts?.totalMonthly || 0;
                      const icPlusCost = prev.proposedCosts?.interchangePlus?.totalMonthly || 0;
                      const existingDualPricing = prev.proposedCosts?.dualPricing || { monthlyProcessingFees: 0, monthlyFees: 0, totalMonthly: 0 };
                      return {
                        ...prev,
                        proposedCosts: {
                          ...prev.proposedCosts,
                          dualPricing: { ...existingDualPricing, totalMonthly: value }
                        },
                        savings: {
                          dualPricingMonthly: currentCost - value,
                          dualPricingAnnual: (currentCost - value) * 12,
                          interchangePlusMonthly: currentCost - icPlusCost,
                          interchangePlusAnnual: (currentCost - icPlusCost) * 12,
                        }
                      };
                    });
                  }}
                  data-testid="input-dual-pricing"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">per month</p>
            </div>
            <div className="p-4 rounded-lg border">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Interchange Plus</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-lg font-bold pl-8"
                  value={parsedData?.proposedCosts?.interchangePlus?.totalMonthly || 0}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setParsedData(prev => {
                      if (!prev) return null;
                      const currentCost = prev.currentCosts?.totalMonthly || 0;
                      const dualPricingCost = prev.proposedCosts?.dualPricing?.totalMonthly || 0;
                      const existingIcPlus = prev.proposedCosts?.interchangePlus || { monthlyProcessingFees: 0, monthlyFees: 0, totalMonthly: 0 };
                      return {
                        ...prev,
                        proposedCosts: {
                          ...prev.proposedCosts,
                          interchangePlus: { ...existingIcPlus, totalMonthly: value }
                        },
                        savings: {
                          dualPricingMonthly: currentCost - dualPricingCost,
                          dualPricingAnnual: (currentCost - dualPricingCost) * 12,
                          interchangePlusMonthly: currentCost - value,
                          interchangePlusAnnual: (currentCost - value) * 12,
                        }
                      };
                    });
                  }}
                  data-testid="input-interchange-plus"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <PricingConfiguration
        onConfigChange={setPricingConfig}
        initialConfig={pricingConfig}
        compact={false}
        collapsible={true}
        defaultCollapsed={true}
        showPresets={true}
      />

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
            Equipment & Software Selection
          </CardTitle>
          <CardDescription>
            Select equipment and software from the EquipIQ library (optional - select multiple items)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Items Summary */}
            {selectedEquipment.length > 0 && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Selected ({selectedEquipment.length})</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedEquipment([])}
                    data-testid="button-clear-equipment"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEquipment.map(eq => (
                    <Badge key={eq.id} variant="secondary" className="flex items-center gap-1">
                      {eq.name}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEquipmentSelection(eq);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment by name, type, or description..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-equipment-search"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Category Tabs */}
                <div className="flex rounded-lg border p-1 gap-1">
                  <Button
                    variant={equipmentCategory === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEquipmentCategory("all")}
                    data-testid="button-category-all"
                  >
                    All
                  </Button>
                  <Button
                    variant={equipmentCategory === "hardware" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEquipmentCategory("hardware")}
                    data-testid="button-category-hardware"
                  >
                    <Cpu className="w-4 h-4 mr-1" />
                    Hardware
                  </Button>
                  <Button
                    variant={equipmentCategory === "software" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEquipmentCategory("software")}
                    data-testid="button-category-software"
                  >
                    <Package className="w-4 h-4 mr-1" />
                    Software
                  </Button>
                </div>

                {/* Vendor Filter */}
                <Select value={equipmentVendorFilter} onValueChange={setEquipmentVendorFilter}>
                  <SelectTrigger className="w-40" data-testid="select-vendor-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors?.map(v => (
                      <SelectItem key={v.vendorId} value={v.vendorId}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Equipment List by Vendor */}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.keys(equipmentByVendor).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No equipment found matching your filters</p>
                </div>
              ) : (
                Object.entries(equipmentByVendor).map(([vendorName, products]) => (
                  <div key={vendorName}>
                    <p className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                      {vendorName} ({products.length})
                    </p>
                    <div className="grid gap-2">
                      {products.map((eq) => {
                        const isSelected = selectedEquipment.some(e => e.id === eq.id);
                        return (
                          <div
                            key={eq.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected ? "border-primary bg-primary/5" : "hover-elevate"
                            }`}
                            onClick={() => toggleEquipmentSelection(eq)}
                            data-testid={`equipment-${eq.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                              }`}>
                                {isSelected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{eq.name}</p>
                                  <Badge variant="outline" className="text-xs">{eq.type}</Badge>
                                  <Badge variant={eq.category === "hardware" ? "default" : "secondary"} className="text-xs">
                                    {eq.category}
                                  </Badge>
                                </div>
                                {eq.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{eq.description}</p>
                                )}
                                {eq.priceRange && (
                                  <p className="text-sm font-medium text-primary mt-1">{eq.priceRange}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
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
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedRenderer === "claude" ? "border-primary bg-primary/5" : "hover-elevate"
              }`}
              onClick={() => {
                setSelectedRenderer("claude");
                if (outputFormat === "pptx") setOutputFormat("pdf");
              }}
              data-testid="renderer-claude"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedRenderer === "claude" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-1">Claude AI <span className="text-xs bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded">Best</span></p>
                  <p className="text-sm text-muted-foreground">AI-written proposal content</p>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground space-y-1">
                <p>• Professional AI writing</p>
                <p>• Beautiful formatting</p>
                <p>• PDF or Word output</p>
              </div>
            </div>

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
                {(selectedRenderer === "replit" || selectedRenderer === "claude") && (
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
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => setStep("review")}
              data-testid="button-back-review"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Go back to review</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={() => handleGenerate(false)}
              disabled={generateMutation.isPending || isGeneratingClaude}
              data-testid="button-generate-basic"
            >
              {(generateMutation.isPending || isGeneratingClaude) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Basic Proposal
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate basic proposal</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={700}>
          <TooltipTrigger asChild>
            <Button
              className="flex-1"
              onClick={() => handleGenerate(true)}
              disabled={generateMutation.isPending || isGeneratingClaude}
              data-testid="button-generate-ai"
            >
              {(generateMutation.isPending || isGeneratingClaude) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isGeneratingClaude ? "Claude is writing..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI Enhancement
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate AI-enhanced proposal</p>
          </TooltipContent>
        </Tooltip>
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
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Download proposal as PDF</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip delayDuration={700}>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Download proposal as Word document</p>
              </TooltipContent>
            </Tooltip>
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
              setSelectedEquipment([]);
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
              onClick={() => navigate("/")}
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
        <main className="container px-4 py-6 max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the Proposal Generator.
              Contact your administrator to request access.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-return-home">
              Return Home
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
          <Tooltip delayDuration={700}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h1 className="font-semibold">Proposal Generator</h1>
            <p className="text-xs text-muted-foreground">Create professional proposals</p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-2xl mx-auto">
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
