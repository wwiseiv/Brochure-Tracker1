import { useState, useEffect, useCallback } from "react";
import { useSearch } from "wouter";
import { AutoLayout } from "./AutoLayout";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Clock, Users,
  Loader2, FileText, CheckCircle, XCircle, AlertCircle, Download,
} from "lucide-react";
import { DesktopNudge } from "./DesktopNudge";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

function getQuickDates(preset: string) {
  const now = new Date();
  switch (preset) {
    case "thisMonth": {
      return { start: getDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: getDateStr(now) };
    }
    case "lastMonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: getDateStr(first), end: getDateStr(last) };
    }
    case "thisQuarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: getDateStr(new Date(now.getFullYear(), qMonth, 1)), end: getDateStr(now) };
    }
    case "thisYear": {
      return { start: getDateStr(new Date(now.getFullYear(), 0, 1)), end: getDateStr(now) };
    }
    default:
      return { start: getDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: getDateStr(now) };
  }
}

interface JobPLData {
  details: Array<{
    roId: number; roNumber: string; customerName: string; vehicleInfo: string;
    revenue: number; cost: number; profit: number; margin: number; date: string;
  }>;
  summary: { totalRevenue: number; totalCost: number; totalProfit: number; avgMargin: number };
}

interface SalesTaxData {
  totalPartsTax: number; totalLaborTax: number; totalTax: number; roCount: number;
  details: Array<{
    roNumber: string; date: string; subtotal: number;
    partsTax: number; laborTax: number; totalTax: number; total: number;
  }>;
}

interface TechProductivityData {
  technicians: Array<{
    id: number; name: string; totalHours: number;
    totalRevenue: number; roCount: number; effectiveRate: number;
  }>;
}

interface ApprovalData {
  totalEstimates: number; approved: number; declined: number;
  pending: number; conversionRate: number; avgApprovalTimeHours: number;
}

interface DualPricingData {
  summary: {
    totalTransactions: number;
    cashTransactions: number;
    cardTransactions: number;
    cashPercent: number;
    cardPercent: number;
    totalRevenueCashBasis: number;
    totalDualPricingCollected: number;
    totalCollected: number;
    avgTransactionCash: number;
    avgTransactionCard: number;
    dualPricingRate: number;
  };
  transactions: Array<{
    date: string;
    roNumber: string;
    customerName: string;
    vehicle: string;
    method: string;
    cashPrice: number;
    cardPrice: number;
    amountPaid: number;
    tip: number;
    totalCollected: number;
    dpAmount: number;
    cardBrand: string | null;
    cardLast4: string | null;
  }>;
}

const TAB_MAP: Record<string, string> = {
  revenue: "revenue",
  tax: "sales-tax",
  technician: "tech-productivity",
  customer: "approvals",
  "dual-pricing": "dual-pricing",
};

