import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TwoFactorPage from '../two-factor/page';
import { useAuthStore } from '@/store/authStore';

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('TwoFactorPage', () => {
  const mockVerify2FA = jest.fn();
  const mockVerifyBackupCode = jest.fn();
  const mockReset2FA = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    // Default mock setup - user is in 2FA flow
    mockUseAuthStore.mockReturnValue({
      verify2FA: mockVerify2FA,
      verifyBackupCode: mockVerifyBackupCode,
      reset2FA: mockReset2FA,
      requires2FA: true,
      isLoading: false,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      tempToken: 'test-temp-token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setUser: jest.fn(),
      setAccessToken: jest.fn(),
      refreshUser: jest.fn(),
    });
  });

  describe('Initial Render', () => {
    it('should render the 2FA page when in 2FA flow', () => {
      render(<TwoFactorPage />);

      expect(screen.getByRole('heading', { name: /two-factor authentication/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
    });

    it('should show TOTP form by default', () => {
      render(<TwoFactorPage />);

      expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();
      expect(screen.getByText(/use a backup code instead/i)).toBeInTheDocument();
    });

    it('should have back to login button', () => {
      render(<TwoFactorPage />);

      expect(screen.getByText(/back to login/i)).toBeInTheDocument();
    });
  });

  describe('TOTP Verification', () => {
    it('should submit TOTP code', async () => {
      mockVerify2FA.mockResolvedValueOnce({});

      render(<TwoFactorPage />);

      const codeInput = screen.getByPlaceholderText('000000');
      await userEvent.type(codeInput, '123456');
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(mockVerify2FA).toHaveBeenCalledWith('123456');
      });
    });

    it('should redirect to dashboard on successful verification', async () => {
      const toast = require('react-hot-toast').default;
      mockVerify2FA.mockResolvedValueOnce({});

      render(<TwoFactorPage />);

      const codeInput = screen.getByPlaceholderText('000000');
      await userEvent.type(codeInput, '123456');
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Login successful!');
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error on invalid code', async () => {
      const toast = require('react-hot-toast').default;
      mockVerify2FA.mockRejectedValueOnce({
        response: { data: { error: { message: 'Invalid code' } } },
      });

      render(<TwoFactorPage />);

      const codeInput = screen.getByPlaceholderText('000000');
      await userEvent.type(codeInput, '000000');
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid code');
      });
    });

    it('should validate code format', async () => {
      render(<TwoFactorPage />);

      const codeInput = screen.getByPlaceholderText('000000');
      await userEvent.type(codeInput, '123');
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText(/6 digits/i)).toBeInTheDocument();
      });
    });
  });

  describe('Backup Code Flow', () => {
    it('should switch to backup code form', async () => {
      render(<TwoFactorPage />);

      fireEvent.click(screen.getByText(/use a backup code instead/i));

      await waitFor(() => {
        expect(screen.getByText(/enter one of your backup codes/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
      });
    });

    it('should switch back to TOTP form', async () => {
      render(<TwoFactorPage />);

      // Switch to backup code
      fireEvent.click(screen.getByText(/use a backup code instead/i));

      await waitFor(() => {
        expect(screen.getByText(/use authenticator app instead/i)).toBeInTheDocument();
      });

      // Switch back
      fireEvent.click(screen.getByText(/use authenticator app instead/i));

      await waitFor(() => {
        expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();
      });
    });

    it('should submit backup code', async () => {
      mockVerifyBackupCode.mockResolvedValueOnce({});

      render(<TwoFactorPage />);

      fireEvent.click(screen.getByText(/use a backup code instead/i));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
      });

      const codeInput = screen.getByPlaceholderText('XXXX-XXXX');
      await userEvent.type(codeInput, 'ABCD-1234');
      fireEvent.click(screen.getByRole('button', { name: /verify backup code/i }));

      await waitFor(() => {
        expect(mockVerifyBackupCode).toHaveBeenCalledWith('ABCD-1234');
      });
    });

    it('should redirect on successful backup code verification', async () => {
      const toast = require('react-hot-toast').default;
      mockVerifyBackupCode.mockResolvedValueOnce({});

      render(<TwoFactorPage />);

      fireEvent.click(screen.getByText(/use a backup code instead/i));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeInTheDocument();
      });

      await userEvent.type(screen.getByPlaceholderText('XXXX-XXXX'), 'ABCD-1234');
      fireEvent.click(screen.getByRole('button', { name: /verify backup code/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Login successful!');
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Back Button', () => {
    it('should reset 2FA state and go back to login', async () => {
      render(<TwoFactorPage />);

      fireEvent.click(screen.getByText(/back to login/i));

      await waitFor(() => {
        expect(mockReset2FA).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });
    });
  });

  describe('Error State Display', () => {
    it('should display server error message', async () => {
      mockVerify2FA.mockRejectedValueOnce({
        response: { data: { error: { message: 'Too many attempts' } } },
      });

      render(<TwoFactorPage />);

      await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));

      await waitFor(() => {
        expect(screen.getByText('Too many attempts')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state', () => {
      mockUseAuthStore.mockReturnValue({
        verify2FA: mockVerify2FA,
        verifyBackupCode: mockVerifyBackupCode,
        reset2FA: mockReset2FA,
        requires2FA: true,
        isLoading: true,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        tempToken: 'test-temp-token',
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        setUser: jest.fn(),
        setAccessToken: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<TwoFactorPage />);

      const button = screen.getByRole('button', { name: /verify/i });
      expect(button).toHaveAttribute('disabled');
    });
  });
});
