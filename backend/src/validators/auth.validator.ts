import { z } from 'zod';

// Password validation regex
const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

// Register schema
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(passwordRegex.uppercase, 'Password must contain at least one uppercase letter')
    .regex(passwordRegex.lowercase, 'Password must contain at least one lowercase letter')
    .regex(passwordRegex.number, 'Password must contain at least one number')
    .regex(passwordRegex.special, 'Password must contain at least one special character'),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(passwordRegex.uppercase, 'Password must contain at least one uppercase letter')
    .regex(passwordRegex.lowercase, 'Password must contain at least one lowercase letter')
    .regex(passwordRegex.number, 'Password must contain at least one number')
    .regex(passwordRegex.special, 'Password must contain at least one special character'),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(passwordRegex.uppercase, 'Password must contain at least one uppercase letter')
    .regex(passwordRegex.lowercase, 'Password must contain at least one lowercase letter')
    .regex(passwordRegex.number, 'Password must contain at least one number')
    .regex(passwordRegex.special, 'Password must contain at least one special character'),
});

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// 2FA verify schema
export const verify2FASchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
  tempToken: z.string().min(1, 'Temp token is required'),
});

// 2FA setup verify schema
export const verify2FASetupSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

// Backup code schema
export const backupCodeSchema = z.object({
  code: z
    .string()
    .transform((val) => val.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
    .refine((val) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val), {
      message: 'Invalid backup code format',
    }),
  tempToken: z.string().min(1, 'Temp token is required'),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // Can come from cookie
});

// Types
export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
export type Verify2FADto = z.infer<typeof verify2FASchema>;
export type Verify2FASetupDto = z.infer<typeof verify2FASetupSchema>;
export type BackupCodeDto = z.infer<typeof backupCodeSchema>;
