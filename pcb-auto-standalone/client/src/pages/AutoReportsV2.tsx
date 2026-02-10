import { useState, useEffect, useCallback, useMemo } from "react";
import { AutoLayout } from "./AutoLayout";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  DollarSign,
  Clock,
  Users,
  Loader2,
  Download,
  ArrowUpDown,
  FileText,
  Wrench,
  TrendingUp,
  Target,
} from "lucide-react";

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(val);
}

function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

function formatHours(val: number): string {
  return val.toFixed(1);
}

function getCurrentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthStartEnd(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { start: `${y}-${m}-01`, end: `${y}-${m}-${d}` };
}

interface MonthlySummary {
  totalRosClosed: number;
  totalRevenue: number;
  avgRevenuePerRo: number;
  totalPartsRevenue: number;
  totalLaborRevenue: number;
  totalFeesRevenue: number;
  totalSubletRevenue: number;
  totalDiscount: number;
  revenueByPayType: {
    customerPay: number;
    internal: number;
    warranty: number;
  };
  totalBilledHours: number;
  totalActualHours: number;
  avgBilledHoursPerRo: number;
  efficiency: number;
  totalAddonLines: number;
  addonApprovalRate: number;
}

interface AdvisorRow {
  advisorId: number;
  advisorName: string;
  rosClosed: number;
  totalRevenue: number;
  avgRevenuePerRo: number;
  addonLinesPresented: number;
  addonApprovalRate: number;
}

interface TechRow {
  techId: number;
  techName: string;
  totalSessions: number;
  totalActualMinutes: number;
  totalBilledHours: number;
  avgSessionDuration: number;
  efficiency: number;
}

interface LocationOption {
  id: number;
  name: string;
}

type SortDir = "asc" | "desc";

