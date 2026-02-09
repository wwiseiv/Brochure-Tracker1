import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useAutoAssistant } from "./AutoAssistantProvider";
import { useLocation } from "wouter";
import { Sparkles, X, Send, Mic, MicOff, Volume2, VolumeX, Square, Trash2, ArrowRight } from "lucide-react";
import { useAutoAuth } from "@/hooks/use-auto-auth";

const QUICK_ACTIONS: Record<string, string[]> = {
  "dashboard": ["What do my stats mean?", "How do I create an RO?", "Show me around"],
  "repair-orders": ["How do I create an RO?", "What do the columns mean?", "How do I search?"],
  "ro-detail": ["How do I add parts?", "Send this estimate", "How does dual pricing work?"],
  "inspections": ["Walk me through an inspection", "How do photos work?", "What does Watch mean?"],
  "scheduling": ["Add an appointment", "How do bays work?", "Can I drag to reschedule?"],
  "customers": ["Add a customer", "Look up service history", "Add a vehicle"],
  "settings": ["Set up dual pricing", "Add an employee", "Configure tax rates"],
  "reports": ["What reports are available?", "Daily revenue", "What is fees saved?"],
  "invoice": ["How does cash vs card work?", "How do I email a receipt?", "How do I process a refund?"],
  "staff": ["How do I add an employee?", "How do pay rates work?", "How do I set a PIN?"],
  "default": ["How do I create an RO?", "Walk me through an inspection", "How does dual pricing work?"],
};

const PAGE_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "repair-orders": "Repair Orders",
  "ro-detail": "Repair Order",
  "inspections": "Inspections",
  "scheduling": "Scheduling",
  "customers": "Customers",
  "settings": "Settings",
  "reports": "Reports",
  "invoice": "Invoice",
  "staff": "Staff",
  "unknown": "PCB Auto",
};

const NAV_TARGETS: Record<string, { label: string; route: string; highlightId?: string; toast?: string }> = {
  "revenue": { label: "Revenue", route: "/auto/dashboard", highlightId: "stat-revenue", toast: "Revenue (Month)" },
  "open-ros": { label: "Open ROs", route: "/auto/dashboard", highlightId: "stat-open-ros", toast: "Open Repair Orders" },
  "total-customers": { label: "Total Customers", route: "/auto/dashboard", highlightId: "stat-total-customers", toast: "Total Customers" },
  "appointments": { label: "Today's Appointments", route: "/auto/dashboard", highlightId: "stat-appointments", toast: "Today's Appointments" },
  "fees-saved": { label: "Fees Saved", route: "/auto/dashboard", highlightId: "card-dual-pricing-widget", toast: "Dual Pricing Savings" },
  "work-orders": { label: "Work Orders", route: "/auto/repair-orders", toast: "Work Orders" },
  "estimates": { label: "Estimates", route: "/auto/repair-orders", toast: "Estimates" },
  "customers": { label: "Customers", route: "/auto/customers", toast: "Customer Management" },
  "vehicles": { label: "Vehicles", route: "/auto/customers", toast: "Vehicle Records" },
  "schedule": { label: "Schedule", route: "/auto/schedule", toast: "Today's Schedule" },
  "inspections": { label: "Inspections (DVI)", route: "/auto/inspections", toast: "Digital Vehicle Inspections" },
  "invoices": { label: "Invoices", route: "/auto/repair-orders", toast: "Invoices" },
  "parts": { label: "Parts", route: "/auto/repair-orders", toast: "Parts Ordering" },
  "reports": { label: "Reports", route: "/auto/reports", toast: "Reports & Analytics" },
  "report-cash-card": { label: "Cash vs Card Report", route: "/auto/reports", toast: "Cash vs Card Report" },
  "report-revenue": { label: "Revenue Report", route: "/auto/reports", toast: "Revenue Report" },
  "report-tech": { label: "Tech Productivity", route: "/auto/reports", toast: "Tech Productivity" },
  "report-customers": { label: "Customer Report", route: "/auto/reports", toast: "Customer Report" },
  "settings": { label: "Settings", route: "/auto/settings", toast: "Shop Settings" },
  "settings-dual-pricing": { label: "Dual Pricing Settings", route: "/auto/settings", toast: "Dual Pricing Configuration" },
  "settings-staff": { label: "Staff Management", route: "/auto/staff", toast: "Staff & Roles" },
  "settings-quickbooks": { label: "QuickBooks", route: "/auto/quickbooks", toast: "QuickBooks Integration" },
  "new-ro": { label: "New Work Order", route: "/auto/repair-orders/new", toast: "Create New Work Order" },
  "payment-processor": { label: "Payment Processor", route: "/auto/processor", toast: "Payment Processor Setup" },
};

