import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;

        // Update the token in store
        useAuthStore.getState().setAccessToken(accessToken);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        useAuthStore.getState().logout();

        // Redirect to login if on client side
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async () => {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // 2FA
  enable2FA: async () => {
    const response = await api.post('/auth/2fa/enable');
    return response.data;
  },

  verify2FASetup: async (code: string) => {
    const response = await api.post('/auth/2fa/verify-setup', { code });
    return response.data;
  },

  verify2FA: async (code: string, tempToken: string) => {
    const response = await api.post('/auth/2fa/verify', { code, tempToken });
    return response.data;
  },

  verifyBackupCode: async (code: string, tempToken: string) => {
    const response = await api.post('/auth/2fa/backup', { code, tempToken });
    return response.data;
  },

  disable2FA: async (code: string) => {
    const response = await api.post('/auth/2fa/disable', { code });
    return response.data;
  },
};

// OAuth API
export const oauthApi = {
  getStatus: async () => {
    const response = await api.get('/auth/oauth/status');
    return response.data;
  },

  unlinkProvider: async (provider: 'google' | 'github' | 'facebook') => {
    const response = await api.delete(`/auth/oauth/${provider}`);
    return response.data;
  },

  // OAuth initiation URLs
  getGoogleAuthUrl: () => `${API_URL}/auth/google`,
  getGitHubAuthUrl: () => `${API_URL}/auth/github`,
  getFacebookAuthUrl: () => `${API_URL}/auth/facebook`,
};

export const userApi = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/users/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/users/account');
    return response.data;
  },

  getSessions: async () => {
    const response = await api.get('/users/sessions');
    return response.data;
  },

  revokeSession: async (sessionId: string) => {
    const response = await api.delete(`/users/sessions/${sessionId}`);
    return response.data;
  },

  revokeAllSessions: async () => {
    const response = await api.delete('/users/sessions');
    return response.data;
  },
};

export default api;
