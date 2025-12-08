import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '../register/page';
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

describe('RegisterPage', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      register: mockRegister,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthStore>);
  });

  describe('rendering', () => {
    it('renders registration form', () => {
      render(<RegisterPage />);

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByText('Sign up to get started with SecureAuth Pro')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    });

    it('renders password requirements', () => {
      render(<RegisterPage />);

      expect(screen.getByText('Password must contain:')).toBeInTheDocument();
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
      expect(screen.getByText('One special character')).toBeInTheDocument();
    });

    it('renders terms checkbox', () => {
      render(<RegisterPage />);
      expect(screen.getByLabelText(/I agree to the/i)).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      render(<RegisterPage />);
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('renders OAuth buttons', () => {
      render(<RegisterPage />);
      expect(screen.getByTitle('Sign up with Google')).toBeInTheDocument();
      expect(screen.getByTitle('Sign up with GitHub')).toBeInTheDocument();
      expect(screen.getByTitle('Sign up with Facebook')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('does not call register with empty form', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /^create account$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).not.toHaveBeenCalled();
      });
    });

    it('does not call register with incomplete form', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const firstNameInput = screen.getByPlaceholderText('First name');
      const submitButton = screen.getByRole('button', { name: /^create account$/i });

      await user.type(firstNameInput, 'John');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).not.toHaveBeenCalled();
      });
    });
  });

  describe('form submission', () => {
    const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
      const termsCheckbox = screen.getByLabelText(/I agree to the/i);

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('Email address'), 'john@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'Password123!');
      await user.type(screen.getByPlaceholderText('Confirm password'), 'Password123!');
      await user.click(termsCheckbox);
    };

    it('calls register with correct data', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<RegisterPage />);

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /^create account$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });
      });
    });

    it('displays server error message', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Email already registered',
            },
          },
        },
      };
      mockRegister.mockRejectedValueOnce(error);

      const user = userEvent.setup();
      render(<RegisterPage />);

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /^create account$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('displays generic error when no specific message', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<RegisterPage />);

      await fillValidForm(user);

      const submitButton = screen.getByRole('button', { name: /^create account$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading state when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        register: mockRegister,
        isLoading: true,
      } as unknown as ReturnType<typeof useAuthStore>);

      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /^create account$/i });
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

      render(<RegisterPage />);

      const googleButton = screen.getByTitle('Sign up with Google');
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

      render(<RegisterPage />);

      const githubButton = screen.getByTitle('Sign up with GitHub');
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

      render(<RegisterPage />);

      const facebookButton = screen.getByTitle('Sign up with Facebook');
      fireEvent.click(facebookButton);

      expect(window.location.href).toBe('http://localhost:5000/api/auth/facebook');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });
});
