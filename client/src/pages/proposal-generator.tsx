import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  ExternalLink
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
}

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

  const { data: proposals, isLoading: proposalsLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: equipment } = useQuery<EquipmentProduct[]>({
    queryKey: ["/api/equipiq/products"],
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
        const transformedData = transformParsedData(results[0].data);
        setParsedData(transformedData);
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
      equipment?: EquipmentProduct; 
      useAI?: boolean;
      renderer?: "replit" | "gamma";
      format?: "pdf" | "docx" | "pptx";
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

  const supportedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const isValidFile = (file: File) => {
    return supportedMimeTypes.includes(file.type) || 
      /\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(isValidFile);
    const invalidCount = files.length - validFiles.length;
    
    if (invalidCount > 0) {
      toast({
        title: "Some files skipped",
        description: `${invalidCount} unsupported file(s) were not added`,
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
    const invalidCount = files.length - validFiles.length;
    
    if (invalidCount > 0) {
      toast({
        title: "Some files skipped",
        description: `${invalidCount} unsupported file(s) were not added`,
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
        equipment: selectedEquipment || undefined,
        useAI,
        renderer: selectedRenderer,
        format: outputFormat,
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

  const renderUploadStep = () => (
    <div className="space-y-6">
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
            }}
            data-testid="button-new-proposal"
          >
            Create Another Proposal
          </Button>
        </CardContent>
      </Card>
    </div>
  );

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
      </main>

      <BottomNav />
    </div>
  );
}
