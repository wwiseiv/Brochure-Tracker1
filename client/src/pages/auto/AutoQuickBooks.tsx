import { useState } from "react";
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      fontFamily: "'DM Sans', 'SF Pro Display', system-ui, sans-serif",
      color: "#e5e7eb",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{
        background: "linear-gradient(135deg, #111827 0%, #1a1f2e 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #2ca01c 0%, #0aab4b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 800, color: "white",
            boxShadow: "0 4px 14px rgba(44,160,28,0.3)",
          }}>QB</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.3px" }} data-testid="text-qb-title">
              QuickBooks Integration
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              PCB Auto → QuickBooks Online · Automatic Sync
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {connected && (
            <button onClick={handleSync} disabled={syncing} data-testid="button-sync-now" style={{
              padding: "10px 20px", borderRadius: 10,
              background: syncing ? "#374151" : "rgba(255,255,255,0.08)",
              color: syncing ? "#9ca3af" : "white",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 13, fontWeight: 600, cursor: syncing ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.15s ease",
            }}>
              <RefreshCw size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
          <div style={{
            padding: "8px 16px", borderRadius: 20,
            background: connected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: connected ? "#4ade80" : "#f87171",
            fontSize: 12, fontWeight: 700, letterSpacing: "0.5px",
            display: "flex", alignItems: "center", gap: 6,
          }} data-testid="status-connection">
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? "#22c55e" : "#ef4444",
              boxShadow: connected ? "0 0 8px rgba(34,197,94,0.5)" : "none",
            }} />
            {connected ? "CONNECTED" : "DISCONNECTED"}
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", gap: 2, padding: "0 32px",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`} style={{
            padding: "14px 20px", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "white" : "#6b7280",
            background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === t.id ? "2px solid #2ca01c" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.15s ease", whiteSpace: "nowrap",
          }}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {tab === "dashboard" && (
          <div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16, marginBottom: 28,
            }}>
              {[
                { label: "Total Synced", value: MOCK_SUMMARY.totalSynced.toLocaleString(), sub: "all time", color: "#2ca01c" },
                { label: "This Week", value: MOCK_SUMMARY.thisWeek, sub: "transactions", color: "#3b82f6" },
                { label: "Revenue Synced", value: fmt(MOCK_SUMMARY.totalRevenue), sub: "this month", color: "#a855f7" },
                { label: "Dual Pricing Tracked", value: fmt(MOCK_SUMMARY.totalDP), sub: "this month", color: "#f59e0b" },
                { label: "Pending Invoices", value: MOCK_SUMMARY.pendingInvoices, sub: "awaiting payment", color: "#6366f1" },
                { label: "Errors", value: MOCK_SUMMARY.errors, sub: "need attention", color: MOCK_SUMMARY.errors > 0 ? "#ef4444" : "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14, padding: "20px 22px",
                }} data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", marginTop: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28, marginBottom: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 20 }}>
                How PCB Auto → QuickBooks Sync Works
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                {[
                  { step: "1", title: "RO Invoiced", desc: "When you invoice a repair order in PCB Auto, an invoice is created in QuickBooks with matching line items (labor, parts, fees)." },
                  { step: "2", title: "Payment Recorded", desc: "When the customer pays (cash or card), the payment is recorded against the QBO invoice. Dual pricing splits automatically." },
                  { step: "3", title: "Accounts Updated", desc: "Revenue goes to your income accounts. Dual pricing amount goes to its own account. Tax to liability. Tips tracked separately." },
                  { step: "4", title: "Set & Forget", desc: "Everything syncs automatically in real time. No CSV exports, no manual entry, no reconciliation headaches." },
                ].map((s, i) => {
                  const StepIcon = stepIcons[i];
                  return (
                    <div key={i} style={{ display: "flex", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: "rgba(44,160,28,0.12)", color: "#4ade80",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20,
                      }}><StepIcon size={20} /></div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                          <span style={{ color: "#2ca01c", marginRight: 6 }}>Step {s.step}</span>{s.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginTop: 4 }}>{s.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 6 }}>
                Sample QBO Journal Entry \u2014 Card Payment
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
                RO #1001 · Robert Smith · 2019 Ford F-150 XLT · Paid by Card
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      {["Account", "Debit", "Credit", "Memo"].map(h => (
                        <th key={h} style={{
                          padding: "10px 14px", textAlign: h === "Debit" || h === "Credit" ? "right" : "left",
                          color: "#9ca3af", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { account: "Undeposited Funds", debit: 568.82, credit: null, memo: "Card payment \u2014 Visa \u00b7\u00b7\u00b7\u00b74821" },
                      { account: "Service Revenue \u2014 Labor", debit: null, credit: 187.50, memo: "2.0 hrs labor @ $125/hr (brakes, belt)" },
                      { account: "Service Revenue \u2014 Parts", debit: null, credit: 232.48, memo: "Bosch pads, ACDelco rotors, Gates belt, Fram filter" },
                      { account: "Shop Supply Revenue", debit: null, credit: 26.96, memo: "Shop supplies" },
                      { account: "Dual Pricing Income", debit: null, credit: 19.18, memo: "Card price \u2212 cash price (3.49%)" },
                      { account: "Parts COGS", debit: 154.49, credit: null, memo: "Wholesale parts cost" },
                      { account: "Inventory / AP", debit: null, credit: 154.49, memo: "Parts cost offset" },
                      { account: "Sales Tax Payable", debit: null, credit: 35.96, memo: "IN state + Hamilton County (7%)" },
                      { account: "Accounts Receivable", debit: null, credit: 66.74, memo: "Clear AR for RO #1001" },
                    ].map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      }}>
                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#e5e7eb" }}>{row.account}</td>
                        <td style={{
                          padding: "10px 14px", textAlign: "right",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: row.debit ? "#4ade80" : "transparent",
                        }}>{row.debit ? fmt(row.debit) : "\u2014"}</td>
                        <td style={{
                          padding: "10px 14px", textAlign: "right",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: row.credit ? "#60a5fa" : "transparent",
                        }}>{row.credit ? fmt(row.credit) : "\u2014"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>{row.memo}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid rgba(255,255,255,0.1)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "white" }}>TOTALS</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{fmt(723.31)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{fmt(723.31)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#4ade80", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={14} /> Balanced
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 10,
                background: "rgba(44,160,28,0.08)", border: "1px solid rgba(44,160,28,0.15)",
                fontSize: 12, color: "#6b7280", lineHeight: 1.6,
              }}>
                <span style={{ color: "#4ade80", fontWeight: 700 }}>Key:</span> The <strong style={{ color: "#f59e0b" }}>Dual Pricing Income</strong> line ({fmt(19.18)}) is the difference between the card price and cash price. This goes to its own income account so the shop owner can see exactly how much the dual pricing program earns — separate from service revenue. The customer never sees this breakdown.
              </div>
            </div>
          </div>
        )}

        {tab === "mapping" && (
          <div>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 4 }}>
                Chart of Accounts Mapping
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
                Map PCB Auto transaction types to your QuickBooks accounts. These determine where revenue, costs, and liabilities land in your books.
              </div>

              <div style={{ display: "grid", gap: 2 }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 40px 1fr 1fr",
                  padding: "10px 16px", alignItems: "center",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>PCB Auto Category</div>
                  <div />
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>QuickBooks Account</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Account Type</div>
                </div>

                {[
                  { key: "labor", label: "Labor Revenue", desc: "Hourly labor charges on repair orders" },
                  { key: "parts", label: "Parts Revenue", desc: "Parts sold to customers (retail price)" },
                  { key: "dualPricing", label: "Dual Pricing Income", desc: "Card price \u2212 cash price on card transactions" },
                  { key: "shopSupplies", label: "Shop Supplies", desc: "Shop supply fees charged to customers" },
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
                    <div key={item.key} style={{
                      display: "grid", gridTemplateColumns: "1fr 40px 1fr 1fr",
                      padding: "14px 16px", alignItems: "center",
                      background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderRadius: 8, gap: 8,
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <MappingIcon size={16} style={{ color: "#9ca3af" }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{item.desc}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "center", color: "#4b5563", fontSize: 18 }}>\u2192</div>
                      <div>
                        <select
                          value={mappings[item.key]}
                          onChange={e => setMappings(m => ({ ...m, [item.key]: e.target.value }))}
                          data-testid={`select-mapping-${item.key}`}
                          style={{
                            width: "100%", padding: "10px 12px", borderRadius: 8,
                            background: "#1a1f2e", color: "white", border: "1px solid rgba(255,255,255,0.1)",
                            fontSize: 13, fontWeight: 500, cursor: "pointer",
                            appearance: "auto",
                          }}
                        >
                          {MOCK_ACCOUNTS.map(a => (
                            <option key={a.id} value={a.id}>{a.number} \u2014 {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{
                        padding: "6px 12px", borderRadius: 6,
                        background: selectedAccount?.type === "Income" ? "rgba(34,197,94,0.1)" :
                          selectedAccount?.type === "Bank" ? "rgba(59,130,246,0.1)" :
                          selectedAccount?.type === "Cost of Goods Sold" ? "rgba(239,68,68,0.1)" :
                          "rgba(255,255,255,0.05)",
                        color: selectedAccount?.type === "Income" ? "#4ade80" :
                          selectedAccount?.type === "Bank" ? "#60a5fa" :
                          selectedAccount?.type === "Cost of Goods Sold" ? "#f87171" :
                          "#9ca3af",
                        fontSize: 12, fontWeight: 600, display: "inline-block",
                      }}>
                        {selectedAccount?.type}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end",
              }}>
                <button data-testid="button-reset-mapping" style={{
                  padding: "10px 20px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", color: "#9ca3af",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Reset to Defaults</button>
                <button data-testid="button-save-mapping" style={{
                  padding: "10px 24px", borderRadius: 10,
                  background: "linear-gradient(135deg, #2ca01c 0%, #0aab4b 100%)",
                  color: "white", border: "none",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(44,160,28,0.3)",
                }}>Save Mapping</button>
              </div>
            </div>

            <div style={{
              background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: 14, padding: 24, marginTop: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={16} /> How Dual Pricing Maps to QuickBooks
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
                When a customer pays by <strong style={{ color: "white" }}>card</strong>, the total is higher than the cash price. The difference goes to <strong style={{ color: "#f59e0b" }}>Dual Pricing Income</strong> — a separate income account so you can track exactly how much your dual pricing program earns, separate from service revenue.
                <br /><br />
                When a customer pays by <strong style={{ color: "white" }}>cash</strong>, there is no dual pricing amount — the full payment goes to your revenue accounts.
                <br /><br />
                <strong style={{ color: "white" }}>Example (Card Payment on $549.64 RO):</strong><br />
                Service Revenue receives $446.94 (labor + parts + supplies)<br />
                Sales Tax Payable receives $35.96<br />
                Dual Pricing Income receives $19.18 (card price \u2212 cash price)<br />
                Undeposited Funds is debited $568.82 (total card charge)<br />
                Everything balances. Your accountant will love this.
              </div>
            </div>
          </div>
        )}

        {tab === "log" && (
          <div>
            <div style={{
              display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
            }}>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginRight: 8 }}>Filter:</div>
              {[
                { id: "all", label: "All" },
                { id: "synced", label: "Synced", icon: Check },
                { id: "pending_payment", label: "Pending", icon: Clock },
                { id: "error", label: "Errors", icon: AlertTriangle },
              ].map(f => (
                <button key={f.id} onClick={() => setFilterStatus(f.id)} data-testid={`filter-${f.id}`} style={{
                  padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: filterStatus === f.id ? "rgba(44,160,28,0.15)" : "rgba(255,255,255,0.04)",
                  color: filterStatus === f.id ? "#4ade80" : "#6b7280",
                  border: filterStatus === f.id ? "1px solid rgba(44,160,28,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {f.icon && <f.icon size={12} />}
                  {f.label}
                </button>
              ))}

              <div style={{ flex: 1 }} />

              <button data-testid="button-export-excel" style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(255,255,255,0.06)", color: "#9ca3af",
                border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Download size={13} /> Export to Excel
              </button>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, overflow: "hidden",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                      {["Status", "Date", "RO #", "Customer", "Vehicle", "Method", "Amount", "Dual Pricing", "QBO Invoice", "QBO Payment"].map(h => (
                        <th key={h} style={{
                          padding: "12px 14px", textAlign: h === "Amount" || h === "Dual Pricing" ? "right" : "left",
                          color: "#6b7280", fontWeight: 600, fontSize: 11,
                          textTransform: "uppercase", letterSpacing: "0.5px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_SYNC_LOG
                      .filter(s => filterStatus === "all" || s.status === filterStatus)
                      .map((s, i) => (
                      <tr key={s.id} style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}
                      onClick={() => setShowJournal(showJournal === s.id ? null : s.id)}
                      data-testid={`row-sync-${s.id}`}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: s.status === "synced" ? "rgba(34,197,94,0.12)" :
                              s.status === "pending_payment" ? "rgba(245,158,11,0.12)" :
                              "rgba(239,68,68,0.12)",
                            color: s.status === "synced" ? "#4ade80" :
                              s.status === "pending_payment" ? "#fbbf24" : "#f87171",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            {s.status === "synced" ? <><Check size={10} /> Synced</> : s.status === "pending_payment" ? <><Clock size={10} /> Pending</> : <><AlertTriangle size={10} /> Error</>}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "#9ca3af" }}>
                          {fmtDate(s.syncedAt)}<br />
                          <span style={{ fontSize: 11, color: "#4b5563" }}>{fmtTime(s.syncedAt)}</span>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "white", fontFamily: "'JetBrains Mono', monospace" }}>
                          #{s.roNumber}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#e5e7eb" }}>{s.customer}</td>
                        <td style={{ padding: "12px 14px", color: "#6b7280", fontSize: 12 }}>{s.vehicle}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {s.method && (
                            <span style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: s.method === "card" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
                              color: s.method === "card" ? "#60a5fa" : "#4ade80",
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                              {s.method === "card" ? <><CreditCard size={10} /> Card</> : <><Banknote size={10} /> Cash</>}
                            </span>
                          )}
                        </td>
                        <td style={{
                          padding: "12px 14px", textAlign: "right",
                          fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "white",
                        }}>{fmt(s.amount)}</td>
                        <td style={{
                          padding: "12px 14px", textAlign: "right",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: s.dpAmount > 0 ? "#fbbf24" : "#374151",
                        }}>{s.dpAmount > 0 ? fmt(s.dpAmount) : "\u2014"}</td>
                        <td style={{
                          padding: "12px 14px",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#2ca01c",
                        }}>{s.qboInvoice}</td>
                        <td style={{
                          padding: "12px 14px",
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                          color: s.qboPayment ? "#2ca01c" : "#4b5563",
                        }}>{s.qboPayment || "\u2014"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filterStatus === "error" && MOCK_SYNC_LOG.filter(s => s.status === "error").length > 0 && (
                <div style={{
                  padding: "16px 20px", background: "rgba(239,68,68,0.06)",
                  borderTop: "1px solid rgba(239,68,68,0.15)",
                }}>
                  {MOCK_SYNC_LOG.filter(s => s.status === "error").map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>RO #{s.roNumber}:</span>
                        <span style={{ color: "#9ca3af", fontSize: 13, marginLeft: 8 }}>{s.error}</span>
                      </div>
                      <button data-testid={`button-retry-${s.id}`} style={{
                        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: "rgba(239,68,68,0.15)", color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
                      }}>Retry Sync</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                Showing {MOCK_SYNC_LOG.filter(s => filterStatus === "all" || s.status === filterStatus).length} of {MOCK_SYNC_LOG.length} transactions
              </div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                Last synced: {fmtDate(MOCK_SUMMARY.lastSync)} at {fmtTime(MOCK_SUMMARY.lastSync)}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 20 }}>
                QuickBooks Online Connection
              </div>

              {connected ? (
                <div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 16, padding: 20,
                    background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: 12, marginBottom: 20,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "linear-gradient(135deg, #2ca01c 0%, #0aab4b 100%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, fontWeight: 800, color: "white",
                    }}>QB</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Demo Auto Repair</div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>QuickBooks Online Plus · Company ID: 4620816365272840</div>
                      <div style={{ fontSize: 12, color: "#4ade80", marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check size={12} /> Connected since Jan 15, 2026
                      </div>
                    </div>
                    <button onClick={handleDisconnect} data-testid="button-disconnect" style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      background: "rgba(239,68,68,0.1)", color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer",
                    }}>Disconnect</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Token Status</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#4ade80", marginTop: 4 }}>Valid</div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Expires: Mar 15, 2026 · Auto-refreshes</div>
                    </div>
                    <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>API Calls Today</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginTop: 4 }}>47 / 500</div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Intuit rate limit: 500/min</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: 28, textAlign: "center",
                    background: "rgba(255,255,255,0.02)", borderRadius: 12,
                    border: "1px dashed rgba(255,255,255,0.1)",
                  }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
                      background: "rgba(44,160,28,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 32, fontWeight: 800, color: "#2ca01c",
                    }}>QB</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 8 }}>
                      Connect QuickBooks Online
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                      Link your QuickBooks account to automatically sync invoices, payments, and dual pricing data. Takes 30 seconds.
                    </div>
                    <button onClick={handleConnect} disabled={connecting} data-testid="button-connect-qb" style={{
                      padding: "14px 32px", borderRadius: 12,
                      background: connecting
                        ? "rgba(44,160,28,0.3)"
                        : "linear-gradient(135deg, #2ca01c 0%, #0aab4b 100%)",
                      color: "white", border: "none",
                      fontSize: 15, fontWeight: 700, cursor: connecting ? "default" : "pointer",
                      boxShadow: connecting ? "none" : "0 4px 20px rgba(44,160,28,0.4)",
                      display: "inline-flex", alignItems: "center", gap: 10,
                      transition: "all 0.2s ease",
                    }}>
                      {connecting ? (
                        <>
                          <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                          Connecting to QuickBooks...
                        </>
                      ) : (
                        <>
                          <ExternalLink size={18} />
                          Connect to QuickBooks
                        </>
                      )}
                    </button>
                    {connecting && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>
                        Redirecting to Intuit for authorization...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 20 }}>
                Sync Settings
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                {[
                  { id: "autoSync", label: "Automatic Sync", desc: "Sync transactions to QuickBooks in real time as payments are processed", value: autoSync, setter: setAutoSync },
                  { id: "syncInvoices", label: "Sync Invoices", desc: "Create QBO invoices when repair orders are invoiced in PCB Auto", value: syncInvoices, setter: setSyncInvoices },
                  { id: "syncPayments", label: "Sync Payments", desc: "Record payments in QBO when customers pay (cash or card)", value: syncPayments, setter: setSyncPayments },
                  { id: "syncCustomers", label: "Sync Customers", desc: "Create and update customer records in QBO from PCB Auto", value: syncCustomers, setter: setSyncCustomers },
                ].map(setting => (
                  <div key={setting.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", background: "rgba(255,255,255,0.02)",
                    borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>{setting.label}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{setting.desc}</div>
                    </div>
                    <button onClick={() => setting.setter(!setting.value)} data-testid={`toggle-${setting.id}`} style={{
                      width: 52, height: 28, borderRadius: 14, border: "none",
                      background: setting.value ? "#2ca01c" : "#374151",
                      position: "relative", cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "white", position: "absolute", top: 3,
                        left: setting.value ? 27 : 3,
                        transition: "left 0.2s ease",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14, padding: 28,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 20 }}>
                What Syncs to QuickBooks
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                {[
                  { title: "Invoices", items: ["Invoice created when RO is invoiced", "Line items: labor, parts, fees", "Customer & vehicle info in memo", "Tax calculated and mapped", "Dual pricing amounts split correctly"], color: "#3b82f6" },
                  { title: "Payments", items: ["Payment recorded on invoice", "Cash \u2192 deposit account", "Card \u2192 undeposited funds", "Dual pricing \u2192 separate income account", "Tips tracked in liability account"], color: "#2ca01c" },
                  { title: "Customers", items: ["Auto-created on first RO", "Name, phone, email synced", "Vehicle info in customer notes", "Updates sync both directions", "Service history linked via invoices"], color: "#a855f7" },
                ].map((section, i) => (
                  <div key={i} style={{
                    padding: 20, borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: section.color, marginBottom: 12,
                    }}>
                      {section.title}
                    </div>
                    {section.items.map((item, j) => (
                      <div key={j} style={{
                        fontSize: 12, color: "#9ca3af", padding: "5px 0",
                        display: "flex", gap: 8, alignItems: "flex-start",
                      }}>
                        <Check size={12} style={{ color: section.color, flexShrink: 0, marginTop: 2 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        select option { background: #1a1f2e; color: white; }
      `}</style>
    </div>
  );
}
