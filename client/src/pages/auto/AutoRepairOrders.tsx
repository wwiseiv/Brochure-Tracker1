import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Plus, Loader2, Search, Eye, Pencil, Printer,
  Wrench, ChevronLeft, ChevronRight, Download,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  quote: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  estimate: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partially_approved: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  completed: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  invoiced: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  void: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "quote", label: "Quote" },
  { value: "estimate", label: "Estimate" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "partially_approved", label: "Partial" },
  { value: "declined", label: "Declined" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_30", label: "Last 30 Days" },
  { value: "last_90", label: "Last 90 Days" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Date (newest)", sort: "date", order: "desc" },
  { value: "date_asc", label: "Date (oldest)", sort: "date", order: "asc" },
  { value: "customer_asc", label: "Customer A-Z", sort: "customer", order: "asc" },
  { value: "total_desc", label: "Total (highest)", sort: "total", order: "desc" },
  { value: "total_asc", label: "Total (lowest)", sort: "total", order: "asc" },
  { value: "ro_desc", label: "RO # (newest)", sort: "ro_number", order: "desc" },
];

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

interface Vehicle {
  id: number;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
}

interface RepairOrder {
  id: number;
  roNumber: string;
  createdAt: string;
  status: string;
  subtotalCash: string | null;
  subtotalCard: string | null;
  taxAmount: string | null;
  totalCash: string | null;
  totalCard: string | null;
  paidAmount: string | null;
  balanceDue: string | null;
  customer: Customer | null;
  vehicle: Vehicle | null;
}

interface Stats {
  totalRos: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  avgTicket: number;
}

function formatMoney(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function getDateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  switch (preset) {
    case "today":
      return { from: startOfDay.toISOString(), to: endOfDay.toISOString() };
    case "this_week": {
      const day = startOfDay.getDay();
      const start = new Date(startOfDay);
      start.setDate(start.getDate() - day);
      return { from: start.toISOString(), to: endOfDay.toISOString() };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to: endOfDay.toISOString() };
    }
    case "last_30": {
      const start = new Date(startOfDay);
      start.setDate(start.getDate() - 30);
      return { from: start.toISOString(), to: endOfDay.toISOString() };
    }
    case "last_90": {
      const start = new Date(startOfDay);
      start.setDate(start.getDate() - 90);
      return { from: start.toISOString(), to: endOfDay.toISOString() };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: start.toISOString(), to: endOfDay.toISOString() };
    }
    default:
      return null;
  }
}

const STATUS_LABELS: Record<string, string> = {
  quote: "Quote", estimate: "Estimate", sent: "Sent",
  approved: "Approved", partially_approved: "Partial",
  declined: "Declined", in_progress: "In Progress",
  completed: "Completed", invoiced: "Invoiced",
  paid: "Paid", void: "Void",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={`${STATUS_COLORS[status] || ""} no-default-hover-elevate no-default-active-elevate`}
    >
      {(STATUS_LABELS[status] || status.replace(/_/g, " ")).toUpperCase()}
    </Badge>
  );
}

const LIMIT = 25;