function sortData<T>(data: T[], key: keyof T, dir: SortDir): T[] {
  return [...data].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AutoReportsV2() {
  const { autoFetch } = useAutoAuth();
  const [activeTab, setActiveTab] = useState("monthly");

  const [month, setMonth] = useState(getCurrentMonth);
  const [locationId, setLocationId] = useState("all");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const defaults = getMonthStartEnd();
  const [advStart, setAdvStart] = useState(defaults.start);
  const [advEnd, setAdvEnd] = useState(defaults.end);
  const [advisors, setAdvisors] = useState<AdvisorRow[]>([]);
  const [advLoading, setAdvLoading] = useState(false);
  const [advSortKey, setAdvSortKey] = useState<keyof AdvisorRow>("totalRevenue");
  const [advSortDir, setAdvSortDir] = useState<SortDir>("desc");

  const [techStart, setTechStart] = useState(defaults.start);
  const [techEnd, setTechEnd] = useState(defaults.end);
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [techLoading, setTechLoading] = useState(false);
  const [techSortKey, setTechSortKey] = useState<keyof TechRow>("efficiency");
  const [techSortDir, setTechSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    autoFetch("/api/locations")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLocations(d);
        else if (d?.locations) setLocations(d.locations);
      })
      .catch(() => {});
  }, [autoFetch]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (locationId !== "all") params.set("locationId", locationId);
      const res = await autoFetch(
        `/api/reports/monthly-summary?${params.toString()}`
      );
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [autoFetch, month, locationId]);

  const fetchAdvisors = useCallback(async () => {
    setAdvLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: new Date(advStart).toISOString(),
        endDate: new Date(advEnd + "T23:59:59").toISOString(),
      });
      const res = await autoFetch(
        `/api/reports/advisor-performance?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setAdvisors(Array.isArray(data) ? data : []);
      } else {
        setAdvisors([]);
      }
    } catch {
      setAdvisors([]);
    } finally {
      setAdvLoading(false);
    }
  }, [autoFetch, advStart, advEnd]);

  const fetchTechs = useCallback(async () => {
    setTechLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: new Date(techStart).toISOString(),
        endDate: new Date(techEnd + "T23:59:59").toISOString(),
      });
      const res = await autoFetch(
        `/api/reports/tech-efficiency?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setTechs(Array.isArray(data) ? data : []);
      } else {
        setTechs([]);
      }
    } catch {
      setTechs([]);
    } finally {
      setTechLoading(false);
    }
  }, [autoFetch, techStart, techEnd]);

  useEffect(() => {
    if (activeTab === "monthly") fetchSummary();
  }, [activeTab, fetchSummary]);

  useEffect(() => {
    if (activeTab === "advisors") fetchAdvisors();
  }, [activeTab, fetchAdvisors]);

  useEffect(() => {
    if (activeTab === "techs") fetchTechs();
  }, [activeTab, fetchTechs]);

  const sortedAdvisors = useMemo(
    () => sortData(advisors, advSortKey, advSortDir),
    [advisors, advSortKey, advSortDir]
  );

  const sortedTechs = useMemo(
    () => sortData(techs, techSortKey, techSortDir),
    [techs, techSortKey, techSortDir]
  );

  function toggleAdvSort(key: keyof AdvisorRow) {
    if (advSortKey === key) {
      setAdvSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setAdvSortKey(key);
      setAdvSortDir("desc");
    }
  }

  function toggleTechSort(key: keyof TechRow) {
    if (techSortKey === key) {
      setTechSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTechSortKey(key);
      setTechSortDir("desc");
    }
  }

  function exportMonthlySummary() {
    if (!summary) return;
    const s = summary;
    const headers = ["Metric", "Value"];
    const rows = [
      ["ROs Closed", String(s.totalRosClosed)],
      ["Total Revenue", formatCurrency(s.totalRevenue)],
      ["Avg Revenue/RO", formatCurrency(s.avgRevenuePerRo)],
      ["Parts Revenue", formatCurrency(s.totalPartsRevenue)],
      ["Labor Revenue", formatCurrency(s.totalLaborRevenue)],
      ["Fees Revenue", formatCurrency(s.totalFeesRevenue)],
      ["Sublet Revenue", formatCurrency(s.totalSubletRevenue)],
      ["Total Discount", formatCurrency(s.totalDiscount)],
      ["Customer Pay", formatCurrency(s.revenueByPayType.customerPay)],
      ["Internal", formatCurrency(s.revenueByPayType.internal)],
      ["Warranty", formatCurrency(s.revenueByPayType.warranty)],
      ["Billed Hours", formatHours(s.totalBilledHours)],
      ["Actual Hours", formatHours(s.totalActualHours)],
      ["Avg Billed Hours/RO", formatHours(s.avgBilledHoursPerRo)],
      ["Efficiency", formatPct(s.efficiency)],
      ["Total Add-on Lines", String(s.totalAddonLines)],
      ["Add-on Approval Rate", formatPct(s.addonApprovalRate)],
    ];
    downloadCsv(`monthly-summary-${month}.csv`, headers, rows);
  }

  function exportAdvisors() {
    if (!sortedAdvisors.length) return;
    const headers = [
      "Name",
      "ROs Closed",
      "Total Revenue",
      "Avg Revenue/RO",
      "Add-on Lines",
      "Approval Rate %",
    ];
    const rows = sortedAdvisors.map((a) => [
      a.advisorName,
      String(a.rosClosed),
      formatCurrency(a.totalRevenue),
      formatCurrency(a.avgRevenuePerRo),
      String(a.addonLinesPresented),
      formatPct(a.addonApprovalRate),
    ]);
    downloadCsv(
      `advisor-performance-${advStart}-to-${advEnd}.csv`,
      headers,
      rows
    );
  }

  function exportTechs() {
    if (!sortedTechs.length) return;
    const headers = [
      "Name",
      "Total Sessions",
      "Hours Worked",
      "Billed Hours",
      "Avg Session (min)",
      "Efficiency %",
    ];
    const rows = sortedTechs.map((t) => [
      t.techName,
      String(t.totalSessions),
      formatHours(t.totalActualMinutes / 60),
      formatHours(t.totalBilledHours),
      formatHours(t.avgSessionDuration),
      formatPct(t.efficiency),
    ]);
    downloadCsv(
      `tech-efficiency-${techStart}-to-${techEnd}.csv`,
      headers,
      rows
    );
  }

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-reports-v2-title">
            Reports
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger
              value="monthly"
              className="whitespace-nowrap"
              data-testid="tab-monthly-summary"
            >
              Monthly Summary
            </TabsTrigger>
            <TabsTrigger
              value="advisors"
              className="whitespace-nowrap"
              data-testid="tab-advisor-performance"
            >
              Advisor Performance
            </TabsTrigger>
            <TabsTrigger
              value="techs"
              className="whitespace-nowrap"
              data-testid="tab-tech-efficiency"
            >
              Tech Efficiency
            </TabsTrigger>
          </TabsList>

          {/* Monthly Summary Tab */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="month-picker"
                      className="text-sm font-medium"
                    >
                      Month
                    </label>
                    <Input
                      id="month-picker"
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      data-testid="input-month-picker"
                    />
                  </div>
                  {locations.length > 0 && (
                    <div className="space-y-1 min-w-[160px]">
                      <label className="text-sm font-medium">Location</label>
                      <Select
                        value={locationId}
                        onValueChange={setLocationId}
                      >
                        <SelectTrigger data-testid="select-location">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem
                              key={loc.id}
                              value={String(loc.id)}
                            >
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportMonthlySummary}
                    disabled={!summary || summaryLoading}
                    data-testid="button-export-monthly"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {summaryLoading && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {summaryLoading && !summary && (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-8 w-8 animate-spin text-muted-foreground"
                  data-testid="loading-monthly"
                />
              </div>
            )}

            {!summaryLoading && !summary && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p data-testid="text-no-monthly-data">
                    No data available for this period
                  </p>
                </CardContent>
              </Card>
            )}

            {summary && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        ROs Closed
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold"
                        data-testid="text-kpi-ros-closed"
                      >
                        {summary.totalRosClosed}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        Total Revenue
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400"
                        data-testid="text-kpi-total-revenue"
                      >
                        {formatCurrency(summary.totalRevenue)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        Avg Revenue/RO
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold"
                        data-testid="text-kpi-avg-revenue"
                      >
                        {formatCurrency(summary.avgRevenuePerRo)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        Billed Hours
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold"
                        data-testid="text-kpi-billed-hours"
                      >
                        {formatHours(summary.totalBilledHours)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        Actual Hours
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold"
                        data-testid="text-kpi-actual-hours"
                      >
                        {formatHours(summary.totalActualHours)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">
                        Efficiency
                      </CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-xl sm:text-2xl font-bold"
                        data-testid="text-kpi-efficiency"
                      >
                        {formatPct(summary.efficiency)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">
                        Revenue Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Parts</span>
                        <span
                          className="font-medium"
                          data-testid="text-rev-parts"
                        >
                          {formatCurrency(summary.totalPartsRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Labor</span>
                        <span
                          className="font-medium"
                          data-testid="text-rev-labor"
                        >
                          {formatCurrency(summary.totalLaborRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fees</span>
                        <span
                          className="font-medium"
                          data-testid="text-rev-fees"
                        >
                          {formatCurrency(summary.totalFeesRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sublet</span>
                        <span
                          className="font-medium"
                          data-testid="text-rev-sublet"
                        >
                          {formatCurrency(summary.totalSubletRevenue)}
                        </span>
                      </div>
                      {summary.totalDiscount > 0 && (
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span className="text-muted-foreground">
                            Discounts
                          </span>
                          <span
                            className="font-medium text-red-600 dark:text-red-400"
                            data-testid="text-rev-discount"
                          >
                            -{formatCurrency(summary.totalDiscount)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">
                        Pay Type Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Customer Pay
                        </span>
                        <span
                          className="font-medium"
                          data-testid="text-pay-customer"
                        >
                          {formatCurrency(
                            summary.revenueByPayType.customerPay
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Internal</span>
                        <span
                          className="font-medium"
                          data-testid="text-pay-internal"
                        >
                          {formatCurrency(summary.revenueByPayType.internal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Warranty</span>
                        <span
                          className="font-medium"
                          data-testid="text-pay-warranty"
                        >
                          {formatCurrency(summary.revenueByPayType.warranty)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold">
                        Add-on Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Add-on Lines
                        </span>
                        <span
                          className="font-medium"
                          data-testid="text-addon-lines"
                        >
                          {summary.totalAddonLines}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Approval Rate
                        </span>
                        <span
                          className="font-medium"
                          data-testid="text-addon-rate"
                        >
                          {formatPct(summary.addonApprovalRate)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Advisor Performance Tab */}
          <TabsContent value="advisors" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={advStart}
                      onChange={(e) => setAdvStart(e.target.value)}
                      data-testid="input-adv-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={advEnd}
                      onChange={(e) => setAdvEnd(e.target.value)}
                      data-testid="input-adv-end"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAdvisors}
                    disabled={!sortedAdvisors.length || advLoading}
                    data-testid="button-export-advisors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {advLoading && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {advLoading && !advisors.length && (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-8 w-8 animate-spin text-muted-foreground"
                  data-testid="loading-advisors"
                />
              </div>
            )}

            {!advLoading && !advisors.length && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p data-testid="text-no-advisor-data">
                    No data available for this period
                  </p>
                </CardContent>
              </Card>
            )}

            {sortedAdvisors.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                className="flex items-center gap-1 text-left"
                                onClick={() => toggleAdvSort("advisorName")}
                                data-testid="sort-adv-name"
                              >
                                Name
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() => toggleAdvSort("rosClosed")}
                                data-testid="sort-adv-ros"
                              >
                                ROs
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() => toggleAdvSort("totalRevenue")}
                                data-testid="sort-adv-revenue"
                              >
                                Revenue
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleAdvSort("avgRevenuePerRo")
                                }
                                data-testid="sort-adv-avg"
                              >
                                Avg/RO
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleAdvSort("addonLinesPresented")
                                }
                                data-testid="sort-adv-addon"
                              >
                                Add-on Lines
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleAdvSort("addonApprovalRate")
                                }
                                data-testid="sort-adv-approval"
                              >
                                Approval %
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedAdvisors.map((a) => (
                            <TableRow
                              key={a.advisorId}
                              data-testid={`row-advisor-${a.advisorId}`}
                            >
                              <TableCell className="font-medium">
                                {a.advisorName}
                              </TableCell>
                              <TableCell className="text-right">
                                {a.rosClosed}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(a.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(a.avgRevenuePerRo)}
                              </TableCell>
                              <TableCell className="text-right">
                                {a.addonLinesPresented}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPct(a.addonApprovalRate)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {sortedAdvisors.map((a) => (
                    <Card
                      key={a.advisorId}
                      data-testid={`card-advisor-${a.advisorId}`}
                    >
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">
                            {a.advisorName}
                          </span>
                          <Badge variant="secondary" className="shrink-0">
                            {a.rosClosed} ROs
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Revenue
                            </span>
                            <p className="font-medium">
                              {formatCurrency(a.totalRevenue)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Avg/RO
                            </span>
                            <p className="font-medium">
                              {formatCurrency(a.avgRevenuePerRo)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Add-on Lines
                            </span>
                            <p className="font-medium">
                              {a.addonLinesPresented}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Approval Rate
                            </span>
                            <p className="font-medium">
                              {formatPct(a.addonApprovalRate)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Tech Efficiency Tab */}
          <TabsContent value="techs" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={techStart}
                      onChange={(e) => setTechStart(e.target.value)}
                      data-testid="input-tech-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={techEnd}
                      onChange={(e) => setTechEnd(e.target.value)}
                      data-testid="input-tech-end"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTechs}
                    disabled={!sortedTechs.length || techLoading}
                    data-testid="button-export-techs"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {techLoading && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>

            {techLoading && !techs.length && (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-8 w-8 animate-spin text-muted-foreground"
                  data-testid="loading-techs"
                />
              </div>
            )}

            {!techLoading && !techs.length && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p data-testid="text-no-tech-data">
                    No data available for this period
                  </p>
                </CardContent>
              </Card>
            )}

            {sortedTechs.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                className="flex items-center gap-1 text-left"
                                onClick={() => toggleTechSort("techName")}
                                data-testid="sort-tech-name"
                              >
                                Name
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleTechSort("totalSessions")
                                }
                                data-testid="sort-tech-sessions"
                              >
                                Sessions
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleTechSort("totalActualMinutes")
                                }
                                data-testid="sort-tech-hours"
                              >
                                Hours Worked
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleTechSort("totalBilledHours")
                                }
                                data-testid="sort-tech-billed"
                              >
                                Billed Hours
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() =>
                                  toggleTechSort("avgSessionDuration")
                                }
                                data-testid="sort-tech-avg"
                              >
                                Avg Session
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center gap-1 ml-auto"
                                onClick={() => toggleTechSort("efficiency")}
                                data-testid="sort-tech-efficiency"
                              >
                                Efficiency
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedTechs.map((t) => (
                            <TableRow
                              key={t.techId}
                              data-testid={`row-tech-${t.techId}`}
                            >
                              <TableCell className="font-medium">
                                {t.techName}
                              </TableCell>
                              <TableCell className="text-right">
                                {t.totalSessions}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatHours(t.totalActualMinutes / 60)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatHours(t.totalBilledHours)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatHours(t.avgSessionDuration)} min
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={
                                    t.efficiency >= 100
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {formatPct(t.efficiency)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {sortedTechs.map((t) => (
                    <Card
                      key={t.techId}
                      data-testid={`card-tech-${t.techId}`}
                    >
                      <CardContent className="pt-4 pb-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">
                            {t.techName}
                          </span>
                          <Badge
                            variant={
                              t.efficiency >= 100 ? "default" : "secondary"
                            }
                          >
                            {formatPct(t.efficiency)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Sessions
                            </span>
                            <p className="font-medium">{t.totalSessions}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Hours Worked
                            </span>
                            <p className="font-medium">
                              {formatHours(t.totalActualMinutes / 60)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Billed Hours
                            </span>
                            <p className="font-medium">
                              {formatHours(t.totalBilledHours)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Avg Session
                            </span>
                            <p className="font-medium">
                              {formatHours(t.avgSessionDuration)} min
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AutoLayout>
  );
}
