'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { twoFactorSchema, TwoFactorFormData, backupCodeSchema, BackupCodeFormData } from '@/schemas/auth.schema';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Shield, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';

export default function TwoFactorPage() {
  const router = useRouter();
  const { verify2FA, verifyBackupCode, isLoading, requires2FA, reset2FA } = useAuthStore();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Redirect if not in 2FA flow
  if (!requires2FA && typeof window !== 'undefined') {
    router.push('/auth/login');
    return null;
  }

  const totpForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  });

  const backupForm = useForm<BackupCodeFormData>({
    resolver: zodResolver(backupCodeSchema),
  });

  const onSubmitTotp = async (data: TwoFactorFormData) => {
    setServerError(null);
    try {
      await verify2FA(data.code);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Invalid code';
      setServerError(message);
      toast.error(message);
    }
  };

  const onSubmitBackup = async (data: BackupCodeFormData) => {
    setServerError(null);
    try {
      await verifyBackupCode(data.code);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      const message = axiosError.response?.data?.error?.message || 'Invalid backup code';
      setServerError(message);
      toast.error(message);
    }
  };

  const handleBack = () => {
    reset2FA();
    router.push('/auth/login');
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600 mb-4">
          <Shield className="h-6 w-6" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {serverError && (
          <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm mb-4">
            {serverError}
          </div>
        )}

        {!useBackupCode ? (
          <form onSubmit={totpForm.handleSubmit(onSubmitTotp)} className="space-y-4">
            <Input
              type="text"
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              autoComplete="one-time-code"
              error={totpForm.formState.errors.code?.message}
              {...totpForm.register('code')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Verify
            </Button>

            <button
              type="button"
              onClick={() => setUseBackupCode(true)}
              className="w-full text-sm text-primary-600 hover:text-primary-500"
            >
              Use a backup code instead
            </button>
          </form>
        ) : (
          <form onSubmit={backupForm.handleSubmit(onSubmitBackup)} className="space-y-4">
            <Input
              type="text"
              placeholder="XXXX-XXXX"
              className="text-center text-lg tracking-widest uppercase"
              autoComplete="off"
              error={backupForm.formState.errors.code?.message}
              {...backupForm.register('code')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Verify Backup Code
            </Button>

            <button
              type="button"
              onClick={() => setUseBackupCode(false)}
              className="w-full text-sm text-primary-600 hover:text-primary-500"
            >
              Use authenticator app instead
            </button>
          </form>
        )}

        <button
          onClick={handleBack}
          className="mt-6 flex items-center justify-center w-full text-sm text-secondary-600 hover:text-secondary-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to login
        </button>
      </CardContent>
    </Card>
  );
}
