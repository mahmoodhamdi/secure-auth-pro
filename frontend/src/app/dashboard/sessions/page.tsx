'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { userApi } from '@/lib/axios';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Trash2,
  LogOut,
  Shield,
} from 'lucide-react';
import { AxiosError } from 'axios';

interface Session {
  _id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await userApi.getSessions();
      setSessions(response.data.sessions || []);
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setIsRevoking(sessionId);
    try {
      await userApi.revokeSession(sessionId);
      setSessions(sessions.filter((s) => s._id !== sessionId));
      toast.success('Session revoked successfully');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to revoke session');
    } finally {
      setIsRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    setIsRevokingAll(true);
    try {
      await userApi.revokeAllSessions();
      // Keep only current session
      setSessions(sessions.filter((s) => s.isCurrent));
      toast.success('All other sessions revoked');
    } catch (error) {
      const axiosError = error as AxiosError<{ error: { message: string } }>;
      toast.error(axiosError.response?.data?.error?.message || 'Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-8 h-8" />;
      case 'tablet':
        return <Tablet className="w-8 h-8" />;
      default:
        return <Monitor className="w-8 h-8" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Sessions</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your active sessions across all devices
          </p>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={revokeAllSessions}
            isLoading={isRevokingAll}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Revoke All Other Sessions
          </Button>
        )}
      </div>

      {/* Security Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="flex items-start gap-3 py-4">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">Security Tip</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              If you see any sessions you don&apos;t recognize, revoke them immediately and change
              your password.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No active sessions found</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card
              key={session._id}
              className={session.isCurrent ? 'ring-2 ring-primary-500' : ''}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        session.isCurrent
                          ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {session.browser} on {session.os}
                        </h3>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {session.ipAddress}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {session.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {getRelativeTime(session.lastActive)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Started: {formatDate(session.createdAt)}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeSession(session._id)}
                      isLoading={isRevoking === session._id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