function getPageKey(): string {
  const path = window.location.pathname;
  if (path.includes("/auto/repair-orders/") && !path.endsWith("/new")) return "ro-detail";
  if (path.includes("/auto/repair-orders")) return "repair-orders";
  if (path.includes("/auto/inspection")) return "inspections";
  if (path.includes("/auto/schedule")) return "scheduling";
  if (path.includes("/auto/customer")) return "customers";
  if (path.includes("/auto/report")) return "reports";
  if (path.includes("/auto/setting")) return "settings";
  if (path.includes("/auto/staff")) return "staff";
  if (path.includes("/auto/invoice")) return "invoice";
  if (path.includes("/auto/dashboard") || path === "/auto") return "dashboard";
  return "unknown";
}

function useDictation(onResult?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const SpeechRecognitionApi = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;
  const isSupported = !!SpeechRecognitionApi;

  useEffect(() => {
    const SpeechRecognition = SpeechRecognitionApi;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        setInterimTranscript(interim);
        if (final) {
          onResult?.(final);
          setInterimTranscript("");
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };

      recognitionRef.current = recognition;
    }
  }, [onResult]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch { /* already started */ }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimTranscript,
    isSupported,
    toggleListening,
    stopListening,
  };
}

function useReadAloud() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { token } = useAutoAuth();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const play = useCallback(async (messageId: string, text: string) => {
    if (playingId === messageId) {
      stop();
      return;
    }

    stop();

    try {
      const res = await fetch("/api/auto/assistant/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(messageId);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlayingId(null);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPlayingId(null);
      };

      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }, [playingId, stop, token]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { playingId, play, stop };
}

function FloatingButton() {
  const { toggle, isOpen } = useAutoAssistant();

  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className="fixed right-4 z-[9990] flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95"
      style={{
        width: 56,
        height: 56,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      }}
      data-testid="button-auto-assistant"
    >
      <Sparkles className="h-6 w-6" />
      <style>{`
        @media (max-width: 639px) {
          [data-testid="button-auto-assistant"] {
            bottom: 64px !important;
          }
        }
      `}</style>
    </button>
  );
}

