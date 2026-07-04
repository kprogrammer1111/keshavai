'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/stores/chat-store';

function CodeBlock({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');

  const copyCode = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!className) {
    return (
      <code className="rounded bg-[var(--hover)] px-1.5 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    );
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl bg-[var(--hover)]">
      <button
        type="button"
        onClick={copyCode}
        className="absolute right-2 top-2 rounded-md p-1.5 text-[var(--muted)] opacity-0 transition-opacity hover:bg-white hover:text-[var(--foreground)] group-hover/code:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto p-4 pt-10 font-mono text-sm leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      <ActionButton
        label={copied ? 'Copied' : 'Copy'}
        onClick={copyContent}
        icon={copied ? Check : Copy}
      />
      <ActionButton label="Good response" icon={ThumbsUp} />
      <ActionButton label="Bad response" icon={ThumbsDown} />
      <ActionButton label="Share" icon={Share2} />
      <ActionButton label="More" icon={MoreHorizontal} />
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function AssistantContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="chat-prose text-[15px] leading-7 text-[var(--foreground)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: CodeBlock,
          hr: () => <hr className="my-6 border-[var(--border)]" />,
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-2xl font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-xl font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-neutral-800 align-middle" />
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'USER';

  if (isUser) {
    return (
      <div className="flex w-full justify-end px-4 py-3">
        <div className="max-w-[85%] rounded-3xl bg-[var(--user-bubble)] px-4 py-2.5 text-[15px] leading-relaxed text-[var(--foreground)] sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group w-full px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <AssistantContent content={message.content} isStreaming={isStreaming} />
        {!isStreaming && message.content && <MessageActions content={message.content} />}
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

  useEffect(() => {
    userScrolledUpRef.current = false;
    requestAnimationFrame(() => scrollToBottom(true));
  }, [chatId, scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
  }, [messages, streamingContent, isStreaming, scrollToBottom]);

  const showStreamingBubble = isStreaming && streamingContent;
  const showThinking = isStreaming && !streamingContent;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white"
    >
      <div className="mx-auto w-full max-w-3xl pb-4 pt-2">
        {messages.length === 0 && !isStreaming && (
          <p className="px-4 py-12 text-center text-sm text-[var(--muted)]">
            Ask anything to get started
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {showThinking && (
          <div className="px-4 py-4">
            <ThinkingDots />
          </div>
        )}
        {showStreamingBubble && (
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
