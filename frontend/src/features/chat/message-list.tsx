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
        'bg-white',
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white">
        {isUser ? (
          <User className="h-4 w-4 text-[var(--foreground)]" />
        ) : (
          <Bot className="h-4 w-4 text-[var(--foreground)]" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="prose prose-sm max-w-none text-[var(--foreground)] prose-pre:bg-[var(--hover)] prose-pre:border prose-pre:border-[var(--border)] prose-code:text-[var(--foreground)]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1 animate-pulse bg-neutral-400" />
          )}
        </div>

        {!isUser && !isStreaming && (
          <button
            onClick={copyContent}
            className="flex items-center gap-1 text-xs text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--foreground)]"
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
  chatId: string;
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
}

const SCROLL_THRESHOLD = 80;

export function MessageList({
  chatId,
  messages,
  streamingContent,
  isStreaming,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const userScrolledUpRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    if (userScrolledUpRef.current && behavior !== 'auto') return;

    // Prefer scrolling the sentinel — more reliable than scrollHeight
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < SCROLL_THRESHOLD;
    userScrolledUpRef.current = distanceFromBottom > SCROLL_THRESHOLD;
  }, []);

  // Reset when switching chats — scroll to latest messages
  useEffect(() => {
    userScrolledUpRef.current = false;
    isNearBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [chatId, scrollToBottom]);

  // Scroll when messages load or update
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
  }, [messages, scrollToBottom]);

  // Keep up with streaming tokens
  useEffect(() => {
    if (isStreaming && !userScrolledUpRef.current) {
      scrollToBottom('auto');
    }
  }, [streamingContent, isStreaming, scrollToBottom]);

  // Content height changes (markdown, code blocks)
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (!userScrolledUpRef.current) {
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
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
    >
      {/* min-h-full + justify-end pins short chats to bottom (ChatGPT-style) */}
      <div
        ref={contentRef}
        className="mx-auto flex min-h-full max-w-3xl flex-col justify-end"
      >
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
        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>
    </div>
  );
}
