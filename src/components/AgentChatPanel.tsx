'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types';
import AgentAvatar from './AgentAvatar';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  streaming?: boolean;
  error?: boolean;
}

interface AgentChatPanelProps {
  agent: Agent;
  open: boolean;
  onClose: () => void;
}

export default function AgentChatPanel({ agent, open, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Gateway mode: always "connected" since we use HTTP fetch
  const connected = true;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Send message via HTTP fetch to gateway chat endpoint
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    // Add user message to history
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Add placeholder assistant message
    const placeholderId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: placeholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    }]);
    setStreaming(true);

    try {
      const res = await fetch('/api/gateway/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, message: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => prev.map(msg =>
        msg.id === placeholderId
          ? { ...msg, content: data.text || 'No response', streaming: false }
          : msg
      ));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => prev.map(msg =>
        msg.id === placeholderId
          ? { ...msg, content: errorMsg, streaming: false, error: true }
          : msg
      ));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, agent.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] z-50 flex flex-col bg-background border-l border-border/50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
              <AgentAvatar agent={agent} size="md" showStatus={true} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {agent.name}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {agent.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!connected && (
                  <span className="text-[10px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Offline
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Start a conversation
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Messages are session-only and not persisted
                    </p>
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} agent={agent} />
              ))}

              {/* Typing indicator */}
              {streaming && (
                <div className="flex items-center gap-2 text-muted-foreground/60 text-xs pl-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{agent.name} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? `Message ${agent.name}...` : 'Reconnecting...'}
                  disabled={!connected}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none rounded-xl px-4 py-2.5 text-sm",
                    "bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50",
                    "focus:outline-none focus:ring-1 focus:ring-border focus:border-border",
                    "max-h-[120px] scrollbar-thin",
                    "disabled:opacity-50"
                  )}
                  style={{ minHeight: '40px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '40px';
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || streaming || !connected}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                    input.trim() && !streaming && connected
                      ? "bg-foreground text-background hover:opacity-80"
                      : "bg-secondary/50 text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-[10px] text-muted-foreground/40">
                  Enter to send, Shift+Enter for newline
                </span>
                <span className="kbd text-[10px]">ESC</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Individual message bubble */
function MessageBubble({ message, agent }: { message: ChatMessage; agent: Agent }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <AgentAvatar agent={agent} size="sm" showStatus={false} />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-foreground text-background rounded-br-md"
            : message.error
              ? "bg-red-500/10 border border-red-500/20 text-red-400 rounded-bl-md"
              : "bg-secondary/70 border border-border/30 text-foreground rounded-bl-md"
        )}
      >
        <MessageContent content={message.content} isCode={!isUser} />

        {message.streaming && !message.content && (
          <div className="flex gap-1 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Render message content with code block detection */
function MessageContent({ content, isCode }: { content: string; isCode: boolean }) {
  if (!content) return null;

  // Split on code fences
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const firstNewline = part.indexOf('\n');
          const lang = part.slice(3, firstNewline > 0 ? firstNewline : 3).trim();
          const code = firstNewline > 0
            ? part.slice(firstNewline + 1, -3)
            : part.slice(3, -3);

          return (
            <pre
              key={i}
              className="mt-2 mb-1 p-3 rounded-lg bg-black/30 border border-border/20 overflow-x-auto text-xs"
            >
              {lang && (
                <div className="text-[10px] text-muted-foreground/50 mb-2 uppercase tracking-wider">
                  {lang}
                </div>
              )}
              <code className="font-mono text-foreground/90 whitespace-pre">{code}</code>
            </pre>
          );
        }

        // Detect inline code
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {inlineParts.map((ip, j) => {
              if (ip.startsWith('`') && ip.endsWith('`')) {
                return (
                  <code
                    key={j}
                    className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-xs text-foreground/80"
                  >
                    {ip.slice(1, -1)}
                  </code>
                );
              }
              return <span key={j}>{ip}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}
