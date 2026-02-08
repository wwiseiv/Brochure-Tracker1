import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AssistantContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  clearMessages: () => void;
}

const AssistantCtx = createContext<AssistantContextType | null>(null);
export const useAutoAssistant = () => useContext(AssistantCtx)!;

function getPageName(path: string): string {
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

export function AutoAssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(`sess_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [location] = useLocation();
  const { user, shop, token } = useAutoAuth();

  const gatherContext = useCallback(() => {
    const path = window.location.pathname;
    const pageName = getPageName(path);

    const ctx: Record<string, unknown> = {
      currentPage: pageName,
      currentUrl: path,
      shopName: shop?.name || "Unknown",
      userRole: user?.role || "unknown",
      userName: user?.firstName || "there",
      dualPricingEnabled: parseFloat(shop?.cardFeePercent || "0") > 0,
      dualPricingRate: (parseFloat(shop?.cardFeePercent || "0") * 100).toFixed(2),
      hasEmployees: true,
      hasBays: true,
    };

    if (pageName === "ro-detail") {
      const roMatch = path.match(/\/auto\/repair-orders\/(\d+)/);
      if (roMatch) {
        ctx.roId = roMatch[1];
      }
    }

    return ctx;
  }, [shop, user]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const context = gatherContext();
      const res = await fetch("/api/auto/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          context,
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: `msg_${Date.now()}_reply`,
        role: "assistant",
        content: data.message || "Sorry, I couldn't process that. Try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [gatherContext, token]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }, []);

  return (
    <AssistantCtx.Provider value={{
      isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false),
      toggle: () => setIsOpen(o => !o), messages, sendMessage, isLoading, clearMessages,
    }}>
      {children}
    </AssistantCtx.Provider>
  );
}
