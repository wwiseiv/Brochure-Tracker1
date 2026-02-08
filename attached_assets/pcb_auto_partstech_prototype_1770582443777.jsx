import { useState, useEffect, useCallback } from "react";

// ============================================
// MOCK DATA — realistic parts for common jobs
// ============================================
const MOCK_SUPPLIERS = [
  { id: "s1", name: "O'Reilly Auto Parts", location: "Carmel, IN — 0.8 mi", logo: "🟢", deliveryTime: "In Stock — Counter Pickup" },
  { id: "s2", name: "AutoZone", location: "Carmel, IN — 1.2 mi", logo: "🟠", deliveryTime: "In Stock — Counter Pickup" },
  { id: "s3", name: "NAPA Auto Parts", location: "Westfield, IN — 3.1 mi", logo: "🔵", deliveryTime: "In Stock — Delivery 2hrs" },
  { id: "s4", name: "Advance Auto Parts", location: "Fishers, IN — 4.5 mi", logo: "🔴", deliveryTime: "In Stock — Delivery Today" },
  { id: "s5", name: "WorldPac", location: "Indianapolis, IN — 12 mi", logo: "⚫", deliveryTime: "Ships Next Day" },
];

const MOCK_PARTS_DB = {
  "front brake pads": [
    { id: "p1", partNumber: "BC1058", brand: "Bosch", name: "Bosch QuietCast Brake Pad Set — Front", supplier: MOCK_SUPPLIERS[0], cost: 42.99, list: 79.99, inStock: true, qty: 8, rating: 4.7, warranty: "Lifetime" },
    { id: "p2", partNumber: "MKD1058", brand: "Motorcraft", name: "Motorcraft Standard Brake Pad Set — Front", supplier: MOCK_SUPPLIERS[1], cost: 38.49, list: 69.99, inStock: true, qty: 12, rating: 4.3, warranty: "2 Year" },
    { id: "p3", partNumber: "CRK14404", brand: "Power Stop", name: "Power Stop Z23 Evolution Carbon-Fiber Brake Pads — Front", supplier: MOCK_SUPPLIERS[2], cost: 52.99, list: 94.99, inStock: true, qty: 4, rating: 4.8, warranty: "3 Year / 36K Miles" },
    { id: "p4", partNumber: "ATD1058C", brand: "Wagner", name: "Wagner ThermoQuiet Ceramic Brake Pad Set — Front", supplier: MOCK_SUPPLIERS[3], cost: 44.99, list: 84.99, inStock: true, qty: 6, rating: 4.5, warranty: "Lifetime" },
    { id: "p5", partNumber: "EUR1058", brand: "Akebono", name: "Akebono Euro Ultra-Premium Ceramic Brake Pads — Front", supplier: MOCK_SUPPLIERS[4], cost: 61.50, list: 109.99, inStock: true, qty: 2, rating: 4.9, warranty: "Lifetime" },
  ],
  "front rotors": [
    { id: "r1", partNumber: "18A2328AC", brand: "ACDelco", name: "ACDelco Advantage Non-Coated Rotor — Front", supplier: MOCK_SUPPLIERS[0], cost: 67.50, list: 119.99, inStock: true, qty: 4, rating: 4.4, warranty: "2 Year" },
    { id: "r2", partNumber: "AR85134", brand: "DuraGo", name: "DuraGo Premium Vented Rotor — Front", supplier: MOCK_SUPPLIERS[1], cost: 52.99, list: 94.99, inStock: true, qty: 6, rating: 4.2, warranty: "1 Year" },
    { id: "r3", partNumber: "EBR1214XPR", brand: "Power Stop", name: "Power Stop Drilled & Slotted Rotor — Front", supplier: MOCK_SUPPLIERS[2], cost: 78.99, list: 139.99, inStock: true, qty: 3, rating: 4.7, warranty: "3 Year / 36K" },
    { id: "r4", partNumber: "R-54171", brand: "Raybestos", name: "Raybestos Advanced Technology Rotor — Front", supplier: MOCK_SUPPLIERS[3], cost: 59.99, list: 104.99, inStock: true, qty: 5, rating: 4.5, warranty: "Lifetime" },
  ],
  "serpentine belt": [
    { id: "b1", partNumber: "K060923", brand: "Gates", name: "Gates Micro-V Serpentine Belt", supplier: MOCK_SUPPLIERS[0], cost: 31.50, list: 54.99, inStock: true, qty: 7, rating: 4.8, warranty: "Lifetime" },
    { id: "b2", partNumber: "5060920", brand: "Continental", name: "Continental Elite Poly-V Serpentine Belt", supplier: MOCK_SUPPLIERS[2], cost: 28.99, list: 49.99, inStock: true, qty: 3, rating: 4.5, warranty: "4 Year / 50K" },
    { id: "b3", partNumber: "6PK2340", brand: "Bando", name: "Bando OEM Quality Serpentine Belt", supplier: MOCK_SUPPLIERS[4], cost: 24.99, list: 42.99, inStock: true, qty: 5, rating: 4.3, warranty: "2 Year" },
  ],
  "air filter": [
    { id: "a1", partNumber: "CA10262", brand: "Fram", name: "Fram Extra Guard Air Filter", supplier: MOCK_SUPPLIERS[1], cost: 12.99, list: 24.99, inStock: true, qty: 15, rating: 4.2, warranty: "1 Year" },
    { id: "a2", partNumber: "33-2385", brand: "K&N", name: "K&N Washable Engine Air Filter", supplier: MOCK_SUPPLIERS[0], cost: 54.99, list: 79.99, inStock: true, qty: 3, rating: 4.9, warranty: "Million Mile" },
    { id: "a3", partNumber: "AF1032", brand: "Purolator", name: "Purolator ONE Engine Air Filter", supplier: MOCK_SUPPLIERS[3], cost: 14.49, list: 26.99, inStock: true, qty: 8, rating: 4.4, warranty: "1 Year" },
  ],
  "cabin air filter": [
    { id: "c1", partNumber: "CF10285", brand: "Fram", name: "Fram Fresh Breeze Cabin Air Filter", supplier: MOCK_SUPPLIERS[1], cost: 16.99, list: 32.99, inStock: true, qty: 10, rating: 4.3, warranty: "1 Year" },
    { id: "c2", partNumber: "VF2001", brand: "K&N", name: "K&N Washable Cabin Air Filter", supplier: MOCK_SUPPLIERS[0], cost: 44.99, list: 69.99, inStock: true, qty: 2, rating: 4.8, warranty: "Million Mile" },
  ],
  "tire": [
    { id: "t1", partNumber: "15502650000", brand: "Continental", name: "Continental CrossContact LX25 275/55R20", supplier: MOCK_SUPPLIERS[2], cost: 189.00, list: 245.99, inStock: true, qty: 8, rating: 4.7, warranty: "70K Miles" },
    { id: "t2", partNumber: "732594500", brand: "Michelin", name: "Michelin Defender LTX M/S2 275/55R20", supplier: MOCK_SUPPLIERS[0], cost: 215.00, list: 289.99, inStock: true, qty: 4, rating: 4.9, warranty: "70K Miles" },
  ],
};

