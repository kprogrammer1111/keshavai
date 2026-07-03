'use client';

import { useEffect, useRef } from 'react';
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
        'group flex gap-4 px-4 py-6',
        isUser ? 'bg-transparent' : 'bg-zinc-900/50',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-emerald-600' : 'bg-zinc-700',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1 animate-pulse bg-emerald-500" />
          )}
        </div>

        {!isUser && !isStreaming && (
          <button
            onClick={copyContent}
            className="flex items-center gap-1 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-300"
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

export function MessageList({ messages, streamingContent, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto">
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
      <div ref={bottomRef} />
    </div>
  );
}
