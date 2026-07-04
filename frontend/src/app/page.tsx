'use client';

import { useRequireAuth } from '@/hooks/use-auth-guard';
import { ChatInterface } from '@/features/chat/chat-interface';

export default function HomePage() {
  const { hasHydrated, isAuthenticated } = useRequireAuth();

  if (!hasHydrated || !isAuthenticated) return null;

  return <ChatInterface />;
}
