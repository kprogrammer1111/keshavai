'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { chatService } from '@/services/api-services';
import { MessageList } from './message-list';
import { PromptBox } from './prompt-box';
import { Sidebar } from './sidebar';
import { toast } from 'sonner';
import { Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On mobile with no chat selected, show the chat list full-screen
  const mobileShowListOnly = !activeChatId;
  const mobileSidebarOpen = mobileShowListOnly || sidebarOpen;

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
      setSidebarOpen(false);
    } catch {
      toast.error('Failed to create chat');
    }
  };

  const handleSelectChat = async (id: string) => {
    setActiveChat(id);
    setSidebarOpen(false);
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
        setSidebarOpen(false);
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

      const { data: freshChat } = await chatService.get(resolvedChatId);
      updateChat(resolvedChatId, {
        messages: freshChat.messages,
        title: freshChat.title,
      });

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
    <div className="flex h-dvh overflow-hidden bg-white">
      {/* Mobile backdrop when drawer is open over a chat */}
      {sidebarOpen && activeChatId && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onSearch={handleSearch}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        showMobileClose={!!activeChatId && sidebarOpen}
        mobileFullScreen={mobileShowListOnly}
      />

      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          mobileShowListOnly ? 'max-md:hidden' : ''
        }`}
      >
        {/* Mobile top bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-white px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chats"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
            {activeChat?.title ?? 'Keshavai'}
          </p>
        </div>

        {!activeChatId ? (
          <div className="hidden flex-1 flex-col items-center justify-center gap-4 bg-white md:flex">
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
