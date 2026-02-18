'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import type { Comment } from '@/types';

interface CommentThreadProps {
  taskId: string;
  comments: Comment[];
  onAdd: (text: string) => void;
}

export default function CommentThread({ taskId, comments, onAdd }: CommentThreadProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      onAdd(trimmed);
      setText('');
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, onAdd]);

  /** Color based on author name hash */
  function authorColor(author: string): string {
    const colors = ['#e879a4', '#46a758', '#3e63dd', '#ffb224', '#8e4ec6', '#00a2c7', '#e54d2e'];
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-3 mb-4 max-h-[300px]">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground/40">No comments yet</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {comments.map((comment) => {
              const color = authorColor(comment.author);
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="group"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Author avatar */}
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5"
                      style={{
                        background: `${color}20`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {comment.author.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {comment.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 font-tabular" suppressHydrationWarning>
                          {timeAgo(new Date(comment.createdAt).getTime())}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 pt-3 border-t border-border/30">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Write a comment..."
          rows={1}
          className="flex-1 resize-none text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-border transition-colors min-h-[36px] max-h-[100px]"
        />
        <button
          type="button"
          disabled={!text.trim() || submitting}
          onClick={handleSubmit}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            text.trim()
              ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
              : "bg-secondary text-muted-foreground/30 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
