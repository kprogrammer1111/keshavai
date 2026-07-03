'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-lg">
        <Button variant="ghost" size="icon" className="shrink-0 text-zinc-400">
          <Paperclip className="h-4 w-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message Keshavai..."
          rows={1}
          disabled={disabled}
          className={cn(
            'max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none',
            disabled && 'opacity-50',
          )}
        />

        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-zinc-600">
        Keshavai can make mistakes. Verify important information.
      </p>
    </div>
  );
}
