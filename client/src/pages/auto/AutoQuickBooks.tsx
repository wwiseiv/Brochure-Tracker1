import { useState } from "react";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BarChart3, Link2, ClipboardList, Settings, FileText, CreditCard,
  CheckCircle2, Wrench, Cog, DollarSign, Droplets, Landmark,
  Banknote, Package, Building2, Clock, Download, RefreshCw,
  ExternalLink, AlertTriangle, Check,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  number: string;
}

interface SyncLogEntry {
  id: string;
  roNumber: string;
  customer: string;
  type: string;
  method: string | null;
  amount: number;
  cashPrice: number;
  dpAmount: number;
  qboInvoice: string;
  qboPayment: string | null;
  status: string;
  syncedAt: string;
  vehicle: string;
  error?: string;
}

interface SyncSummary {
  totalSynced: number;
  thisWeek: number;
  lastSync: string;
  totalRevenue: number;
  totalDP: number;
  pendingInvoices: number;
  errors: number;
}

interface AccountMappings {
  labor: string;
  parts: string;
  dualPricing: string;
  shopSupplies: string;
  salesTax: string;
  tips: string;
  partsCogs: string;
  deposit: string;
  ar: string;
  undeposited: string;
  [key: string]: string;
}

const MOCK_ACCOUNTS: Account[] = [
  { id: "1", name: "Checking Account", type: "Bank", number: "1000" },
  { id: "2", name: "Service Revenue - Labor", type: "Income", number: "4000" },
  { id: "3", name: "Service Revenue - Parts", type: "Income", number: "4100" },
  { id: "4", name: "Dual Pricing Income", type: "Income", number: "4200" },
  { id: "5", name: "Shop Supply Revenue", type: "Income", number: "4300" },
  { id: "6", name: "Sales Tax Payable", type: "Other Current Liability", number: "2100" },
  { id: "7", name: "Tips Collected", type: "Other Current Liability", number: "2200" },
  { id: "8", name: "Parts Cost of Goods", type: "Cost of Goods Sold", number: "5000" },
  { id: "9", name: "Accounts Receivable", type: "Accounts Receivable", number: "1100" },
  { id: "10", name: "Undeposited Funds", type: "Other Current Asset", number: "1200" },
];

const MOCK_SYNC_LOG: SyncLogEntry[] = [
  { id: "s1", roNumber: "1001", customer: "Robert Smith", type: "payment", method: "card", amount: 568.82, cashPrice: 549.64, dpAmount: 19.18, qboInvoice: "INV-2041", qboPayment: "PMT-1087", status: "synced", syncedAt: "2026-02-08T15:42:00Z", vehicle: "2019 Ford F-150 XLT" },
  { id: "s2", roNumber: "1002", customer: "Maria Garcia", type: "payment", method: "cash", amount: 312.00, cashPrice: 312.00, dpAmount: 0, qboInvoice: "INV-2042", qboPayment: "PMT-1088", status: "synced", syncedAt: "2026-02-08T14:18:00Z", vehicle: "2022 Toyota Camry LE" },
  { id: "s3", roNumber: "0998", customer: "James Wilson", type: "payment", method: "card", amount: 922.31, cashPrice: 891.20, dpAmount: 31.11, qboInvoice: "INV-2039", qboPayment: "PMT-1085", status: "synced", syncedAt: "2026-02-07T16:55:00Z", vehicle: "2020 Chevy Silverado" },
  { id: "s4", roNumber: "0997", customer: "Lisa Chen", type: "payment", method: "card", amount: 276.83, cashPrice: 267.50, dpAmount: 9.33, qboInvoice: "INV-2038", qboPayment: "PMT-1084", status: "synced", syncedAt: "2026-02-07T14:22:00Z", vehicle: "2021 Honda CR-V" },
  { id: "s5", roNumber: "0996", customer: "Tom Davis", type: "payment", method: "cash", amount: 445.00, cashPrice: 445.00, dpAmount: 0, qboInvoice: "INV-2037", qboPayment: "PMT-1083", status: "synced", syncedAt: "2026-02-07T11:05:00Z", vehicle: "2018 Honda Accord" },
  { id: "s6", roNumber: "0995", customer: "Sarah Johnson", type: "invoice", method: null, amount: 734.50, cashPrice: 734.50, dpAmount: 0, qboInvoice: "INV-2036", qboPayment: null, status: "pending_payment", syncedAt: "2026-02-07T09:30:00Z", vehicle: "2023 Hyundai Tucson" },
  { id: "s7", roNumber: "0994", customer: "Mike Brown", type: "payment", method: "card", amount: 1245.67, cashPrice: 1203.20, dpAmount: 42.47, qboInvoice: "INV-2035", qboPayment: "PMT-1082", status: "synced", syncedAt: "2026-02-06T17:12:00Z", vehicle: "2017 BMW X5" },
  { id: "s8", roNumber: "0993", customer: "Jennifer Lee", type: "payment", method: "cash", amount: 189.00, cashPrice: 189.00, dpAmount: 0, qboInvoice: "INV-2034", qboPayment: "PMT-1081", status: "synced", syncedAt: "2026-02-06T13:45:00Z", vehicle: "2020 Mazda CX-5" },
  { id: "s9", roNumber: "0990", customer: "David Martinez", type: "payment", method: "card", amount: 487.22, cashPrice: 470.75, dpAmount: 16.47, qboInvoice: "INV-2031", qboPayment: "PMT-1079", status: "error", syncedAt: "2026-02-05T15:20:00Z", vehicle: "2019 Toyota Tacoma", error: "QBO token expired \u2014 reconnect required" },
];

