'use client';

import { useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check, User, Bot } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Message } from '@/stores/chat-store';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'USER';

  const copyContent = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'group flex gap-4 px-4 py-6 md:px-8',
        isUser ? 'bg-white' : 'bg-[var(--surface-muted)]',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-[var(--accent)]' : 'bg-[var(--sidebar-bg)]',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="prose prose-sm max-w-none text-[var(--foreground)] prose-pre:bg-[#f3f0ff] prose-pre:border prose-pre:border-[var(--border)] prose-code:text-[var(--accent)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1 animate-pulse bg-[var(--accent)]" />
          )}
        </div>

        {!isUser && !isStreaming && (
          <button
            onClick={copyContent}
            className="flex items-center gap-1 text-xs text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--accent)]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
}

const SCROLL_THRESHOLD = 100;

export function MessageList({ messages, streamingContent, isStreaming }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Smooth scroll only when a new message is added (user sent)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      isNearBottomRef.current = true;
      scrollToBottom('smooth');
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Instant scroll during streaming (avoid smooth-scroll jank)
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom('auto');
    }
  }, [streamingContent, isStreaming, scrollToBottom]);

  // Scroll when content height changes (markdown/code blocks rendering)
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        scrollToBottom('auto');
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
    >
      <div ref={contentRef} className="mx-auto max-w-3xl">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'ASSISTANT',
              content: streamingContent,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
      </div>
    </div>
  );
}
