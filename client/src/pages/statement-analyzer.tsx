import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  TrendingDown, 
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
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";

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
  useAI: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

interface AnalysisResult {
  success: boolean;
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

const quickFillExamples = {
  small: { volume: "15000", transactions: "300", totalFees: "450", merchantType: "retail" },
  medium: { volume: "50000", transactions: "800", totalFees: "1350", merchantType: "retail" },
  large: { volume: "150000", transactions: "2500", totalFees: "3800", merchantType: "retail" },
  restaurant: { volume: "75000", transactions: "1500", totalFees: "1950", merchantType: "restaurant" }
};

export default function StatementAnalyzer() {
  const { toast } = useToast();
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedObjection, setExpandedObjection] = useState<string | null>(null);

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
      useAI: false
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
        useAI: data.useAI
      };
      
      const response = await apiRequest("POST", "/api/proposal-intelligence/analyze-statement", payload);
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      toast({
        title: "Analysis Complete",
        description: "Statement analyzed successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
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
    form.reset();
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

  return (
    <div className="container mx-auto p-4 max-w-6xl print:p-0">
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/coach">
            <Button variant="ghost" size="icon" data-testid="button-back-coach">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statement Analyzer</h1>
            <p className="text-muted-foreground">Analyze merchant statements and generate talking points</p>
          </div>
        </div>
        {results && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewAnalysis} data-testid="button-new-analysis">
              <RefreshCw className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </div>
        )}
      </div>

      {!results ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Enter Statement Data
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Enter the merchant's processing statement information
            </CardDescription>
          </CardHeader>
          
          <div className="px-6 py-3 bg-muted/50 border-b flex flex-wrap items-center gap-2 text-sm">
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

          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Savings Hero */}
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 text-white overflow-hidden">
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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <Card>
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
            <Card>
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
          <Card>
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
            <Card className="border-red-200 dark:border-red-800">
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

          {/* Talking Points */}
          <Card>
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
                                    onClick={() => copyToClipboard(objData.response || (data as string), `Objection: ${key}`)}
                                  >
                                    {copiedText === `Objection: ${key}` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{objData.response || (data as string)}</p>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                PCBancard Value Propositions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {(Array.isArray(results.talkingPoints.valueProps) 
                  ? results.talkingPoints.valueProps 
                  : [
                    { title: "Transparent Interchange-Plus Pricing", detail: "See exactly what interchange you pay - no hidden markups" },
                    { title: "No Junk Fees", detail: "No annual fees, no PCI fees, no statement fees, no batch fees" },
                    { title: "Free PCI Compliance Assistance", detail: "We help you complete your PCI questionnaire at no extra cost" },
                    { title: "Free Terminal with Dual Pricing", detail: "Dejavoo P1 or P3 terminal included with our free equipment program" },
                    { title: "No Long-Term Contract", detail: "Month-to-month agreement with no early termination fees" },
                    { title: "US-Based Support", detail: "Real people answering the phone, not overseas call centers" }
                  ]
                ).map((prop, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{typeof prop === 'string' ? prop : prop.title}</p>
                      {typeof prop !== 'string' && prop.detail && (
                        <p className="text-sm text-muted-foreground">{prop.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Competitor Insights */}
          {results.competitorInsights && (
            <Card>
              <CardHeader>
                <CardTitle>Competitor Insights: {form.getValues("processorName")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Known Issues
                    </h4>
                    <ul className="text-sm space-y-1">
                      {results.competitorInsights.knownIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="h-3 w-3 mt-1 text-red-500 flex-shrink-0" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Contract Pitfalls
                    </h4>
                    <ul className="text-sm space-y-1">
                      {results.competitorInsights.contractPitfalls.map((pitfall, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="h-3 w-3 mt-1 text-amber-500 flex-shrink-0" />
                          <span>{pitfall}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-blue-600 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Talking Points
                    </h4>
                    <ul className="text-sm space-y-1">
                      {results.competitorInsights.talkingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 mt-1 text-blue-500 flex-shrink-0" />
                          <span className="italic">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {results.aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Statement Summary</h4>
                    <p className="text-sm bg-muted p-4 rounded-lg">{results.aiAnalysis.statementSummary}</p>
                  </div>
                  {results.aiAnalysis.customTalkingPoints.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Custom Talking Points</h4>
                      <ul className="space-y-2">
                        {results.aiAnalysis.customTalkingPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.aiAnalysis.personalizedClosing && (
                    <div>
                      <h4 className="font-medium mb-2">Personalized Closing</h4>
                      <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-sm">
                        {results.aiAnalysis.personalizedClosing}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Print Section */}
          <div className="bg-muted rounded-xl p-6 text-center print:hidden">
            <p className="text-muted-foreground mb-3">Need a printable version?</p>
            <Button onClick={handlePrint} data-testid="button-print-bottom">
              <Printer className="h-4 w-4 mr-2" />
              Print Talking Points
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground print:hidden">
            Interchange rates are estimates. Actual rates vary based on card mix and qualification.
          </p>
        </div>
      )}
    </div>
  );
}
