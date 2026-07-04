'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { chatService } from '@/services/api-services';
import { MessageList } from './message-list';
import { PromptBox } from './prompt-box';
import { Sidebar } from './sidebar';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function ChatInterface() {
  const {
    chats,
    activeChatId,
    isStreaming,
    streamingContent,
    selectedProvider,
    selectedModel,
    setChats,
    mergeChatList,
    setActiveChat,
    addChat,
    removeChat,
    updateChat,
    setStreaming,
    appendStreamContent,
    resetStreamContent,
  } = useChatStore();

  const { accessToken } = useAuthStore();
  const abortRef = useRef<AbortController | null>(null);
  const activeChat = chats.find((c) => c.id === activeChatId);

  const loadChats = useCallback(async () => {
    try {
      const { data } = await chatService.list();
      mergeChatList(data.chats);
    } catch {
      toast.error('Failed to load chats');
    }
  }, [mergeChatList]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleNewChat = async () => {
    try {
      const { data } = await chatService.create({
        provider: selectedProvider,
        model: selectedModel,
      });
      addChat({ ...data, messages: [] });
      setActiveChat(data.id);
    } catch {
      toast.error('Failed to create chat');
    }
  };

  const handleSelectChat = async (id: string) => {
    setActiveChat(id);
    try {
      const { data } = await chatService.get(id);
      updateChat(id, { messages: data.messages, title: data.title });
    } catch {
      toast.error('Failed to load chat history');
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await chatService.delete(id);
      removeChat(id);
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      loadChats();
      return;
    }
    try {
      const { data } = await chatService.search(query);
      setChats(data);
    } catch {
      toast.error('Search failed');
    }
  };

  const handleSend = async (content: string) => {
    let chatId = activeChatId;

    if (!chatId) {
      try {
        const { data } = await chatService.create({
          provider: selectedProvider,
          model: selectedModel,
        });
        addChat({ ...data, messages: [] });
        setActiveChat(data.id);
        chatId = data.id;
      } catch {
        toast.error('Failed to create chat');
        return;
      }
    }

    if (!chatId) {
      toast.error('Failed to create chat');
      return;
    }

    const resolvedChatId = chatId;

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'USER' as const,
      content,
      createdAt: new Date().toISOString(),
    };

    const currentMessages =
      useChatStore.getState().chats.find((c) => c.id === resolvedChatId)?.messages ?? [];

    updateChat(resolvedChatId, {
      messages: [...currentMessages, userMessage],
      title: currentMessages.length === 0 ? content.slice(0, 50) : undefined,
    });

    setStreaming(true);
    resetStreamContent();
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/chats/${resolvedChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          content,
          provider: selectedProvider,
          model: selectedModel,
          useRag: false,
          useTools: false,
        }),
        signal: abortRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as {
                  content?: string;
                  done?: boolean;
                  error?: string;
                };
                if (data.content) {
                  fullContent += data.content;
                  appendStreamContent(data.content);
                }
                if (data.error) toast.error(data.error);
              } catch {
                // skip malformed SSE
              }
            }
          }
        }
      }

      // Sync full history from server (avoids stale/duplicate local state)
      const { data: freshChat } = await chatService.get(resolvedChatId);
      updateChat(resolvedChatId, {
        messages: freshChat.messages,
        title: freshChat.title,
      });

      // Refresh sidebar order/titles without wiping loaded messages
      chatService.list().then(({ data }) => mergeChatList(data.chats));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to send message');
      }
    } finally {
      setStreaming(false);
      resetStreamContent();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onSearch={handleSearch}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!activeChatId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-white">
              <Sparkles className="h-8 w-8 text-[var(--foreground)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">
              How can I help you today?
            </h2>
            <p className="text-[var(--muted)]">
              Start a new conversation or select an existing chat
            </p>
          </div>
        ) : (
          <MessageList
            chatId={activeChatId}
            messages={activeChat?.messages ?? []}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
          />
        )}

        <PromptBox
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}
