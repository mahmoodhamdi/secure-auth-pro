'use client';

import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Shield, Mail, Calendar, Smartphone } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-secondary-600 mt-1">
          Here&apos;s an overview of your account security.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-green-100">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Email Status</p>
                <p className="text-lg font-semibold text-secondary-900">
                  {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-full ${
                  user.isTwoFactorEnabled ? 'bg-green-100' : 'bg-yellow-100'
                }`}
              >
                <Smartphone
                  className={`h-5 w-5 ${
                    user.isTwoFactorEnabled ? 'text-green-600' : 'text-yellow-600'
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Two-Factor Auth</p>
                <p className="text-lg font-semibold text-secondary-900">
                  {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-primary-100">
                <Shield className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Account Role</p>
                <p className="text-lg font-semibold text-secondary-900 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-secondary-100">
                <Calendar className="h-5 w-5 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Member Since</p>
                <p className="text-lg font-semibold text-secondary-900">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!user.isEmailVerified && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <Mail className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Verify your email</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please verify your email address to secure your account.
                  </p>
                </div>
              </div>
            )}

            {!user.isTwoFactorEnabled && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">
                    Enable Two-Factor Authentication
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Add an extra layer of security to your account by enabling 2FA.
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Enable now &rarr;
                  </Link>
                </div>
              </div>
            )}

            {user.isEmailVerified && user.isTwoFactorEnabled && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Your account is secure</p>
                  <p className="text-sm text-green-700 mt-1">
                    Great job! You have all recommended security features enabled.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/profile">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
                  <span className="text-primary-600 font-semibold text-lg">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </span>
                </div>
                <p className="font-medium text-secondary-900">Edit Profile</p>
                <p className="text-sm text-secondary-500 mt-1">
                  Update your personal information
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-secondary-100 flex items-center justify-center mb-3">
                  <Smartphone className="h-6 w-6 text-secondary-600" />
                </div>
                <p className="font-medium text-secondary-900">Active Sessions</p>
                <p className="text-sm text-secondary-500 mt-1">
                  View and manage your sessions
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-secondary-900">Security Settings</p>
                <p className="text-sm text-secondary-500 mt-1">
                  Configure 2FA and password
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
