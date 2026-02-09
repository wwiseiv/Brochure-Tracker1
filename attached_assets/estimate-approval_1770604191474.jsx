import { useState, useEffect, useRef } from "react";

const SHOP_INFO = {
  name: "Precision Auto Care",
  phone: "(317) 555-0142",
  address: "8842 Michigan Rd, Indianapolis, IN 46268",
  logo: null,
};

const VEHICLE_INFO = {
  year: "2021",
  make: "Toyota",
  model: "Camry SE",
  vin: "4T1G11AK5MU...4829",
  mileage: "47,832",
  licensePlate: "IN • ABC 1234",
  color: "Celestial Silver",
};

const CUSTOMER_INFO = {
  name: "Sarah Mitchell",
  phone: "(317) 555-0198",
  email: "sarah.mitchell@email.com",
};

const INITIAL_ITEMS = [
  {
    id: 1,
    category: "safety",
    priority: "red",
    service: "Front Brake Pad Replacement",
    description: "Front brake pads measured at 2mm — below minimum safe threshold of 3mm. Metal-on-metal contact imminent. Rotors show scoring but are within spec for resurfacing.",
    laborHours: 1.2,
    laborRate: 135,
    parts: [
      { name: "Ceramic Brake Pads (Front Set)", price: 89.99, qty: 1 },
      { name: "Brake Hardware Kit", price: 24.99, qty: 1 },
    ],
    inspectionPhotos: ["brake_pad_worn.jpg"],
    techNote: "Recommend immediate replacement — safety concern",
    status: null,
  },
  {
    id: 2,
    category: "safety",
    priority: "red",
    service: "Brake Rotor Resurfacing (Front)",
    description: "Both front rotors have visible scoring from worn pads. Still within minimum thickness spec — resurfacing will restore smooth braking surface and extend rotor life.",
    laborHours: 0.8,
    laborRate: 135,
    parts: [
      { name: "Rotor Resurfacing (per rotor)", price: 35.00, qty: 2 },
    ],
    inspectionPhotos: ["rotor_scoring.jpg"],
    techNote: "Required with brake pad replacement for proper bedding",
    status: null,
  },
  {
    id: 3,
    category: "maintenance",
    priority: "yellow",
    service: "Cabin Air Filter Replacement",
    description: "Cabin filter is heavily clogged with debris and dust. Restricting airflow to HVAC system. Replacement recommended every 15,000–20,000 miles.",
    laborHours: 0.3,
    laborRate: 135,
    parts: [
      { name: "Cabin Air Filter - OEM Spec", price: 28.99, qty: 1 },
    ],
    inspectionPhotos: ["cabin_filter_dirty.jpg"],
    techNote: "Last replaced ~25,000 miles ago per service history",
    status: null,
  },
  {
    id: 4,
    category: "maintenance",
    priority: "yellow",
    service: "Engine Air Filter Replacement",
    description: "Engine air filter showing significant dirt accumulation. Restricting airflow can reduce fuel efficiency by 2-4% and affect engine performance.",
    laborHours: 0.2,
    laborRate: 135,
    parts: [
      { name: "Engine Air Filter - OEM Spec", price: 32.99, qty: 1 },
    ],
    inspectionPhotos: [],
    techNote: "Due based on mileage interval",
    status: null,
  },
  {
    id: 5,
    category: "recommended",
    priority: "green",
    service: "Tire Rotation & Balance",
    description: "Tires showing uneven wear pattern (inner edge front, outer edge rear). Rotation will equalize wear and extend tire life. All tires have 5/32\" tread remaining — good for another 15,000+ miles with rotation.",
    laborHours: 0.5,
    laborRate: 135,
    parts: [
      { name: "Wheel Balance (per wheel)", price: 12.00, qty: 4 },
    ],
    inspectionPhotos: [],
    techNote: "Alignment looks good — rotation should correct wear pattern",
    status: null,
  },
  {
    id: 6,
    category: "recommended",
    priority: "green",
    service: "Synthetic Oil Change + Filter",
    description: "Oil life monitor at 12%. Using Toyota-spec 0W-20 full synthetic. Includes drain plug washer, new OEM filter, and 5-point fluid top-off.",
    laborHours: 0.4,
    laborRate: 135,
    parts: [
      { name: "Full Synthetic 0W-20 (5 qt)", price: 42.99, qty: 1 },
      { name: "OEM Oil Filter", price: 8.99, qty: 1 },
      { name: "Drain Plug Washer", price: 1.99, qty: 1 },
    ],
    inspectionPhotos: [],
    techNote: "Next service due at ~52,800 miles or 6 months",
    status: null,
  },
];

