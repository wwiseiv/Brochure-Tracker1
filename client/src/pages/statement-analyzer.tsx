import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Deal } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  AlertTriangle, 
  MessageSquare, 
  DollarSign,
  Loader2,
  Copy,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Printer,
  BarChart3,
  Target,
  ShieldCheck,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Image,
  File,
  X,
  Keyboard,
  Camera,
  Mail,
  Download,
  Share2,
  Pencil,
  Brain,
  ThumbsUp
} from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "wouter";
import PricingConfiguration, { PricingConfig, DEFAULT_PRICING_CONFIG } from "@/components/PricingConfiguration";

const processors = [
  "Unknown",
  "Square",
  "Stripe",
  "PayPal",
  "Clover",
  "Toast",
  "First Data / Fiserv",
  "TSYS / Global Payments",
  "Worldpay / Vantiv",
  "Heartland",
  "Elavon",
  "Chase Paymentech",
  "Bank of America",
  "Wells Fargo",
  "PNC",
  "Other"
];

const formSchema = z.object({
  merchantName: z.string().optional(),
  processorName: z.string().optional(),
  totalVolume: z.string().min(1, "Required"),
  totalTransactions: z.string().min(1, "Required"),
  totalFees: z.string().min(1, "Required"),
  merchantType: z.string().default("retail"),
  interchangeFees: z.string().optional(),
  assessmentFees: z.string().optional(),
  monthlyFees: z.string().optional(),
  pciFees: z.string().optional(),
  statementFees: z.string().optional(),
  batchFees: z.string().optional(),
  equipmentFees: z.string().optional(),
  otherFees: z.string().optional(),
  useAI: z.boolean().default(false),
  icPlusRateMargin: z.string().optional(),
  icPlusPerTxnFee: z.string().optional(),
  icPlusMonthlyFee: z.string().optional(),
  dualPricingMonthlyCost: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AnalysisResult {
  success: boolean;
  merchantName?: string;
  processorName?: string;
  analysis: {
    summary: {
      monthlyVolume: number;
      monthlyTransactions: number;
      averageTicket: number;
      currentTotalFees: number;
      currentEffectiveRate: number;
    };
    costAnalysis: {
      trueInterchange: number;
      trueAssessments: number;
      trueWholesale: number;
      trueWholesaleRate: number;
      processorMarkup: number;
      processorMarkupRate: number;
    };
    savings: {
      interchangePlus: {
        monthlyCost: number;
        effectiveRate: number;
        monthlySavings: number;
        annualSavings: number;
        description: string;
      };
      dualPricing: {
        monthlyCost: number;
        effectiveRate: number;
        monthlySavings: number;
        annualSavings: number;
        description: string;
      };
    };
    redFlags: Array<{
      severity: string;
      issue: string;
      detail: string;
      savings: number;
      category: string;
    }>;
  };
  talkingPoints: {
    opening: string;
    keyFacts: string[];
    redFlagScripts: Array<{ issue: string; script: string; severity: string; impact: string }>;
    questions: string[];
    objections: Record<string, { objection: string; response: string }>;
    valueProps: Array<{ title: string; detail: string }>;
    dualPricingPitch: string;
    interchangePlusPitch: string;
    closing: string;
  };
  competitorInsights?: {
    knownIssues: string[];
    contractPitfalls: string[];
    talkingPoints: string[];
  };
  aiAnalysis?: {
    statementSummary: string;
    customTalkingPoints: string[];
    personalizedClosing: string;
  };
}

interface UploadedFile {
  file: File;
  preview?: string;
  objectPath?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

interface ExtractedData {
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
  extractionId?: number;
  processorIdentified?: string;
  processorConfidence?: number;
}

const quickFillExamples = {
  small: { volume: "15000", transactions: "300", totalFees: "450", merchantType: "retail" },
  medium: { volume: "50000", transactions: "800", totalFees: "1350", merchantType: "retail" },
  large: { volume: "150000", transactions: "2500", totalFees: "3800", merchantType: "retail" },
  restaurant: { volume: "75000", transactions: "1500", totalFees: "1950", merchantType: "restaurant" }
};

const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.webp,.heic";

export default function StatementAnalyzer() {
  const { toast } = useToast();
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedObjection, setExpandedObjection] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionStep, setExtractionStep] = useState<"idle" | "uploading" | "extracting" | "review">("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [showCorrectionUI, setShowCorrectionUI] = useState(false);
  const [correctionField, setCorrectionField] = useState<string | null>(null);
  const [correctionValue, setCorrectionValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDealId, setSelectedDealId] = useState<string>("");

  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchantName: "",
      processorName: "Unknown",
      totalVolume: "",
      totalTransactions: "",
      totalFees: "",
      merchantType: "retail",
      interchangeFees: "",
      assessmentFees: "",
      monthlyFees: "",
      pciFees: "",
      statementFees: "",
      batchFees: "",
      equipmentFees: "",
      otherFees: "",
      useAI: false,
      icPlusRateMargin: "0.50",
      icPlusPerTxnFee: "0.10",
      icPlusMonthlyFee: "10",
      dualPricingMonthlyCost: "64.95"
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        merchantName: data.merchantName || undefined,
        processorName: data.processorName || undefined,
        totalVolume: parseFloat(data.totalVolume),
        totalTransactions: parseInt(data.totalTransactions),
        totalFees: parseFloat(data.totalFees),
        merchantType: data.merchantType,
        fees: {
          interchange: data.interchangeFees ? parseFloat(data.interchangeFees) : undefined,
          assessments: data.assessmentFees ? parseFloat(data.assessmentFees) : undefined,
          monthlyFees: data.monthlyFees ? parseFloat(data.monthlyFees) : undefined,
          pciFees: data.pciFees ? parseFloat(data.pciFees) : undefined,
          statementFees: data.statementFees ? parseFloat(data.statementFees) : undefined,
          batchFees: data.batchFees ? parseFloat(data.batchFees) : undefined,
          equipmentFees: data.equipmentFees ? parseFloat(data.equipmentFees) : undefined,
          otherFees: data.otherFees ? parseFloat(data.otherFees) : undefined
        },
        useAI: data.useAI,
        pricingConfig: {
          pricingModel: pricingConfig.pricingModel,
          dualPricing: {
            customerFeePercent: pricingConfig.dualPricingCustomerFee,
            monthlyFee: pricingConfig.dualPricingMonthlyFee
          },
          interchangePlus: {
            markupPercent: pricingConfig.icPlusMarkupPercent,
            perTransaction: pricingConfig.icPlusPerTransaction,
            monthlyFee: pricingConfig.icPlusMonthlyFee
          },
          surcharge: {
            rate: pricingConfig.surchargeRate
          }
        },
        icPlusMargin: {
          ratePercent: pricingConfig.icPlusMarkupPercent,
          perTxnFee: pricingConfig.icPlusPerTransaction,
          monthlyFee: pricingConfig.icPlusMonthlyFee
        },
        dualPricingMonthlyCost: pricingConfig.dualPricingMonthlyFee
      };
      
      const response = await apiRequest("POST", "/api/proposal-intelligence/analyze-statement", payload);
      return response.json();
    },
    onSuccess: async (data) => {
      setResults(data);
      
      if (selectedDealId && extractedData?.extractionId) {
        try {
          const merchantName = form.getValues("merchantName") || "Unknown Merchant";
          await apiRequest("POST", `/api/deals/${selectedDealId}/attachments`, {
            attachmentType: "statement",
            externalId: String(extractedData.extractionId),
            name: `Statement Analysis - ${merchantName}`,
            notes: "Linked from Statement Analyzer",
          });
          toast({
            title: "Analysis Complete",
            description: "Statement analyzed and linked to deal successfully"
          });
        } catch (error) {
          toast({
            title: "Analysis Complete",
            description: "Statement analyzed but failed to link to deal"
          });
        }
      } else {
        toast({
          title: "Analysis Complete",
          description: "Statement analyzed successfully"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const extractMutation = useMutation({
    mutationFn: async (files: Array<{ path: string; mimeType: string; name: string }>) => {
      const response = await apiRequest("POST", "/api/proposal-intelligence/extract-statement", { files });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.extracted) {
        const extractedWithMeta = {
          ...data.extracted,
          extractionId: data.extractionId,
          processorIdentified: data.processorIdentified,
          processorConfidence: data.processorConfidence
        };
        setExtractedData(extractedWithMeta);
        applyExtractedData(data.extracted);
        setExtractionStep("review");
        
        const processorInfo = data.processorIdentified && data.processorIdentified !== 'Unknown'
          ? ` • Processor: ${data.processorIdentified}`
          : '';
        toast({
          title: "Data Extracted",
          description: `Confidence: ${data.extracted.confidence}%${processorInfo}. Review and edit as needed.`
        });
      } else {
        setExtractionStep("idle");
        toast({
          title: "Extraction Failed",
          description: data.error || "Could not extract data from the statement. Please try again or enter manually.",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      setExtractionStep("idle");
      toast({
        title: "Extraction Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    }
  });

  const correctionMutation = useMutation({
    mutationFn: async (params: { extractionId: number; fieldName: string; originalValue: string; correctedValue: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/proposal-intelligence/learning/extractions/${params.extractionId}/correct`,
        { fieldName: params.fieldName, originalValue: params.originalValue, correctedValue: params.correctedValue }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank You!",
        description: "Your correction helps improve our accuracy for everyone."
      });
      setShowCorrectionUI(false);
      setCorrectionField(null);
      setCorrectionValue("");
    },
    onError: (error: Error) => {
      toast({
        title: "Correction Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (extractionId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/proposal-intelligence/learning/extractions/${extractionId}/verify`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thanks!",
        description: "Glad our extraction was accurate."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const submitCorrection = (fieldName: string, originalValue: string, correctedValue: string) => {
    if (!extractedData?.extractionId) return;
    correctionMutation.mutate({
      extractionId: extractedData.extractionId,
      fieldName,
      originalValue,
      correctedValue
    });
  };

  const applyExtractedData = (data: ExtractedData) => {
    if (data.merchantName) form.setValue("merchantName", data.merchantName);
    if (data.processorName) {
      const matchedProcessor = processors.find(p => 
        p.toLowerCase().includes(data.processorName?.toLowerCase() || "") ||
        data.processorName?.toLowerCase().includes(p.toLowerCase())
      );
      form.setValue("processorName", matchedProcessor || "Other");
    }
    if (data.totalVolume) form.setValue("totalVolume", data.totalVolume.toString());
    if (data.totalTransactions) form.setValue("totalTransactions", data.totalTransactions.toString());
    if (data.totalFees) form.setValue("totalFees", data.totalFees.toString());
    if (data.merchantType) form.setValue("merchantType", data.merchantType);
    
    if (data.fees) {
      if (data.fees.interchange) form.setValue("interchangeFees", data.fees.interchange.toString());
      if (data.fees.assessments) form.setValue("assessmentFees", data.fees.assessments.toString());
      if (data.fees.monthlyFees) form.setValue("monthlyFees", data.fees.monthlyFees.toString());
      if (data.fees.pciFees) form.setValue("pciFees", data.fees.pciFees.toString());
      if (data.fees.statementFees) form.setValue("statementFees", data.fees.statementFees.toString());
      if (data.fees.batchFees) form.setValue("batchFees", data.fees.batchFees.toString());
      if (data.fees.equipmentFees) form.setValue("equipmentFees", data.fees.equipmentFees.toString());
      if (data.fees.otherFees) form.setValue("otherFees", data.fees.otherFees.toString());
      setShowAdvanced(true);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const acceptedExtensions = ACCEPTED_FILE_TYPES.split(",");
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

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAndExtract = async () => {
    if (uploadedFiles.length === 0) return;

    setExtractionStep("uploading");
    
    const fileData: Array<{ path: string; mimeType: string; name: string }> = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const uploadFile = uploadedFiles[i];
      
      setUploadedFiles(prev => {
        const updated = [...prev];
        updated[i] = { ...updated[i], uploading: true };
        return updated;
      });

      try {
        const urlResponse = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        setUploadedFiles(prev => {
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
        setUploadedFiles(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], uploading: false, error: "Upload failed" };
          return updated;
        });
      }
    }

    if (fileData.length > 0) {
      setExtractionStep("extracting");
      extractMutation.mutate(fileData);
    } else {
      setExtractionStep("idle");
      toast({
        title: "Upload Failed",
        description: "No files could be uploaded",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const copyAllForEmail = async () => {
    if (!results) return;
    
    const { analysis, talkingPoints, competitorInsights, aiAnalysis } = results;
    const maxSavings = Math.max(
      analysis.savings.dualPricing.annualSavings,
      analysis.savings.interchangePlus.annualSavings
    );
    const maxMonthlySavings = Math.max(
      analysis.savings.dualPricing.monthlySavings,
      analysis.savings.interchangePlus.monthlySavings
    );
    
    let emailText = `PCBancard Statement Analysis Report
=====================================

SAVINGS OPPORTUNITY: ${formatCurrency(maxSavings)}/year (${formatCurrency(maxMonthlySavings)}/month)

CURRENT SITUATION
-----------------
Monthly Volume: ${formatCurrency(analysis.summary.monthlyVolume)}
Monthly Transactions: ${analysis.summary.monthlyTransactions.toLocaleString()}
Average Ticket: ${formatCurrencyExact(analysis.summary.averageTicket)}
Current Effective Rate: ${analysis.summary.currentEffectiveRate}%
Current Monthly Fees: ${formatCurrencyExact(analysis.summary.currentTotalFees)}

COST ANALYSIS
-------------
True Interchange Cost: ${formatCurrencyExact(analysis.costAnalysis.trueInterchange)}
Card Brand Assessments: ${formatCurrencyExact(analysis.costAnalysis.trueAssessments)}
True Wholesale Cost: ${formatCurrencyExact(analysis.costAnalysis.trueWholesale)} (${analysis.costAnalysis.trueWholesaleRate}%)
Current Processor Markup: ${formatCurrencyExact(analysis.costAnalysis.processorMarkup)} (${analysis.costAnalysis.processorMarkupRate}%)

PCBANCARD OPTIONS
-----------------

DUAL PRICING (Recommended):
Monthly Cost: ${formatCurrencyExact(analysis.savings.dualPricing.monthlyCost)}
Effective Rate: ${analysis.savings.dualPricing.effectiveRate}%
Monthly Savings: ${formatCurrency(analysis.savings.dualPricing.monthlySavings)}
Annual Savings: ${formatCurrency(analysis.savings.dualPricing.annualSavings)}

INTERCHANGE PLUS:
Monthly Cost: ${formatCurrencyExact(analysis.savings.interchangePlus.monthlyCost)}
Effective Rate: ${analysis.savings.interchangePlus.effectiveRate}%
Monthly Savings: ${formatCurrency(analysis.savings.interchangePlus.monthlySavings)}
Annual Savings: ${formatCurrency(analysis.savings.interchangePlus.annualSavings)}

`;

    if (analysis.redFlags.length > 0) {
      emailText += `ISSUES FOUND
------------
`;
      analysis.redFlags.forEach(flag => {
        emailText += `[${flag.severity}] ${flag.issue}: ${flag.detail} (${formatCurrency(flag.savings)}/mo potential savings)\n`;
      });
      emailText += '\n';
    }

    emailText += `OPENING STATEMENT
-----------------
${talkingPoints.opening}

KEY FACTS
---------
${talkingPoints.keyFacts.map(f => `- ${f}`).join('\n')}

DISCOVERY QUESTIONS
-------------------
${talkingPoints.questions.map((q, i) => `${i+1}. ${q}`).join('\n')}

DUAL PRICING PITCH
------------------
${talkingPoints.dualPricingPitch}

INTERCHANGE PLUS PITCH
----------------------
${talkingPoints.interchangePlusPitch || 'Contact PCBancard for Interchange Plus pricing details.'}

CLOSING
-------
${talkingPoints.closing}
`;

    if (competitorInsights && competitorInsights.talkingPoints.length > 0) {
      emailText += `
COMPETITIVE ADVANTAGES
----------------------
${competitorInsights.talkingPoints.map(p => `- ${p}`).join('\n')}
`;
    }

    if (aiAnalysis) {
      emailText += `
AI INSIGHTS
-----------
${aiAnalysis.statementSummary}

${aiAnalysis.customTalkingPoints.length > 0 ? aiAnalysis.customTalkingPoints.map(p => `- ${p}`).join('\n') : ''}
`;
    }

    emailText += `
---
Generated by PCBancard Statement Analyzer
${new Date().toLocaleDateString()}
`;

    await navigator.clipboard.writeText(emailText);
    setCopiedText("Full Analysis");
    setTimeout(() => setCopiedText(null), 3000);
    toast({ 
      title: "Copied to Clipboard!", 
      description: "Full analysis ready to paste into email" 
    });
  };

  const copyCustomerProposal = async () => {
    if (!results) return;
    
    const { analysis } = results;
    const merchantName = form.getValues("merchantName") || "Your Business";
    const maxSavings = Math.max(
      analysis.savings.dualPricing.annualSavings,
      analysis.savings.interchangePlus.annualSavings
    );
    const maxMonthlySavings = Math.max(
      analysis.savings.dualPricing.monthlySavings,
      analysis.savings.interchangePlus.monthlySavings
    );
    
    let proposalText = `EXCLUSIVE SAVINGS PROPOSAL FOR ${merchantName.toUpperCase()}
${"=".repeat(40)}

Dear ${merchantName},

Based on our analysis of your current payment processing, we've identified significant savings opportunities for your business.

SAVINGS OPPORTUNITY
-------------------
Annual Savings: ${formatCurrency(maxSavings)}
Monthly Savings: ${formatCurrency(maxMonthlySavings)}

YOUR CURRENT SITUATION
----------------------
Monthly Processing Volume: ${formatCurrency(analysis.summary.monthlyVolume)}
Monthly Transactions: ${analysis.summary.monthlyTransactions.toLocaleString()}
Average Ticket Size: ${formatCurrencyExact(analysis.summary.averageTicket)}
Current Effective Rate: ${analysis.summary.currentEffectiveRate}%
Current Monthly Processing Fees: ${formatCurrencyExact(analysis.summary.currentTotalFees)}

PCBANCARD PROGRAM OPTIONS
-------------------------

OPTION 1: DUAL PRICING PROGRAM (Most Popular)
Your customers pay a small service fee for card payments, dramatically reducing your processing costs.
- Your Monthly Cost: ${formatCurrencyExact(analysis.savings.dualPricing.monthlyCost)}
- Your Effective Rate: ${analysis.savings.dualPricing.effectiveRate}%
- Your Monthly Savings: ${formatCurrency(analysis.savings.dualPricing.monthlySavings)}
- Your Annual Savings: ${formatCurrency(analysis.savings.dualPricing.annualSavings)}

OPTION 2: INTERCHANGE PLUS PRICING
Transparent pricing with true interchange pass-through plus a small margin.
- Your Monthly Cost: ${formatCurrencyExact(analysis.savings.interchangePlus.monthlyCost)}
- Your Effective Rate: ${analysis.savings.interchangePlus.effectiveRate}%
- Your Monthly Savings: ${formatCurrency(analysis.savings.interchangePlus.monthlySavings)}
- Your Annual Savings: ${formatCurrency(analysis.savings.interchangePlus.annualSavings)}

NEXT STEPS
----------
Ready to start saving? Contact your PCBancard representative to get started. We can have you up and running within 48 hours.

---
Prepared for you by PCBancard
${new Date().toLocaleDateString()}
`;

    await navigator.clipboard.writeText(proposalText);
    setCopiedText("Customer Proposal");
    setTimeout(() => setCopiedText(null), 3000);
    toast({ 
      title: "Proposal Copied!", 
      description: "Customer-facing proposal ready to send" 
    });
  };

  const exportToExcel = () => {
    if (!results) return;
    
    const { analysis, talkingPoints } = results;
    const maxSavings = Math.max(
      analysis.savings.dualPricing.annualSavings,
      analysis.savings.interchangePlus.annualSavings
    );
    
    const summaryData = [
      ["PCBancard Statement Analysis Report"],
      ["Generated", new Date().toLocaleDateString()],
      [],
      ["CURRENT SITUATION"],
      ["Monthly Volume", analysis.summary.monthlyVolume],
      ["Monthly Transactions", analysis.summary.monthlyTransactions],
      ["Average Ticket", analysis.summary.averageTicket],
      ["Current Effective Rate (%)", analysis.summary.currentEffectiveRate],
      ["Current Monthly Fees", analysis.summary.currentTotalFees],
      [],
      ["COST BREAKDOWN"],
      ["True Interchange Cost", analysis.costAnalysis.trueInterchange],
      ["Card Brand Assessments", analysis.costAnalysis.trueAssessments],
      ["True Wholesale Cost", analysis.costAnalysis.trueWholesale],
      ["True Wholesale Rate (%)", analysis.costAnalysis.trueWholesaleRate],
      ["Processor Markup", analysis.costAnalysis.processorMarkup],
      ["Processor Markup Rate (%)", analysis.costAnalysis.processorMarkupRate],
      [],
      ["SAVINGS ANALYSIS"],
      ["Maximum Annual Savings", maxSavings],
      [],
      ["Dual Pricing Program"],
      ["Monthly Cost", analysis.savings.dualPricing.monthlyCost],
      ["Effective Rate (%)", analysis.savings.dualPricing.effectiveRate],
      ["Monthly Savings", analysis.savings.dualPricing.monthlySavings],
      ["Annual Savings", analysis.savings.dualPricing.annualSavings],
      [],
      ["Interchange Plus"],
      ["Monthly Cost", analysis.savings.interchangePlus.monthlyCost],
      ["Effective Rate (%)", analysis.savings.interchangePlus.effectiveRate],
      ["Monthly Savings", analysis.savings.interchangePlus.monthlySavings],
      ["Annual Savings", analysis.savings.interchangePlus.annualSavings],
    ];

    const redFlagsData = [
      ["ISSUES FOUND"],
      ["Severity", "Issue", "Detail", "Monthly Savings Impact"],
      ...analysis.redFlags.map(f => [f.severity, f.issue, f.detail, f.savings])
    ];

    const talkingPointsData = [
      ["TALKING POINTS"],
      [],
      ["Opening Statement"],
      [talkingPoints.opening],
      [],
      ["Key Facts"],
      ...talkingPoints.keyFacts.map(f => [f]),
      [],
      ["Discovery Questions"],
      ...talkingPoints.questions.map((q, i) => [`${i+1}. ${q}`]),
      [],
      ["Dual Pricing Pitch"],
      [talkingPoints.dualPricingPitch],
      [],
      ["Interchange Plus Pitch"],
      [talkingPoints.interchangePlusPitch || ""],
      [],
      ["Closing"],
      [talkingPoints.closing]
    ];

    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Analysis Summary");
    
    if (analysis.redFlags.length > 0) {
      const wsFlags = XLSX.utils.aoa_to_sheet(redFlagsData);
      wsFlags['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsFlags, "Issues Found");
    }
    
    const wsTalking = XLSX.utils.aoa_to_sheet(talkingPointsData);
    wsTalking['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsTalking, "Sales Scripts");
    
    const merchantName = form.getValues("merchantName") || "Merchant";
    const filename = `PCBancard_Analysis_${merchantName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    toast({ 
      title: "Excel Downloaded!", 
      description: `Analysis saved as ${filename}` 
    });
  };

  const downloadAgentPDF = () => {
    document.body.classList.remove("print-merchant-mode");
    setTimeout(() => {
      window.print();
      toast({ 
        title: "Agent PDF", 
        description: "Includes all sales talking points, AI insights, and competitor intelligence" 
      });
    }, 100);
  };

  const downloadMerchantPDF = () => {
    document.body.classList.add("print-merchant-mode");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-merchant-mode");
      toast({ 
        title: "Merchant PDF", 
        description: "Clean version for sharing with the merchant" 
      });
    }, 100);
  };

  const downloadAgentWord = async () => {
    if (!results) return;
    try {
      const response = await fetch("/api/proposal-intelligence/statement-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          merchantName: results.merchantName || "Merchant",
          processorName: results.processorName,
          analysis: {
            ...results.analysis,
            talkingPoints: results.talkingPoints,
            competitorInsights: results.competitorInsights,
            aiInsights: results.aiAnalysis
          },
          documentType: "agent"
        })
      });
      
      if (!response.ok) throw new Error("Failed to generate document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(results.merchantName || "Merchant").replace(/[^a-zA-Z0-9]/g, "_")}_Statement_Analysis_Agent.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Agent Word Document",
        description: "Downloaded editable Word document with full analysis"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not generate Word document",
        variant: "destructive"
      });
    }
  };

  const downloadMerchantWord = async () => {
    if (!results) return;
    try {
      const response = await fetch("/api/proposal-intelligence/statement-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          merchantName: results.merchantName || "Merchant",
          processorName: results.processorName,
          analysis: results.analysis,
          documentType: "merchant"
        })
      });
      
      if (!response.ok) throw new Error("Failed to generate document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(results.merchantName || "Merchant").replace(/[^a-zA-Z0-9]/g, "_")}_Statement_Analysis.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Merchant Word Document",
        description: "Downloaded editable Word document for sharing"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not generate Word document",
        variant: "destructive"
      });
    }
  };

  const handleQuickFill = (type: keyof typeof quickFillExamples) => {
    const example = quickFillExamples[type];
    form.setValue("totalVolume", example.volume);
    form.setValue("totalTransactions", example.transactions);
    form.setValue("totalFees", example.totalFees);
    form.setValue("merchantType", example.merchantType);
  };

  const handleNewAnalysis = () => {
    setResults(null);
    setExtractedData(null);
    setExtractionStep("idle");
    setUploadedFiles([]);
    setEntryMode("upload");
    setShowAdvanced(false);
    form.reset({
      merchantName: "",
      processorName: "Unknown",
      totalVolume: "",
      totalTransactions: "",
      totalFees: "",
      merchantType: "retail",
      interchangeFees: "",
      assessmentFees: "",
      monthlyFees: "",
      pciFees: "",
      statementFees: "",
      batchFees: "",
      equipmentFees: "",
      otherFees: "",
      useAI: false,
      icPlusRateMargin: "0.50",
      icPlusPerTxnFee: "0.10",
      icPlusMonthlyFee: "10",
      dualPricingMonthlyCost: "64.95"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const onSubmit = (data: FormValues) => {
    analyzeMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCurrencyExact = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (file.type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type.includes("sheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl print:p-0">
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statement Analyzer</h1>
            <p className="text-muted-foreground">Upload or enter statement data for analysis</p>
          </div>
        </div>
        {results && (
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={copyAllForEmail}
              data-testid="button-copy-email-header"
            >
              {copiedText === "Full Analysis" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Copy for Email
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {!results ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Statement Data Entry
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Upload statement files or enter numbers manually
            </CardDescription>
          </CardHeader>
          
          <div className="border-b">
            <div className="flex">
              <button
                type="button"
                onClick={() => setEntryMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                  entryMode === "upload" 
                    ? "bg-primary/10 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid="tab-upload"
              >
                <Upload className="h-4 w-4" />
                Upload Statement
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("manual")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                  entryMode === "manual" 
                    ? "bg-primary/10 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid="tab-manual"
              >
                <Keyboard className="h-4 w-4" />
                Enter Manually
              </button>
            </div>
          </div>

          <CardContent className="pt-6">
            {entryMode === "upload" && extractionStep !== "review" && (
              <div className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging 
                      ? "border-primary bg-primary/10" 
                      : "hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  data-testid="dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isDragging ? "Drop files here" : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, Excel, CSV, or Images (multiple pages supported)
                      </p>
                    </div>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Files to analyze ({uploadedFiles.length})</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          uploadedFiles.forEach(f => {
                            if (f.preview) URL.revokeObjectURL(f.preview);
                          });
                          setUploadedFiles([]);
                          setExtractedData(null);
                          setExtractionStep("idle");
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        data-testid="button-clear-all-files"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {uploadedFiles.map((f, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          data-testid={`file-item-${i}`}
                        >
                          {f.preview ? (
                            <img src={f.preview} alt="" className="h-10 w-10 object-cover rounded" />
                          ) : (
                            getFileIcon(f.file)
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
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                              data-testid={`button-remove-file-${i}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {extractionStep === "uploading" && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Uploading files...</p>
                        <Progress value={
                          (uploadedFiles.filter(f => f.uploaded).length / uploadedFiles.length) * 100
                        } />
                      </div>
                    )}

                    {extractionStep === "extracting" && (
                      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">AI is extracting data from your statement...</span>
                      </div>
                    )}

                    {extractionStep === "idle" && (
                      <>
                        <PricingConfiguration
                          onConfigChange={setPricingConfig}
                          initialConfig={pricingConfig}
                          compact={true}
                          collapsible={true}
                          defaultCollapsed={true}
                        />
                        
                        <Button 
                          className="w-full" 
                          onClick={uploadAndExtract}
                          disabled={uploadedFiles.length === 0}
                          data-testid="button-extract"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Extract & Analyze with AI
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    or{" "}
                    <button 
                      type="button"
                      onClick={() => setEntryMode("manual")}
                      className="text-primary underline"
                      data-testid="link-manual-entry"
                    >
                      enter numbers manually
                    </button>
                  </p>
                </div>
              </div>
            )}

            {(entryMode === "manual" || extractionStep === "review") && (
              <>
                {extractionStep === "review" && extractedData && (
                  <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800 dark:text-green-300">
                          Data Extracted Successfully
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                          Confidence: {extractedData.confidence}% - Please review and correct any values below.
                        </p>
                        {extractedData.extractionNotes.length > 0 && (
                          <ul className="text-xs text-green-600 dark:text-green-500 mt-2 list-disc list-inside">
                            {extractedData.extractionNotes.map((note, i) => (
                              <li key={i}>{note}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {entryMode === "manual" && (
                  <div className="px-0 py-3 bg-muted/50 -mx-6 px-6 mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Quick fill:</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleQuickFill("small")}
                      data-testid="button-quick-small"
                    >
                      Small ($15k)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleQuickFill("medium")}
                      data-testid="button-quick-medium"
                    >
                      Medium ($50k)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleQuickFill("large")}
                      data-testid="button-quick-large"
                    >
                      Large ($150k)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleQuickFill("restaurant")}
                      data-testid="button-quick-restaurant"
                    >
                      Restaurant
                    </Button>
                  </div>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="merchantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Merchant Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Business name" {...field} data-testid="input-merchant-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="processorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Processor</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-processor">
                                  <SelectValue placeholder="Select processor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {processors.map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormItem>
                      <FormLabel>Link to Deal (Optional)</FormLabel>
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
                      <FormDescription>Link this analysis to an existing deal in your pipeline</FormDescription>
                    </FormItem>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="totalVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Volume *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input className="pl-7" placeholder="50,000" {...field} data-testid="input-total-volume" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="totalTransactions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transactions *</FormLabel>
                            <FormControl>
                              <Input placeholder="800" {...field} data-testid="input-transactions" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="totalFees"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Fees *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input className="pl-7" placeholder="1,250" {...field} data-testid="input-total-fees" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="merchantType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-merchant-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="retail">Retail Store</SelectItem>
                              <SelectItem value="restaurant">Restaurant</SelectItem>
                              <SelectItem value="qsr">Quick Service Restaurant</SelectItem>
                              <SelectItem value="supermarket">Supermarket</SelectItem>
                              <SelectItem value="ecommerce">E-Commerce / Online</SelectItem>
                              <SelectItem value="service">Service Business</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="b2b">B2B</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" type="button" className="w-full justify-start text-primary" data-testid="button-toggle-advanced">
                          {showAdvanced ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                          Advanced: Fee Breakdown (optional)
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            If available on the statement, enter the fee breakdown for more accurate analysis:
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField
                              control={form.control}
                              name="interchangeFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Interchange</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-interchange" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="assessmentFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Assessments</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-assessments" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="monthlyFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Monthly Fee</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-monthly-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="pciFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">PCI Fee</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-pci-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="statementFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Statement Fee</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-statement-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="batchFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Batch Fees</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-batch-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="equipmentFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Equipment</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-equipment-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="otherFees"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Other Fees</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="$0" {...field} data-testid="input-other-fees" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <PricingConfiguration
                      onConfigChange={setPricingConfig}
                      initialConfig={pricingConfig}
                      compact={false}
                      collapsible={true}
                      defaultCollapsed={true}
                    />

                    <FormField
                      control={form.control}
                      name="useAI"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>AI-Enhanced Analysis</FormLabel>
                            <FormDescription>
                              Use Claude AI for personalized insights and talking points
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-use-ai"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={analyzeMutation.isPending}
                      data-testid="button-analyze-statement"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze Statement
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Export Action Bar */}
          <Card className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20 print:hidden">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Share This Analysis</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={copyCustomerProposal}
                    className="gap-2"
                    data-testid="button-copy-customer-proposal"
                  >
                    {copiedText === "Customer Proposal" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Send to Customer
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyAllForEmail}
                    className="gap-2"
                    data-testid="button-copy-email"
                  >
                    {copiedText === "Full Analysis" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        My Notes
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToExcel}
                    className="gap-2"
                    data-testid="button-export-excel"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAgentPDF}
                    className="gap-2"
                    data-testid="button-download-agent-pdf"
                  >
                    <Download className="h-4 w-4" />
                    Agent PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadMerchantPDF}
                    className="gap-2"
                    data-testid="button-download-merchant-pdf"
                  >
                    <FileText className="h-4 w-4" />
                    Merchant PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadAgentWord}
                    className="gap-2"
                    data-testid="button-download-agent-word"
                  >
                    <Download className="h-4 w-4" />
                    Agent Word
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={downloadMerchantWord}
                    className="gap-2"
                    data-testid="button-download-merchant-word"
                  >
                    <FileText className="h-4 w-4" />
                    Merchant Word
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleNewAnalysis}
                    className="gap-2"
                    data-testid="button-new-analysis"
                  >
                    <RefreshCw className="h-4 w-4" />
                    New Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Savings Hero */}
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 text-white overflow-hidden statement-section">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <p className="text-green-100 text-sm font-medium uppercase tracking-wide">Maximum Savings Opportunity</p>
                <p className="text-5xl font-bold mt-2">
                  {formatCurrency(Math.max(
                    results.analysis.savings.dualPricing.annualSavings,
                    results.analysis.savings.interchangePlus.annualSavings
                  ))}
                </p>
                <p className="text-green-100 mt-1">
                  per year ({formatCurrency(Math.max(
                    results.analysis.savings.dualPricing.monthlySavings,
                    results.analysis.savings.interchangePlus.monthlySavings
                  ))}/month)
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{results.analysis.summary.currentEffectiveRate}%</p>
                  <p className="text-xs text-green-100">Current Rate</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{results.analysis.costAnalysis.trueWholesaleRate}%</p>
                  <p className="text-xs text-green-100">True Interchange</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{results.analysis.savings.dualPricing.effectiveRate}%</p>
                  <p className="text-xs text-green-100">With Dual Pricing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 print:grid-cols-1">
            {/* Cost Breakdown */}
            <Card className="statement-section">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Monthly Volume</span>
                      <span className="font-semibold">{formatCurrency(results.analysis.summary.monthlyVolume)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Transactions</span>
                      <span className="font-semibold">{results.analysis.summary.monthlyTransactions.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">True Interchange</span>
                      <span className="font-semibold">{formatCurrencyExact(results.analysis.costAnalysis.trueInterchange)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Assessments</span>
                      <span className="font-semibold">{formatCurrencyExact(results.analysis.costAnalysis.trueAssessments)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold">
                      <span>True Wholesale Cost</span>
                      <span className="text-green-600">{formatCurrencyExact(results.analysis.costAnalysis.trueWholesale)}</span>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-red-700 dark:text-red-300 font-medium">Current Total Fees</span>
                      <span className="font-bold text-red-700 dark:text-red-300">{formatCurrencyExact(results.analysis.summary.currentTotalFees)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-red-600 dark:text-red-400 text-sm">Processor Markup</span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrencyExact(results.analysis.costAnalysis.processorMarkup)} ({results.analysis.costAnalysis.processorMarkupRate}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PCBancard Options */}
            <Card className="statement-section">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  PCBancard Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dual Pricing */}
                <div className="rounded-lg p-4 bg-primary/5 border-2 border-primary">
                  <Badge className="mb-2">RECOMMENDED</Badge>
                  <h4 className="font-bold">Dual Pricing Program</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer pays 3.99% service fee for card transactions
                  </p>
                  
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Cost</span>
                      <span className="font-semibold">{formatCurrencyExact(results.analysis.savings.dualPricing.monthlyCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Rate</span>
                      <span className="font-semibold">{results.analysis.savings.dualPricing.effectiveRate}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Monthly Savings</span>
                      <span>{formatCurrency(results.analysis.savings.dualPricing.monthlySavings)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Annual Savings</span>
                      <span>{formatCurrency(results.analysis.savings.dualPricing.annualSavings)}</span>
                    </div>
                  </div>
                </div>

                {/* Interchange Plus */}
                <div className="rounded-lg p-4 bg-muted/50 border">
                  <h4 className="font-bold">Interchange Plus</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    True interchange + 0.20% + $0.10/txn
                  </p>
                  
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Monthly Cost</span>
                      <span className="font-semibold">{formatCurrencyExact(results.analysis.savings.interchangePlus.monthlyCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Effective Rate</span>
                      <span className="font-semibold">{results.analysis.savings.interchangePlus.effectiveRate}%</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Monthly Savings</span>
                      <span>{formatCurrency(results.analysis.savings.interchangePlus.monthlySavings)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Annual Savings</span>
                      <span>{formatCurrency(results.analysis.savings.interchangePlus.annualSavings)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rate Comparison Visual */}
          <Card className="statement-section">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Rate Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Current Processor</span>
                    <span className="font-semibold text-red-600">{results.analysis.summary.currentEffectiveRate}%</span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(results.analysis.summary.currentEffectiveRate / 4 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">True Interchange Cost</span>
                    <span className="font-semibold text-blue-600">{results.analysis.costAnalysis.trueWholesaleRate}%</span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(results.analysis.costAnalysis.trueWholesaleRate / 4 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">PCBancard Interchange Plus</span>
                    <span className="font-semibold text-emerald-600">{results.analysis.savings.interchangePlus.effectiveRate}%</span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(results.analysis.savings.interchangePlus.effectiveRate / 4 * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">PCBancard Dual Pricing</span>
                    <span className="font-semibold text-green-600">{results.analysis.savings.dualPricing.effectiveRate}%</span>
                  </div>
                  <div className="h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.max(results.analysis.savings.dualPricing.effectiveRate, 0.5) / 4 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Red Flags */}
          {results.analysis.redFlags.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 statement-section">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                  Issues Found ({results.analysis.redFlags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.analysis.redFlags.map((flag, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg border-l-4 ${
                        flag.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-950/30 border-red-500' :
                        flag.severity === 'HIGH' ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-500' :
                        'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold">{flag.issue}</p>
                          <p className="text-sm text-muted-foreground mt-1">{flag.detail}</p>
                        </div>
                        <Badge 
                          variant={flag.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                          className="whitespace-nowrap"
                        >
                          {formatCurrency(flag.savings)}/mo
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Talking Points - Agent Only */}
          <Card className="agent-only-content statement-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Sales Talking Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="opening">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="opening" data-testid="tab-opening">Opening</TabsTrigger>
                  <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
                  <TabsTrigger value="dual-pricing" data-testid="tab-dual-pricing">Dual Pricing</TabsTrigger>
                  <TabsTrigger value="ic-plus" data-testid="tab-ic-plus">IC Plus</TabsTrigger>
                  <TabsTrigger value="objections" data-testid="tab-objections">Objections</TabsTrigger>
                  <TabsTrigger value="closing" data-testid="tab-closing">Closing</TabsTrigger>
                </TabsList>

                <TabsContent value="opening" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(results.talkingPoints.opening, "Opening")}
                      data-testid="button-copy-opening"
                    >
                      {copiedText === "Opening" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <ScrollArea className="h-[200px]">
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg whitespace-pre-wrap text-sm">
                        {results.talkingPoints.opening}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Key Facts:</h4>
                    <ul className="text-sm space-y-1">
                      {results.talkingPoints.keyFacts.map((fact, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="questions" className="mt-4">
                  <div className="space-y-2">
                    {results.talkingPoints.questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <span className="bg-primary/10 text-primary font-bold w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm">{q}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="dual-pricing" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(results.talkingPoints.dualPricingPitch, "Dual Pricing Pitch")}
                      data-testid="button-copy-dual-pricing"
                    >
                      {copiedText === "Dual Pricing Pitch" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <ScrollArea className="h-[300px]">
                      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg whitespace-pre-wrap text-sm">
                        {results.talkingPoints.dualPricingPitch}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="ic-plus" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(results.talkingPoints.interchangePlusPitch || "", "IC Plus Pitch")}
                      data-testid="button-copy-ic-plus"
                    >
                      {copiedText === "IC Plus Pitch" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <ScrollArea className="h-[300px]">
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg whitespace-pre-wrap text-sm">
                        {results.talkingPoints.interchangePlusPitch || "If dual pricing isn't the right fit, we also offer Interchange-Plus pricing with true wholesale rates plus a small, transparent markup."}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="objections" className="mt-4">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {Object.entries(results.talkingPoints.objections).map(([key, data], i) => {
                        const objData = typeof data === 'string' 
                          ? { objection: key, response: data }
                          : data;
                        
                        return (
                          <Collapsible 
                            key={i} 
                            open={expandedObjection === key}
                            onOpenChange={() => setExpandedObjection(expandedObjection === key ? null : key)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className="w-full flex justify-between items-center p-4 bg-muted/50 hover:bg-muted rounded-lg cursor-pointer transition">
                                <div className="flex items-center gap-2">
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <span className="font-medium text-sm">"{objData.objection || key}"</span>
                                </div>
                                {expandedObjection === key ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="p-4 border rounded-lg mt-2 bg-background">
                                <div className="flex justify-end mb-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(objData.response || '', `Objection: ${key}`)}
                                  >
                                    {copiedText === `Objection: ${key}` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{objData.response || ''}</p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="closing" className="mt-4">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => copyToClipboard(results.talkingPoints.closing, "Closing")}
                      data-testid="button-copy-closing"
                    >
                      {copiedText === "Closing" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <ScrollArea className="h-[200px]">
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg whitespace-pre-wrap text-sm">
                        {results.talkingPoints.closing}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Value Propositions */}
          <Card className="statement-section">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Value Propositions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {results.talkingPoints.valueProps.map((prop, i) => (
                  <div key={i} className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-sm">{prop.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{prop.detail}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis (if enabled) - Agent Only */}
          {results.aiAnalysis && (
            <Card className="border-purple-200 dark:border-purple-800 agent-only-content statement-section">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-5 w-5" />
                  AI-Enhanced Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Statement Summary</h4>
                  <p className="text-sm text-muted-foreground">{results.aiAnalysis.statementSummary}</p>
                </div>
                {results.aiAnalysis.customTalkingPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Custom Talking Points</h4>
                    <ul className="text-sm space-y-1">
                      {results.aiAnalysis.customTalkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="h-3 w-3 text-purple-500 mt-1 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.aiAnalysis.personalizedClosing && (
                  <div>
                    <h4 className="font-medium mb-2">Personalized Closing</h4>
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg text-sm">
                      {results.aiAnalysis.personalizedClosing}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Competitor Insights (if available) - Agent Only */}
          {results.competitorInsights && (
            <Card className="agent-only-content statement-section">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Competitor Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.competitorInsights.knownIssues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Known Issues</h4>
                    <ul className="text-sm space-y-1">
                      {results.competitorInsights.knownIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-red-500 mt-1 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.competitorInsights.talkingPoints.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Competitive Talking Points</h4>
                    <ul className="text-sm space-y-1">
                      {results.competitorInsights.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Improve Accuracy - Only show if we have an extractionId */}
          {extractedData?.extractionId && (
            <Card className="border-blue-200 dark:border-blue-800 print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Brain className="h-5 w-5" />
                  Help Improve Our Accuracy
                </CardTitle>
                <CardDescription>
                  Your feedback helps us extract statements more accurately
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showCorrectionUI ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <p className="text-sm text-muted-foreground flex-1">
                      Did we extract the numbers correctly? If not, let us know what was wrong.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (extractedData?.extractionId) {
                            verifyMutation.mutate(extractedData.extractionId);
                          }
                        }}
                        disabled={verifyMutation.isPending}
                        className="gap-2"
                        data-testid="button-extraction-correct"
                      >
                        {verifyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-4 w-4" />
                        )}
                        Looks Good
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCorrectionUI(true)}
                        className="gap-2"
                        data-testid="button-report-correction"
                      >
                        <Pencil className="h-4 w-4" />
                        Report Issue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">What field was wrong?</label>
                        <Select value={correctionField || ""} onValueChange={setCorrectionField}>
                          <SelectTrigger data-testid="select-correction-field">
                            <SelectValue placeholder="Select a field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="totalVolume">Total Volume</SelectItem>
                            <SelectItem value="totalTransactions">Total Transactions</SelectItem>
                            <SelectItem value="totalFees">Total Fees</SelectItem>
                            <SelectItem value="processorName">Processor Name</SelectItem>
                            <SelectItem value="merchantName">Merchant Name</SelectItem>
                            <SelectItem value="interchangeFees">Interchange Fees</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">What should the value be?</label>
                        <Input
                          placeholder="Enter correct value"
                          value={correctionValue}
                          onChange={(e) => setCorrectionValue(e.target.value)}
                          data-testid="input-correction-value"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCorrectionUI(false);
                          setCorrectionField(null);
                          setCorrectionValue("");
                        }}
                        data-testid="button-cancel-correction"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (correctionField && correctionValue) {
                            const getOriginalValue = (field: string): string => {
                              switch (field) {
                                case "totalVolume": return extractedData?.totalVolume?.toString() || "";
                                case "totalTransactions": return extractedData?.totalTransactions?.toString() || "";
                                case "totalFees": return extractedData?.totalFees?.toString() || "";
                                case "processorName": return extractedData?.processorName || "";
                                case "merchantName": return extractedData?.merchantName || "";
                                case "interchangeFees": return extractedData?.fees?.interchange?.toString() || "";
                                default: return "";
                              }
                            };
                            submitCorrection(correctionField, getOriginalValue(correctionField), correctionValue);
                          }
                        }}
                        disabled={!correctionField || !correctionValue || correctionMutation.isPending}
                        className="gap-2"
                        data-testid="button-submit-correction"
                      >
                        {correctionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Submit Correction
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