function renderAssistantContent(content: string, onNavigate: (key: string) => void): ReactNode {
  const nodes: ReactNode[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      nodes.push(<br key={`br-${lineIdx}`} />);
    }

    const tokenPattern = /(\*{0,2}\[\[nav:([a-z0-9-]+)\]\]\*{0,2}|\*\*(.+?)\*\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`t-${lineIdx}-${lastIndex}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }

      if (match[2]) {
        const navKey = match[2];
        const target = NAV_TARGETS[navKey];
        if (target) {
          nodes.push(
            <button
              key={`nav-${lineIdx}-${match.index}`}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(navKey);
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-blue-600 dark:text-blue-400 font-semibold text-[13px] leading-tight bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 active:bg-blue-200 dark:active:bg-blue-700/50 border-b-[1.5px] border-blue-300 dark:border-blue-600 hover:border-blue-500 rounded transition-all duration-150 cursor-pointer whitespace-nowrap"
              title={`Go to ${target.label}`}
              data-testid={`navlink-${navKey}`}
            >
              <ArrowRight className="h-3 w-3 shrink-0 opacity-70" />
              {target.label}
            </button>
          );
        } else {
          nodes.push(
            <span key={`u-${lineIdx}-${match.index}`} className="text-muted-foreground">[{navKey}]</span>
          );
        }
      } else if (match[3]) {
        nodes.push(
          <strong key={`b-${lineIdx}-${match.index}`} className="font-semibold">
            {match[3]}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      nodes.push(
        <span key={`t-${lineIdx}-end`}>
          {line.slice(lastIndex)}
        </span>
      );
    }
  });

  return <>{nodes}</>;
}

function ChatPanel() {
  const { isOpen, close, messages, sendMessage, isLoading, clearMessages } = useAutoAssistant();
  const [input, setInput] = useState("");
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageKey = getPageKey();
  const quickActions = QUICK_ACTIONS[pageKey] || QUICK_ACTIONS["default"];
  const pageLabel = PAGE_LABELS[pageKey] || "PCB Auto";

  const { playingId, play } = useReadAloud();

  const handleNavigation = useCallback((navKey: string) => {
    const target = NAV_TARGETS[navKey];
    if (!target) return;
    close();
    setTimeout(() => {
      setLocation(target.route);
      if (target.highlightId) {
        setTimeout(() => {
          const el = document.getElementById(target.highlightId!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ai-nav-highlight');
            setTimeout(() => el.classList.remove('ai-nav-highlight'), 2500);
          }
        }, 400);
      }
    }, 300);
  }, [close, setLocation]);

  const handleDictationResult = useCallback((text: string) => {
    setInput(prev => prev + (prev ? " " : "") + text);
  }, []);

  const dictation = useDictation(handleDictationResult);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    dictation.stopListening();
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[9988] bg-black/40"
          onClick={close}
          data-testid="assistant-backdrop"
        />
      )}

      <div
        className={`fixed z-[9990] flex flex-col bg-background border shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          borderRadius: "12px",
        }}
        data-testid="panel-auto-assistant"
      >
        <style>{`
          [data-testid="panel-auto-assistant"] {
            right: 16px;
            bottom: 80px;
            width: 400px;
            height: 560px;
          }
          @media (max-width: 639px) {
            [data-testid="panel-auto-assistant"] {
              right: 0 !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 85vh !important;
              border-radius: 12px 12px 0 0 !important;
            }
          }
          @keyframes bounce-dot {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
          @keyframes pulse-mic {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
            50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          }
        `}</style>

        <div
          className="flex items-center justify-between gap-2 px-4 py-3 text-white shrink-0"
          style={{ backgroundColor: "#111827" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">PCB Auto Assistant</p>
              <p className="text-xs opacity-70 truncate">{pageLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearMessages(); }}
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                data-testid="button-clear-chat"
                aria-label="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); close(); }}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              data-testid="button-close-assistant"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-6 pb-4 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Hi there! How can I help?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask me anything about {pageLabel}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="px-3 py-1.5 text-xs rounded-full border bg-background text-foreground hover-elevate transition-colors"
                    data-testid={`chip-${action.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gray-800 text-white dark:bg-gray-700"
                      : "bg-muted text-foreground"
                  }`}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  {msg.role === "assistant" ? (
                    <div className="text-sm leading-relaxed">
                      {renderAssistantContent(msg.content, handleNavigation)}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => play(msg.id, msg.content)}
                    className="flex items-center gap-1 mt-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded"
                    data-testid={`button-tts-${msg.id}`}
                  >
                    {playingId === msg.id ? (
                      <>
                        <VolumeX className="h-3 w-3" />
                        <span>Playing...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-2 h-2 rounded-full bg-muted-foreground/50"
                    style={{
                      animation: `bounce-dot 1.4s infinite ease-in-out both`,
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t bg-background">
          {dictation.interimTranscript && (
            <div className="px-4 py-1.5 text-xs text-muted-foreground bg-muted/50 border-b flex items-center gap-2">
              <Mic className="h-3 w-3 text-red-500 shrink-0" />
              <span className="truncate italic">{dictation.interimTranscript}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            {dictation.isSupported && (
              <button
                onClick={dictation.toggleListening}
                className={`p-2 rounded-full shrink-0 transition-colors ${
                  dictation.isListening
                    ? "bg-red-500 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={dictation.isListening ? { animation: "pulse-mic 1.5s ease-in-out infinite" } : {}}
                data-testid="button-mic"
              >
                {dictation.isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground border rounded-md px-3 py-2 transition-colors ${
                dictation.isListening ? "border-red-500" : "border-input"
              }`}
              data-testid="input-assistant-message"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-full shrink-0 bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function AutoAssistantChat() {
  return (
    <>
      <FloatingButton />
      <ChatPanel />
    </>
  );
}
