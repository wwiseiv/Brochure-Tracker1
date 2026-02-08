import { useState, useEffect, useRef } from "react";

// ============================================
// DEMO DATA
// ============================================
const SHOP = {
  name: "Demo Auto Repair",
  address: "123 Main Street",
  city: "Carmel, IN 46032",
  phone: "(317) 555-1234",
  email: "service@demoautorepair.com",
  website: "www.demoautorepair.com",
  taxRate: 0.07,
  defaultSurcharge: 3.49,
};

const CUSTOMER = {
  name: "Robert Smith",
  phone: "(317) 555-0101",
  email: "rsmith@email.com",
  address: "456 Oak Lane, Carmel, IN 46032",
};

const VEHICLE = {
  year: 2019, make: "Ford", model: "F-150 XLT",
  vin: "1FTEW1EP3KKD12345", mileage: "42,350",
  license: "IN ABC-1234", color: "Silver",
};

const SERVICE_LINES = [
  { id: 1, type: "labor", desc: "Front brake pad & rotor replacement", qty: 1, hours: 1.5, rate: 125.00, price: 187.50, taxable: true },
  { id: 2, type: "part", desc: "Bosch QuietCast Brake Pads — Front", partNum: "BC1058", qty: 1, cost: 42.99, price: 64.49, taxable: true },
  { id: 3, type: "part", desc: "ACDelco Advantage Rotors — Front", partNum: "18A2328AC", qty: 2, cost: 67.50, price: 101.25, taxable: true },
  { id: 4, type: "labor", desc: "Serpentine belt replacement", qty: 1, hours: 0.5, rate: 125.00, price: 62.50, taxable: true },
  { id: 5, type: "part", desc: "Gates Micro-V Serpentine Belt", partNum: "K060923", qty: 1, cost: 31.50, price: 47.25, taxable: true },
  { id: 6, type: "labor", desc: "Engine air filter replacement", qty: 1, hours: 0.1, rate: 125.00, price: 12.50, taxable: true },
  { id: 7, type: "part", desc: "Fram Extra Guard Air Filter", partNum: "CA10262", qty: 1, cost: 12.99, price: 19.49, taxable: true },
  { id: 8, type: "fee", desc: "Shop supplies & environmental fee", qty: 1, price: 18.95, taxable: false },
];

const RO_NUMBER = "1001";