const priorityConfig = {
  red: { label: "Safety Critical", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", icon: "⚠️", dot: "#EF4444" },
  yellow: { label: "Recommended Soon", bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", icon: "🔧", dot: "#F59E0B" },
  green: { label: "Maintenance", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", icon: "✓", dot: "#10B981" },
};

function formatCurrency(num) {
  return "$" + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getItemTotal(item) {
  const labor = item.laborHours * item.laborRate;
  const parts = item.parts.reduce((sum, p) => sum + p.price * p.qty, 0);
  return labor + parts;
}

// Signature pad component
function SignaturePad({ onSign }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (hasSignature) onSign(true);
  };

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSign(false);
  };

  return (
    <div>
      <div style={{
        position: "relative",
        border: "2px dashed #CBD5E1",
        borderRadius: 12,
        background: "#FAFBFC",
        overflow: "hidden",
      }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: 120, touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            color: "#94A3B8", fontSize: 14, fontFamily: "'DM Sans', sans-serif", pointerEvents: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Sign here with finger or mouse
          </div>
        )}
      </div>
      {hasSignature && (
        <button onClick={clearSig} style={{
          marginTop: 8, background: "none", border: "none", color: "#64748B",
          fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          textDecoration: "underline", padding: 0,
        }}>Clear signature</button>
      )}
    </div>
  );
}

// AI Chat simulation
function AIChat({ items, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi Sarah! 👋 I'm the AI assistant for Precision Auto Care. I can help explain any of the recommended services on your estimate, answer questions about pricing, or help you understand what's urgent vs. what can wait. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const aiResponses = {
    brake: "Great question about the brakes! Your front brake pads are at 2mm, which is below the 3mm safety minimum. At this level, you're very close to metal-on-metal contact, which would damage the rotors beyond resurfacing (costing $200+ more per rotor for full replacement). I'd strongly recommend approving both the pad replacement and rotor resurfacing together — they work as a system. The total for both services is about $380, which is actually very competitive for ceramic pads and resurfacing. Would you like me to break down the cost further?",
    filter: "The cabin and engine air filters are both overdue based on your mileage. The cabin filter affects your A/C and heating — you might notice musty smells or weak airflow. The engine filter affects fuel economy and performance. Neither is urgent safety-wise, but they're inexpensive maintenance items ($29–$33 each) that prevent bigger issues. If you want to save a bit now, I'd prioritize the engine air filter since it directly impacts fuel efficiency. The cabin filter can wait another month or two without any mechanical risk.",
    wait: "Here's my honest assessment of what can wait:\n\n🔴 **Can't wait:** Front brake pads + rotor resurfacing. These are safety-critical — you're below minimum safe specs.\n\n🟡 **Soon (1-2 months):** Air filters. Won't cause damage short-term but affecting efficiency.\n\n🟢 **Flexible:** Tire rotation and oil change. Your oil life is at 12% so you have maybe 500-1,000 miles left. Tire rotation can wait a few weeks.\n\nIf budget is tight, I'd recommend approving the brakes today and scheduling the rest for next month. Want me to help you set that up?",
    price: "Let me break down the pricing for you:\n\n• **Labor rate: $135/hr** — this is competitive for the Indianapolis area (average is $130-$155/hr for a quality independent shop)\n• **Parts:** All parts are OEM-spec aftermarket, which gives you manufacturer-quality fit at 20-30% less than dealer pricing\n• **No hidden fees:** The estimate shows exactly what you'll pay — parts + labor + tax\n\nThe total for all recommended work is about $780. If you approve just the safety-critical brakes, that's about $380. Is there a specific line item you'd like me to explain?",
    default: "That's a great question! Let me look into that for you. Based on the inspection findings and your vehicle's service history, I'd recommend discussing this directly with your service advisor for the most accurate answer. Would you like me to send them a message with your question, or is there something else about the estimate I can help clarify?",
  };

  const getResponse = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("brake") || lower.includes("pad") || lower.includes("rotor")) return aiResponses.brake;
    if (lower.includes("filter") || lower.includes("cabin") || lower.includes("air")) return aiResponses.filter;
    if (lower.includes("wait") || lower.includes("urgent") || lower.includes("later") || lower.includes("priority") || lower.includes("need")) return aiResponses.wait;
    if (lower.includes("price") || lower.includes("cost") || lower.includes("expensive") || lower.includes("much") || lower.includes("break down") || lower.includes("charge")) return aiResponses.price;
    return aiResponses.default;
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { role: "assistant", text: getResponse(userMsg) }]);
    }, 1500 + Math.random() * 1000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #E2E8F0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16,
            }}>🤖</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", fontFamily: "'DM Sans', sans-serif" }}>AI Service Advisor</div>
              <div style={{ fontSize: 12, color: "#10B981", fontFamily: "'DM Sans', sans-serif" }}>● Online now</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "#F1F5F9", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748B",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
            }}>
              <div style={{
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user"
                  ? "linear-gradient(135deg, #3B82F6, #2563EB)"
                  : "#F1F5F9",
                color: m.role === "user" ? "#fff" : "#1E293B",
                fontSize: 14, lineHeight: 1.5,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "pre-line",
              }}>{m.text}</div>
            </div>
          ))}
          {isTyping && (
            <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
              <div style={{
                padding: "10px 18px", borderRadius: "16px 16px 16px 4px",
                background: "#F1F5F9", display: "flex", gap: 4,
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#94A3B8",
                    animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div style={{
          padding: "8px 20px", display: "flex", gap: 8, overflowX: "auto",
          borderTop: "1px solid #F1F5F9",
        }}>
          {["What's urgent?", "Explain brake cost", "Can filters wait?", "Price breakdown"].map((q) => (
            <button key={q} onClick={() => { setInput(q); }} style={{
              whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20,
              border: "1px solid #E2E8F0", background: "#FAFBFC", color: "#475569",
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
            }}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 20px 24px", display: "flex", gap: 8,
          borderTop: "1px solid #E2E8F0",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your estimate..."
            style={{
              flex: 1, padding: "10px 16px", borderRadius: 24,
              border: "1.5px solid #E2E8F0", outline: "none", fontSize: 14,
              fontFamily: "'DM Sans', sans-serif", background: "#FAFBFC",
            }}
          />
          <button onClick={send} style={{
            width: 40, height: 40, borderRadius: "50%",
            background: input.trim() ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#E2E8F0",
            border: "none", cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "#94A3B8"} strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

// Photo viewer simulation
function PhotoViewer({ service, onClose }) {
  const placeholderImages = {
    "brake_pad_worn.jpg": { label: "Front brake pad — 2mm remaining", gradient: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)" },
    "rotor_scoring.jpg": { label: "Rotor surface scoring visible", gradient: "linear-gradient(135deg, #EA580C 0%, #9A3412 100%)" },
    "cabin_filter_dirty.jpg": { label: "Cabin filter — heavy debris buildup", gradient: "linear-gradient(135deg, #D97706 0%, #92400E 100%)" },
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20, cursor: "pointer",
    }}>
      <div style={{
        color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}>📸 Inspection Photos — {service}</div>
      <div style={{
        width: "100%", maxWidth: 400, aspectRatio: "4/3",
        borderRadius: 16, overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: Object.values(placeholderImages)[0]?.gradient || "#334155",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
        </svg>
        <div style={{
          color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 12,
          fontFamily: "'DM Sans', sans-serif", textAlign: "center", padding: "0 20px",
        }}>
          [Inspection photo placeholder]<br/>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Tap anywhere to close</span>
        </div>
      </div>
      <div style={{
        color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 16,
        fontFamily: "'DM Sans', sans-serif", textAlign: "center",
      }}>
        In production, actual DVI inspection photos<br/>from the technician will display here
      </div>
    </div>
  );
}

// Main component
export default function EstimateApprovalPortal() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [showChat, setShowChat] = useState(false);
  const [showPhotos, setShowPhotos] = useState(null);
  const [customerNote, setCustomerNote] = useState("");
  const [hasSigned, setHasSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [showCashPrice, setShowCashPrice] = useState(false);

  const updateStatus = (id, status) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, status } : item));
  };

  const approvedItems = items.filter((i) => i.status === "approved");
  const declinedItems = items.filter((i) => i.status === "declined");
  const pendingItems = items.filter((i) => i.status === null);

  const approvedTotal = approvedItems.reduce((sum, i) => sum + getItemTotal(i), 0);
  const estimateTotal = items.reduce((sum, i) => sum + getItemTotal(i), 0);
  const cashDiscount = 0.035;
  const cashTotal = approvedTotal * (1 - cashDiscount);

  const allDecided = pendingItems.length === 0;
  const hasApprovals = approvedItems.length > 0;
  const canSubmit = allDecided && hasApprovals && hasSigned;

  const approveAll = () => setItems((prev) => prev.map((i) => ({ ...i, status: "approved" })));
  const resetAll = () => setItems((prev) => prev.map((i) => ({ ...i, status: null })));

  if (submitted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 30%, #fff 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet"/>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, #10B981, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, marginBottom: 24,
          boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
          animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>✓</div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#065F46", marginBottom: 8,
          fontFamily: "'Fraunces', serif",
        }}>Estimate Approved!</h1>
        <p style={{ color: "#047857", fontSize: 16, textAlign: "center", marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
          Your service advisor has been notified. You'll receive a text when your vehicle is ready.
        </p>
        <div style={{
          background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #D1FAE5",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: "#64748B", fontSize: 14 }}>Services approved</span>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{approvedItems.length} of {items.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: "#64748B", fontSize: 14 }}>Approved total</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#0F172A" }}>{formatCurrency(approvedTotal)}</span>
          </div>
          {declinedItems.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B", fontSize: 14 }}>Declined services</span>
              <span style={{ color: "#DC2626", fontWeight: 500 }}>{declinedItems.length} items</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748B" }}>Questions? Call us:</span>
          <a href={`tel:${SHOP_INFO.phone}`} style={{
            color: "#059669", fontWeight: 600, fontSize: 16, textDecoration: "none",
          }}>{SHOP_INFO.phone}</a>
        </div>
        <style>{`@keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8FAFC",
      fontFamily: "'DM Sans', sans-serif",
      paddingBottom: 200,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet"/>

      {/* Top bar */}
      <div style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        padding: "16px 20px",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{
                fontSize: 17, fontWeight: 700, color: "#fff",
                fontFamily: "'Fraunces', serif",
                letterSpacing: "-0.01em",
              }}>{SHOP_INFO.name}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{SHOP_INFO.phone}</div>
            </div>
            <div style={{
              background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 600, color: "#60A5FA",
              letterSpacing: "0.05em",
            }}>ESTIMATE</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>

        {/* Vehicle card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "18px 20px",
          marginTop: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
          border: "1px solid #E2E8F0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Vehicle</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginTop: 4, fontFamily: "'Fraunces', serif" }}>
                {VEHICLE_INFO.year} {VEHICLE_INFO.make} {VEHICLE_INFO.model}
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                {VEHICLE_INFO.color} · {VEHICLE_INFO.mileage} mi
              </div>
            </div>
            <div style={{
              background: "#F1F5F9", borderRadius: 10, padding: "8px 12px",
              fontSize: 13, fontWeight: 600, color: "#475569",
              fontFamily: "monospace", letterSpacing: "0.05em",
            }}>{VEHICLE_INFO.licensePlate}</div>
          </div>
          <div style={{
            marginTop: 12, padding: "8px 12px", background: "#F8FAFC",
            borderRadius: 8, fontSize: 12, color: "#64748B",
            fontFamily: "monospace",
          }}>VIN: {VEHICLE_INFO.vin}</div>
        </div>

        {/* Summary banner */}
        <div style={{
          background: "linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%)",
          borderRadius: 16, padding: "18px 20px", marginTop: 12,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#93C5FD", fontWeight: 500 }}>Estimate Total</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontFamily: "'Fraunces', serif", marginTop: 2 }}>
              {formatCurrency(estimateTotal)}
            </div>
            <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 4 }}>
              {items.length} services · {items.reduce((s, i) => s + i.laborHours, 0).toFixed(1)} labor hrs
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 8, padding: "6px 12px",
              fontSize: 12, color: "#34D399", fontWeight: 600,
            }}>
              💰 Cash price saves {(cashDiscount * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
              Approve below ↓
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap",
        }}>
          <button onClick={approveAll} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10,
            background: "#ECFDF5", border: "1.5px solid #A7F3D0",
            color: "#047857", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            minWidth: 140,
          }}>✓ Approve All</button>
          <button onClick={resetAll} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10,
            background: "#F8FAFC", border: "1.5px solid #E2E8F0",
            color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            minWidth: 140,
          }}>↺ Reset All</button>
        </div>

        {/* Priority sections */}
        {["red", "yellow", "green"].map((priority) => {
          const sectionItems = items.filter((i) => i.priority === priority);
          if (sectionItems.length === 0) return null;
          const config = priorityConfig[priority];

          return (
            <div key={priority} style={{ marginTop: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: config.dot, flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 700, color: config.text,
                  letterSpacing: "0.03em",
                  fontFamily: "'DM Sans', sans-serif",
                }}>{config.label.toUpperCase()}</span>
                <div style={{ flex: 1, height: 1, background: config.border, opacity: 0.4 }} />
              </div>

              {sectionItems.map((item) => {
                const total = getItemTotal(item);
                const isExpanded = expandedItem === item.id;
                const hasPhotos = item.inspectionPhotos.length > 0;

                return (
                  <div key={item.id} style={{
                    background: "#fff",
                    borderRadius: 14,
                    marginBottom: 10,
                    border: item.status === "approved"
                      ? "2px solid #10B981"
                      : item.status === "declined"
                        ? "2px solid #F87171"
                        : "1px solid #E2E8F0",
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                    opacity: item.status === "declined" ? 0.65 : 1,
                  }}>
                    {/* Item header */}
                    <div
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      style={{
                        padding: "14px 16px",
                        cursor: "pointer",
                        display: "flex", gap: 12, alignItems: "flex-start",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: config.bg, border: `1px solid ${config.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, marginTop: 2,
                      }}>{config.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 15, fontWeight: 600, color: "#0F172A",
                          lineHeight: 1.3,
                        }}>{item.service}</div>
                        <div style={{
                          fontSize: 12, color: "#64748B", marginTop: 4,
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                        }}>
                          <span>{item.laborHours}h labor</span>
                          <span style={{ color: "#CBD5E1" }}>·</span>
                          <span>{item.parts.length} part{item.parts.length !== 1 ? "s" : ""}</span>
                          {hasPhotos && (
                            <>
                              <span style={{ color: "#CBD5E1" }}>·</span>
                              <span
                                onClick={(e) => { e.stopPropagation(); setShowPhotos(item.service); }}
                                style={{ color: "#3B82F6", cursor: "pointer", fontWeight: 500 }}
                              >📸 Photos</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                          {formatCurrency(total)}
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="#94A3B8" strokeWidth="2"
                          style={{
                            marginTop: 4,
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <polyline points="6,9 12,15 18,9"/>
                        </svg>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        padding: "0 16px 14px",
                        borderTop: "1px solid #F1F5F9",
                      }}>
                        <p style={{
                          fontSize: 13, color: "#475569", lineHeight: 1.6,
                          margin: "12px 0",
                        }}>{item.description}</p>

                        {item.techNote && (
                          <div style={{
                            background: "#FFFBEB", border: "1px solid #FDE68A",
                            borderRadius: 8, padding: "8px 12px",
                            fontSize: 12, color: "#92400E", marginBottom: 12,
                            display: "flex", gap: 6, alignItems: "flex-start",
                          }}>
                            <span>🔧</span>
                            <span><strong>Tech note:</strong> {item.techNote}</span>
                          </div>
                        )}

                        <div style={{ fontSize: 12, color: "#64748B" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                            <span>Labor ({item.laborHours}h × {formatCurrency(item.laborRate)})</span>
                            <span style={{ fontWeight: 600, color: "#334155" }}>{formatCurrency(item.laborHours * item.laborRate)}</span>
                          </div>
                          {item.parts.map((p, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                              <span>{p.name} {p.qty > 1 ? `×${p.qty}` : ""}</span>
                              <span style={{ fontWeight: 600, color: "#334155" }}>{formatCurrency(p.price * p.qty)}</span>
                            </div>
                          ))}
                          <div style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "8px 0 0", marginTop: 4,
                            borderTop: "1px dashed #E2E8F0",
                            fontWeight: 700, color: "#0F172A", fontSize: 14,
                          }}>
                            <span>Service Total</span>
                            <span>{formatCurrency(total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approve / Decline buttons */}
                    <div style={{
                      display: "flex", borderTop: "1px solid #F1F5F9",
                    }}>
                      <button
                        onClick={() => updateStatus(item.id, item.status === "approved" ? null : "approved")}
                        style={{
                          flex: 1, padding: "11px 0",
                          border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          background: item.status === "approved"
                            ? "linear-gradient(135deg, #10B981, #059669)"
                            : "#FAFBFC",
                          color: item.status === "approved" ? "#fff" : "#059669",
                          borderRight: "1px solid #F1F5F9",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item.status === "approved" ? "✓ Approved" : "Approve"}
                      </button>
                      <button
                        onClick={() => updateStatus(item.id, item.status === "declined" ? null : "declined")}
                        style={{
                          flex: 1, padding: "11px 0",
                          border: "none", cursor: "pointer",
                          fontSize: 13, fontWeight: 600,
                          fontFamily: "'DM Sans', sans-serif",
                          background: item.status === "declined"
                            ? "linear-gradient(135deg, #EF4444, #DC2626)"
                            : "#FAFBFC",
                          color: item.status === "declined" ? "#fff" : "#DC2626",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item.status === "declined" ? "✕ Declined" : "Decline"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Customer note */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "16px 18px",
          marginTop: 20, border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>
            💬 Questions or notes for your advisor
          </div>
          <textarea
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="e.g., Can I get a ride while my car is being worked on? When will it be ready?"
            style={{
              width: "100%", minHeight: 70, padding: 12, borderRadius: 10,
              border: "1.5px solid #E2E8F0", outline: "none", resize: "vertical",
              fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              background: "#FAFBFC", color: "#334155",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Signature section */}
        {allDecided && hasApprovals && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "16px 18px",
            marginTop: 12, border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>
              ✍️ Authorization Signature
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12, lineHeight: 1.5 }}>
              By signing below, I authorize {SHOP_INFO.name} to perform the approved services listed above on my vehicle.
            </div>
            <SignaturePad onSign={setHasSigned} />
          </div>
        )}

        {/* Dual pricing toggle */}
        {hasApprovals && (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "16px 18px",
            marginTop: 12, border: "1px solid #E2E8F0",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Payment Method</span>
              <div style={{
                display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 3,
              }}>
                <button onClick={() => setShowCashPrice(false)} style={{
                  padding: "5px 12px", borderRadius: 6, border: "none",
                  background: !showCashPrice ? "#fff" : "transparent",
                  boxShadow: !showCashPrice ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  color: !showCashPrice ? "#0F172A" : "#64748B",
                  fontFamily: "'DM Sans', sans-serif",
                }}>Card</button>
                <button onClick={() => setShowCashPrice(true)} style={{
                  padding: "5px 12px", borderRadius: 6, border: "none",
                  background: showCashPrice ? "#fff" : "transparent",
                  boxShadow: showCashPrice ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  color: showCashPrice ? "#10B981" : "#64748B",
                  fontFamily: "'DM Sans', sans-serif",
                }}>Cash 💰</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B", marginBottom: 4 }}>
              <span>Approved services ({approvedItems.length})</span>
              <span>{formatCurrency(approvedTotal)}</span>
            </div>
            {showCashPrice && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#10B981", marginBottom: 4 }}>
                <span>Cash discount (−{(cashDiscount * 100).toFixed(1)}%)</span>
                <span>−{formatCurrency(approvedTotal * cashDiscount)}</span>
              </div>
            )}
            {declinedItems.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#F87171", marginBottom: 4 }}>
                <span>Declined ({declinedItems.length})</span>
                <span style={{ textDecoration: "line-through" }}>{formatCurrency(declinedItems.reduce((s, i) => s + getItemTotal(i), 0))}</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              borderTop: "2px solid #0F172A", paddingTop: 10, marginTop: 8,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                {showCashPrice ? "Cash Total" : "Card Total"}
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 24, fontWeight: 700,
                  color: showCashPrice ? "#059669" : "#0F172A",
                  fontFamily: "'Fraunces', serif",
                }}>
                  {formatCurrency(showCashPrice ? cashTotal : approvedTotal)}
                </div>
                {showCashPrice && (
                  <div style={{ fontSize: 11, color: "#10B981", fontWeight: 500 }}>
                    You save {formatCurrency(approvedTotal * cashDiscount)}!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid #E2E8F0",
        padding: "12px 16px 24px",
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {/* Progress bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{
              flex: 1, height: 4, background: "#E2E8F0", borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                width: `${((items.length - pendingItems.length) / items.length) * 100}%`,
                height: "100%",
                background: allDecided ? "#10B981" : "linear-gradient(90deg, #3B82F6, #60A5FA)",
                borderRadius: 2, transition: "width 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>
              {items.length - pendingItems.length}/{items.length} reviewed
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {/* AI Chat button */}
            <button onClick={() => setShowChat(true)} style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
            }}>💬</button>

            {/* Submit button */}
            <button
              onClick={() => canSubmit && setSubmitted(true)}
              disabled={!canSubmit}
              style={{
                flex: 1, padding: "0 20px", height: 48, borderRadius: 12,
                border: "none", cursor: canSubmit ? "pointer" : "default",
                fontSize: 15, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                background: canSubmit
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : "#E2E8F0",
                color: canSubmit ? "#fff" : "#94A3B8",
                boxShadow: canSubmit ? "0 4px 14px rgba(16,185,129,0.35)" : "none",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {!allDecided
                ? `Review ${pendingItems.length} remaining`
                : !hasApprovals
                  ? "Approve at least 1 service"
                  : !hasSigned
                    ? "Sign to authorize"
                    : `Submit — ${formatCurrency(showCashPrice ? cashTotal : approvedTotal)}`
              }
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showChat && <AIChat items={items} onClose={() => setShowChat(false)} />}
      {showPhotos && <PhotoViewer service={showPhotos} onClose={() => setShowPhotos(null)} />}
    </div>
  );
}
