import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  twoFactorSchema,
  backupCodeSchema,
  updateProfileSchema,
} from '../auth.schema';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Please enter a valid email address');
      }
    });

    it('rejects empty password', () => {
      const data = {
        email: 'test@example.com',
        password: '',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('rejects missing email', () => {
      const data = {
        password: 'password123',
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('validates correct registration data', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short first name', () => {
      const data = { ...validData, firstName: 'J' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('First name must be at least 2 characters');
      }
    });

    it('rejects long first name', () => {
      const data = { ...validData, firstName: 'A'.repeat(51) };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('First name must be less than 50 characters');
      }
    });

    it('rejects short last name', () => {
      const data = { ...validData, lastName: 'D' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const data = { ...validData, password: 'password123!', confirmPassword: 'password123!' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must contain at least one uppercase letter');
      }
    });

    it('rejects password without lowercase', () => {
      const data = { ...validData, password: 'PASSWORD123!', confirmPassword: 'PASSWORD123!' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must contain at least one lowercase letter');
      }
    });

    it('rejects password without number', () => {
      const data = { ...validData, password: 'Password!!!', confirmPassword: 'Password!!!' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must contain at least one number');
      }
    });

    it('rejects password without special character', () => {
      const data = { ...validData, password: 'Password123', confirmPassword: 'Password123' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must contain at least one special character');
      }
    });

    it('rejects short password', () => {
      const data = { ...validData, password: 'Pass1!', confirmPassword: 'Pass1!' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Password must be at least 8 characters');
      }
    });

    it('rejects mismatched passwords', () => {
      const data = { ...validData, confirmPassword: 'DifferentPassword123!' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });
  });

  describe('forgotPasswordSchema', () => {
    it('validates correct email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    const validData = {
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('validates correct reset password data', () => {
      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects weak password', () => {
      const data = {
        password: 'weak',
        confirmPassword: 'weak',
      };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects mismatched passwords', () => {
      const data = {
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      };
      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });
  });

  describe('changePasswordSchema', () => {
    const validData = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('validates correct change password data', () => {
      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty current password', () => {
      const data = { ...validData, currentPassword: '' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Current password is required');
      }
    });

    it('rejects weak new password', () => {
      const data = { ...validData, newPassword: 'weak', confirmPassword: 'weak' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('rejects mismatched new passwords', () => {
      const data = { ...validData, confirmPassword: 'Different123!' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('twoFactorSchema', () => {
    it('validates correct 6-digit code', () => {
      const result = twoFactorSchema.safeParse({ code: '123456' });
      expect(result.success).toBe(true);
    });

    it('rejects code with less than 6 digits', () => {
      const result = twoFactorSchema.safeParse({ code: '12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Code must be 6 digits');
      }
    });

    it('rejects code with more than 6 digits', () => {
      const result = twoFactorSchema.safeParse({ code: '1234567' });
      expect(result.success).toBe(false);
    });

    it('rejects code with letters', () => {
      const result = twoFactorSchema.safeParse({ code: '12345a' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Code must contain only numbers');
      }
    });

    it('rejects empty code', () => {
      const result = twoFactorSchema.safeParse({ code: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('backupCodeSchema', () => {
    it('validates correct backup code', () => {
      const result = backupCodeSchema.safeParse({ code: 'ABCD-1234' });
      expect(result.success).toBe(true);
    });

    it('transforms code to uppercase', () => {
      const result = backupCodeSchema.safeParse({ code: 'abcd-1234' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('ABCD-1234');
      }
    });

    it('removes invalid characters', () => {
      const result = backupCodeSchema.safeParse({ code: 'ABCD 1234!' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('ABCD1234');
      }
    });

    it('rejects short backup code', () => {
      const result = backupCodeSchema.safeParse({ code: 'ABC' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Backup code is required');
      }
    });
  });

  describe('updateProfileSchema', () => {
    it('validates correct profile update data', () => {
      const result = updateProfileSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result.success).toBe(true);
    });

    it('allows partial updates with only firstName', () => {
      const result = updateProfileSchema.safeParse({ firstName: 'John' });
      expect(result.success).toBe(true);
    });

    it('allows partial updates with only lastName', () => {
      const result = updateProfileSchema.safeParse({ lastName: 'Doe' });
      expect(result.success).toBe(true);
    });

    it('allows empty object (no updates)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects short firstName when provided', () => {
      const result = updateProfileSchema.safeParse({ firstName: 'J' });
      expect(result.success).toBe(false);
    });

    it('rejects long firstName when provided', () => {
      const result = updateProfileSchema.safeParse({ firstName: 'A'.repeat(51) });
      expect(result.success).toBe(false);
    });
  });
});
