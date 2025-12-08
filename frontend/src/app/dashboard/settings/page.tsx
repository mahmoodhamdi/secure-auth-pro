'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { userApi, authApi, oauthApi } from '@/lib/axios';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { Lock, Shield, Key, Trash2, Link, Unlink } from 'lucide-react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuthStore();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [oauthStatus, setOauthStatus] = useState<{
    google: boolean;
    github: boolean;
    facebook: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Fetch OAuth status on mount
  useState(() => {
    const fetchOAuthStatus = async () => {
      try {
        const response = await oauthApi.getStatus();
        setOauthStatus(response.data.connections);
      } catch (error) {
        console.error('Failed to fetch OAuth status', error);
      }
    };
    fetchOAuthStatus();
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    try {
      await userApi.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      reset();
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const response = await authApi.enable2FA();
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setShow2FASetup(true);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to setup 2FA');
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsSettingUp2FA(true);
    try {
      const response = await authApi.verify2FASetup(verificationCode);
      toast.success('Two-factor authentication enabled');
      setShow2FASetup(false);
      setVerificationCode('');
      await refreshUser();
      // Show backup codes
      if (response.data.backupCodes) {
        toast.success(`Save your backup codes: ${response.data.backupCodes.join(', ')}`, {
          duration: 10000,
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Invalid verification code');
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsDisabling2FA(true);
    try {
      await authApi.disable2FA(disableCode);
      toast.success('Two-factor authentication disabled');
      setDisableCode('');
      await refreshUser();
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Invalid verification code');
    } finally {
      setIsDisabling2FA(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await userApi.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
      router.push('/');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUnlinkOAuth = async (provider: 'google' | 'github' | 'facebook') => {
    try {
      await oauthApi.unlinkProvider(provider);
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked`);
      setOauthStatus((prev) => (prev ? { ...prev, [provider]: false } : null));
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to unlink account');
    }
  };

  const handleLinkOAuth = (provider: 'google' | 'github' | 'facebook') => {
    const urls = {
      google: oauthApi.getGoogleAuthUrl(),
      github: oauthApi.getGitHubAuthUrl(),
      facebook: oauthApi.getFacebookAuthUrl(),
    };
    window.location.href = urls[provider];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account security and authentication options
        </p>
      </div>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password regularly for better security</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <Input
                type="password"
                placeholder="Current password"
                className="pl-10"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <Input
                type="password"
                placeholder="New password"
                className="pl-10"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <Input
                type="password"
                placeholder="Confirm new password"
                className="pl-10"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>
            <Button type="submit" isLoading={isChangingPassword}>
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using authenticator apps
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Shield className="w-5 h-5" />
                <span className="font-medium">2FA is enabled</span>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code to disable"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  onClick={handleDisable2FA}
                  isLoading={isDisabling2FA}
                  className="text-red-600 border-red-600"
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : show2FASetup ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}
              {secret && (
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Manual entry code:</p>
                  <code className="text-sm font-mono">{secret}</code>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="max-w-xs"
                />
                <Button onClick={handleVerify2FASetup} isLoading={isSettingUp2FA}>
                  Verify & Enable
                </Button>
                <Button variant="ghost" onClick={() => setShow2FASetup(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleEnable2FA} isLoading={isSettingUp2FA}>
              <Shield className="w-4 h-4 mr-2" />
              Enable 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>Manage your linked social accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium">Google</span>
              </div>
              {oauthStatus?.google ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkOAuth('google')}
                  className="text-red-600"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Unlink
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleLinkOAuth('google')}>
                  <Link className="w-4 h-4 mr-1" />
                  Link
                </Button>
              )}
            </div>

            {/* GitHub */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="font-medium">GitHub</span>
              </div>
              {oauthStatus?.github ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkOAuth('github')}
                  className="text-red-600"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Unlink
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleLinkOAuth('github')}>
                  <Link className="w-4 h-4 mr-1" />
                  Link
                </Button>
              )}
            </div>

            {/* Facebook */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span className="font-medium">Facebook</span>
              </div>
              {oauthStatus?.facebook ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkOAuth('facebook')}
                  className="text-red-600"
                >
                  <Unlink className="w-4 h-4 mr-1" />
                  Unlink
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleLinkOAuth('facebook')}>
                  <Link className="w-4 h-4 mr-1" />
                  Link
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={handleDeleteAccount}
                  isLoading={isDeletingAccount}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Yes, Delete My Account
                </Button>
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
