import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a random token (for email verification, password reset, etc.)
 */
export const generateRandomToken = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token using SHA-256 (for storing in database)
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a secure random string (for backup codes, etc.)
 */
export const generateSecureCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }

  return result;
};

/**
 * Generate backup codes for 2FA
 */
export const generateBackupCodes = (count = 10): string[] => {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX
    const part1 = generateSecureCode(4);
    const part2 = generateSecureCode(4);
    codes.push(`${part1}-${part2}`);
  }

  return codes;
};

/**
 * Hash backup codes for storage
 */
export const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
};

/**
 * Verify a backup code
 */
export const verifyBackupCode = async (
  code: string,
  hashedCodes: string[]
): Promise<number> => {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(code, hashedCodes[i]);
    if (isMatch) {
      return i; // Return index of matched code
    }
  }
  return -1; // No match found
};