export default function AutoReports() {
  const { autoFetch } = useAutoAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const urlTab = new URLSearchParams(searchString).get("tab");
  const defaults = getQuickDates("thisMonth");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [activeTab, setActiveTab] = useState(urlTab && TAB_MAP[urlTab] ? TAB_MAP[urlTab] : "job-pl");
  const [exporting, setExporting] = useState(false);
  const [revenueExporting, setRevenueExporting] = useState(false);

  const [jobPL, setJobPL] = useState<JobPLData | null>(null);
  const [salesTax, setSalesTax] = useState<SalesTaxData | null>(null);
  const [techProd, setTechProd] = useState<TechProductivityData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalData | null>(null);
  const [dualPricing, setDualPricing] = useState<DualPricingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = `startDate=${startDate}&endDate=${endDate}`;
      const [plRes, taxRes, techRes, appRes, dpRes] = await Promise.all([
        autoFetch(`/api/reports/job-profitability?${params}`),
        autoFetch(`/api/reports/sales-tax?${params}`),
        autoFetch(`/api/reports/tech-productivity?${params}`),
        autoFetch(`/api/reports/approval-conversion?${params}`),
        autoFetch(`/api/reports/dual-pricing?${params}`),
      ]);

      if (plRes.ok) setJobPL(await plRes.json());
      if (taxRes.ok) setSalesTax(await taxRes.json());
      if (techRes.ok) setTechProd(await techRes.json());
      if (appRes.ok) setApprovals(await appRes.json());
      if (dpRes.ok) setDualPricing(await dpRes.json());
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, autoFetch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportReport = async (reportType: string, data: any) => {
    if (!data) return;
    setExporting(true);
    try {
      const res = await autoFetch("/api/reports/export", {
        method: "POST",
        body: JSON.stringify({ reportType, reportData: data, startDate, endDate }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `PCB_Auto_${reportType}_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  function applyQuickDate(preset: string) {
    const dates = getQuickDates(preset);
    setStartDate(dates.start);
    setEndDate(dates.end);
  }

  const exportRevenueReport = async () => {
    setRevenueExporting(true);
    try {
      const res = await autoFetch("/api/reports/revenue/export", {
        method: "POST",
        body: JSON.stringify({ startDate, endDate, jobPL, dualPricing }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `PCB_Auto_Revenue_Report_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Revenue Report Downloaded", description: "AI-powered financial analysis included" });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setRevenueExporting(false);
    }
  };

  const maxRevenue = techProd?.technicians?.length
    ? Math.max(...techProd.technicians.map((t) => t.totalRevenue ?? 0), 1)
    : 1;

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
        </div>

        <DesktopNudge message="Detailed reports with charts and tables are best viewed on a larger screen." dismissKey="reports-detail" />

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => applyQuickDate("thisMonth")} data-testid="button-this-month">This Month</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickDate("lastMonth")} data-testid="button-last-month">Last Month</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickDate("thisQuarter")} data-testid="button-this-quarter">This Quarter</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickDate("thisYear")} data-testid="button-this-year">This Year</Button>
              </div>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="revenue" className="whitespace-nowrap" data-testid="tab-revenue">Revenue</TabsTrigger>
            <TabsTrigger value="job-pl" className="whitespace-nowrap" data-testid="tab-job-pl">Job P&L</TabsTrigger>
            <TabsTrigger value="sales-tax" className="whitespace-nowrap" data-testid="tab-sales-tax">Sales Tax</TabsTrigger>
            <TabsTrigger value="tech-productivity" className="whitespace-nowrap" data-testid="tab-tech-productivity">Tech Productivity</TabsTrigger>
            <TabsTrigger value="approvals" className="whitespace-nowrap" data-testid="tab-approvals">Approvals</TabsTrigger>
            <TabsTrigger value="dual-pricing" className="whitespace-nowrap" data-testid="tab-dual-pricing">Dual Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4 mt-4">
            {(() => {
              const totalRevenue = jobPL?.summary?.totalRevenue ?? 0;
              const totalProfit = jobPL?.summary?.totalProfit ?? 0;
              const totalCost = jobPL?.summary?.totalCost ?? 0;
              const avgMargin = jobPL?.summary?.avgMargin ?? 0;
              const cashTotal = dualPricing?.summary?.totalCollected
                ? (dualPricing.summary.totalCollected - dualPricing.summary.totalDualPricingCollected)
                : 0;
              const cardTotal = dualPricing?.summary?.totalDualPricingCollected ?? 0;
              const cashCount = dualPricing?.summary?.cashTransactions ?? 0;
              const cardCount = dualPricing?.summary?.cardTransactions ?? 0;
              const totalTx = dualPricing?.summary?.totalTransactions ?? 0;
              const cashPct = dualPricing?.summary?.cashPercent ?? 0;
              const cardPct = dualPricing?.summary?.cardPercent ?? 0;
              const dpEarned = dualPricing?.summary?.totalDualPricingCollected ?? 0;
              const avgRoValue = jobPL?.details?.length ? totalRevenue / jobPL.details.length : 0;

              const dailyMap: Record<string, { revenue: number; count: number; cash: number; card: number }> = {};
              if (dualPricing?.transactions) {
                for (const tx of dualPricing.transactions) {
                  const day = tx.date ? new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Unknown";
                  if (!dailyMap[day]) dailyMap[day] = { revenue: 0, count: 0, cash: 0, card: 0 };
                  dailyMap[day].revenue += tx.totalCollected;
                  dailyMap[day].count += 1;
                  if (tx.method === "cash") dailyMap[day].cash += tx.amountPaid;
                  else dailyMap[day].card += tx.amountPaid;
                }
              }
              const dailyBreakdown = Object.entries(dailyMap).map(([day, data]) => ({ day, ...data }));

              return (
                <>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={exportRevenueReport} disabled={revenueExporting || (!jobPL && !dualPricing)} data-testid="button-export-revenue">
                      {revenueExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      {revenueExporting ? "Generating AI Report..." : "Export to Excel"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl sm:text-2xl font-bold truncate text-green-600 dark:text-green-400" data-testid="text-rev-total">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{jobPL?.details?.length ?? 0} completed jobs</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate">Net Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-xl sm:text-2xl font-bold truncate ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-rev-profit">{formatCurrency(totalProfit)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{avgMargin.toFixed(1)}% margin</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate">Avg Job Value</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-rev-avg">{formatCurrency(avgRoValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{totalTx} total transactions</p>
                      </CardContent>
                    </Card>
                    <Card className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate">Dual Pricing Earned</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl sm:text-2xl font-bold truncate text-green-600 dark:text-green-400" data-testid="text-rev-dp">{formatCurrency(dpEarned)}</div>
                        <p className="text-xs text-muted-foreground mt-1">from {cardCount} card transactions</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">Payment Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Cash Payments</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-rev-cash">{formatCurrency(dualPricing?.transactions?.filter(t => t.method === "cash").reduce((s, t) => s + t.amountPaid, 0) ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">{cashCount} transactions ({cashPct}%)</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Card Payments</p>
                            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400" data-testid="text-rev-card">{formatCurrency(dualPricing?.transactions?.filter(t => t.method === "card").reduce((s, t) => s + t.amountPaid, 0) ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">{cardCount} transactions ({cardPct}%)</p>
                          </div>
                        </div>
                        {totalTx > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Cash {cashPct}%</span>
                              <span>Card {cardPct}%</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
                              <div className="bg-green-500 h-full transition-all" style={{ width: `${cashPct}%` }} />
                              <div className="bg-blue-500 h-full transition-all" style={{ width: `${cardPct}%` }} />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">Cost & Profit Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Revenue</span>
                          <span className="text-sm font-medium">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Parts & Labor Cost</span>
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">-{formatCurrency(totalCost)}</span>
                        </div>
                        <hr className="border-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Net Profit</span>
                          <span className={`text-sm font-bold ${totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{formatCurrency(totalProfit)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Dual Pricing Earned</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">+{formatCurrency(dpEarned)}</span>
                        </div>
                        <hr className="border-border" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">Total Earnings</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totalProfit + dpEarned)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {dailyBreakdown.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">Daily Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" data-testid="table-daily-revenue">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 font-medium">Date</th>
                                <th className="text-right py-2 font-medium">Cash</th>
                                <th className="text-right py-2 font-medium">Card</th>
                                <th className="text-right py-2 font-medium">Total</th>
                                <th className="text-right py-2 font-medium">Transactions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dailyBreakdown.map((row) => (
                                <tr key={row.day} className="border-b last:border-b-0">
                                  <td className="py-2">{row.day}</td>
                                  <td className="text-right py-2">{formatCurrency(row.cash)}</td>
                                  <td className="text-right py-2">{formatCurrency(row.card)}</td>
                                  <td className="text-right py-2 font-medium">{formatCurrency(row.revenue)}</td>
                                  <td className="text-right py-2">{row.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {dualPricing?.transactions && dualPricing.transactions.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold">Transaction Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" data-testid="table-revenue-transactions">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 font-medium">Date</th>
                                <th className="text-left py-2 font-medium">RO #</th>
                                <th className="text-left py-2 font-medium">Customer</th>
                                <th className="text-left py-2 font-medium">Method</th>
                                <th className="text-right py-2 font-medium">Cash Price</th>
                                <th className="text-right py-2 font-medium">Card Price</th>
                                <th className="text-right py-2 font-medium">Paid</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dualPricing.transactions.map((tx, i) => (
                                <tr key={i} className="border-b last:border-b-0">
                                  <td className="py-2 whitespace-nowrap">{formatDate(tx.date)}</td>
                                  <td className="py-2">{tx.roNumber}</td>
                                  <td className="py-2 truncate max-w-[120px]">{tx.customerName}</td>
                                  <td className="py-2">
                                    <Badge variant={tx.method === "cash" ? "secondary" : "outline"} className="text-[10px]">
                                      {tx.method === "cash" ? "Cash" : "Card"}
                                    </Badge>
                                  </td>
                                  <td className="text-right py-2">{formatCurrency(tx.cashPrice)}</td>
                                  <td className="text-right py-2">{formatCurrency(tx.cardPrice)}</td>
                                  <td className="text-right py-2 font-medium">{formatCurrency(tx.totalCollected)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(!jobPL && !dualPricing) && (
                    <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No revenue data for the selected period</CardContent></Card>
                  )}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="job-pl" className="space-y-4 mt-4">
            {jobPL && (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportReport("job-pl", jobPL)} disabled={exporting} data-testid="button-export-job-pl">
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export to Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-total-revenue">{formatCurrency(jobPL.summary.totalRevenue ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Total Cost</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate" data-testid="text-total-cost">{formatCurrency(jobPL.summary.totalCost ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Total Profit</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl sm:text-2xl font-bold truncate ${(jobPL.summary.totalProfit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-total-profit">
                        {formatCurrency(jobPL.summary.totalProfit ?? 0)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Avg Margin</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl sm:text-2xl font-bold ${(jobPL.summary.avgMargin ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-avg-margin">
                        {(jobPL.summary.avgMargin ?? 0).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-job-pl">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">RO #</th>
                        <th className="text-left py-3 px-2 font-medium">Customer</th>
                        <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Vehicle</th>
                        <th className="text-right py-3 px-2 font-medium">Revenue</th>
                        <th className="text-right py-3 px-2 font-medium">Cost</th>
                        <th className="text-right py-3 px-2 font-medium">Profit</th>
                        <th className="text-right py-3 px-2 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobPL.details.map((row) => (
                        <tr key={row.roId} className="border-b" data-testid={`row-job-pl-${row.roId}`}>
                          <td className="py-2 px-2 font-mono">{row.roNumber}</td>
                          <td className="py-2 px-2">{row.customerName}</td>
                          <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">{row.vehicleInfo}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(row.revenue ?? 0)}</td>
                          <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{formatCurrency(row.cost ?? 0)}</td>
                          <td className={`py-2 px-2 text-right ${(row.profit ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatCurrency(row.profit ?? 0)}
                          </td>
                          <td className={`py-2 px-2 text-right ${(row.margin ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {(row.margin ?? 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                      {jobPL.details.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No data for selected date range</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="sales-tax" className="space-y-4 mt-4">
            {salesTax && (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportReport("sales-tax", salesTax)} disabled={exporting} data-testid="button-export-sales-tax">
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export to Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Parts Tax Collected</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-parts-tax">{formatCurrency(salesTax.totalPartsTax ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Labor Tax Collected</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-labor-tax">{formatCurrency(salesTax.totalLaborTax ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Total Tax</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-total-tax">{formatCurrency(salesTax.totalTax ?? 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{salesTax.roCount} repair orders</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-sales-tax">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">RO #</th>
                        <th className="text-left py-3 px-2 font-medium">Date</th>
                        <th className="text-right py-3 px-2 font-medium">Subtotal</th>
                        <th className="text-right py-3 px-2 font-medium">Parts Tax</th>
                        <th className="text-right py-3 px-2 font-medium">Labor Tax</th>
                        <th className="text-right py-3 px-2 font-medium">Total Tax</th>
                        <th className="text-right py-3 px-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesTax.details.map((row, idx) => (
                        <tr key={idx} className="border-b" data-testid={`row-sales-tax-${idx}`}>
                          <td className="py-2 px-2 font-mono">{row.roNumber}</td>
                          <td className="py-2 px-2 text-muted-foreground">{formatDate(row.date)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(row.subtotal ?? 0)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(row.partsTax ?? 0)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(row.laborTax ?? 0)}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(row.totalTax ?? 0)}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(row.total ?? 0)}</td>
                        </tr>
                      ))}
                      {salesTax.details.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No data for selected date range</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tech-productivity" className="space-y-4 mt-4">
            {techProd && (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportReport("tech-productivity", techProd)} disabled={exporting} data-testid="button-export-tech-productivity">
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export to Excel
                  </Button>
                </div>
                {techProd.technicians.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No technician data for selected date range
                    </CardContent>
                  </Card>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {techProd.technicians.map((tech) => (
                    <Card key={tech.id} data-testid={`card-tech-${tech.id}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {tech.name}
                        </CardTitle>
                        <Badge variant="secondary">{tech.roCount} ROs</Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="text-muted-foreground">Hours</p>
                            <p className="font-semibold">{tech.totalHours}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-semibold text-green-600 dark:text-green-400 truncate">{formatCurrency(tech.totalRevenue ?? 0)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-semibold truncate">{formatCurrency(tech.effectiveRate ?? 0)}/hr</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Revenue</span>
                            <span>{formatCurrency(tech.totalRevenue ?? 0)}</span>
                          </div>
                          <div className="w-full bg-muted rounded-md h-2.5 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-md transition-all"
                              style={{ width: `${Math.min(((tech.totalRevenue ?? 0) / maxRevenue) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4 mt-4">
            {approvals && (
              <>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => exportReport("approvals", approvals)} disabled={exporting} data-testid="button-export-approvals">
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    Export to Excel
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Estimates</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-estimates">{approvals.totalEstimates}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Approved</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-approved">{approvals.approved}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Declined</CardTitle>
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-declined">{approvals.declined}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Pending</CardTitle>
                      <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-pending">{approvals.pending}</div>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Conversion Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-conversion-rate">{approvals.conversionRate ?? 0}%</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Approved</span>
                          <span className="font-semibold">{approvals.conversionRate ?? 0}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-md h-4 overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-md transition-all"
                            style={{ width: `${Math.min(approvals.conversionRate ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Average Approval Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl sm:text-3xl font-bold" data-testid="text-avg-approval-time">
                        {(approvals.avgApprovalTimeHours ?? 0) < 24
                          ? `${(approvals.avgApprovalTimeHours ?? 0).toFixed(1)} hrs`
                          : `${((approvals.avgApprovalTimeHours ?? 0) / 24).toFixed(1)} days`}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">From estimate creation to approval</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="dual-pricing" className="space-y-4 mt-4">
            {dualPricing && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold" data-testid="text-dp-title">Dual Pricing Report</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-download-dp-excel"
                    onClick={() => {
                      const url = `/api/reports/dual-pricing/export?startDate=${startDate}&endDate=${endDate}`;
                      autoFetch(url)
                        .then(res => res.blob())
                        .then(blob => {
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `PCB_Auto_Transactions_${startDate}_to_${endDate}.xlsx`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        })
                        .catch(err => console.error("Export failed:", err));
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">Total Collected</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold truncate" data-testid="text-dp-total-collected">{formatCurrency(dualPricing.summary.totalCollected ?? 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">{dualPricing.summary.totalTransactions} transactions</p>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Cash / Card Split</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold" data-testid="text-dp-split">{dualPricing.summary.cashPercent ?? 0}% / {dualPricing.summary.cardPercent ?? 0}%</div>
                      <p className="text-xs text-muted-foreground mt-1">{dualPricing.summary.cashTransactions} cash, {dualPricing.summary.cardTransactions} card</p>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">DP Earned</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate" data-testid="text-dp-earned">{formatCurrency(dualPricing.summary.totalDualPricingCollected ?? 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">Rate: {(dualPricing.summary.dualPricingRate ?? 0).toFixed(2)}%</p>
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-xs sm:text-sm font-medium truncate">Avg Transaction</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-semibold truncate" data-testid="text-dp-avg-cash">Cash: {formatCurrency(dualPricing.summary.avgTransactionCash ?? 0)}</div>
                      <div className="text-sm font-semibold truncate" data-testid="text-dp-avg-card">Card: {formatCurrency(dualPricing.summary.avgTransactionCard ?? 0)}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span>Cash {dualPricing.summary.cashPercent ?? 0}%</span>
                      <div className="flex-1 bg-muted rounded-md h-4 overflow-hidden flex">
                        <div className="bg-green-500 h-full" style={{ width: `${dualPricing.summary.cashPercent ?? 0}%` }} />
                        <div className="bg-blue-500 h-full" style={{ width: `${dualPricing.summary.cardPercent ?? 0}%` }} />
                      </div>
                      <span>Card {dualPricing.summary.cardPercent ?? 0}%</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-dual-pricing">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Date</th>
                        <th className="text-left py-3 px-2 font-medium">RO #</th>
                        <th className="text-left py-3 px-2 font-medium">Customer</th>
                        <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Vehicle</th>
                        <th className="text-left py-3 px-2 font-medium">Method</th>
                        <th className="text-right py-3 px-2 font-medium">Cash Price</th>
                        <th className="text-right py-3 px-2 font-medium">Card Price</th>
                        <th className="text-right py-3 px-2 font-medium">Paid</th>
                        <th className="text-right py-3 px-2 font-medium">DP Amt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dualPricing.transactions.map((tx, idx) => (
                        <tr key={idx} className="border-b" data-testid={`row-dp-${idx}`}>
                          <td className="py-2 px-2 text-muted-foreground">{formatDate(tx.date)}</td>
                          <td className="py-2 px-2 font-mono">{tx.roNumber}</td>
                          <td className="py-2 px-2">{tx.customerName}</td>
                          <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">{tx.vehicle}</td>
                          <td className="py-2 px-2">
                            <Badge variant={tx.method === 'cash' ? 'secondary' : 'default'}>
                              {tx.method}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right">{formatCurrency(tx.cashPrice ?? 0)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(tx.cardPrice ?? 0)}</td>
                          <td className="py-2 px-2 text-right font-medium">{formatCurrency(tx.amountPaid ?? 0)}</td>
                          <td className={`py-2 px-2 text-right ${(tx.dpAmount ?? 0) > 0 ? "text-green-600 dark:text-green-400 font-medium" : ""}`}>
                            {(tx.dpAmount ?? 0) > 0 ? formatCurrency(tx.dpAmount ?? 0) : "-"}
                          </td>
                        </tr>
                      ))}
                      {dualPricing.transactions.length === 0 && (
                        <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No dual pricing data for selected date range</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AutoLayout>
  );
}