export default function AutoRepairOrders() {
  const { autoFetch } = useAutoAuth();
  const [, setLocation] = useLocation();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortKey, setSortKey] = useState("date_desc");
  const [page, setPage] = useState(1);

  const [ros, setRos] = useState<RepairOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalRos: 0, totalBilled: 0, totalPaid: 0, outstanding: 0, avgTicket: 0 });
  const [loading, setLoading] = useState(true);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const handlePrintPdf = useCallback(async (roId: number) => {
    setPrintingId(roId);
    try {
      const resp = await autoFetch(`/api/auto/repair-orders/${roId}/pdf`);
      if (!resp.ok) throw new Error("PDF generation failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `repair-order-${roId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Print PDF error:", err);
    } finally {
      setPrintingId(null);
    }
  }, [autoFetch]);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const sortOption = useMemo(() => SORT_OPTIONS.find((o) => o.value === sortKey) || SORT_OPTIONS[0], [sortKey]);

  const computedDates = useMemo(() => {
    if (dateRange === "custom") {
      return {
        from: customFrom ? new Date(customFrom).toISOString() : "",
        to: customTo ? new Date(customTo + "T23:59:59").toISOString() : "",
      };
    }
    if (dateRange === "all") return null;
    return getDateRange(dateRange);
  }, [dateRange, customFrom, customTo]);

  const fetchROs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (computedDates?.from) params.set("from", computedDates.from);
      if (computedDates?.to) params.set("to", computedDates.to);
      params.set("sort", sortOption.sort);
      params.set("order", sortOption.order);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await autoFetch(`/api/auto/repair-orders?${params.toString()}`);
      const data = await res.json();
      setRos(data.repairOrders || []);
      setTotal(data.total ?? 0);
      setStats({
        totalRos: data.stats?.totalRos ?? 0,
        totalBilled: data.stats?.totalBilled ?? 0,
        totalPaid: data.stats?.totalPaid ?? 0,
        outstanding: data.stats?.outstanding ?? 0,
        avgTicket: data.stats?.avgTicket ?? 0,
      });
      setHasEverLoaded(true);
    } catch (err) {
      console.error("Failed to fetch repair orders:", err);
    } finally {
      setLoading(false);
    }
  }, [autoFetch, search, statusFilter, computedDates, sortOption, page]);

  useEffect(() => {
    fetchROs();
  }, [fetchROs]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
    setSortKey("date_desc");
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== "all" || dateRange !== "all";

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  const exportCsv = () => {
    const headers = ["RO #", "Date", "Customer Name", "Vehicle", "Status", "Subtotal", "Tax", "Total", "Paid Amount", "Balance Due"];
    const rows = ros.map((ro) => [
      ro.roNumber,
      formatDate(ro.createdAt),
      ro.customer ? `${ro.customer.firstName} ${ro.customer.lastName}` : "",
      ro.vehicle ? [ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ") : "",
      ro.status.replace(/_/g, " "),
      parseFloat(ro.subtotalCash ?? "0").toFixed(2),
      parseFloat(ro.taxAmount ?? "0").toFixed(2),
      parseFloat(ro.totalCash ?? "0").toFixed(2),
      parseFloat(ro.paidAmount ?? "0").toFixed(2),
      parseFloat(ro.balanceDue ?? "0").toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `repair-orders-export-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigateToRo = (id: number) => {
    setLocation(`/auto/repair-orders/${id}`);
  };

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Title + New RO */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-ros-title">
            <FileText className="h-5 w-5" /> Repair Orders
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/auto/repair-orders/new?type=estimate">
              <Button variant="outline" className="gap-2" data-testid="button-new-estimate">
                <Plus className="h-4 w-4" /> New Estimate
              </Button>
            </Link>
            <Link href="/auto/repair-orders/new">
              <Button className="gap-2" data-testid="button-new-ro">
                <Plus className="h-4 w-4" /> New RO
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, phone, vehicle, VIN, or RO #..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-ro-search"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((sf) => (
            <Badge
              key={sf.value}
              variant="outline"
              className={`cursor-pointer toggle-elevate ${statusFilter === sf.value ? "toggle-elevated" : ""}`}
              onClick={() => { setStatusFilter(sf.value); setPage(1); }}
              data-testid={`filter-status-${sf.value}`}
            >
              {sf.label}
            </Badge>
          ))}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(1); }}>
              <SelectTrigger data-testid="select-date-range">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <>
              <div className="min-w-[140px]">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                  data-testid="input-date-from"
                />
              </div>
              <div className="min-w-[140px]">
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                  data-testid="input-date-to"
                />
              </div>
            </>
          )}

          <div className="min-w-[150px]">
            <Select value={sortKey} onValueChange={(v) => { setSortKey(v); setPage(1); }}>
              <SelectTrigger data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="gap-2" onClick={exportCsv} data-testid="button-export-csv">
            <Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span>
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: "Total ROs", value: String(stats.totalRos), testId: "stat-total-ros" },
            { label: "Total Billed", value: formatMoney(parseFloat(String(stats.totalBilled)) || 0), testId: "stat-total-billed" },
            { label: "Total Paid", value: formatMoney(parseFloat(String(stats.totalPaid)) || 0), testId: "stat-total-paid" },
            { label: "Outstanding", value: formatMoney(parseFloat(String(stats.outstanding)) || 0), testId: "stat-outstanding" },
            { label: "Avg Ticket", value: formatMoney(parseFloat(String(stats.avgTicket)) || 0), testId: "stat-avg-ticket" },
          ].map((stat) => (
            <Card key={stat.testId} data-testid={stat.testId} className="min-w-0">
              <CardContent className="p-3 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-base sm:text-lg font-bold truncate">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-ros" />
          </div>
        )}

        {/* Empty State: No ROs at all */}
        {!loading && total === 0 && !hasActiveFilters && hasEverLoaded && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Wrench className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">No Repair Orders Yet</h2>
              <p className="text-sm text-muted-foreground">Create your first repair order to get started.</p>
              <Link href="/auto/repair-orders/new">
                <Button className="gap-2 mt-2" data-testid="button-empty-new-ro">
                  <Plus className="h-4 w-4" /> New RO
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Empty State: No results from filters */}
        {!loading && total === 0 && hasActiveFilters && hasEverLoaded && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Search className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">No results found</h2>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-2" data-testid="button-clear-filters">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results: Desktop Table */}
        {!loading && ros.length > 0 && (
          <>
            <div className="hidden md:block border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">RO #</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="text-right w-[100px]">Balance</TableHead>
                    <TableHead className="text-right w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ros.map((ro) => (
                    <TableRow
                      key={ro.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => navigateToRo(ro.id)}
                      data-testid={`row-ro-${ro.id}`}
                    >
                      <TableCell className="font-mono font-medium text-sm">{ro.roNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(ro.createdAt)}</TableCell>
                      <TableCell>
                        {ro.customer ? (
                          <Link
                            href={`/auto/customers/${ro.customer.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <span className="text-sm font-medium underline underline-offset-2">
                              {ro.customer.firstName} {ro.customer.lastName}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ro.vehicle
                          ? [ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ro.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatMoney(parseFloat(ro.totalCash ?? "0"))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {parseFloat(ro.balanceDue ?? "0") > 0 ? (
                          <span className="text-destructive font-medium">
                            {formatMoney(parseFloat(ro.balanceDue ?? "0"))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); navigateToRo(ro.id); }}
                            data-testid={`button-view-ro-${ro.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {ro.status !== "paid" && ro.status !== "void" && ro.status !== "completed" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setLocation(`/auto/repair-orders/${ro.id}`); }}
                              data-testid={`button-edit-ro-${ro.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={printingId === ro.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPdf(ro.id);
                            }}
                            data-testid={`button-print-ro-${ro.id}`}
                          >
                            {printingId === ro.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Results: Mobile Cards */}
            <div className="md:hidden space-y-2">
              {ros.map((ro) => (
                <Card
                  key={ro.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => navigateToRo(ro.id)}
                  data-testid={`card-ro-${ro.id}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-medium text-sm">{ro.roNumber}</span>
                        <StatusBadge status={ro.status} />
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(ro.createdAt)}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      {ro.customer && (
                        <Link
                          href={`/auto/customers/${ro.customer.id}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <span className="font-medium underline underline-offset-2">
                            {ro.customer.firstName} {ro.customer.lastName}
                          </span>
                        </Link>
                      )}
                      {ro.vehicle && (
                        <p className="text-muted-foreground">
                          {[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-medium">{formatMoney(parseFloat(ro.totalCash ?? "0"))}</span>
                        {parseFloat(ro.balanceDue ?? "0") > 0 && (
                          <span className="text-sm text-destructive">
                            Bal: {formatMoney(parseFloat(ro.balanceDue ?? "0"))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); navigateToRo(ro.id); }}
                          data-testid={`button-view-ro-mobile-${ro.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {ro.status !== "paid" && ro.status !== "void" && ro.status !== "completed" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setLocation(`/auto/repair-orders/${ro.id}`); }}
                            data-testid={`button-edit-ro-mobile-${ro.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={printingId === ro.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintPdf(ro.id);
                          }}
                          data-testid={`button-print-ro-mobile-${ro.id}`}
                        >
                          {printingId === ro.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {showingFrom}–{showingTo} of {total} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="pagination-prev"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="pagination-next"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AutoLayout>
  );
}
