'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

/** Wait for persisted auth to load, then redirect to login if unauthenticated. */
export function useRequireAuth() {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  return { hasHydrated, isAuthenticated };
}

/** Wait for persisted auth to load, then redirect home if already signed in. */
export function useRedirectIfAuthenticated(homePath = '/') {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (isAuthenticated) {
      router.replace(homePath);
    }
  }, [hasHydrated, isAuthenticated, homePath, router]);

  return { hasHydrated, isAuthenticated };
}
