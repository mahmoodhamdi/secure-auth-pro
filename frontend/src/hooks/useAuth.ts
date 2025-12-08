'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface UseAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  redirectIfAuthenticated?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, refreshUser } = useAuthStore();

  useEffect(() => {
    // If we have a token but no user, try to refresh
    const token = useAuthStore.getState().accessToken;
    if (token && !user && !isLoading) {
      refreshUser().catch(() => {
        // Refresh failed, handled by store
      });
    }
  }, [user, isLoading, refreshUser]);

  useEffect(() => {
    if (isLoading) return;

    // Redirect to login if auth is required but user is not authenticated
    if (options.requireAuth && !isAuthenticated) {
      router.push(options.redirectTo || '/auth/login');
      return;
    }

    // Redirect away from auth pages if already authenticated
    if (options.redirectIfAuthenticated && isAuthenticated) {
      router.push(options.redirectIfAuthenticated);
      return;
    }
  }, [isAuthenticated, isLoading, options, router]);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
}

export function useRequireAuth(redirectTo = '/auth/login') {
  return useAuth({ requireAuth: true, redirectTo });
}

export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  return useAuth({ redirectIfAuthenticated: redirectTo });
}
