'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/axios';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid or missing verification token');
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (error) {
        const axiosError = error as AxiosError<{ error: { message: string } }>;
        setStatus('error');
        setMessage(
          axiosError.response?.data?.error?.message ||
            'Failed to verify email. The link may have expired.'
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <Card>
      <CardHeader className="text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Verifying Email</CardTitle>
            <CardDescription>{message}</CardDescription>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Email Verified</CardTitle>
            <CardDescription>{message}</CardDescription>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Verification Failed</CardTitle>
            <CardDescription>{message}</CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'success' && (
          <Link href="/auth/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <Link href="/auth/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
            <p className="text-sm text-gray-600 text-center">
              If you need a new verification link, please log in and request one from your dashboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
