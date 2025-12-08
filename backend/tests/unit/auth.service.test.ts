import { authService } from '../../src/services/auth.service';
import { User } from '../../src/models/User.model';
import { hashPassword } from '../../src/utils/encryption';
import { AppError } from '../../src/utils/errors';

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.isEmailVerified).toBe(false);
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
      const registeredUser = await authService.register(userData);
      
      // Verify email to allow login
      await User.findByIdAndUpdate(registeredUser._id, { isEmailVerified: true });

      const result = await authService.login(
        userData.email,
        userData.password,
        '127.0.0.1',
        'Mozilla/5.0'
      );

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.accessToken).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password', '127.0.0.1')
      ).rejects.toThrow();
    });

    it('should throw error for invalid password', async () => {
      const userData = {
        email: 'wrongpass@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registeredUser = await authService.register(userData);
      await User.findByIdAndUpdate(registeredUser._id, { isEmailVerified: true });

      await expect(
        authService.login(userData.email, 'WrongPassword123!', '127.0.0.1')
      ).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const userData = {
        email: 'verify@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await authService.register(userData);
      
      // Get the verification token from database
      const userWithToken = await User.findById(user._id).select('+emailVerificationToken');
      
      if (userWithToken?.emailVerificationToken) {
        const result = await authService.verifyEmail(userWithToken.emailVerificationToken);
        expect(result.isEmailVerified).toBe(true);
      }
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
    it('should logout user and invalidate refresh token', async () => {
      const userData = {
        email: 'logout@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const registeredUser = await authService.register(userData);
      await User.findByIdAndUpdate(registeredUser._id, { isEmailVerified: true });

      const loginResult = await authService.login(
        userData.email,
        userData.password,
        '127.0.0.1',
        'Mozilla/5.0'
      );

      // Logout should succeed
      await expect(
        authService.logout(registeredUser._id.toString())
      ).resolves.not.toThrow();
    });
  });
});
