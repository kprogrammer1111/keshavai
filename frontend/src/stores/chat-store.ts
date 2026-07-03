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
  selectedProvider: string;
  selectedModel: string;
  setChats: (chats: Chat[]) => void;
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
  selectedProvider: 'GEMINI',
  selectedModel: 'gemini-1.5-flash',
  setChats: (chats) => set({ chats }),
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
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamContent: (content) =>
    set((s) => ({ streamingContent: s.streamingContent + content })),
  resetStreamContent: () => set({ streamingContent: '' }),
  setModel: (provider, model) => set({ selectedProvider: provider, selectedModel: model }),
}));
