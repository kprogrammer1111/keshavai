import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
  tokenCount?: number;
  isEdited?: boolean;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  isPinned: boolean;
  model?: string;
  provider?: string;
  updatedAt: string;
  messages?: Message[];
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isStreaming: boolean;
  streamingContent: string;
  streamStartedAt: number | null;
  selectedProvider: string;
  selectedModel: string;
  setChats: (chats: Chat[]) => void;
  mergeChatList: (chats: Chat[]) => void;
  setActiveChat: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, data: Partial<Chat>) => void;
  removeChat: (id: string) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamContent: (content: string) => void;
  resetStreamContent: () => void;
  setModel: (provider: string, model: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  isStreaming: false,
  streamingContent: '',
  streamStartedAt: null,
  selectedProvider: 'GEMINI',
  selectedModel: 'gemini-2.5-flash',
  setChats: (incoming) =>
    set((s) => ({
      chats: incoming.map((chat) => {
        const existing = s.chats.find((c) => c.id === chat.id);
        // Keep full history if we already loaded more than the list preview (1 msg)
        if (
          existing?.messages &&
          existing.messages.length > (chat.messages?.length ?? 0)
        ) {
          return { ...chat, messages: existing.messages };
        }
        return chat;
      }),
    })),
  mergeChatList: (incoming) =>
    set((s) => {
      const incomingIds = new Set(incoming.map((c) => c.id));
      const preserved = s.chats.filter((c) => !incomingIds.has(c.id));
      const merged = incoming.map((chat) => {
        const existing = s.chats.find((c) => c.id === chat.id);
        if (
          existing?.messages &&
          existing.messages.length > (chat.messages?.length ?? 0)
        ) {
          return { ...chat, messages: existing.messages };
        }
        return chat;
      });
      return { chats: [...merged, ...preserved] };
    }),
  setActiveChat: (id) => set({ activeChatId: id, streamingContent: '' }),
  addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
  updateChat: (id, data) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
  removeChat: (id) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== id),
      activeChatId: s.activeChatId === id ? null : s.activeChatId,
    })),
  setStreaming: (isStreaming) =>
    set({
      isStreaming,
      streamStartedAt: isStreaming ? Date.now() : null,
    }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  resetStreamContent: () => set({ streamingContent: '' }),
  setModel: (provider, model) => set({ selectedProvider: provider, selectedModel: model }),
}));
