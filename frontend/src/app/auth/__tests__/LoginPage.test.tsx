import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../login/page';
import { useAuthStore } from '@/store/authStore';

// Mock the modules
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useRedirectIfAuthenticated: jest.fn(),
}));

jest.mock('@/lib/axios', () => ({
  oauthApi: {
    getGoogleAuthUrl: () => 'http://localhost:5000/api/auth/google',
    getGitHubAuthUrl: () => 'http://localhost:5000/api/auth/github',
    getFacebookAuthUrl: () => 'http://localhost:5000/api/auth/facebook',
  },
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('LoginPage', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      requires2FA: false,
    } as ReturnType<typeof useAuthStore>);
  });

  describe('rendering', () => {
    it('renders login form', () => {
      render(<LoginPage />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    });

    it('renders remember me checkbox', () => {
      render(<LoginPage />);
      expect(screen.getByText('Remember me')).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<LoginPage />);
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('renders sign up link', () => {
      render(<LoginPage />);
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('renders OAuth buttons', () => {
      render(<LoginPage />);
      expect(screen.getByTitle('Sign in with Google')).toBeInTheDocument();
      expect(screen.getByTitle('Sign in with GitHub')).toBeInTheDocument();
      expect(screen.getByTitle('Sign in with Facebook')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('does not call login with empty form', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Wait a bit to ensure async validation completes
      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });

    it('does not call login with only email filled', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  describe('form submission', () => {
    it('calls login with correct credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('displays server error message', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Invalid credentials',
            },
          },
        },
      };
      mockLogin.mockRejectedValueOnce(error);

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('displays generic error when no specific message', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading state when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        requires2FA: false,
      } as ReturnType<typeof useAuthStore>);

      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('OAuth buttons', () => {
    it('Google button redirects to Google OAuth', () => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      render(<LoginPage />);

      const googleButton = screen.getByTitle('Sign in with Google');
      fireEvent.click(googleButton);

      expect(window.location.href).toBe('http://localhost:5000/api/auth/google');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('GitHub button redirects to GitHub OAuth', () => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      render(<LoginPage />);

      const githubButton = screen.getByTitle('Sign in with GitHub');
      fireEvent.click(githubButton);

      expect(window.location.href).toBe('http://localhost:5000/api/auth/github');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('Facebook button redirects to Facebook OAuth', () => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      render(<LoginPage />);

      const facebookButton = screen.getByTitle('Sign in with Facebook');
      fireEvent.click(facebookButton);

      expect(window.location.href).toBe('http://localhost:5000/api/auth/facebook');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });
});
