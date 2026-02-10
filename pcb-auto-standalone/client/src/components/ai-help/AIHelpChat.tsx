import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { renderAIMessage } from './AIMessageRenderer';
import { useAINavigation } from './useAINavigation';
import { useAutoAuth } from '@/hooks/use-auto-auth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Suggestion {
  text: string;
  icon: string;
}

function getAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  token?: string | null,
  shopContext?: Record<string, unknown>
) {
  const res = await fetch('/api/ai-help/chat', {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      message,
      history: history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      shopContext,
    }),
  });
  if (!res.ok) throw new Error('Chat request failed');
  return res.json() as Promise<{ response: string }>;
}

async function fetchSuggestions(page: string, token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/ai-help/suggestions?page=${encodeURIComponent(page)}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  return res.json() as Promise<{ suggestions: Suggestion[] }>;
}

interface AIHelpChatProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIHelpChat({ isOpen, onOpenChange }: AIHelpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your PCB Auto help assistant. Ask me anything about the app -- I can explain features and take you right to them.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [location] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo, toast } = useAINavigation();
  const { token } = useAutoAuth();

  const { data: suggestionsData } = useQuery({
    queryKey: ['ai-help-suggestions', location],
    queryFn: () => fetchSuggestions(location, token),
    staleTime: 60_000,
  });

  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
      sendChatMessage(message, history, token),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm having trouble connecting right now. Try again in a moment, or browse using the navigation menu.",
          timestamp: Date.now(),
        },
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const handleNavigate = useCallback(
    (key: string) => {
      onOpenChange(false);
      setTimeout(() => navigateTo(key), 300);
    },
    [navigateTo]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    chatMutation.mutate({ message: text, history: [...messages, userMsg] });
  }, [input, messages, chatMutation]);

  const handleQuickPrompt = useCallback(
    (text: string) => {
      setInput('');
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      chatMutation.mutate({ message: text, history: [...messages, userMsg] });
    },
    [messages, chatMutation]
  );

  const suggestions = suggestionsData?.suggestions || [];

  return (
    <>
      {/* Navigation Toast */}
      <div
        className={`
          fixed top-16 left-1/2 -translate-x-1/2 z-[2000]
          bg-slate-900 text-white px-5 py-2.5 rounded-xl
          text-sm font-medium shadow-2xl
          flex items-center gap-2 max-w-sm
          transition-all duration-300
          ${toast.visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-3 pointer-events-none'
          }
        `}
        data-testid="ai-help-toast"
      >
        {toast.icon && <span>{toast.icon}</span>}
        <span>{toast.message}</span>
      </div>

      {/* Chat Overlay */}
      <div
        className={`
          fixed inset-0 z-[1000] flex flex-col justify-end
          transition-all duration-300
          ${isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          }
        `}
        style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onOpenChange(false);
        }}
      >
        <div
          data-testid="ai-help-panel"
          className={`
            bg-white dark:bg-slate-900 rounded-t-[20px] max-h-[82vh] sm:max-h-[82vh] flex flex-col
            shadow-[0_-10px_40px_rgba(0,0,0,0.15)]
            transition-transform duration-300
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          `}
          style={{ maxHeight: 'min(82vh, 100dvh)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-1 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">PCB Auto Help</div>
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm transition-colors"
              data-testid="button-close-ai-help"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[88%] animate-[msgIn_0.25s_ease] ${
                  msg.role === 'user' ? 'self-end' : 'self-start'
                }`}
              >
                <div
                  className={`px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[14px_14px_4px_14px]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-[14px_14px_14px_4px]'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? renderAIMessage(msg.content, handleNavigate)
                    : msg.content}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="self-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-[14px_14px_14px_4px] px-5 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {suggestions.length > 0 && !chatMutation.isPending && (
            <div className="px-5 py-1.5 flex gap-1.5 overflow-x-auto border-t border-slate-100 dark:border-slate-800">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleQuickPrompt(s.text)}
                  data-testid={`suggestion-${s.text.slice(0, 20).replace(/\s/g, '-').toLowerCase()}`}
                  className="
                    whitespace-nowrap px-3 py-1.5 rounded-full
                    border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700
                    hover:border-indigo-300 text-slate-600 dark:text-slate-300 hover:text-indigo-600
                    text-xs font-medium transition-colors flex-shrink-0
                  "
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="flex gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              data-testid="input-ai-help"
              className="
                flex-1 px-4 py-2.5 rounded-full
                border-[1.5px] border-slate-200 dark:border-slate-700 focus:border-indigo-500
                outline-none text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700
                dark:text-slate-200
                transition-colors
              "
              disabled={chatMutation.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              data-testid="button-send-ai-help"
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-200
                ${input.trim()
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md cursor-pointer hover:shadow-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-default'
                }
              `}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
