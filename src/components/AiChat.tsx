'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Minimize2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m CodeBot, the AI assistant for CodeHost. How can I help you? 😊',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Collapsed by default on all devices, click the circle to open

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input field
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chatMessages = [...messages.filter((m) => m.id !== 'welcome'), userMsg].map(
        (m) => ({ role: m.role, content: m.content })
      );

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatMessages }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.error || 'Network error, please try again later.',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Network error, please try again later. For help, contact info@hapince.site',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Circle button (collapsed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-foreground text-background flex items-center justify-center shadow-lg hover:opacity-90 transition-all duration-200"
        style={{ borderRadius: '50%' }}
        title="AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  // Dialog (expanded state)
  return (
    <div
      className={`fixed z-50 bg-white border-2 border-foreground shadow-2xl flex flex-col ${
        isMobile
          ? 'inset-0'
          : 'bottom-6 right-6 w-[380px] h-[520px]'
      }`}
      style={isMobile ? {} : { borderRadius: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-foreground bg-foreground text-background">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <span className="font-display text-lg">CodeBot AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {!isMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:opacity-70 transition-opacity"
              title="Minimize"
            >
              <Minimize2 size={16} />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:opacity-70 transition-opacity"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 shrink-0 flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-muted border border-foreground'
              }`}
              style={{ borderRadius: '50%' }}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`max-w-[75%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-foreground text-background'
                  : 'bg-muted border border-border-light'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div
              className="w-7 h-7 shrink-0 flex items-center justify-center bg-muted border border-foreground"
              style={{ borderRadius: '50%' }}
            >
              <Bot size={14} />
            </div>
            <div className="bg-muted border border-border-light px-3 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground animate-bounce" style={{ borderRadius: '50%', animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground animate-bounce" style={{ borderRadius: '50%', animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground animate-bounce" style={{ borderRadius: '50%', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t-2 border-foreground p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            rows={1}
            className="flex-1 resize-none border-2 border-foreground px-3 py-2 text-sm font-mono focus:outline-none bg-white"
            style={{ maxHeight: '80px', minHeight: '36px' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by Hapince Technology AI | <a href="mailto:info@hapince.site" className="underline">info@hapince.site</a>
        </p>
      </div>
    </div>
  );
}
