import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  X, 
  Minus, 
  Send, 
  Bot, 
  User,
  Sparkles,
  Loader2
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/help/chat", {
        message,
        conversationHistory: messages.slice(-10)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I couldn't process that. Please try again." 
      }]);
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;
    
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue("");
    chatMutation.mutate(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your AI assistant. I can help you navigate the app, explain features, or answer questions about how to use BrochureTracker. What would you like to know?"
      }]);
    }
  };

  const quickQuestions = [
    "How do I create a proposal?",
    "What is the Statement Analyzer?",
    "How do I track a brochure drop?",
    "Tell me about Sales Spark"
  ];

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        data-testid="button-help-chatbot-open"
        className="fixed top-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI Help"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        data-testid="button-help-chatbot-expand"
        className="fixed top-20 right-4 z-40 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
        aria-label="Expand chat"
      >
        <Bot className="w-5 h-5" />
        <span className="text-sm font-medium">AI Help</span>
        {messages.length > 0 && (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <Card 
      className="fixed top-20 right-4 left-4 sm:left-auto z-40 sm:w-[380px] h-[60vh] max-h-[450px] flex flex-col shadow-2xl border-primary/20"
      data-testid="help-chatbot-panel"
    >
      <div className="flex items-center justify-between p-3 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Help Assistant</h3>
            <p className="text-[10px] text-muted-foreground">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
            data-testid="button-help-chatbot-minimize"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
            data-testid="button-help-chatbot-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {chatMutation.isPending && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-muted">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {messages.length === 1 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputValue(q);
                    setTimeout(() => {
                      setMessages(prev => [...prev, { role: 'user', content: q }]);
                      setInputValue("");
                      chatMutation.mutate(q);
                    }, 100);
                  }}
                  className="text-xs px-2 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  data-testid={`button-quick-question-${idx}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-background">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 text-sm"
            disabled={chatMutation.isPending}
            data-testid="input-help-chatbot-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || chatMutation.isPending}
            data-testid="button-help-chatbot-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
