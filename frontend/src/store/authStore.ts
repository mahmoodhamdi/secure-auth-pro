import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData, AuthResponse, TwoFactorResponse } from '@/types';
import { authApi } from '@/lib/axios';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requires2FA: boolean;
  tempToken: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  verifyBackupCode: (code: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  refreshUser: () => Promise<void>;
  reset2FA: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  requires2FA: false,
  tempToken: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);

          // Check if 2FA is required
          if (response.data.requires2FA) {
            set({
              requires2FA: true,
              tempToken: response.data.tempToken,
              isLoading: false,
            });
            return;
          }

          // Normal login success
          const { user, accessToken } = response.data as AuthResponse;
          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            requires2FA: false,
            tempToken: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          await authApi.register(data);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          // Ignore errors during logout
          console.error('Logout error:', error);
        } finally {
          set(initialState);
        }
      },

      verify2FA: async (code: string) => {
        const { tempToken } = get();
        if (!tempToken) throw new Error('No temp token available');

        set({ isLoading: true });
        try {
          const response = await authApi.verify2FA(code, tempToken);
          const { user, accessToken } = response.data as AuthResponse;

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            requires2FA: false,
            tempToken: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyBackupCode: async (code: string) => {
        const { tempToken } = get();
        if (!tempToken) throw new Error('No temp token available');

        set({ isLoading: true });
        try {
          const response = await authApi.verifyBackupCode(code, tempToken);
          const { user, accessToken } = response.data as AuthResponse;

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
            requires2FA: false,
            tempToken: null,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setAccessToken: (token: string | null) => {
        set({ accessToken: token });
      },

      refreshUser: async () => {
        try {
          const response = await authApi.getCurrentUser();
          set({ user: response.data.user });
        } catch (error) {
          // If refresh fails, logout
          set(initialState);
          throw error;
        }
      },

      reset2FA: () => {
        set({ requires2FA: false, tempToken: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
