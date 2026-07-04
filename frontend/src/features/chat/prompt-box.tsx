'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Mic, Square, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptBoxProps {
  onSend: (content: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export function PromptBox({ onSend, onStop, isStreaming, disabled }: PromptBoxProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const canSend = input.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="shrink-0 bg-white px-3 pb-4 pt-2 sm:px-4 sm:pb-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-[28px] border border-[var(--border)] bg-white px-2 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:px-3">
          <button
            type="button"
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
            aria-label="Add attachment"
          >
            <Plus className="h-5 w-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            rows={1}
            disabled={disabled || isStreaming}
            className={cn(
              'max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none',
              (disabled || isStreaming) && 'opacity-60',
            )}
          />

          <button
            type="button"
            className="mb-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)] sm:flex"
            aria-label="Voice input"
          >
            <Mic className="h-5 w-5" />
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white transition-opacity hover:opacity-90"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                'mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                canSend
                  ? 'bg-neutral-900 text-white hover:opacity-90'
                  : 'bg-[var(--hover)] text-[var(--muted)]',
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
