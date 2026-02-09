/**
 * PCB Auto — AI Help Chat Component
 * 
 * Floating chat panel that provides AI-powered help with
 * tappable navigation links embedded in responses.
 * 
 * Usage:
 *   import { AIHelpChat } from '@/components/AIHelpChat';
 *   // In your App layout:
 *   <AIHelpChat />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { renderAIMessage } from './AIMessageRenderer';
import { useAINavigation } from './useAINavigation';

// ─── Types ───

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

// ─── API Calls ───

async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  shopContext?: Record<string, unknown>
) {
  const res = await fetch('/api/ai-help/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function fetchSuggestions(page: string) {
  const res = await fetch(`/api/ai-help/suggestions?page=${encodeURIComponent(page)}`);
  if (!res.ok) throw new Error('Failed to fetch suggestions');
  return res.json() as Promise<{ suggestions: Suggestion[] }>;
}

// ─── Component ───

export function AIHelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hey! 👋 I'm your AI assistant. Ask me anything about PCB Auto — I can explain features and take you right to them.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [location] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateTo, toast } = useAINavigation();

  // Fetch contextual suggestions based on current page
  const { data: suggestionsData } = useQuery({
    queryKey: ['ai-help-suggestions', location],
    queryFn: () => fetchSuggestions(location),
    staleTime: 60_000,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: ({ message, history }: { message: string; history: ChatMessage[] }) =>
      sendChatMessage(message, history),
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
            "I'm having trouble connecting right now. Try again in a moment, or browse using the navigation menu at the bottom.",
          timestamp: Date.now(),
        },
      ]);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatMutation.isPending]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  // Handle navigation from AI links — close chat first
  const handleNavigate = useCallback(
    (key: string) => {
      setIsOpen(false);
      // Small delay for close animation, then navigate
      setTimeout(() => navigateTo(key), 300);
    },
    [navigateTo]
  );

  // Send message
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

  // Quick prompt
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
      {/* ─── Navigation Toast ─── */}
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
      >
        <span>{toast.icon}</span>
        <span>{toast.message}</span>
      </div>

      {/* ─── Floating Trigger Button ─── */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-24 right-4 z-50 w-14 h-14 rounded-2xl
          bg-gradient-to-br from-purple-500 to-blue-600
          shadow-lg shadow-purple-500/30
          flex items-center justify-center text-2xl
          transition-all duration-300 hover:scale-105 active:scale-95
          ${isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100'}
        `}
        aria-label="Open AI Help"
      >
        🤖
        {/* Online indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </button>

      {/* ─── Chat Overlay ─── */}
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
          if (e.target === e.currentTarget) setIsOpen(false);
        }}
      >
        <div
          className={`
            bg-white rounded-t-[20px] max-h-[82vh] flex flex-col
            shadow-[0_-10px_40px_rgba(0,0,0,0.15)]
            transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          `}
        >
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-base">
                🤖
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900">PCB Auto AI</div>
                <div className="text-xs text-green-500">● Online</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ─── Messages ─── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
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
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-[14px_14px_4px_14px]'
                      : 'bg-slate-100 text-slate-800 rounded-[14px_14px_14px_4px]'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? renderAIMessage(msg.content, handleNavigate)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {chatMutation.isPending && (
              <div className="self-start">
                <div className="bg-slate-100 rounded-[14px_14px_14px_4px] px-5 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Quick Prompts ─── */}
          {suggestions.length > 0 && !chatMutation.isPending && (
            <div className="px-5 py-1.5 flex gap-1.5 overflow-x-auto border-t border-slate-100">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleQuickPrompt(s.text)}
                  className="
                    whitespace-nowrap px-3 py-1.5 rounded-full
                    border border-slate-200 bg-white hover:bg-slate-50
                    hover:border-blue-300 text-slate-600 hover:text-blue-600
                    text-xs font-medium transition-colors flex-shrink-0
                  "
                >
                  <span className="mr-1">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* ─── Input ─── */}
          <div className="flex gap-2 px-5 py-3 pb-6 border-t border-slate-200">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              className="
                flex-1 px-4 py-2.5 rounded-full
                border-[1.5px] border-slate-200 focus:border-blue-500
                outline-none text-sm bg-slate-50 focus:bg-white
                transition-colors
              "
              disabled={chatMutation.isPending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-200
                ${input.trim()
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md cursor-pointer hover:shadow-lg'
                  : 'bg-slate-200 text-slate-400 cursor-default'
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
