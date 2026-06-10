import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser } from '../types';
import { backendMode } from '../services/envService';
import { backendApi } from '../services/backendApi';

interface AuthState {
  user: AuthUser | null;
  loadingSession: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  checkBackendSession: () => Promise<AuthUser | null>;
  setLoadingSession: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loadingSession: false,
      login: (user) => set({ user }),
      setLoadingSession: (value) => set({ loadingSession: value }),
      logout: async () => {
        if (backendMode() === 'api') {
          try {
            await backendApi.logout();
          } catch (error) {
            console.error('[auth] backend logout failed', error);
          }
        }
        set({ user: null });
      },
      checkBackendSession: async () => {
        if (backendMode() !== 'api') return null;
        set({ loadingSession: true });
        try {
          const response = await backendApi.getMe();
          if (!response.authenticated || !response.user) {
            set({ user: null, loadingSession: false });
            return null;
          }
          const user: AuthUser = {
            email: response.user.email,
            name: response.user.name,
            picture: response.user.picture,
            provider: 'google',
          };
          set({ user, loadingSession: false });
          return user;
        } catch (error) {
          console.error('[auth] check session failed', error);
          set({ user: null, loadingSession: false });
          return null;
        }
      },
    }),
    { name: '7c-commander-auth' }
  )
);