export default function DualPricingPaymentInvoice() {
  const [screen, setScreen] = useState("invoice"); // invoice | settings | payment | processing | receipt
  const [surchargeRate, setSurchargeRate] = useState(SHOP.defaultSurcharge);
  const [tempRate, setTempRate] = useState(SHOP.defaultSurcharge.toString());
  const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'card'
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [cardLast4, setCardLast4] = useState("4821");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [authCode, setAuthCode] = useState("");
  const [paidAt, setPaidAt] = useState(null);
  const [notification, setNotification] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [splitPayment, setSplitPayment] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const printRef = useRef(null);

  // Calculations
  const laborLines = SERVICE_LINES.filter(l => l.type === "labor");
  const partLines = SERVICE_LINES.filter(l => l.type === "part");
  const feeLines = SERVICE_LINES.filter(l => l.type === "fee");

  const laborTotal = laborLines.reduce((s, l) => s + l.price * l.qty, 0);
  const partsTotal = partLines.reduce((s, l) => s + l.price * l.qty, 0);
  const feesTotal = feeLines.reduce((s, l) => s + l.price * l.qty, 0);
  const subtotal = laborTotal + partsTotal + feesTotal;

  const taxableTotal = SERVICE_LINES.filter(l => l.taxable).reduce((s, l) => s + l.price * l.qty, 0);
  const tax = +(taxableTotal * SHOP.taxRate).toFixed(2);

  const cashTotal = +(subtotal + tax).toFixed(2);
  const surchargeAmount = +(cashTotal * (surchargeRate / 100)).toFixed(2);
  const cardTotal = +(cashTotal + surchargeAmount).toFixed(2);

  const partsCost = partLines.reduce((s, l) => s + l.cost * l.qty, 0);
  const partsMargin = partsTotal - partsCost;

  const finalAmount = paymentMethod === "card" ? cardTotal : cashTotal;
  const totalWithTip = +(finalAmount + tipAmount).toFixed(2);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const processPayment = () => {
    setScreen("processing");
    setAuthCode(`A${Math.floor(Math.random() * 900000 + 100000)}`);
    setTimeout(() => {
      setPaidAt(new Date());
      setScreen("receipt");
    }, 2400);
  };

  const handlePrint = () => window.print();

  const handleEmail = () => {
    setEmailSent(true);
    notify(`Invoice emailed to ${CUSTOMER.email}`);
    setTimeout(() => setEmailSent(false), 5000);
  };

  const handleNewRO = () => {
    setScreen("invoice");
    setPaymentMethod(null);
    setTipAmount(0);
    setCustomTip("");
    setPaidAt(null);
    setEmailSent(false);
  };

  // ============================================
  // STYLES
  // ============================================
  const mono = "'JetBrains Mono', 'SF Mono', 'Consolas', monospace";
  const sans = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

  return (
    <div style={{ fontFamily: sans, background: "#eef0f4", minHeight: "100vh", color: "#111827" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: ${sans}; cursor: pointer; transition: all 0.15s ease; }
        button:active { transform: scale(0.97); }
        input { font-family: ${sans}; }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes checkmark { 0% { stroke-dashoffset: 50; } 100% { stroke-dashoffset: 0; } }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .receipt-container { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Notification */}
      {notification && (
        <div className="no-print" style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
          background: notification.type === "success" ? "#065f46" : "#991b1b",
          color: "white", padding: "14px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "slideUp 0.3s ease",
        }}>
          {notification.msg}
        </div>
      )}

      {/* Top Nav */}
      <div className="no-print" style={{
        background: "#111827", color: "white", padding: "0 24px",
        display: "flex", alignItems: "center", height: 56, gap: 16,
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: "#60a5fa" }}>PCB</span> Auto
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, opacity: 0.6 }}>
          RO #{RO_NUMBER} · {CUSTOMER.name} · {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}
        </span>
      </div>

      {/* Tab bar */}
      {screen !== "processing" && (
        <div className="no-print" style={{
          background: "white", borderBottom: "2px solid #e5e7eb",
          display: "flex", padding: "0 24px",
        }}>
          {[
            { key: "invoice", label: paidAt ? "📄 Paid Invoice" : "📄 Invoice", show: true },
            { key: "payment", label: "💳 Take Payment", show: !paidAt },
            { key: "receipt", label: "🧾 Receipt", show: !!paidAt },
            { key: "settings", label: "⚙️ Dual Pricing Settings", show: true },
          ].filter(t => t.show).map(tab => (
            <button key={tab.key} onClick={() => setScreen(tab.key)} style={{
              padding: "14px 20px", fontSize: 14, fontWeight: screen === tab.key ? 700 : 500,
              color: screen === tab.key ? "#111827" : "#6b7280",
              background: "transparent", border: "none",
              borderBottom: screen === tab.key ? "3px solid #60a5fa" : "3px solid transparent",
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: screen === "processing" ? 0 : 24 }}>

        {/* ============================================ */}
        {/* SETTINGS */}
        {/* ============================================ */}
        {screen === "settings" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div style={{ background: "white", borderRadius: 14, padding: 32, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Dual Pricing Configuration</h2>
              <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, lineHeight: 1.6 }}>
                Dual pricing displays both a cash price and a card price on every estimate and invoice.
                The card price includes a surcharge to offset credit card processing fees.
                The customer chooses how they want to pay.
              </p>

              <div style={{ display: "grid", gap: 24, maxWidth: 480 }}>
                {/* Surcharge input */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Card Surcharge Rate
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <input
                      value={tempRate}
                      onChange={e => setTempRate(e.target.value)}
                      style={{
                        width: 100, padding: "12px 16px", fontSize: 24, fontWeight: 700,
                        border: "2px solid #d1d5db", borderRadius: 10, textAlign: "center",
                        fontFamily: mono,
                      }}
                    />
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#6b7280" }}>%</span>
                    <button onClick={() => {
                      const v = parseFloat(tempRate);
                      if (!isNaN(v) && v >= 0 && v <= 4) {
                        setSurchargeRate(v);
                        notify(`Surcharge updated to ${v}%`);
                      } else {
                        notify("Enter 0–4%", "error");
                      }
                    }} style={{
                      padding: "12px 24px", fontSize: 14, fontWeight: 700,
                      background: "#111827", color: "white", border: "none", borderRadius: 10,
                    }}>
                      Save
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                    Legal maximum is 4.00% in most states. Indiana allows up to 4%.
                    Industry standard is 3.00%–3.99%. Current: {surchargeRate}%
                  </p>
                </div>

                {/* Preview */}
                <div style={{ padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>
                    Live Preview — RO #{RO_NUMBER}
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div style={{ flex: 1, padding: 16, background: "#f0fdf4", borderRadius: 10, border: "2px solid #86efac", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>Cash Price</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#15803d", fontFamily: mono, marginTop: 4 }}>
                        ${cashTotal.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: 16, background: "#eff6ff", borderRadius: 10, border: "2px solid #93c5fd", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>Card Price</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#1d4ed8", fontFamily: mono, marginTop: 4 }}>
                        ${cardTotal.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                        +${surchargeAmount.toFixed(2)} ({surchargeRate}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick presets */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>Quick Set</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[3.00, 3.25, 3.49, 3.75, 3.99].map(r => (
                      <button key={r} onClick={() => { setTempRate(r.toString()); setSurchargeRate(r); notify(`Surcharge set to ${r}%`); }} style={{
                        padding: "10px 18px", fontSize: 14, fontWeight: surchargeRate === r ? 700 : 500,
                        background: surchargeRate === r ? "#111827" : "white",
                        color: surchargeRate === r ? "white" : "#374151",
                        border: surchargeRate === r ? "none" : "2px solid #d1d5db", borderRadius: 8,
                      }}>
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disclosure text */}
                <div style={{ padding: 16, background: "#fefce8", borderRadius: 10, border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>⚠️ Required Disclosure</div>
                  <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>
                    Federal and state regulations require the surcharge to be clearly disclosed to the customer
                    before the transaction. PCB Auto automatically prints the dual pricing on every estimate,
                    invoice, and receipt. The surcharge line item is always visible and never hidden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* INVOICE SCREEN */}
        {/* ============================================ */}
        {screen === "invoice" && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              {/* Shop header */}
              <div style={{ padding: "28px 32px", borderBottom: "3px solid #111827" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{SHOP.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>
                      {SHOP.address}<br />{SHOP.city}<br />{SHOP.phone} · {SHOP.email}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: paidAt ? "#16a34a" : "#111827" }}>
                      {paidAt ? "PAID" : "INVOICE"}
                    </div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>RO #{RO_NUMBER}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {paidAt ? `Paid: ${paidAt.toLocaleDateString()} ${paidAt.toLocaleTimeString()}` : `Date: ${new Date().toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer + Vehicle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ padding: "16px 32px", borderRight: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Bill To</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{CUSTOMER.name}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                    {CUSTOMER.address}<br />{CUSTOMER.phone}<br />{CUSTOMER.email}
                  </div>
                </div>
                <div style={{ padding: "16px 32px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Vehicle</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{VEHICLE.year} {VEHICLE.make} {VEHICLE.model}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5, fontFamily: mono }}>
                    VIN: {VEHICLE.vin}<br />
                    <span style={{ fontFamily: sans }}>Mileage: {VEHICLE.mileage} · Plate: {VEHICLE.license}</span>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div style={{ padding: "0 32px" }}>
                {/* Header */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 60px 100px 100px",
                  padding: "14px 0", borderBottom: "2px solid #e5e7eb",
                  fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1,
                }}>
                  <div>Description</div>
                  <div style={{ textAlign: "center" }}>Qty</div>
                  <div style={{ textAlign: "right" }}>Unit Price</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                </div>

                {/* Labor section */}
                <div style={{ padding: "12px 0 4px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Labor</div>
                {laborLines.map(line => (
                  <div key={line.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 100px 100px",
                    padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14, alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{line.desc}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{line.hours}hrs × ${line.rate.toFixed(2)}/hr</div>
                    </div>
                    <div style={{ textAlign: "center", color: "#6b7280" }}>{line.qty}</div>
                    <div style={{ textAlign: "right", fontFamily: mono, fontSize: 13 }}>${line.price.toFixed(2)}</div>
                    <div style={{ textAlign: "right", fontFamily: mono, fontWeight: 600 }}>${(line.price * line.qty).toFixed(2)}</div>
                  </div>
                ))}

                {/* Parts section */}
                <div style={{ padding: "16px 0 4px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Parts</div>
                {partLines.map(line => (
                  <div key={line.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 60px 100px 100px",
                    padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14, alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{line.desc}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: mono }}>#{line.partNum}</div>
                    </div>
                    <div style={{ textAlign: "center", color: "#6b7280" }}>{line.qty}</div>
                    <div style={{ textAlign: "right", fontFamily: mono, fontSize: 13 }}>${line.price.toFixed(2)}</div>
                    <div style={{ textAlign: "right", fontFamily: mono, fontWeight: 600 }}>${(line.price * line.qty).toFixed(2)}</div>
                  </div>
                ))}

                {/* Fees */}
                {feeLines.length > 0 && (
                  <>
                    <div style={{ padding: "16px 0 4px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Fees</div>
                    {feeLines.map(line => (
                      <div key={line.id} style={{
                        display: "grid", gridTemplateColumns: "1fr 60px 100px 100px",
                        padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14, alignItems: "center",
                      }}>
                        <div style={{ fontWeight: 500 }}>{line.desc}</div>
                        <div style={{ textAlign: "center", color: "#6b7280" }}>{line.qty}</div>
                        <div style={{ textAlign: "right", fontFamily: mono, fontSize: 13 }}>${line.price.toFixed(2)}</div>
                        <div style={{ textAlign: "right", fontFamily: mono, fontWeight: 600 }}>${(line.price * line.qty).toFixed(2)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Totals */}
              <div style={{ padding: "20px 32px 0", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 320 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                    <span>Labor</span>
                    <span style={{ fontFamily: mono }}>${laborTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
                    <span>Parts</span>
                    <span style={{ fontFamily: mono }}>${partsTotal.toFixed(2)}</span>
                  </div>
                  {feesTotal > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "#6b7280" }}>
                      <span>Fees</span>
                      <span style={{ fontFamily: mono }}>${feesTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, borderTop: "1px solid #e5e7eb" }}>
                    <span>Subtotal</span>
                    <span style={{ fontFamily: mono, fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: "#6b7280" }}>
                    <span>Tax ({(SHOP.taxRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontFamily: mono }}>${tax.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* DUAL PRICING BOX */}
              <div style={{ padding: "16px 32px 28px" }}>
                <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
                  <div style={{
                    padding: "20px 28px", background: "#f0fdf4", borderRadius: 12,
                    border: "2px solid #86efac", textAlign: "center", minWidth: 180,
                    ...(paidAt && paymentMethod === "cash" ? { border: "3px solid #16a34a", boxShadow: "0 0 0 3px rgba(22,163,74,0.15)" } : {}),
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 1 }}>Cash Price</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#15803d", fontFamily: mono, marginTop: 4 }}>
                      ${cashTotal.toFixed(2)}
                    </div>
                    {paidAt && paymentMethod === "cash" && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginTop: 6, background: "#dcfce7", padding: "4px 12px", borderRadius: 20 }}>✓ PAID</div>
                    )}
                  </div>
                  <div style={{
                    padding: "20px 28px", background: "#eff6ff", borderRadius: 12,
                    border: "2px solid #93c5fd", textAlign: "center", minWidth: 180,
                    ...(paidAt && paymentMethod === "card" ? { border: "3px solid #2563eb", boxShadow: "0 0 0 3px rgba(37,99,235,0.15)" } : {}),
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1 }}>Card Price</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "#1d4ed8", fontFamily: mono, marginTop: 4 }}>
                      ${cardTotal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      Includes {surchargeRate}% card surcharge (${surchargeAmount.toFixed(2)})
                    </div>
                    {paidAt && paymentMethod === "card" && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginTop: 6, background: "#dbeafe", padding: "4px 12px", borderRadius: 20 }}>✓ PAID</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment details if paid */}
              {paidAt && (
                <div style={{ padding: "0 32px 24px" }}>
                  <div style={{
                    padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0",
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Payment Method</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        {paymentMethod === "card" ? `${cardBrand} ····${cardLast4}` : "Cash"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>
                        {paymentMethod === "card" ? "Auth Code" : "Tendered"}
                      </div>
                      <div style={{ fontWeight: 600, marginTop: 4, fontFamily: mono }}>
                        {paymentMethod === "card" ? authCode : `$${totalWithTip.toFixed(2)}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Date & Time</div>
                      <div style={{ fontWeight: 600, marginTop: 4 }}>{paidAt.toLocaleString()}</div>
                    </div>
                    {tipAmount > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Tip</div>
                        <div style={{ fontWeight: 600, marginTop: 4, fontFamily: mono }}>${tipAmount.toFixed(2)}</div>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>Total Charged</div>
                        <div style={{ fontWeight: 700, marginTop: 4, fontFamily: mono, fontSize: 16 }}>${totalWithTip.toFixed(2)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ padding: "16px 32px 24px", borderTop: "1px solid #e5e7eb", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Thank you for your business!</p>
                <p style={{ fontSize: 12, color: "#d1d5db", marginTop: 4 }}>{SHOP.website} · Powered by PCB Auto</p>
              </div>
            </div>

            {/* Action buttons */}
            {!paidAt ? (
              <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center" }}>
                <button onClick={() => setScreen("payment")} style={{
                  padding: "16px 36px", fontSize: 16, fontWeight: 700,
                  background: "#111827", color: "white", border: "none", borderRadius: 12,
                }}>
                  💳 Take Payment
                </button>
                <button onClick={handlePrint} style={{
                  padding: "16px 24px", fontSize: 14, fontWeight: 600,
                  background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: 12,
                }}>
                  🖨️ Print
                </button>
                <button onClick={handleEmail} style={{
                  padding: "16px 24px", fontSize: 14, fontWeight: 600,
                  background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: 12,
                }}>
                  ✉️ Email
                </button>
              </div>
            ) : (
              <div className="no-print" style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center" }}>
                <button onClick={handlePrint} style={{
                  padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  background: "#111827", color: "white", border: "none", borderRadius: 12,
                }}>
                  🖨️ Print Invoice
                </button>
                <button onClick={handleEmail} style={{
                  padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  background: emailSent ? "#dcfce7" : "white",
                  color: emailSent ? "#16a34a" : "#374151",
                  border: emailSent ? "2px solid #86efac" : "2px solid #d1d5db", borderRadius: 12,
                }}>
                  {emailSent ? "✓ Email Sent" : `✉️ Email to ${CUSTOMER.email}`}
                </button>
                <button onClick={handleNewRO} style={{
                  padding: "16px 24px", fontSize: 14, fontWeight: 600,
                  background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: 12,
                }}>
                  ↺ Reset Demo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* PAYMENT SCREEN */}
        {/* ============================================ */}
        {screen === "payment" && !paidAt && (
          <div style={{ animation: "slideUp 0.3s ease" }}>
            <div style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "24px 32px", borderBottom: "1px solid #e5e7eb" }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Take Payment — RO #{RO_NUMBER}</h2>
                <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>{CUSTOMER.name} · {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}</p>
              </div>

              {/* Payment method selection */}
              <div style={{ padding: "24px 32px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                  Select Payment Method
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}>
                  {/* Cash option */}
                  <button onClick={() => setPaymentMethod("cash")} style={{
                    padding: 24, borderRadius: 14, textAlign: "center",
                    background: paymentMethod === "cash" ? "#f0fdf4" : "white",
                    border: paymentMethod === "cash" ? "3px solid #16a34a" : "2px solid #e5e7eb",
                    boxShadow: paymentMethod === "cash" ? "0 0 0 4px rgba(22,163,74,0.1)" : "none",
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>💵</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>Cash</div>
                    <div style={{ fontSize: 32, fontWeight: 800, fontFamily: mono, color: "#15803d", marginTop: 8 }}>
                      ${cashTotal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>No surcharge</div>
                  </button>

                  {/* Card option */}
                  <button onClick={() => setPaymentMethod("card")} style={{
                    padding: 24, borderRadius: 14, textAlign: "center",
                    background: paymentMethod === "card" ? "#eff6ff" : "white",
                    border: paymentMethod === "card" ? "3px solid #2563eb" : "2px solid #e5e7eb",
                    boxShadow: paymentMethod === "card" ? "0 0 0 4px rgba(37,99,235,0.1)" : "none",
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>💳</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1d4ed8" }}>Credit / Debit Card</div>
                    <div style={{ fontSize: 32, fontWeight: 800, fontFamily: mono, color: "#1d4ed8", marginTop: 8 }}>
                      ${cardTotal.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                      Includes {surchargeRate}% surcharge (+${surchargeAmount.toFixed(2)})
                    </div>
                  </button>
                </div>

                {/* Card details (simulated) */}
                {paymentMethod === "card" && (
                  <div style={{ marginTop: 24, padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", maxWidth: 560, animation: "slideUp 0.2s ease" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>
                      Card Details (Simulated)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#9ca3af" }}>Card Brand</label>
                        <select value={cardBrand} onChange={e => setCardBrand(e.target.value)} style={{
                          width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db",
                          borderRadius: 8, marginTop: 4, background: "white",
                        }}>
                          <option>Visa</option>
                          <option>Mastercard</option>
                          <option>Amex</option>
                          <option>Discover</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#9ca3af" }}>Last 4 Digits</label>
                        <input value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4}
                          style={{ width: "100%", padding: "10px 12px", fontSize: 16, fontFamily: mono, fontWeight: 700, border: "1px solid #d1d5db", borderRadius: 8, marginTop: 4, letterSpacing: 3 }}
                        />
                      </div>
                    </div>
                    <div style={{
                      marginTop: 12, padding: 10, background: "#fefce8", borderRadius: 8,
                      border: "1px solid #fde68a", fontSize: 12, color: "#92400e",
                    }}>
                      ⚠️ A {surchargeRate}% surcharge of ${surchargeAmount.toFixed(2)} applies to card payments.
                      This is disclosed on the posted price and receipt.
                    </div>
                  </div>
                )}

                {/* Tip */}
                {paymentMethod && (
                  <div style={{ marginTop: 24, maxWidth: 560, animation: "slideUp 0.2s ease" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                      Tip (Optional)
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[0, 5, 10, 15, 20].map(pct => {
                        const tipVal = pct === 0 ? 0 : +(finalAmount * pct / 100).toFixed(2);
                        const isActive = tipAmount === tipVal && customTip === "";
                        return (
                          <button key={pct} onClick={() => { setTipAmount(tipVal); setCustomTip(""); }} style={{
                            flex: 1, padding: "12px 8px", borderRadius: 8, fontSize: 13, fontWeight: isActive ? 700 : 500,
                            background: isActive ? "#111827" : "white",
                            color: isActive ? "white" : "#374151",
                            border: isActive ? "none" : "2px solid #e5e7eb", textAlign: "center",
                          }}>
                            {pct === 0 ? "No Tip" : `${pct}%`}
                            {pct > 0 && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>${tipVal.toFixed(2)}</div>}
                          </button>
                        );
                      })}
                      <div style={{ flex: 1, position: "relative" }}>
                        <input
                          value={customTip}
                          onChange={e => {
                            setCustomTip(e.target.value);
                            const v = parseFloat(e.target.value);
                            setTipAmount(isNaN(v) ? 0 : v);
                          }}
                          placeholder="Custom"
                          style={{
                            width: "100%", padding: "12px 12px 12px 24px", fontSize: 14, fontWeight: 600,
                            border: customTip ? "2px solid #111827" : "2px solid #e5e7eb", borderRadius: 8, textAlign: "center",
                          }}
                        />
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>$</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Process button */}
              {paymentMethod && (
                <div style={{ padding: "0 32px 32px" }}>
                  <div style={{
                    padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0",
                    display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 560, marginBottom: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Payment Amount</div>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono }}>${finalAmount.toFixed(2)}</div>
                    </div>
                    {tipAmount > 0 && (
                      <>
                        <div style={{ fontSize: 20, color: "#d1d5db" }}>+</div>
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Tip</div>
                          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: mono }}>${tipAmount.toFixed(2)}</div>
                        </div>
                        <div style={{ fontSize: 20, color: "#d1d5db" }}>=</div>
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Total</div>
                          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: mono, color: "#111827" }}>${totalWithTip.toFixed(2)}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <button onClick={processPayment} style={{
                    width: "100%", maxWidth: 560, padding: 18, fontSize: 18, fontWeight: 800,
                    background: paymentMethod === "cash" ? "#16a34a" : "#2563eb",
                    color: "white", border: "none", borderRadius: 12,
                    boxShadow: `0 4px 14px ${paymentMethod === "cash" ? "rgba(22,163,74,0.4)" : "rgba(37,99,235,0.4)"}`,
                  }}>
                    {paymentMethod === "cash"
                      ? `💵 Record Cash Payment — $${totalWithTip.toFixed(2)}`
                      : `💳 Charge ${cardBrand} ····${cardLast4} — $${totalWithTip.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PROCESSING SCREEN */}
        {/* ============================================ */}
        {screen === "processing" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            minHeight: "80vh", animation: "fadeIn 0.3s ease",
          }}>
            <div style={{
              width: 80, height: 80, border: "4px solid #e5e7eb", borderTopColor: paymentMethod === "card" ? "#2563eb" : "#16a34a",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 28 }}>
              {paymentMethod === "card" ? "Processing Card Payment..." : "Recording Cash Payment..."}
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
              {paymentMethod === "card" ? `Charging ${cardBrand} ····${cardLast4}` : "Verifying amount..."}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: mono, marginTop: 16, animation: "pulse 1.5s ease infinite" }}>
              ${totalWithTip.toFixed(2)}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* RECEIPT SCREEN */}
        {/* ============================================ */}
        {screen === "receipt" && paidAt && (
          <div style={{ animation: "slideUp 0.4s ease" }}>
            {/* Success banner */}
            <div className="no-print" style={{
              textAlign: "center", padding: 28, marginBottom: 20,
              background: paymentMethod === "cash" ? "#f0fdf4" : "#eff6ff",
              borderRadius: 14, border: `2px solid ${paymentMethod === "cash" ? "#86efac" : "#93c5fd"}`,
            }}>
              <div style={{ fontSize: 48 }}>{paymentMethod === "cash" ? "💵" : "💳"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: paymentMethod === "cash" ? "#15803d" : "#1d4ed8" }}>
                Payment Successful
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>
                {paymentMethod === "card"
                  ? `${cardBrand} ····${cardLast4} · Auth: ${authCode}`
                  : "Cash received"}
                {" · "}{paidAt.toLocaleString()}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, fontFamily: mono, marginTop: 12 }}>
                ${totalWithTip.toFixed(2)}
              </div>
              {tipAmount > 0 && (
                <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
                  (includes ${tipAmount.toFixed(2)} tip)
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="no-print" style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
              <button onClick={handlePrint} style={{
                padding: "14px 28px", fontSize: 15, fontWeight: 700,
                background: "#111827", color: "white", border: "none", borderRadius: 12,
              }}>
                🖨️ Print Receipt
              </button>
              <button onClick={handleEmail} style={{
                padding: "14px 28px", fontSize: 15, fontWeight: 700,
                background: emailSent ? "#dcfce7" : "white",
                color: emailSent ? "#16a34a" : "#374151",
                border: emailSent ? "2px solid #86efac" : "2px solid #d1d5db", borderRadius: 12,
              }}>
                {emailSent ? "✓ Sent" : `✉️ Email Receipt`}
              </button>
              <button onClick={() => setScreen("invoice")} style={{
                padding: "14px 24px", fontSize: 14, fontWeight: 600,
                background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: 12,
              }}>
                📄 View Full Invoice
              </button>
              <button onClick={handleNewRO} style={{
                padding: "14px 24px", fontSize: 14, fontWeight: 600,
                background: "white", color: "#374151", border: "2px solid #d1d5db", borderRadius: 12,
              }}>
                ↺ Reset Demo
              </button>
            </div>

            {/* Printable receipt */}
            <div className="receipt-container" ref={printRef} style={{
              background: "white", borderRadius: 14, overflow: "hidden",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)", maxWidth: 480, margin: "0 auto",
            }}>
              <div style={{ padding: "28px 28px 0", textAlign: "center", borderBottom: "2px dashed #e5e7eb", paddingBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{SHOP.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.6 }}>
                  {SHOP.address} · {SHOP.city}<br />{SHOP.phone}
                </div>
                <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: "#16a34a", letterSpacing: 1 }}>
                  — PAID —
                </div>
              </div>

              <div style={{ padding: "16px 28px", fontSize: 13, lineHeight: 1.8, borderBottom: "1px dashed #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>RO #</span><span style={{ fontWeight: 600 }}>{RO_NUMBER}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Customer</span><span style={{ fontWeight: 600 }}>{CUSTOMER.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Vehicle</span><span style={{ fontWeight: 600 }}>{VEHICLE.year} {VEHICLE.make} {VEHICLE.model}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Mileage</span><span style={{ fontWeight: 600 }}>{VEHICLE.mileage}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Date</span><span style={{ fontWeight: 600 }}>{paidAt.toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ padding: "12px 28px", borderBottom: "1px dashed #e5e7eb" }}>
                {SERVICE_LINES.map(line => (
                  <div key={line.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                    <span style={{ flex: 1, marginRight: 12 }}>
                      {line.desc}
                      {line.qty > 1 ? ` ×${line.qty}` : ""}
                    </span>
                    <span style={{ fontFamily: mono, fontWeight: 500, whiteSpace: "nowrap" }}>
                      ${(line.price * line.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ padding: "12px 28px", fontSize: 14, borderBottom: "1px dashed #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>Subtotal</span><span style={{ fontFamily: mono }}>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#6b7280" }}>
                  <span>Tax ({(SHOP.taxRate * 100).toFixed(0)}%)</span><span style={{ fontFamily: mono }}>${tax.toFixed(2)}</span>
                </div>
                {paymentMethod === "card" && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#6b7280" }}>
                    <span>Card Surcharge ({surchargeRate}%)</span><span style={{ fontFamily: mono }}>${surchargeAmount.toFixed(2)}</span>
                  </div>
                )}
                {tipAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#6b7280" }}>
                    <span>Tip</span><span style={{ fontFamily: mono }}>${tipAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 0 4px",
                  borderTop: "1px solid #e5e7eb", marginTop: 4,
                  fontSize: 20, fontWeight: 800,
                }}>
                  <span>Total</span><span style={{ fontFamily: mono }}>${totalWithTip.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ padding: "16px 28px", fontSize: 13, lineHeight: 1.8, borderBottom: "2px dashed #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Method</span>
                  <span style={{ fontWeight: 600 }}>{paymentMethod === "card" ? `${cardBrand} ····${cardLast4}` : "Cash"}</span>
                </div>
                {paymentMethod === "card" && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6b7280" }}>Auth Code</span>
                    <span style={{ fontWeight: 600, fontFamily: mono }}>{authCode}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>Time</span>
                  <span style={{ fontWeight: 600 }}>{paidAt.toLocaleTimeString()}</span>
                </div>
              </div>

              <div style={{ padding: "20px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>Thank you for your business!</p>
                <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 8 }}>Powered by PCB Auto · pcbisv.com</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
