'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/axios';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const { setAccessToken, setUser, refreshUser } = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const token = searchParams.get('token');
      const isNewUser = searchParams.get('isNewUser') === 'true';
      const error = searchParams.get('error');
      const errorMessage = searchParams.get('message');

      if (error) {
        setStatus('error');
        setMessage(errorMessage || 'Authentication failed. Please try again.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('No authentication token received.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
        return;
      }

      try {
        // Set the access token
        setAccessToken(token);

        // Fetch user data
        await refreshUser();

        setStatus('success');
        setMessage(isNewUser ? 'Account created successfully!' : 'Welcome back!');

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Failed to complete authentication. Please try again.');
        setAccessToken(null);
        setUser(null);
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router, setAccessToken, setUser, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
                {message}
              </h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-green-600 dark:text-green-400">
                {message}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-xl font-semibold text-red-600 dark:text-red-400">
                Authentication Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                Redirecting to login...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