const VEHICLE = { year: 2019, make: "Ford", model: "F-150 XLT", engine: "5.0L V8", vin: "1FTEW1EP3KKD12345" };
const RO_NUMBER = "1001";
const CUSTOMER = { name: "Robert Smith", phone: "(317) 555-0101" };
const MARKUP_PCT = 50;

// ============================================
// MAIN APP
// ============================================
export default function PartsOrderingPrototype() {
  const [screen, setScreen] = useState("ro"); // ro | settings | partstech
  const [roLines, setRoLines] = useState([
    { id: "l1", type: "labor", desc: "Front brake pad & rotor replacement", hours: 1.5, rate: 125.00, price: 187.50 },
    { id: "l2", type: "labor", desc: "Serpentine belt replacement", hours: 0.5, rate: 125.00, price: 62.50 },
  ]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [ptConnected, setPtConnected] = useState(true);
  const [sortBy, setSortBy] = useState("price"); // price | rating | brand
  const [notification, setNotification] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPart, setManualPart] = useState({ desc: "", partNum: "", qty: 1, cost: "", price: "", supplier: "" });
  const [receivingMode, setReceivingMode] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const doSearch = () => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    let results = [];
    Object.entries(MOCK_PARTS_DB).forEach(([key, parts]) => {
      if (q.includes(key) || key.includes(q) || q.split(" ").some(w => key.includes(w))) {
        results = [...results, ...parts];
      }
    });
    if (results.length === 0) {
      // fuzzy fallback
      results = MOCK_PARTS_DB["front brake pads"];
    }
    setSearchResults(results);
    setHasSearched(true);
  };

  const addToCart = (part) => {
    if (cart.find(c => c.id === part.id)) return;
    setCart([...cart, { ...part, qty: part.name.includes("Rotor") ? 2 : 1 }]);
    showNotification(`${part.brand} ${part.partNumber} added to cart`);
  };

  const removeFromCart = (partId) => setCart(cart.filter(c => c.id !== partId));

  const updateCartQty = (partId, qty) => {
    setCart(cart.map(c => c.id === partId ? { ...c, qty: Math.max(1, qty) } : c));
  };

  const submitQuote = () => {
    const newLines = cart.map((item, i) => ({
      id: `pt-${Date.now()}-${i}`,
      type: "part",
      desc: item.name,
      partNumber: item.partNumber,
      brand: item.brand,
      supplier: item.supplier.name,
      qty: item.qty,
      cost: item.cost,
      price: +(item.cost * (1 + MARKUP_PCT / 100)).toFixed(2),
      markup: MARKUP_PCT,
      ptOrderId: `PT-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: "ordered",
      receivedAt: null,
    }));

    const order = {
      id: `ord-${Date.now()}`,
      ptOrderId: newLines[0]?.ptOrderId || "PT-0000",
      supplier: [...new Set(newLines.map(l => l.supplier))].join(", "),
      items: newLines,
      orderedAt: new Date().toLocaleString(),
      status: "ordered",
    };

    setRoLines([...roLines, ...newLines]);
    setOrderHistory([order, ...orderHistory]);
    setCart([]);
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setScreen("ro");
    showNotification(`${newLines.length} parts added to RO #${RO_NUMBER} — ${MARKUP_PCT}% markup applied`);
  };

  const addManualPart = () => {
    if (!manualPart.desc || !manualPart.cost || !manualPart.price) return;
    const line = {
      id: `man-${Date.now()}`,
      type: "part",
      desc: manualPart.desc,
      partNumber: manualPart.partNum || "—",
      brand: "—",
      supplier: manualPart.supplier || "Shop Stock",
      qty: manualPart.qty,
      cost: +manualPart.cost,
      price: +manualPart.price,
      markup: manualPart.cost > 0 ? +(((manualPart.price / manualPart.cost) - 1) * 100).toFixed(0) : 0,
      status: "received",
    };
    setRoLines([...roLines, line]);
    setManualPart({ desc: "", partNum: "", qty: 1, cost: "", price: "", supplier: "" });
    setManualMode(false);
    showNotification("Manual part added to RO");
  };

  const markReceived = (lineId) => {
    setRoLines(roLines.map(l => l.id === lineId ? { ...l, status: "received", receivedAt: new Date().toLocaleTimeString() } : l));
    showNotification("Part marked as received ✅");
  };

  const sorted = [...searchResults].sort((a, b) => {
    if (sortBy === "price") return a.cost - b.cost;
    if (sortBy === "rating") return b.rating - a.rating;
    return a.brand.localeCompare(b.brand);
  });

  const partLines = roLines.filter(l => l.type === "part");
  const laborLines = roLines.filter(l => l.type === "labor");
  const partsTotal = partLines.reduce((s, l) => s + l.price * (l.qty || 1), 0);
  const laborTotal = laborLines.reduce((s, l) => s + l.price, 0);
  const subtotal = partsTotal + laborTotal;
  const tax = +(subtotal * 0.07).toFixed(2);
  const cardSurcharge = +((subtotal + tax) * 0.035).toFixed(2);
  const cashTotal = subtotal + tax;
  const cardTotal = cashTotal + cardSurcharge;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#f0f2f5", minHeight: "100vh", color: "#1a1a2e" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; cursor: pointer; }
        input, textarea, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c1c5ce; border-radius: 3px; }
      `}</style>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: notification.type === "success" ? "#1b5e20" : "#b71c1c",
          color: "white", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          animation: "slideDown 0.3s ease"
        }}>
          {notification.msg}
        </div>
      )}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>

      {/* TOP NAV */}
      <div style={{ background: "#1a1a2e", color: "white", padding: "0 24px", display: "flex", alignItems: "center", height: 56, gap: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
          <span style={{ color: "#4fc3f7" }}>PCB</span> Auto
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, opacity: 0.7 }}>RO #{RO_NUMBER} · {CUSTOMER.name} · {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}</span>
      </div>

      {/* TAB BAR */}
      <div style={{ background: "white", borderBottom: "2px solid #e0e3ea", display: "flex", gap: 0, padding: "0 24px" }}>
        {[
          { key: "ro", label: "📋 Repair Order", active: screen === "ro" },
          { key: "partstech", label: "🔧 PartsTech", active: screen === "partstech" },
          { key: "settings", label: "⚙️ Settings", active: screen === "settings" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setScreen(tab.key)} style={{
            padding: "14px 20px", fontSize: 14, fontWeight: tab.active ? 700 : 500,
            color: tab.active ? "#1a1a2e" : "#6b7280", background: "transparent", border: "none",
            borderBottom: tab.active ? "3px solid #4fc3f7" : "3px solid transparent",
            transition: "all 0.2s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>

        {/* ============================================ */}
        {/* SETTINGS SCREEN */}
        {/* ============================================ */}
        {screen === "settings" && (
          <div style={{ background: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>PartsTech Integration</h2>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "12px 16px", background: ptConnected ? "#e8f5e9" : "#fff3e0", borderRadius: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: ptConnected ? "#4caf50" : "#ff9800" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: ptConnected ? "#2e7d32" : "#e65100" }}>
                {ptConnected ? "Connected" : "Not Connected"}
              </span>
              <button onClick={() => setPtConnected(!ptConnected)} style={{
                marginLeft: "auto", padding: "6px 16px", fontSize: 13, fontWeight: 600,
                background: ptConnected ? "#ffebee" : "#e8f5e9", border: "none", borderRadius: 6,
                color: ptConnected ? "#c62828" : "#2e7d32",
              }}>
                {ptConnected ? "Disconnect" : "Connect"}
              </button>
            </div>

            <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Username</label>
                <div style={{ display: "flex", marginTop: 6 }}>
                  <input defaultValue="wwiseiv@gmail.com" readOnly style={{
                    flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #d1d5db",
                    borderRadius: "8px 0 0 8px", background: "#f9fafb", fontFamily: "'JetBrains Mono', monospace",
                  }} />
                  <button onClick={() => { navigator.clipboard?.writeText("wwiseiv@gmail.com"); showNotification("Username copied"); }} style={{
                    padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "#1a1a2e",
                    color: "white", border: "none", borderRadius: "0 8px 8px 0",
                  }}>Copy</button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>API Key</label>
                <div style={{ display: "flex", marginTop: 6 }}>
                  <input defaultValue="46be04a5085a411fac562770003cb747" readOnly style={{
                    flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #d1d5db",
                    borderRadius: "8px 0 0 8px", background: "#f9fafb", fontFamily: "'JetBrains Mono', monospace",
                  }} />
                  <button onClick={() => { navigator.clipboard?.writeText("46be04a5085a411fac562770003cb747"); showNotification("API key copied"); }} style={{
                    padding: "10px 16px", fontSize: 13, fontWeight: 600, background: "#1a1a2e",
                    color: "white", border: "none", borderRadius: "0 8px 8px 0",
                  }}>Copy</button>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>This API key is only valid for this location.</p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 28, paddingTop: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Parts Markup Rules</h3>
              <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, width: 160 }}>Default Markup:</span>
                  <input defaultValue="50" style={{ width: 70, padding: "8px 12px", fontSize: 16, fontWeight: 700, border: "1px solid #d1d5db", borderRadius: 8, textAlign: "center" }} />
                  <span style={{ fontSize: 14, color: "#6b7280" }}>%</span>
                </div>
                <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                  Cost × 1.50 = retail price. Applied automatically when parts import from PartsTech. You can override per line on the RO.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* RO SCREEN (Repair Order + Estimate) */}
        {/* ============================================ */}
        {screen === "ro" && (
          <div>
            {/* Vehicle header */}
            <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Repair Order #{RO_NUMBER}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{CUSTOMER.name}</div>
                <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{CUSTOMER.phone}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Vehicle</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{VEHICLE.year} {VEHICLE.make} {VEHICLE.model}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{VEHICLE.engine} · {VEHICLE.vin}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 20px", background: "#fff8e1", borderRadius: 8, border: "1px solid #ffecb3" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#e65100", textTransform: "uppercase" }}>Status</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e65100", marginTop: 2 }}>
                  {partLines.some(l => l.status === "ordered") ? "⏳ Waiting Parts" : "🔧 In Progress"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
              {/* LEFT — Line Items */}
              <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                {/* Labor section */}
                <div style={{ padding: "16px 20px 8px", borderBottom: "1px solid #f0f2f5" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Labor</div>
                  {laborLines.map(line => (
                    <div key={line.id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8f9fa", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{line.desc}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>{line.hours}hrs × ${line.rate.toFixed(2)}/hr</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>${line.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {/* Parts section */}
                <div style={{ padding: "16px 20px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>Parts</div>
                    <div style={{ flex: 1 }} />
                    {partLines.some(l => l.status === "ordered") && (
                      <button onClick={() => setReceivingMode(!receivingMode)} style={{
                        fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 6, border: "none",
                        background: receivingMode ? "#c8e6c9" : "#e3f2fd", color: receivingMode ? "#2e7d32" : "#1565c0",
                      }}>
                        {receivingMode ? "✅ Receiving Mode ON" : "📦 Receive Parts"}
                      </button>
                    )}
                  </div>

                  {partLines.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: 14 }}>
                      No parts added yet
                    </div>
                  )}

                  {partLines.map(line => (
                    <div key={line.id} style={{
                      display: "flex", alignItems: "center", padding: "10px 0",
                      borderBottom: "1px solid #f8f9fa", gap: 12, opacity: line.status === "received" ? 0.7 : 1,
                    }}>
                      {receivingMode && line.status === "ordered" && (
                        <button onClick={() => markReceived(line.id)} style={{
                          padding: "6px 12px", fontSize: 12, fontWeight: 700, background: "#4caf50",
                          color: "white", border: "none", borderRadius: 6, whiteSpace: "nowrap",
                        }}>
                          ✅ Received
                        </button>
                      )}
                      {line.status === "received" && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#2e7d32", background: "#e8f5e9", padding: "2px 8px", borderRadius: 4 }}>RCVD</span>
                      )}
                      {line.status === "ordered" && !receivingMode && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#e65100", background: "#fff3e0", padding: "2px 8px", borderRadius: 4 }}>ORD</span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{line.desc}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {line.partNumber} · {line.brand} · {line.supplier}
                          {line.status === "received" && line.receivedAt && ` · Rcvd ${line.receivedAt}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                          ${(line.price * (line.qty || 1)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {line.qty > 1 ? `${line.qty} × $${line.price.toFixed(2)}` : ""} 
                          {line.markup ? `${line.markup}% markup` : ""}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add parts buttons */}
                  <div style={{ display: "flex", gap: 8, padding: "16px 0" }}>
                    <button onClick={() => { setScreen("partstech"); setSearchQuery(`front brake pads ${VEHICLE.year} ${VEHICLE.make} ${VEHICLE.model}`); }} style={{
                      flex: 1, padding: "14px 16px", fontSize: 14, fontWeight: 700,
                      background: "#1a1a2e", color: "white", border: "none", borderRadius: 10,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                      🔧 Add Parts from PartsTech
                    </button>
                    <button onClick={() => setManualMode(true)} style={{
                      padding: "14px 16px", fontSize: 14, fontWeight: 600,
                      background: "white", color: "#1a1a2e", border: "2px solid #d1d5db", borderRadius: 10,
                    }}>
                      + Manual
                    </button>
                  </div>

                  {/* Manual part entry */}
                  {manualMode && (
                    <div style={{ padding: 16, background: "#f8f9fa", borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add Part Manually</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <input value={manualPart.desc} onChange={e => setManualPart({ ...manualPart, desc: e.target.value })} placeholder="Description *" style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input value={manualPart.partNum} onChange={e => setManualPart({ ...manualPart, partNum: e.target.value })} placeholder="Part # (optional)" style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 }} />
                          <input value={manualPart.supplier} onChange={e => setManualPart({ ...manualPart, supplier: e.target.value })} placeholder="Supplier (optional)" style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8 }}>
                          <input type="number" value={manualPart.qty} onChange={e => setManualPart({ ...manualPart, qty: +e.target.value })} placeholder="Qty" style={{ padding: "10px 8px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8, textAlign: "center" }} />
                          <input type="number" value={manualPart.cost} onChange={e => setManualPart({ ...manualPart, cost: e.target.value })} placeholder="Your Cost *" style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 }} />
                          <input type="number" value={manualPart.price} onChange={e => setManualPart({ ...manualPart, price: e.target.value })} placeholder="Sell Price *" style={{ padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8 }} />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={addManualPart} style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 700, background: "#1a1a2e", color: "white", border: "none", borderRadius: 8 }}>Add to RO</button>
                          <button onClick={() => setManualMode(false)} style={{ padding: "10px 16px", fontSize: 14, background: "#f0f2f5", border: "none", borderRadius: 8, color: "#6b7280" }}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — Totals + Actions */}
              <div>
                <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", position: "sticky", top: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Estimate Summary</div>
                  
                  <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Labor ({laborLines.length} lines)</span>
                      <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>${laborTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Parts ({partLines.length} lines)</span>
                      <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>${partsTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span>Subtotal</span>
                      <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                      <span>Tax (7%)</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>${tax.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#16a34a", textTransform: "uppercase" }}>Cash Price</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#15803d", fontFamily: "'JetBrains Mono', monospace" }}>${cashTotal.toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Card Price</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>${cardTotal.toFixed(2)}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>+3.5% surcharge</div>
                      </div>
                    </div>
                  </div>

                  {partLines.length > 0 && (
                    <div style={{ marginTop: 12, padding: 12, background: "#f8f9fa", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Parts Margin</div>
                      <div>Cost: ${partLines.reduce((s, l) => s + l.cost * (l.qty || 1), 0).toFixed(2)} → Sell: ${partsTotal.toFixed(2)}</div>
                      <div style={{ fontWeight: 600, color: "#2e7d32", marginTop: 2 }}>
                        Gross Profit: ${(partsTotal - partLines.reduce((s, l) => s + l.cost * (l.qty || 1), 0)).toFixed(2)}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                    <button style={{ padding: 14, fontSize: 14, fontWeight: 700, background: "#4fc3f7", color: "#1a1a2e", border: "none", borderRadius: 10 }}>
                      📱 Text Estimate to Customer
                    </button>
                    <button style={{ padding: 14, fontSize: 14, fontWeight: 700, background: "white", color: "#1a1a2e", border: "2px solid #d1d5db", borderRadius: 10 }}>
                      ✉️ Email Estimate
                    </button>
                    <button style={{ padding: 14, fontSize: 14, fontWeight: 700, background: "white", color: "#1a1a2e", border: "2px solid #d1d5db", borderRadius: 10 }}>
                      🖨️ Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* PARTSTECH SCREEN */}
        {/* ============================================ */}
        {screen === "partstech" && (
          <div>
            {/* PartsTech header bar */}
            <div style={{ background: "white", borderRadius: "12px 12px 0 0", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #e0e3ea" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>
                <span style={{ background: "#2196f3", color: "white", padding: "2px 8px", borderRadius: 4, fontSize: 13, marginRight: 8 }}>PartsTech</span>
                Parts Search
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 13, color: "#6b7280", background: "#f0f2f5", padding: "6px 12px", borderRadius: 6 }}>
                🚗 {VEHICLE.year} {VEHICLE.make} {VEHICLE.model} · {VEHICLE.engine}
              </div>
            </div>

            <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doSearch()}
                  placeholder="Search parts… e.g. 'front brake pads' or 'serpentine belt' or 'air filter'"
                  style={{ flex: 1, padding: "12px 16px", fontSize: 15, border: "2px solid #d1d5db", borderRadius: 10, outline: "none" }}
                  autoFocus
                />
                <button onClick={doSearch} style={{
                  padding: "12px 28px", fontSize: 15, fontWeight: 700, background: "#1a1a2e",
                  color: "white", border: "none", borderRadius: 10,
                }}>
                  Search
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {["front brake pads", "front rotors", "serpentine belt", "air filter", "cabin air filter", "tire"].map(q => (
                  <button key={q} onClick={() => { setSearchQuery(q); setTimeout(() => { setSearchQuery(q); const ev = { target: { value: q } }; setSearchResults([]); setHasSearched(false); }, 0); }} style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 600, background: "#f0f2f5",
                    border: "1px solid #e0e3ea", borderRadius: 20, color: "#4b5563", cursor: "pointer",
                  }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div style={{ display: "grid", gridTemplateColumns: cart.length > 0 ? "1fr 340px" : "1fr", gap: 0 }}>
              <div style={{ background: "#f8f9fa", minHeight: 400 }}>
                {!hasSearched && (
                  <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontSize: 16 }}>Search for parts above or tap a quick search chip</div>
                    <div style={{ fontSize: 13, marginTop: 8 }}>Vehicle: {VEHICLE.year} {VEHICLE.make} {VEHICLE.model} {VEHICLE.engine} is pre-selected</div>
                  </div>
                )}

                {hasSearched && (
                  <div>
                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, background: "white", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{sorted.length} results</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>Sort:</span>
                      {["price", "rating", "brand"].map(s => (
                        <button key={s} onClick={() => setSortBy(s)} style={{
                          padding: "4px 12px", fontSize: 12, fontWeight: sortBy === s ? 700 : 500,
                          background: sortBy === s ? "#1a1a2e" : "#f0f2f5", color: sortBy === s ? "white" : "#4b5563",
                          border: "none", borderRadius: 20, textTransform: "capitalize",
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>

                    {sorted.map(part => {
                      const inCart = cart.find(c => c.id === part.id);
                      const retailPrice = +(part.cost * (1 + MARKUP_PCT / 100)).toFixed(2);
                      return (
                        <div key={part.id} style={{
                          padding: "16px 20px", background: "white", borderBottom: "1px solid #f0f2f5",
                          display: "flex", gap: 16, alignItems: "flex-start",
                          opacity: inCart ? 0.5 : 1,
                        }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 8, background: "#f0f2f5",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0,
                          }}>
                            {part.supplier.logo}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{part.name}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>#{part.partNumber}</span>
                              <span>·</span>
                              <span>{part.supplier.name}</span>
                              <span>·</span>
                              <span style={{ color: "#16a34a", fontWeight: 600 }}>{part.supplier.deliveryTime}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, display: "flex", gap: 12 }}>
                              <span>⭐ {part.rating}</span>
                              <span>📦 {part.qty} in stock</span>
                              <span>🛡️ {part.warranty}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#1a1a2e" }}>${part.cost.toFixed(2)}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>your cost</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>retail: ${retailPrice.toFixed(2)}</div>
                            <button
                              onClick={() => inCart ? null : addToCart(part)}
                              disabled={!!inCart}
                              style={{
                                marginTop: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700,
                                background: inCart ? "#e5e7eb" : "#1a1a2e", color: inCart ? "#9ca3af" : "white",
                                border: "none", borderRadius: 8, cursor: inCart ? "default" : "pointer",
                              }}
                            >
                              {inCart ? "✓ In Cart" : "+ Add"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart sidebar */}
              {cart.length > 0 && (
                <div style={{ background: "white", borderLeft: "2px solid #e0e3ea", padding: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                    Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
                  </div>
                  {cart.map(item => (
                    <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{item.brand} {item.partNumber}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.supplier.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Qty:</span>
                        <button onClick={() => updateCartQty(item.id, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        <div style={{ flex: 1 }} />
                        <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>${(item.cost * item.qty).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.id)} style={{ fontSize: 16, background: "none", border: "none", color: "#ef4444", padding: 4 }}>✕</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 16, padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280" }}>
                      <span>Your Cost:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        ${cart.reduce((s, c) => s + c.cost * c.qty, 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                      <span>After {MARKUP_PCT}% markup:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                        ${cart.reduce((s, c) => s + c.cost * c.qty * (1 + MARKUP_PCT / 100), 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#16a34a", fontWeight: 700, marginTop: 4 }}>
                      <span>Margin:</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        +${cart.reduce((s, c) => s + c.cost * c.qty * (MARKUP_PCT / 100), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button onClick={submitQuote} style={{
                    width: "100%", marginTop: 16, padding: 16, fontSize: 15, fontWeight: 700,
                    background: "#4caf50", color: "white", border: "none", borderRadius: 10,
                  }}>
                    Submit Quote → Add to RO
                  </button>
                  <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
                    Parts will be added to RO #{RO_NUMBER} with {MARKUP_PCT}% markup
                  </p>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div style={{ background: "white", borderRadius: "0 0 12px 12px", padding: "12px 20px", borderTop: "2px solid #e0e3ea", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setScreen("ro")} style={{
                padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "#f0f2f5",
                border: "none", borderRadius: 8, color: "#4b5563",
              }}>
                ← Back to RO
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                Connected as wwiseiv@gmail.com · API Key: ••••cb747
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
