import { act } from '@testing-library/react';
import { useAuthStore } from '../authStore';
import { authApi } from '@/lib/axios';

// Mock the axios module
jest.mock('@/lib/axios', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    verify2FA: jest.fn(),
    verifyBackupCode: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('authStore', () => {
  const mockUser = {
    _id: '123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isEmailVerified: true,
    isTwoFactorEnabled: false,
    role: 'user' as const,
  };

  beforeEach(() => {
    // Reset store state before each test
    const { setState } = useAuthStore;
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      requires2FA: false,
      tempToken: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.requires2FA).toBe(false);
      expect(state.tempToken).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and update state', async () => {
      mockAuthApi.login.mockResolvedValueOnce({
        data: {
          user: mockUser,
          accessToken: 'test-token',
        },
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@example.com', password: 'password' });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('test-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should handle 2FA requirement', async () => {
      mockAuthApi.login.mockResolvedValueOnce({
        data: {
          requires2FA: true,
          tempToken: 'temp-token-123',
        },
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@example.com', password: 'password' });
      });

      const state = useAuthStore.getState();
      expect(state.requires2FA).toBe(true);
      expect(state.tempToken).toBe('temp-token-123');
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should set isLoading during login', async () => {
      let loadingState: boolean | undefined;

      mockAuthApi.login.mockImplementationOnce(async () => {
        loadingState = useAuthStore.getState().isLoading;
        return {
          data: {
            user: mockUser,
            accessToken: 'test-token',
          },
        };
      });

      await act(async () => {
        await useAuthStore.getState().login({ email: 'test@example.com', password: 'password' });
      });

      expect(loadingState).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should reset isLoading on error', async () => {
      mockAuthApi.login.mockRejectedValueOnce(new Error('Login failed'));

      await act(async () => {
        try {
          await useAuthStore.getState().login({ email: 'test@example.com', password: 'password' });
        } catch {
          // Expected error
        }
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should throw error on failed login', async () => {
      const error = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValueOnce(error);

      await expect(
        useAuthStore.getState().login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      mockAuthApi.register.mockResolvedValueOnce({
        data: {
          message: 'Registration successful',
        },
      });

      await act(async () => {
        await useAuthStore.getState().register({
          email: 'new@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should reset isLoading on registration error', async () => {
      mockAuthApi.register.mockRejectedValueOnce(new Error('Email already exists'));

      await act(async () => {
        try {
          await useAuthStore.getState().register({
            email: 'existing@example.com',
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe',
          });
        } catch {
          // Expected error
        }
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should reset state on logout', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
      });

      mockAuthApi.logout.mockResolvedValueOnce({});

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should reset state even if logout API fails', async () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
      });

      mockAuthApi.logout.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('verify2FA', () => {
    it('should verify 2FA and complete login', async () => {
      useAuthStore.setState({
        requires2FA: true,
        tempToken: 'temp-token-123',
      });

      mockAuthApi.verify2FA.mockResolvedValueOnce({
        data: {
          user: mockUser,
          accessToken: 'new-token',
        },
      });

      await act(async () => {
        await useAuthStore.getState().verify2FA('123456');
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('new-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.requires2FA).toBe(false);
      expect(state.tempToken).toBeNull();
    });

    it('should throw error if no temp token', async () => {
      useAuthStore.setState({
        requires2FA: true,
        tempToken: null,
      });

      await expect(useAuthStore.getState().verify2FA('123456')).rejects.toThrow(
        'No temp token available'
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify backup code and complete login', async () => {
      useAuthStore.setState({
        requires2FA: true,
        tempToken: 'temp-token-123',
      });

      mockAuthApi.verifyBackupCode.mockResolvedValueOnce({
        data: {
          user: mockUser,
          accessToken: 'new-token',
        },
      });

      await act(async () => {
        await useAuthStore.getState().verifyBackupCode('ABCD-1234');
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setUser', () => {
    it('should set user and update isAuthenticated', () => {
      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear authentication when setting user to null', () => {
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
      });

      act(() => {
        useAuthStore.getState().setUser(null);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setAccessToken', () => {
    it('should set access token', () => {
      act(() => {
        useAuthStore.getState().setAccessToken('new-token');
      });

      expect(useAuthStore.getState().accessToken).toBe('new-token');
    });

    it('should clear access token when set to null', () => {
      useAuthStore.setState({ accessToken: 'old-token' });

      act(() => {
        useAuthStore.getState().setAccessToken(null);
      });

      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data', async () => {
      const updatedUser = { ...mockUser, firstName: 'Jane' };
      mockAuthApi.getCurrentUser.mockResolvedValueOnce({
        data: { user: updatedUser },
      });

      await act(async () => {
        await useAuthStore.getState().refreshUser();
      });

      expect(useAuthStore.getState().user).toEqual(updatedUser);
    });

    it('should reset state on refresh failure', async () => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'test-token',
        isAuthenticated: true,
      });

      mockAuthApi.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));

      await act(async () => {
        try {
          await useAuthStore.getState().refreshUser();
        } catch {
          // Expected error
        }
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('reset2FA', () => {
    it('should reset 2FA state', () => {
      useAuthStore.setState({
        requires2FA: true,
        tempToken: 'temp-token-123',
      });

      act(() => {
        useAuthStore.getState().reset2FA();
      });

      const state = useAuthStore.getState();
      expect(state.requires2FA).toBe(false);
      expect(state.tempToken).toBeNull();
    });
  });
});
