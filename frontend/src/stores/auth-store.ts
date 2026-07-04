import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  syncTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

function persistTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        persistTokens(accessToken, refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      syncTokens: (accessToken, refreshToken) => {
        persistTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state?.refreshToken) {
          persistTokens(state.accessToken, state.refreshToken);
          if (state.user && !state.isAuthenticated) {
            useAuthStore.setState({ isAuthenticated: true });
          }
        }
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
