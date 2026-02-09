import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";

interface EstimateData {
  repairOrder: any;
  customer: any;
  vehicle: any;
  shop: any;
  lineItems: any[];
}

interface ItemDecision {
  id: number;
  status: "pending" | "approved" | "declined";
  declinedReason?: string;
}

function formatCurrency(val: string | number | null | undefined): string {
  const num = parseFloat(String(val || "0"));
  return "$" + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseNum(val: any): number {
  return parseFloat(String(val || "0"));
}

const typeConfig: Record<string, { label: string; bg: string; border: string; text: string; dot: string; iconColor: string }> = {
  labor: { label: "Labor Services", bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B", dot: "#EF4444", iconColor: "#DC2626" },
  parts: { label: "Parts & Materials", bg: "#FEF3C7", border: "#FCD34D", text: "#92400E", dot: "#F59E0B", iconColor: "#D97706" },
  sublet: { label: "Sublet Services", bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46", dot: "#10B981", iconColor: "#059669" },
  fee: { label: "Shop Supplies & Other", bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF", dot: "#3B82F6", iconColor: "#2563EB" },
};

function WrenchIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ChevronIcon({ down, color }: { down: boolean; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform 0.2s", transform: down ? "rotate(180deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ size = 16, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PhoneIcon({ size = 14, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function AlertTriangleIcon({ size = 14, color = "#DC2626" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SignaturePad({ onSign, canvasRef }: { onSign: (signed: boolean) => void; canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSign(false);
  };

  return (
    <div>
      <div style={{ position: "relative", border: "2px dashed #CBD5E1", borderRadius: 12, background: "#FAFBFC", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          data-testid="canvas-signature"
          style={{ width: "100%", height: 140, touchAction: "none", cursor: "crosshair", display: "block" }}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            Sign here with finger or mouse
          </div>
        )}
      </div>
      {hasSignature && (
        <button data-testid="button-clear-signature" onClick={clearSig} style={{
          marginTop: 8, background: "none", border: "none", color: "#64748B",
          fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          textDecoration: "underline", padding: 0,
        }}>Clear signature</button>
      )}
    </div>
  );
}

function AIChat({ shopName, customerName, onClose }: { shopName: string; customerName: string; onClose: () => void }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi ${customerName}! I'm the AI assistant for ${shopName}. I can help explain any of the recommended services on your estimate, answer questions about pricing, or help you understand what's urgent vs. what can wait. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getResponse = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("brake") || lower.includes("pad") || lower.includes("rotor"))
      return "Great question about the brakes! Brake pads and rotors are safety-critical components. When pads wear below the minimum threshold, metal-on-metal contact can damage the rotors beyond resurfacing, costing significantly more. I'd strongly recommend approving brake work to avoid more expensive repairs down the road. Would you like me to break down the cost further?";
    if (lower.includes("filter") || lower.includes("cabin") || lower.includes("air"))
      return "Air filters are important maintenance items. The cabin filter affects your A/C and heating quality, while the engine filter affects fuel economy and performance. Neither is urgent safety-wise, but they're inexpensive items that prevent bigger issues. If you want to save a bit now, prioritize the engine air filter since it directly impacts fuel efficiency.";
    if (lower.includes("wait") || lower.includes("urgent") || lower.includes("later") || lower.includes("priority") || lower.includes("need"))
      return "Here's my honest assessment:\n\nSafety items (brakes, steering, etc.) should not wait — they affect your ability to stop and control the vehicle safely.\n\nMaintenance items (filters, fluids) can typically wait 1-2 months without risk of damage.\n\nRecommended services (tire rotation, oil change) are flexible but best done within the next few weeks.\n\nIf budget is tight, approve the safety items today and schedule the rest for next month.";
    if (lower.includes("price") || lower.includes("cost") || lower.includes("expensive") || lower.includes("much") || lower.includes("break down") || lower.includes("charge"))
      return `Let me break down the pricing:\n\nThe labor rate shown is competitive for the area. All parts are OEM-spec quality. The estimate shows exactly what you'll pay — parts, labor, and tax.\n\nYou can also toggle between Card Price and Cash Price at the bottom of the estimate to see potential savings when paying with cash. Is there a specific line item you'd like me to explain?`;
    return `That's a great question! Based on the inspection findings, I'd recommend discussing this directly with your service advisor at ${shopName} for the most accurate answer. Would you like me to help clarify anything else about the estimate?`;
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
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #E2E8F0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6 6 6" /></svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", fontFamily: "'DM Sans', sans-serif" }}>AI Service Advisor</div>
              <div style={{ fontSize: 12, color: "#10B981", fontFamily: "'DM Sans', sans-serif" }}>Online now</div>
            </div>
          </div>
          <button data-testid="button-close-chat" onClick={onClose} style={{
            background: "#F1F5F9", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748B",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <XIcon size={14} color="#64748B" />
          </button>
        </div>

        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12, minHeight: 200,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div style={{
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: m.role === "user" ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#F1F5F9",
                color: m.role === "user" ? "#fff" : "#1E293B",
                fontSize: 14, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", whiteSpace: "pre-line",
              }}>{m.text}</div>
            </div>
          ))}
          {isTyping && (
            <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
              <div style={{ padding: "10px 18px", borderRadius: "16px 16px 16px 4px", background: "#F1F5F9", display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%", background: "#94A3B8",
                    animation: `bounceChat 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "8px 20px", display: "flex", gap: 8, overflowX: "auto", borderTop: "1px solid #F1F5F9" }}>
          {["What's urgent?", "Explain the cost", "Can anything wait?", "Cash vs Card pricing"].map((q) => (
            <button key={q} onClick={() => setInput(q)} style={{
              whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 20,
              border: "1px solid #E2E8F0", background: "#FAFBFC", color: "#475569",
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
            }}>{q}</button>
          ))}
        </div>

        <div style={{ padding: "12px 20px 24px", display: "flex", gap: 8, borderTop: "1px solid #E2E8F0" }}>
          <input
            data-testid="input-chat"
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
          <button data-testid="button-send-chat" onClick={send} style={{
            width: 40, height: 40, borderRadius: "50%",
            background: input.trim() ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#E2E8F0",
            border: "none", cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? "#fff" : "#94A3B8"} strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutoPublicApproval() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [decisions, setDecisions] = useState<ItemDecision[]>([]);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [showCashPrice, setShowCashPrice] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchEstimate();
  }, [token]);

  async function fetchEstimate() {
    try {
      setLoading(true);
      const res = await fetch(`/api/auto/public/estimate/${token}`);
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
      const items = result.lineItems || [];
      setDecisions(items.map((item: any) => ({
        id: item.id,
        status: item.approvalStatus === "approved" ? "approved" : item.approvalStatus === "declined" ? "declined" : "pending",
      })));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const getDecision = (id: number) => decisions.find((d) => d.id === id);
  const updateDecision = (id: number, status: "pending" | "approved" | "declined") => {
    setDecisions((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
  };

  const approveAll = () => setDecisions((prev) => prev.map((d) => ({ ...d, status: "approved" as const })));
  const resetAll = () => setDecisions((prev) => prev.map((d) => ({ ...d, status: "pending" as const })));

  const approvedDecisions = decisions.filter((d) => d.status === "approved");
  const declinedDecisions = decisions.filter((d) => d.status === "declined");
  const pendingDecisions = decisions.filter((d) => d.status === "pending");
  const allDecided = pendingDecisions.length === 0;
  const hasApprovals = approvedDecisions.length > 0;

  const getApprovedItems = () => {
    if (!data) return [];
    return data.lineItems.filter((item: any) => {
      const d = getDecision(item.id);
      return d?.status === "approved";
    });
  };

  const getDeclinedItems = () => {
    if (!data) return [];
    return data.lineItems.filter((item: any) => {
      const d = getDecision(item.id);
      return d?.status === "declined";
    });
  };

  const approvedCardTotal = getApprovedItems().reduce((sum: number, i: any) => sum + parseNum(i.totalCard), 0);
  const approvedCashTotal = getApprovedItems().reduce((sum: number, i: any) => sum + parseNum(i.totalCash), 0);
  const declinedCardTotal = getDeclinedItems().reduce((sum: number, i: any) => sum + parseNum(i.totalCard), 0);
  const cashSavings = approvedCardTotal - approvedCashTotal;

  const totalLaborHours = data ? data.lineItems.reduce((sum: number, i: any) => sum + parseNum(i.laborHours), 0) : 0;

  const canSubmit = allDecided && hasApprovals && hasSigned;

  async function handleSubmit() {
    if (!canSubmit || !data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const signatureData = signatureCanvasRef.current?.toDataURL() || "";
      const res = await fetch(`/api/auto/public/estimate/${token}/line-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: decisions.map((d) => ({ id: d.id, approved: d.status === "approved", declinedReason: d.declinedReason })),
          customerNote: customerNote || undefined,
          signatureData: signatureData || undefined,
          customerName: data.customer ? `${data.customer.firstName || ""} ${data.customer.lastName || ""}`.trim() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setSubmitError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{
          width: 40, height: 40, border: "3px solid #E2E8F0", borderTopColor: "#3B82F6",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ marginTop: 16, color: "#64748B", fontSize: 15 }}>Loading your estimate...</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", padding: 32,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#FEE2E2",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
        }}>
          <AlertTriangleIcon size={28} color="#DC2626" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", fontFamily: "'Fraunces', serif", marginBottom: 8 }}>
          Estimate Not Found
        </h2>
        <p style={{ color: "#64748B", fontSize: 15, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
          This estimate link is invalid or has expired. Please contact the shop for assistance.
        </p>
      </div>
    );
  }

  const { repairOrder: ro, customer, vehicle, shop, lineItems } = data;
  const isReadOnly = ["approved", "completed", "invoiced", "in-progress"].includes(ro.status) || !!ro.approvedAt;
  const isActionable = ro.status === "estimate" || ro.status === "declined";

  if (submitted) {
    const approvedCount = approvedDecisions.length;
    const declinedCount = declinedDecisions.length;
    const title = approvedCount > 0 ? "Estimate Approved!" : "Response Submitted!";
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 30%, #fff 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 32, fontFamily: "'DM Sans', sans-serif",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
        <div data-testid="icon-success" style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, #10B981, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24, boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
          animation: "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <CheckIcon size={36} color="#fff" />
        </div>
        <h1 data-testid="text-success-title" style={{
          fontSize: 28, fontWeight: 700, color: "#065F46", marginBottom: 8,
          fontFamily: "'Fraunces', serif",
        }}>{title}</h1>
        <p style={{ color: "#047857", fontSize: 16, textAlign: "center", marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
          Your service advisor has been notified. You'll receive a text when your vehicle is ready.
        </p>
        <div style={{
          background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380,
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #D1FAE5",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: "#64748B", fontSize: 14 }}>Services approved</span>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{approvedCount} of {decisions.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ color: "#64748B", fontSize: 14 }}>Approved total</span>
            <span style={{ fontWeight: 600, color: "#0F172A" }}>{formatCurrency(showCashPrice ? approvedCashTotal : approvedCardTotal)}</span>
          </div>
          {declinedCount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#64748B", fontSize: 14 }}>Declined</span>
              <span style={{ fontWeight: 600, color: "#EF4444" }}>{declinedCount} services</span>
            </div>
          )}
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748B", fontSize: 14 }}>Vehicle</span>
              <span style={{ fontWeight: 500, color: "#0F172A", fontSize: 14 }}>{[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ")}</span>
            </div>
          </div>
        </div>
        {shop?.phone && (
          <a href={`tel:${shop.phone}`} data-testid="link-shop-phone" style={{
            marginTop: 24, display: "flex", alignItems: "center", gap: 8,
            color: "#059669", fontSize: 15, fontWeight: 500, textDecoration: "none",
          }}>
            <PhoneIcon size={16} color="#059669" />
            Call {shop.phone}
          </a>
        )}
        <p style={{ marginTop: 32, color: "#94A3B8", fontSize: 12 }}>Powered by PCB Auto</p>
      </div>
    );
  }

  const groupedItems: { type: string; items: any[] }[] = [];
  const typeOrder = ["labor", "parts", "sublet", "fee"];
  for (const t of typeOrder) {
    const items = lineItems.filter((i: any) => (i.type || "").toLowerCase() === t && !i.isShopSupply);
    if (items.length > 0) groupedItems.push({ type: t, items });
  }
  const shopSupplyItems = lineItems.filter((i: any) => i.isShopSupply);
  if (shopSupplyItems.length > 0) {
    const existing = groupedItems.find((g) => g.type === "fee");
    if (existing) existing.items.push(...shopSupplyItems);
    else groupedItems.push({ type: "fee", items: shopSupplyItems });
  }
  const ungrouped = lineItems.filter((i: any) => !typeOrder.includes((i.type || "").toLowerCase()) && !i.isShopSupply);
  if (ungrouped.length > 0) {
    const existing = groupedItems.find((g) => g.type === "fee");
    if (existing) existing.items.push(...ungrouped);
    else groupedItems.push({ type: "fee", items: ungrouped });
  }

  const totalCard = parseNum(ro.totalCard);
  const totalCash = parseNum(ro.totalCash);
  const taxAmount = parseNum(ro.taxAmount);

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", paddingBottom: 100 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes bounceChat { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Sticky Top Bar */}
      <div data-testid="header-topbar" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(135deg, #0F172A, #1E293B)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          {shop.logoUrl && (
            <img src={shop.logoUrl} alt={shop.name} style={{ height: 32, width: "auto", objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div data-testid="text-shop-name" style={{
              fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: "#fff",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{shop.name}</div>
            {shop.phone && (
              <a href={`tel:${shop.phone}`} style={{ color: "#94A3B8", fontSize: 12, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                <PhoneIcon size={10} color="#94A3B8" />
                {shop.phone}
              </a>
            )}
          </div>
        </div>
        <div style={{
          background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 6, padding: "4px 10px", color: "#60A5FA",
          fontSize: 11, fontWeight: 700, letterSpacing: 1, flexShrink: 0,
        }}>ESTIMATE</div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" }}>

        {/* Read-Only Status Banner */}
        {isReadOnly && (
          <div data-testid="text-approval-status" style={{
            background: ro.status === "approved" || ro.approvedAt
              ? "linear-gradient(135deg, #059669, #047857)"
              : "linear-gradient(135deg, #3B82F6, #2563EB)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12, color: "#fff",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <CheckIcon size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {ro.status === "approved" || ro.approvedAt ? "Estimate Approved" :
                  ro.status === "completed" ? "Work Completed" :
                    ro.status === "invoiced" ? "Invoiced" : "In Progress"}
              </div>
              {ro.approvedAt && (
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                  {new Date(ro.approvedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  {ro.approvedBy ? ` by ${ro.approvedBy}` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle Info Card */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 data-testid="text-vehicle-info" style={{
                fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 20, color: "#0F172A",
                margin: 0, lineHeight: 1.3,
              }}>
                {[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(" ")}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
                {vehicle?.color && (
                  <span style={{ fontSize: 13, color: "#64748B" }}>{vehicle.color}</span>
                )}
                {vehicle?.mileageIn && (
                  <span style={{ fontSize: 13, color: "#64748B" }}>{parseNum(vehicle.mileageIn).toLocaleString()} mi</span>
                )}
              </div>
            </div>
            {vehicle?.licensePlate && (
              <div style={{
                background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 6,
                padding: "4px 10px", fontFamily: "monospace", fontSize: 13, fontWeight: 600,
                color: "#334155", whiteSpace: "nowrap", flexShrink: 0,
              }}>{vehicle.licensePlate}</div>
            )}
          </div>
          {vehicle?.vin && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5 }}>VIN</span>
              <span style={{ fontSize: 13, color: "#64748B", fontFamily: "monospace" }}>{vehicle.vin}</span>
            </div>
          )}
          {ro.customerConcern && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>CUSTOMER CONCERN</div>
              <p style={{ fontSize: 14, color: "#334155", margin: 0, lineHeight: 1.5 }}>{ro.customerConcern}</p>
            </div>
          )}
        </div>

        {/* Summary Banner */}
        <div style={{
          background: "linear-gradient(135deg, #1E293B, #0F172A)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>Total Estimate</div>
            <div data-testid="text-estimate-total" style={{
              fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: "#fff", lineHeight: 1.2,
            }}>{formatCurrency(showCashPrice ? totalCash : totalCard)}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
              {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
              {totalLaborHours > 0 ? ` \u00B7 ${totalLaborHours.toFixed(1)} labor hrs` : ""}
            </div>
          </div>
          {!ro.hideCashDiscount && totalCard > totalCash && (
            <div style={{
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 8, padding: "6px 12px", textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 500 }}>Cash Price Savings</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#10B981" }}>{formatCurrency(totalCard - totalCash)}</div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {isActionable && !isReadOnly && (
          <div data-testid="section-quick-actions" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button data-testid="button-approve-all" onClick={approveAll} style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              background: "linear-gradient(135deg, #10B981, #059669)",
              border: "none", color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <CheckIcon size={16} color="#fff" /> Approve All
            </button>
            <button data-testid="button-reset-all" onClick={resetAll} style={{
              flex: 1, padding: "10px 16px", borderRadius: 10,
              background: "#fff", border: "1px solid #E2E8F0",
              color: "#475569", fontWeight: 600, fontSize: 14,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              Reset All
            </button>
          </div>
        )}

        {/* Line Item Sections */}
        {groupedItems.map((group) => {
          const config = typeConfig[group.type] || typeConfig.fee;
          return (
            <div key={group.type} style={{ marginBottom: 16 }}>
              <div style={{
                background: config.bg, border: `1px solid ${config.border}`,
                borderRadius: "10px 10px 0 0", padding: "8px 16px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.dot }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: config.text, letterSpacing: 0.3 }}>{config.label}</span>
                <span style={{ fontSize: 12, color: config.text, opacity: 0.7, marginLeft: "auto" }}>{group.items.length} item{group.items.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ background: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #E2E8F0", borderTop: "none", overflow: "hidden" }}>
                {group.items.map((item: any, idx: number) => {
                  const decision = getDecision(item.id);
                  const isExpanded = expandedItem === item.id;
                  const price = showCashPrice ? parseNum(item.totalCash) : parseNum(item.totalCard);
                  const unitPrice = showCashPrice ? parseNum(item.unitPriceCash) : parseNum(item.unitPriceCard);
                  const isApproved = decision?.status === "approved";
                  const isDeclined = decision?.status === "declined";

                  return (
                    <div key={item.id} data-testid={`card-line-item-${item.id}`} style={{
                      borderTop: idx > 0 ? "1px solid #F1F5F9" : "none",
                    }}>
                      <div
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        style={{
                          padding: "12px 16px", cursor: "pointer",
                          display: "flex", alignItems: "flex-start", gap: 10,
                          background: isApproved ? "rgba(16,185,129,0.04)" : isDeclined ? "rgba(239,68,68,0.04)" : "transparent",
                          transition: "background 0.2s",
                        }}
                      >
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", background: config.dot,
                          marginTop: 6, flexShrink: 0,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A", lineHeight: 1.4 }}>
                            {item.description}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                            {parseNum(item.laborHours) > 0 && (
                              <span style={{ fontSize: 12, color: "#64748B" }}>{parseNum(item.laborHours).toFixed(1)} hrs</span>
                            )}
                            {item.partNumber && (
                              <span style={{ fontSize: 12, color: "#64748B" }}>#{item.partNumber}</span>
                            )}
                            {item.isNtnf && (
                              <span style={{
                                fontSize: 10, fontWeight: 600, color: "#F59E0B", background: "#FEF3C7",
                                padding: "1px 6px", borderRadius: 4, letterSpacing: 0.5,
                              }}>NTNF</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{formatCurrency(price)}</div>
                          {!ro.hideCashDiscount && parseNum(item.totalCard) > parseNum(item.totalCash) && showCashPrice && (
                            <div style={{ fontSize: 11, color: "#10B981", fontWeight: 500 }}>Save {formatCurrency(parseNum(item.totalCard) - parseNum(item.totalCash))}</div>
                          )}
                        </div>
                        <ChevronIcon down={isExpanded} color="#94A3B8" />
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{ padding: "0 16px 12px 34px", fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                          {parseNum(item.laborHours) > 0 && parseNum(item.laborRate) > 0 && (
                            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                              <span>Labor: {parseNum(item.laborHours).toFixed(1)} hrs x {formatCurrency(item.laborRate)}/hr</span>
                              <span style={{ fontWeight: 500, color: "#334155" }}>{formatCurrency(parseNum(item.laborHours) * parseNum(item.laborRate))}</span>
                            </div>
                          )}
                          {parseNum(item.quantity) > 0 && unitPrice > 0 && (!parseNum(item.laborHours) || parseNum(item.laborHours) === 0) && (
                            <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                              <span>{parseNum(item.quantity)} x {formatCurrency(unitPrice)}</span>
                              <span style={{ fontWeight: 500, color: "#334155" }}>{formatCurrency(price)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Approve/Decline Buttons */}
                      {isActionable && !isReadOnly && (
                        <div style={{ padding: "0 16px 12px", display: "flex", gap: 8 }}>
                          <button
                            data-testid={`button-approve-item-${item.id}`}
                            onClick={() => updateDecision(item.id, isApproved ? "pending" : "approved")}
                            style={{
                              flex: 1, padding: "8px 12px", borderRadius: 8, border: "none",
                              background: isApproved ? "linear-gradient(135deg, #10B981, #059669)" : "#F1F5F9",
                              color: isApproved ? "#fff" : "#64748B",
                              fontWeight: 600, fontSize: 13, cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              transition: "all 0.2s",
                            }}
                          >
                            {isApproved && <CheckIcon size={14} color="#fff" />}
                            {isApproved ? "Approved" : "Approve"}
                          </button>
                          <button
                            data-testid={`button-decline-item-${item.id}`}
                            onClick={() => updateDecision(item.id, isDeclined ? "pending" : "declined")}
                            style={{
                              flex: 1, padding: "8px 12px", borderRadius: 8, border: "none",
                              background: isDeclined ? "linear-gradient(135deg, #EF4444, #DC2626)" : "#F1F5F9",
                              color: isDeclined ? "#fff" : "#64748B",
                              fontWeight: 600, fontSize: 13, cursor: "pointer",
                              fontFamily: "'DM Sans', sans-serif",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                              transition: "all 0.2s",
                            }}
                          >
                            {isDeclined && <XIcon size={14} color="#fff" />}
                            {isDeclined ? "Declined" : "Decline"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Customer Notes */}
        {isActionable && !isReadOnly && (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>Notes or Questions</div>
            <textarea
              data-testid="input-customer-note"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g., Can I get a ride while my car is being worked on?"
              rows={3}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #E2E8F0", outline: "none", fontSize: 14,
                fontFamily: "'DM Sans', sans-serif", resize: "vertical",
                background: "#FAFBFC", color: "#334155",
              }}
            />
          </div>
        )}

        {/* Signature Section */}
        {isActionable && !isReadOnly && allDecided && hasApprovals && (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>Authorization Signature</div>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 12, lineHeight: 1.5, marginTop: 0 }}>
              By signing below, I authorize {shop.name} to perform the approved services listed above.
            </p>
            <SignaturePad onSign={setHasSigned} canvasRef={signatureCanvasRef} />
          </div>
        )}

        {/* Dual Pricing Section */}
        {hasApprovals && (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "16px 20px", marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Price Summary</div>
              {!ro.hideCashDiscount && (
                <div data-testid="toggle-pricing" style={{
                  display: "flex", alignItems: "center", background: "#F1F5F9",
                  borderRadius: 20, padding: 3, cursor: "pointer", userSelect: "none",
                }} onClick={() => setShowCashPrice(!showCashPrice)}>
                  <div style={{
                    padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                    background: !showCashPrice ? "#3B82F6" : "transparent",
                    color: !showCashPrice ? "#fff" : "#64748B",
                    transition: "all 0.2s",
                  }}>Card Price</div>
                  <div style={{
                    padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                    background: showCashPrice ? "#10B981" : "transparent",
                    color: showCashPrice ? "#fff" : "#64748B",
                    transition: "all 0.2s",
                  }}>Cash Price</div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#64748B", fontSize: 14 }}>Approved ({approvedDecisions.length} services)</span>
              <span style={{ fontWeight: 600, color: "#0F172A", fontSize: 14 }}>
                {formatCurrency(showCashPrice ? approvedCashTotal : approvedCardTotal)}
              </span>
            </div>

            {declinedDecisions.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#94A3B8", fontSize: 14, textDecoration: "line-through" }}>
                  Declined ({declinedDecisions.length})
                </span>
                <span style={{ color: "#94A3B8", fontSize: 14, textDecoration: "line-through" }}>
                  {formatCurrency(showCashPrice
                    ? getDeclinedItems().reduce((s: number, i: any) => s + parseNum(i.totalCash), 0)
                    : declinedCardTotal
                  )}
                </span>
              </div>
            )}

            {taxAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748B", fontSize: 14 }}>Tax</span>
                <span style={{ color: "#334155", fontSize: 14 }}>{formatCurrency(taxAmount)}</span>
              </div>
            )}

            <div style={{
              borderTop: "2px solid #E2E8F0", paddingTop: 12, marginTop: 4,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
                {showCashPrice ? "Cash Total" : "Card Total"}
              </span>
              <span style={{ fontWeight: 700, fontSize: 20, color: "#0F172A", fontFamily: "'Fraunces', serif" }}>
                {formatCurrency(showCashPrice ? approvedCashTotal : approvedCardTotal)}
              </span>
            </div>

            {showCashPrice && cashSavings > 0 && (
              <div style={{
                marginTop: 8, background: "rgba(16,185,129,0.08)", borderRadius: 8,
                padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <CheckIcon size={14} color="#10B981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
                  You save {formatCurrency(cashSavings)} with Cash Price
                </span>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div style={{
            background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 10,
            padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#991B1B",
          }}>{submitError}</div>
        )}

        <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, paddingBottom: 8 }}>Powered by PCB Auto</p>
      </div>

      {/* AI Chat Button */}
      {isActionable && !isReadOnly && (
        <button
          data-testid="button-open-chat"
          onClick={() => setShowChat(true)}
          style={{
            position: "fixed", bottom: 90, right: 16, zIndex: 50,
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            border: "none", cursor: "pointer",
            boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {showChat && (
        <AIChat
          shopName={shop.name || "the shop"}
          customerName={customer?.firstName || "there"}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Sticky Bottom Bar */}
      {isActionable && !isReadOnly && (
        <div data-testid="section-bottom-bar" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
          background: "#fff", borderTop: "1px solid #E2E8F0",
          padding: "10px 16px", boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>
                {decisions.length - pendingDecisions.length} of {decisions.length} items decided
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: allDecided ? "#10B981" : "#F59E0B" }}>
                {allDecided ? "All decided" : `${pendingDecisions.length} remaining`}
              </span>
            </div>
            <div style={{
              height: 4, borderRadius: 2, background: "#E2E8F0", marginBottom: 10, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: allDecided ? "#10B981" : "#3B82F6",
                width: `${((decisions.length - pendingDecisions.length) / Math.max(decisions.length, 1)) * 100}%`,
                transition: "width 0.3s ease",
              }} />
            </div>
            <button
              data-testid="button-submit"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              style={{
                width: "100%", padding: "12px 20px", borderRadius: 10, border: "none",
                fontWeight: 700, fontSize: 15, cursor: canSubmit && !submitting ? "pointer" : "default",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: canSubmit
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : !allDecided
                    ? "#E2E8F0"
                    : !hasSigned
                      ? "#3B82F6"
                      : "#E2E8F0",
                color: canSubmit ? "#fff" : !allDecided ? "#94A3B8" : !hasSigned ? "#fff" : "#94A3B8",
                opacity: submitting ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                    borderRadius: "50%", animation: "spin 0.8s linear infinite",
                  }} />
                  Submitting...
                </>
              ) : !allDecided ? (
                `Review ${pendingDecisions.length} remaining item${pendingDecisions.length !== 1 ? "s" : ""}`
              ) : !hasSigned ? (
                "Sign to authorize"
              ) : (
                <>
                  <CheckIcon size={16} color="#fff" />
                  Submit Approval ({approvedDecisions.length} approved)
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
