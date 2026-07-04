'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/stores/auth-store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      }),
  );

  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    const fallback = window.setTimeout(() => {
      if (!useAuthStore.getState().hasHydrated) {
        useAuthStore.setState({ hasHydrated: true });
      }
    }, 1000);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
