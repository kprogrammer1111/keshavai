'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

interface SidebarProps {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onSearch: (query: string) => void;
}

export function Sidebar({
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onSearch,
}: SidebarProps) {
  const { chats, activeChatId } = useChatStore();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const pinnedChats = chats.filter((c) => c.isPinned);
  const regularChats = chats.filter((c) => !c.isPinned);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-white">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Keshavai</h1>
        <Button variant="ghost" size="icon" onClick={onNewChat}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        {showSearch ? (
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            onBlur={() => !searchQuery && setShowSearch(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-[var(--muted)]"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
            Search chats
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-2">
        {pinnedChats.length > 0 && (
          <div className="mb-2">
            <p className="px-2 py-1 text-xs font-medium text-[var(--muted)]">Pinned</p>
            {pinnedChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                onSelect={onSelectChat}
                onDelete={onDeleteChat}
              />
            ))}
          </div>
        )}

        <div>
          {regularChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              onSelect={onSelectChat}
              onDelete={onDeleteChat}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-medium text-[var(--foreground)]">
            {user?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm text-[var(--foreground)]">
              {user?.name ?? user?.email}
            </p>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ChatItem({
  chat,
  isActive,
  onSelect,
  onDelete,
}: {
  chat: { id: string; title: string; isPinned: boolean };
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
        isActive
          ? 'bg-[var(--active)] text-[var(--foreground)]'
          : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]',
      )}
      onClick={() => onSelect(chat.id)}
    >
      {chat.isPinned ? (
        <Pin className="h-4 w-4 shrink-0" />
      ) : (
        <MessageSquare className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1 truncate">{chat.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(chat.id);
        }}
        className="hidden text-[var(--muted)] hover:text-[var(--foreground)] group-hover:block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
