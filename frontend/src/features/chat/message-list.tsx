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
    <div className="group flex gap-4 bg-white px-4 py-6 md:px-8">
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

export function MessageList({
  chatId,
  messages,
  streamingContent,
  isStreaming,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!force && userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 80;
  }, []);

  // Load / switch chat — jump to latest
  useEffect(() => {
    userScrolledUpRef.current = false;
    requestAnimationFrame(() => scrollToBottom(true));
  }, [chatId, scrollToBottom]);

  // New messages or streaming
  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
  }, [messages, streamingContent, isStreaming, scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
    >
      <div className="mx-auto max-w-3xl pb-4">
        {messages.length === 0 && !isStreaming && (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            Send a message to start the conversation
          </p>
        )}
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
