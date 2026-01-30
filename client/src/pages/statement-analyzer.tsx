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
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

const formSchema = z.object({
  merchantName: z.string().optional(),
  processorName: z.string().optional(),
  totalVolume: z.string().min(1, "Required"),
  totalTransactions: z.string().min(1, "Required"),
  totalFees: z.string().min(1, "Required"),
  merchantType: z.string().default("retail"),
  monthlyFees: z.string().optional(),
  pciFees: z.string().optional(),
  equipmentFees: z.string().optional(),
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
    redFlagScripts: Array<{ issue: string; script: string }>;
    questions: string[];
    objections: Record<string, string>;
    valueProps: string[];
    dualPricingPitch: string;
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

export default function StatementAnalyzer() {
  const { toast } = useToast();
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchantName: "",
      processorName: "",
      totalVolume: "",
      totalTransactions: "",
      totalFees: "",
      merchantType: "retail",
      monthlyFees: "",
      pciFees: "",
      equipmentFees: "",
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
          monthlyFees: data.monthlyFees ? parseFloat(data.monthlyFees) : undefined,
          pciFees: data.pciFees ? parseFloat(data.pciFees) : undefined,
          equipmentFees: data.equipmentFees ? parseFloat(data.equipmentFees) : undefined
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

  const onSubmit = (data: FormValues) => {
    analyzeMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Statement Data
            </CardTitle>
            <CardDescription>
              Enter the merchant's statement information
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <FormControl>
                          <Input placeholder="e.g., Square, Clover" {...field} data-testid="input-processor-name" />
                        </FormControl>
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
                        <FormLabel>Monthly Volume ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000" {...field} data-testid="input-total-volume" />
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
                        <FormLabel>Transactions</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="500" {...field} data-testid="input-transactions" />
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
                        <FormLabel>Total Fees ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1250" {...field} data-testid="input-total-fees" />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-merchant-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="qsr">Quick Service Restaurant</SelectItem>
                          <SelectItem value="supermarket">Supermarket</SelectItem>
                          <SelectItem value="ecommerce">E-Commerce</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="b2b">B2B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                <p className="text-sm font-medium">Optional Fee Details</p>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="monthlyFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Fees ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="25" {...field} data-testid="input-monthly-fees" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pciFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PCI Fees ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="15" {...field} data-testid="input-pci-fees" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equipmentFees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50" {...field} data-testid="input-equipment-fees" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

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

        {results && (
          <div className="space-y-4">
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <DollarSign className="h-5 w-5" />
                  Savings Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      ${results.analysis.savings.dualPricing.monthlySavings.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Monthly Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      ${results.analysis.savings.dualPricing.annualSavings.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Annual Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {results.analysis.savings.dualPricing.effectiveRate}%
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">New Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Rate:</span>
                      <span className="font-medium">{results.analysis.summary.currentEffectiveRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">True Interchange:</span>
                      <span className="font-medium">{results.analysis.costAnalysis.trueWholesaleRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processor Markup:</span>
                      <span className="font-medium text-red-600">{results.analysis.costAnalysis.processorMarkupRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overpaying:</span>
                      <span className="font-medium text-red-600">${results.analysis.costAnalysis.processorMarkup}/mo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      <div key={i} className="flex items-start gap-2 pb-2 border-b last:border-0">
                        <Badge 
                          variant={flag.severity === 'HIGH' ? 'destructive' : flag.severity === 'MEDIUM' ? 'secondary' : 'outline'}
                        >
                          {flag.severity}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{flag.issue}</p>
                          <p className="text-xs text-muted-foreground">{flag.detail}</p>
                          <p className="text-xs font-medium text-red-600">Savings: ${flag.savings}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {results && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Sales Talking Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="opening">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="opening" data-testid="tab-opening">Opening</TabsTrigger>
                <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
                <TabsTrigger value="dual-pricing" data-testid="tab-dual-pricing">Dual Pricing</TabsTrigger>
                <TabsTrigger value="objections" data-testid="tab-objections">Objections</TabsTrigger>
                <TabsTrigger value="closing" data-testid="tab-closing">Closing</TabsTrigger>
              </TabsList>

              <TabsContent value="opening" className="mt-4">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.talkingPoints.opening, "Opening")}
                    data-testid="button-copy-opening"
                  >
                    {copiedText === "Opening" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <ScrollArea className="h-[200px]">
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                      {results.talkingPoints.opening}
                    </div>
                  </ScrollArea>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Key Facts:</h4>
                  <ul className="text-sm space-y-1">
                    {results.talkingPoints.keyFacts.map((fact, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="questions" className="mt-4">
                <div className="space-y-2">
                  {results.talkingPoints.questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                      <span className="font-bold text-primary">{i + 1}.</span>
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
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.talkingPoints.dualPricingPitch, "Dual Pricing Pitch")}
                    data-testid="button-copy-dual-pricing"
                  >
                    {copiedText === "Dual Pricing Pitch" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <ScrollArea className="h-[250px]">
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg whitespace-pre-wrap text-sm">
                      {results.talkingPoints.dualPricingPitch}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="objections" className="mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {Object.entries(results.talkingPoints.objections).map(([objection, response], i) => (
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-sm">{objection}</span>
                        </div>
                        <div className="bg-muted p-2 rounded text-sm whitespace-pre-wrap">
                          {response}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="closing" className="mt-4">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(results.talkingPoints.closing, "Closing")}
                    data-testid="button-copy-closing"
                  >
                    {copiedText === "Closing" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <ScrollArea className="h-[200px]">
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg whitespace-pre-wrap text-sm">
                      {results.talkingPoints.closing}
                    </div>
                  </ScrollArea>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Value Propositions:</h4>
                  <ul className="text-sm space-y-1">
                    {results.talkingPoints.valueProps.slice(0, 5).map((prop, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {prop}
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {results?.competitorInsights && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Competitor Insights: {form.getValues("processorName")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-red-600">Known Issues</h4>
                <ul className="text-sm space-y-1">
                  {results.competitorInsights.knownIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 mt-1 text-red-500 flex-shrink-0" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-amber-600">Contract Pitfalls</h4>
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
                <h4 className="font-medium mb-2 text-blue-600">Talking Points</h4>
                <ul className="text-sm space-y-1">
                  {results.competitorInsights.talkingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <MessageSquare className="h-3 w-3 mt-1 text-blue-500 flex-shrink-0" />
                      <span className="italic">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
