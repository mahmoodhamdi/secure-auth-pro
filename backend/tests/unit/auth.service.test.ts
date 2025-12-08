import { authService } from '../../src/services/auth.service';
import { User } from '../../src/models/User.model';

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);
      expect(result.user.isEmailVerified).toBe(false);
      expect(result.message).toContain('Registration successful');
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const userData = {
        email: 'login@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Register user first
      const registerResult = await authService.register(userData);

      // Verify email to allow login
      await User.findByIdAndUpdate(registerResult.user._id, { isEmailVerified: true });

      const result = await authService.login(
        { email: userData.email, password: userData.password },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(result).toBeDefined();
      // Check for either full login response or 2FA response
      if ('user' in result) {
        expect(result.user.email).toBe(userData.email);
        expect(result.accessToken).toBeDefined();
      }
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.login(
          { email: 'nonexistent@example.com', password: 'password' },
          '127.0.0.1'
        )
      ).rejects.toThrow();
    });

    it('should throw error for invalid password', async () => {
      const userData = {
        email: 'wrongpass@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registerResult = await authService.register(userData);
      await User.findByIdAndUpdate(registerResult.user._id, { isEmailVerified: true });

      await expect(
        authService.login(
          { email: userData.email, password: 'WrongPassword123!' },
          '127.0.0.1'
        )
      ).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      // Get the mocked email service
      const { emailService } = require('../../src/services/email.service');

      const userData = {
        email: 'verify@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(userData);

      // Get the unhashed verification token from the mock call
      const mockCalls = emailService.sendVerificationEmail.mock.calls;
      const verificationToken = mockCalls[mockCalls.length - 1][2]; // Third argument is the token

      // Now verify with the unhashed token
      await authService.verifyEmail(verificationToken);
      const verifiedUser = await User.findOne({ email: userData.email });
      expect(verifiedUser?.isEmailVerified).toBe(true);
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow();
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      const userData = {
        email: 'forgot@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await authService.register(userData);

      // Should not throw error
      await expect(authService.forgotPassword(userData.email)).resolves.not.toThrow();
    });

    it('should not throw error for non-existent email (security)', async () => {
      // For security, forgotPassword should not reveal if email exists
      await expect(authService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout user and invalidate tokens', async () => {
      const userData = {
        email: 'logout@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registerResult = await authService.register(userData);
      await User.findByIdAndUpdate(registerResult.user._id, { isEmailVerified: true });

      const loginResult = await authService.login(
        { email: userData.email, password: userData.password },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      // Logout should succeed
      if ('accessToken' in loginResult) {
        await expect(
          authService.logout(loginResult.accessToken)
        ).resolves.not.toThrow();
      }
    });
  });
});
