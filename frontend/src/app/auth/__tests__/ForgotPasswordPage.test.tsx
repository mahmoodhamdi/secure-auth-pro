import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '../forgot-password/page';
import { authApi } from '@/lib/axios';

// Mock the axios module
jest.mock('@/lib/axios', () => ({
  authApi: {
    forgotPassword: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
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

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the forgot password form', () => {
      render(<ForgotPasswordPage />);

      expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should have back to login link', () => {
      render(<ForgotPasswordPage />);

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/auth/login');
    });

    it('should show descriptive text', () => {
      render(<ForgotPasswordPage />);

      expect(
        screen.getByText(/enter your email address and we'll send you a link/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should not submit form with invalid email', async () => {
      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.click(submitButton);

      // Form should not call API with invalid email
      expect(mockAuthApi.forgotPassword).not.toHaveBeenCalled();
    });

    it('should not submit form with empty email', async () => {
      render(<ForgotPasswordPage />);

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(submitButton);

      // Form should not call API with empty email
      expect(mockAuthApi.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit with valid email', async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({});

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAuthApi.forgotPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should show success state after submission', async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({});

      render(<ForgotPasswordPage />);

      const emailInput = screen.getByPlaceholderText(/email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/link will expire in 1 hour/i)).toBeInTheDocument();
    });

    it('should show try another email button after success', async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({});

      render(<ForgotPasswordPage />);

      await userEvent.type(screen.getByPlaceholderText(/email address/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try another email/i })).toBeInTheDocument();
      });
    });

    it('should return to form when clicking try another email', async () => {
      mockAuthApi.forgotPassword.mockResolvedValueOnce({});

      render(<ForgotPasswordPage />);

      await userEvent.type(screen.getByPlaceholderText(/email address/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try another email/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /try another email/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error', async () => {
      const toast = require('react-hot-toast').default;
      mockAuthApi.forgotPassword.mockRejectedValueOnce({
        response: { data: { error: { message: 'Server error' } } },
      });

      render(<ForgotPasswordPage />);

      await userEvent.type(screen.getByPlaceholderText(/email address/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should show generic error for unknown errors', async () => {
      const toast = require('react-hot-toast').default;
      mockAuthApi.forgotPassword.mockRejectedValueOnce(new Error('Network error'));

      render(<ForgotPasswordPage />);

      await userEvent.type(screen.getByPlaceholderText(/email address/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      let resolvePromise: () => void;
      mockAuthApi.forgotPassword.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePromise = () => resolve({});
          })
      );

      render(<ForgotPasswordPage />);

      await userEvent.type(screen.getByPlaceholderText(/email address/i), 'test@example.com');
      fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

      // Button should be in loading state
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('disabled');
      });

      // Resolve the promise
      resolvePromise!();
    });
  });
});