const MOCK_SUMMARY: SyncSummary = {
  totalSynced: 847,
  thisWeek: 22,
  lastSync: "2026-02-08T15:42:00Z",
  totalRevenue: 38420.00,
  totalDP: 1987.42,
  pendingInvoices: 3,
  errors: 1,
};

const fmt = (n: number): string => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

type TabId = "dashboard" | "mapping" | "log" | "settings";

interface TabItem {
  id: TabId;
  label: string;
  icon: typeof BarChart3;
}

export default function AutoQuickBooks() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [connected, setConnected] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mappings, setMappings] = useState<AccountMappings>({
    labor: "2",
    parts: "3",
    dualPricing: "4",
    shopSupplies: "5",
    salesTax: "6",
    tips: "7",
    partsCogs: "8",
    deposit: "1",
    ar: "9",
    undeposited: "10",
  });
  const [autoSync, setAutoSync] = useState(true);
  const [syncInvoices, setSyncInvoices] = useState(true);
  const [syncPayments, setSyncPayments] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showJournal, setShowJournal] = useState<string | null>(null);

  const tabs: TabItem[] = [
    { id: "dashboard", label: "Sync Dashboard", icon: BarChart3 },
    { id: "mapping", label: "Account Mapping", icon: Link2 },
    { id: "log", label: "Sync Log", icon: ClipboardList },
    { id: "settings", label: "Connection", icon: Settings },
  ];

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 2800);
  };

  const handleDisconnect = () => {
    setConnected(false);
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 3200);
  };

  const mappingIcons: Record<string, typeof Wrench> = {
    labor: Wrench,
    parts: Cog,
    dualPricing: DollarSign,
    shopSupplies: Droplets,
    salesTax: Landmark,
    tips: Banknote,
    partsCogs: Package,
    deposit: Building2,
    ar: FileText,
    undeposited: Clock,
  };

  const stepIcons = [FileText, CreditCard, BarChart3, CheckCircle2];

  const filteredLog = MOCK_SYNC_LOG.filter(s => filterStatus === "all" || s.status === filterStatus);

  return (
    <AutoLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-green-500 flex items-center justify-center text-xl font-extrabold text-white shadow-md flex-shrink-0">
              QB
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold" data-testid="text-qb-title">
                QuickBooks Integration
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                PCB Auto → QuickBooks Online · Automatic Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {connected && (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                data-testid="button-sync-now"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            )}
            <Badge
              variant={connected ? "default" : "destructive"}
              className={connected ? "bg-green-500/10 text-green-500 no-default-hover-elevate no-default-active-elevate" : "no-default-hover-elevate no-default-active-elevate"}
              data-testid="status-connection"
            >
              <span className={`w-2 h-2 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-destructive"}`} />
              {connected ? "CONNECTED" : "DISCONNECTED"}
            </Badge>
          </div>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as TabId)} className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id} data-testid={`tab-${t.id}`}>
                <t.icon className="h-4 w-4 mr-2" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Synced", value: MOCK_SUMMARY.totalSynced.toLocaleString(), sub: "all time", colorClass: "text-green-500" },
                { label: "This Week", value: MOCK_SUMMARY.thisWeek, sub: "transactions", colorClass: "text-blue-500" },
                { label: "Revenue Synced", value: fmt(MOCK_SUMMARY.totalRevenue), sub: "this month", colorClass: "text-purple-500" },
                { label: "Dual Pricing Tracked", value: fmt(MOCK_SUMMARY.totalDP), sub: "this month", colorClass: "text-amber-500" },
                { label: "Pending Invoices", value: MOCK_SUMMARY.pendingInvoices, sub: "awaiting payment", colorClass: "text-indigo-500" },
                { label: "Errors", value: MOCK_SUMMARY.errors, sub: "need attention", colorClass: MOCK_SUMMARY.errors > 0 ? "text-red-500" : "text-green-500" },
              ].map((s, i) => (
                <Card key={i} data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <CardContent className="p-3 sm:pt-4 sm:pb-4">
                    <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{s.label}</div>
                    <div className={`text-xl sm:text-2xl font-extrabold tabular-nums mt-1 ${s.colorClass}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How PCB Auto → QuickBooks Sync Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { step: "1", title: "RO Invoiced", desc: "When you invoice a repair order in PCB Auto, an invoice is created in QuickBooks with matching line items (labor, parts, shop supplies)." },
                    { step: "2", title: "Payment Recorded", desc: "When the customer pays (cash or card), the payment is recorded against the QBO invoice. Dual pricing splits automatically." },
                    { step: "3", title: "Accounts Updated", desc: "Revenue goes to your income accounts. Dual pricing amount goes to its own account. Tax to liability. Tips tracked separately." },
                    { step: "4", title: "Set & Forget", desc: "Everything syncs automatically in real time. No CSV exports, no manual entry, no reconciliation headaches." },
                  ].map((s, i) => {
                    const StepIcon = stepIcons[i];
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center flex-shrink-0">
                          <StepIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">
                            <span className="text-green-500 mr-1.5">Step {s.step}</span>{s.title}
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed mt-1">{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sample QBO Journal Entry — Card Payment</CardTitle>
                <p className="text-xs text-muted-foreground">
                  RO #1001 · Robert Smith · 2019 Ford F-150 XLT · Paid by Card
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {["Account", "Debit", "Credit", "Memo"].map(h => (
                          <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${h === "Debit" || h === "Credit" ? "text-right" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { account: "Undeposited Funds", debit: 568.82, credit: null, memo: "Card payment — Visa ··4821" },
                        { account: "Service Revenue — Labor", debit: null, credit: 187.50, memo: "2.0 hrs labor @ $125/hr (brakes, belt)" },
                        { account: "Service Revenue — Parts", debit: null, credit: 232.48, memo: "Bosch pads, ACDelco rotors, Gates belt, Fram filter" },
                        { account: "Shop Supply Revenue", debit: null, credit: 26.96, memo: "Shop supplies" },
                        { account: "Dual Pricing Income", debit: null, credit: 19.18, memo: "Card price − cash price (3.49%)" },
                        { account: "Parts COGS", debit: 154.49, credit: null, memo: "Wholesale parts cost" },
                        { account: "Inventory / AP", debit: null, credit: 154.49, memo: "Parts cost offset" },
                        { account: "Sales Tax Payable", debit: null, credit: 35.96, memo: "IN state + Hamilton County (7%)" },
                        { account: "Accounts Receivable", debit: null, credit: 66.74, memo: "Clear AR for RO #1001" },
                      ].map((row, i) => (
                        <tr key={i} className={`border-b border-border/50 ${i % 2 !== 0 ? "bg-muted/30" : ""}`}>
                          <td className="px-3 py-2.5 font-semibold">{row.account}</td>
                          <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${row.debit ? "text-green-500" : "text-transparent"}`}>
                            {row.debit ? fmt(row.debit) : "—"}
                          </td>
                          <td className={`px-3 py-2.5 text-right tabular-nums text-xs ${row.credit ? "text-blue-500" : "text-transparent"}`}>
                            {row.credit ? fmt(row.credit) : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.memo}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2">
                        <td className="px-3 py-3 font-extrabold">TOTALS</td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-green-500">{fmt(723.31)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-blue-500">{fmt(723.31)}</td>
                        <td className="px-3 py-3 text-xs font-semibold text-green-500 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Balanced
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 rounded-md bg-green-500/5 border border-green-500/15 text-xs text-muted-foreground leading-relaxed">
                  <span className="text-green-500 font-bold">Key:</span> The <strong className="text-amber-500">Dual Pricing Income</strong> line ({fmt(19.18)}) is the difference between the card price and cash price. This goes to its own income account so the shop owner can see exactly how much the dual pricing program earns — separate from service revenue. The customer never sees this breakdown.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chart of Accounts Mapping</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Map PCB Auto transaction types to your QuickBooks accounts. These determine where revenue, costs, and liabilities land in your books.
                </p>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="hidden md:grid grid-cols-[1fr_40px_1fr_auto] gap-2 px-3 py-2 items-center">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">PCB Auto Category</div>
                  <div />
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">QuickBooks Account</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Account Type</div>
                </div>

                {[
                  { key: "labor", label: "Labor Revenue", desc: "Hourly labor charges on repair orders" },
                  { key: "parts", label: "Parts Revenue", desc: "Parts sold to customers (retail price)" },
                  { key: "dualPricing", label: "Dual Pricing Income", desc: "Card price − cash price on card transactions" },
                  { key: "shopSupplies", label: "Shop Supplies", desc: "Shop supply charges on repair orders" },
                  { key: "salesTax", label: "Sales Tax Collected", desc: "State and local tax collected" },
                  { key: "tips", label: "Tips Collected", desc: "Customer tips on payments" },
                  { key: "partsCogs", label: "Parts Cost (COGS)", desc: "Wholesale cost of parts sold" },
                  { key: "deposit", label: "Deposit Account", desc: "Where funds are deposited" },
                  { key: "ar", label: "Accounts Receivable", desc: "Unpaid invoices pending payment" },
                  { key: "undeposited", label: "Undeposited Funds", desc: "Card payments before bank deposit" },
                ].map((item, i) => {
                  const selectedAccount = MOCK_ACCOUNTS.find(a => a.id === mappings[item.key]);
                  const MappingIcon = mappingIcons[item.key] || FileText;
                  return (
                    <div key={item.key} className={`grid grid-cols-1 md:grid-cols-[1fr_40px_1fr_auto] gap-2 md:gap-3 px-3 py-3 items-center rounded-md ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                      <div className="flex items-center gap-3">
                        <MappingIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                      <div className="hidden md:flex justify-center text-muted-foreground">→</div>
                      <div>
                        <Select
                          value={mappings[item.key]}
                          onValueChange={val => setMappings(m => ({ ...m, [item.key]: val }))}
                        >
                          <SelectTrigger data-testid={`select-mapping-${item.key}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MOCK_ACCOUNTS.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Badge
                          variant="outline"
                          className={`text-xs no-default-hover-elevate no-default-active-elevate ${
                            selectedAccount?.type === "Income" ? "border-green-500/30 text-green-500 bg-green-500/10" :
                            selectedAccount?.type === "Bank" ? "border-blue-500/30 text-blue-500 bg-blue-500/10" :
                            selectedAccount?.type === "Cost of Goods Sold" ? "border-red-500/30 text-red-500 bg-red-500/10" :
                            ""
                          }`}
                        >
                          {selectedAccount?.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" data-testid="button-reset-mapping">
                    Reset to Defaults
                  </Button>
                  <Button className="bg-green-600 text-white" data-testid="button-save-mapping">
                    Save Mapping
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 mb-2 text-amber-500 font-bold text-sm">
                  <DollarSign className="h-4 w-4" /> How Dual Pricing Maps to QuickBooks
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    When a customer pays by <strong className="text-foreground">card</strong>, the total is higher than the cash price. The difference goes to <strong className="text-amber-500">Dual Pricing Income</strong> — a separate income account so you can track exactly how much your dual pricing program earns, separate from service revenue.
                  </p>
                  <p>
                    When a customer pays by <strong className="text-foreground">cash</strong>, there is no dual pricing amount — the full payment goes to your revenue accounts.
                  </p>
                  <p>
                    <strong className="text-foreground">Example (Card Payment on $549.64 RO):</strong><br />
                    Service Revenue receives $446.94 (labor + parts + supplies)<br />
                    Sales Tax Payable receives $35.96<br />
                    Dual Pricing Income receives $19.18 (card price − cash price)<br />
                    Undeposited Funds is debited $568.82 (total card charge)<br />
                    Everything balances. Your accountant will love this.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground font-semibold mr-2">Filter:</span>
              {[
                { id: "all", label: "All", icon: undefined },
                { id: "synced", label: "Synced", icon: Check },
                { id: "pending_payment", label: "Pending", icon: Clock },
                { id: "error", label: "Errors", icon: AlertTriangle },
              ].map(f => (
                <Button
                  key={f.id}
                  variant={filterStatus === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(f.id)}
                  data-testid={`filter-${f.id}`}
                  className={filterStatus === f.id ? "bg-green-600 text-white" : ""}
                >
                  {f.icon && <f.icon className="h-3 w-3 mr-1" />}
                  {f.label}
                </Button>
              ))}

              <div className="flex-1" />

              <Button variant="outline" size="sm" data-testid="button-export-excel">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export to Excel
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-muted/50">
                        {["Status", "Date", "RO #", "Customer", "Vehicle", "Method", "Amount", "Dual Pricing", "QBO Invoice", "QBO Payment"].map(h => (
                          <th key={h} className={`px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b whitespace-nowrap ${h === "Amount" || h === "Dual Pricing" ? "text-right" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLog.map((s, i) => (
                        <tr
                          key={s.id}
                          className={`border-b border-border/50 cursor-pointer hover-elevate ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
                          onClick={() => setShowJournal(showJournal === s.id ? null : s.id)}
                          data-testid={`row-sync-${s.id}`}
                        >
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={`text-xs no-default-hover-elevate no-default-active-elevate ${
                                s.status === "synced" ? "border-green-500/30 text-green-500 bg-green-500/10" :
                                s.status === "pending_payment" ? "border-amber-500/30 text-amber-500 bg-amber-500/10" :
                                "border-red-500/30 text-red-500 bg-red-500/10"
                              }`}
                            >
                              {s.status === "synced" ? <><Check className="h-3 w-3 mr-1" /> Synced</> :
                               s.status === "pending_payment" ? <><Clock className="h-3 w-3 mr-1" /> Pending</> :
                               <><AlertTriangle className="h-3 w-3 mr-1" /> Error</>}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {fmtDate(s.syncedAt)}<br />
                            <span className="text-xs text-muted-foreground/60">{fmtTime(s.syncedAt)}</span>
                          </td>
                          <td className="px-3 py-3 font-bold tabular-nums">
                            #{s.roNumber}
                          </td>
                          <td className="px-3 py-3 font-semibold">{s.customer}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">{s.vehicle}</td>
                          <td className="px-3 py-3">
                            {s.method && (
                              <Badge
                                variant="outline"
                                className={`text-xs no-default-hover-elevate no-default-active-elevate ${
                                  s.method === "card" ? "border-blue-500/30 text-blue-500 bg-blue-500/10" : "border-green-500/30 text-green-500 bg-green-500/10"
                                }`}
                              >
                                {s.method === "card" ? <><CreditCard className="h-3 w-3 mr-1" /> Card</> : <><Banknote className="h-3 w-3 mr-1" /> Cash</>}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmt(s.amount)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums text-xs ${s.dpAmount > 0 ? "text-amber-500" : "text-muted-foreground/30"}`}>
                            {s.dpAmount > 0 ? fmt(s.dpAmount) : "—"}
                          </td>
                          <td className="px-3 py-3 tabular-nums text-xs text-green-500">{s.qboInvoice}</td>
                          <td className={`px-3 py-3 tabular-nums text-xs ${s.qboPayment ? "text-green-500" : "text-muted-foreground/30"}`}>
                            {s.qboPayment || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filterStatus === "error" && MOCK_SYNC_LOG.filter(s => s.status === "error").length > 0 && (
                  <div className="px-5 py-4 bg-red-500/5 border-t border-red-500/15">
                    {MOCK_SYNC_LOG.filter(s => s.status === "error").map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <span className="text-red-500 font-semibold text-sm">RO #{s.roNumber}:</span>
                          <span className="text-muted-foreground text-sm ml-2">{s.error}</span>
                        </div>
                        <Button variant="destructive" size="sm" data-testid={`button-retry-${s.id}`}>
                          Retry Sync
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-5 justify-center flex-wrap text-xs text-muted-foreground">
              <span>Showing {filteredLog.length} of {MOCK_SYNC_LOG.length} transactions</span>
              <span>Last synced: {fmtDate(MOCK_SUMMARY.lastSync)} at {fmtTime(MOCK_SUMMARY.lastSync)}</span>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QuickBooks Online Connection</CardTitle>
              </CardHeader>
              <CardContent>
                {connected ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/5 border border-green-500/15 flex-wrap">
                      <div className="w-13 h-13 rounded-xl bg-green-500 flex items-center justify-center text-2xl font-extrabold text-white">
                        QB
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold">Demo Auto Repair</div>
                        <div className="text-xs text-muted-foreground mt-0.5">QuickBooks Online Plus · Company ID: 4620816365272840</div>
                        <div className="text-xs text-green-500 mt-1 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" /> Connected since Jan 15, 2026
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={handleDisconnect} data-testid="button-disconnect">
                        Disconnect
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <div className="text-xs text-muted-foreground font-semibold uppercase">Token Status</div>
                          <div className="text-sm font-bold text-green-500 mt-1">Valid</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Expires: Mar 15, 2026 · Auto-refreshes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <div className="text-xs text-muted-foreground font-semibold uppercase">API Calls Today</div>
                          <div className="text-sm font-bold mt-1">47 / 500</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Intuit rate limit: 500/min</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center rounded-xl border border-dashed">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-3xl font-extrabold text-green-500 mx-auto mb-4">
                      QB
                    </div>
                    <div className="text-base font-bold mb-2">Connect QuickBooks Online</div>
                    <div className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
                      Link your QuickBooks account to automatically sync invoices, payments, and dual pricing data. Takes 30 seconds.
                    </div>
                    <Button
                      className="bg-green-600 text-white"
                      onClick={handleConnect}
                      disabled={connecting}
                      data-testid="button-connect-qb"
                    >
                      {connecting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Connecting to QuickBooks...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect to QuickBooks
                        </>
                      )}
                    </Button>
                    {connecting && (
                      <div className="text-xs text-muted-foreground mt-3">
                        Redirecting to Intuit for authorization...
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sync Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: "autoSync", label: "Automatic Sync", desc: "Sync transactions to QuickBooks in real time as payments are processed", value: autoSync, setter: setAutoSync },
                  { id: "syncInvoices", label: "Sync Invoices", desc: "Create QBO invoices when repair orders are invoiced in PCB Auto", value: syncInvoices, setter: setSyncInvoices },
                  { id: "syncPayments", label: "Sync Payments", desc: "Record payments in QBO when customers pay (cash or card)", value: syncPayments, setter: setSyncPayments },
                  { id: "syncCustomers", label: "Sync Customers", desc: "Create and update customer records in QBO from PCB Auto", value: syncCustomers, setter: setSyncCustomers },
                ].map(setting => (
                  <div key={setting.id} className="flex items-center justify-between gap-4 p-4 rounded-md bg-muted/30 border">
                    <div>
                      <div className="text-sm font-semibold">{setting.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{setting.desc}</div>
                    </div>
                    <Switch
                      checked={setting.value}
                      onCheckedChange={() => setting.setter(!setting.value)}
                      data-testid={`toggle-${setting.id}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What Syncs to QuickBooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "Invoices", items: ["Invoice created when RO is invoiced", "Line items: labor, parts, shop supplies", "Customer & vehicle info in memo", "Tax calculated and mapped", "Dual pricing amounts split correctly"], colorClass: "text-blue-500" },
                    { title: "Payments", items: ["Payment recorded on invoice", "Cash → deposit account", "Card → undeposited funds", "Dual pricing → separate income account", "Tips tracked in liability account"], colorClass: "text-green-500" },
                    { title: "Customers", items: ["Auto-created on first RO", "Name, phone, email synced", "Vehicle info in customer notes", "Updates sync both directions", "Service history linked via invoices"], colorClass: "text-purple-500" },
                  ].map((section, i) => (
                    <div key={i} className="p-4 rounded-md bg-muted/30 border">
                      <div className={`text-sm font-bold mb-3 ${section.colorClass}`}>
                        {section.title}
                      </div>
                      {section.items.map((item, j) => (
                        <div key={j} className="text-xs text-muted-foreground py-1 flex gap-2 items-start">
                          <Check className={`h-3 w-3 flex-shrink-0 mt-0.5 ${section.colorClass}`} />
                          {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AutoLayout>
  );
}
