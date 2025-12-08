import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User.model.js';
import { redisSet, redisGet, redisDel } from '../config/redis.js';
import { generateBackupCodes, hashBackupCodes, verifyBackupCode } from '../utils/encryption.js';
import { AppError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { IUser } from '../types/user.types.js';
import { emailService } from './email.service.js';

interface TwoFactorSetupResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface TwoFactorVerifyResult {
  success: boolean;
  backupCodes?: string[];
}

class TwoFactorService {
  private readonly APP_NAME = 'SecureAuth Pro';
  private readonly TEMP_SECRET_PREFIX = '2fa_temp_secret:';
  private readonly TEMP_SECRET_EXPIRY = 600; // 10 minutes

  /**
   * Generate 2FA secret and QR code
   */
  async generateSetup(userId: string, email: string): Promise<TwoFactorSetupResult> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${email})`,
      issuer: this.APP_NAME,
      length: 32,
    });

    // Store secret temporarily in Redis (not in DB until verified)
    await redisSet(
      `${this.TEMP_SECRET_PREFIX}${userId}`,
      secret.base32,
      this.TEMP_SECRET_EXPIRY
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCode,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verifyAndEnable(userId: string, code: string): Promise<TwoFactorVerifyResult> {
    // Get temporary secret from Redis
    const tempSecret = await redisGet(`${this.TEMP_SECRET_PREFIX}${userId}`);

    if (!tempSecret) {
      throw new AppError('2FA setup expired. Please start again.', 400, 'AUTH_007');
    }

    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1, // Allow 1 step before/after for clock drift
    });

    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'AUTH_007');
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Update user with 2FA enabled
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          twoFactorSecret: tempSecret,
          isTwoFactorEnabled: true,
          backupCodes: hashedBackupCodes,
        },
      },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    // Delete temporary secret from Redis
    await redisDel(`${this.TEMP_SECRET_PREFIX}${userId}`);

    // Send notification email
    await emailService.send2FAEnabledEmail(user.email, user.firstName);

    return {
      success: true,
      backupCodes, // Return plain backup codes (one-time display)
    };
  }

  /**
   * Verify 2FA code during login
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      throw new AppError('2FA not enabled for this user', 400, 'AUTH_007');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    return isValid;
  }

  /**
   * Verify backup code during login
   */
  async verifyAndUseBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findById(userId).select('+backupCodes');

    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      throw new AppError('No backup codes available', 400, 'AUTH_007');
    }

    // Format code (remove dashes and uppercase)
    const formattedCode = code.toUpperCase().replace(/-/g, '');
    const codeWithDash = `${formattedCode.slice(0, 4)}-${formattedCode.slice(4)}`;

    // Find and verify backup code
    const codeIndex = await verifyBackupCode(codeWithDash, user.backupCodes);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    user.backupCodes.splice(codeIndex, 1);
    await user.save();

    return true;
  }

  /**
   * Disable 2FA
   */
  async disable(userId: string, code: string): Promise<void> {
    // First verify the code
    const isValid = await this.verifyCode(userId, code);

    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'AUTH_007');
    }

    // Disable 2FA
    await User.findByIdAndUpdate(userId, {
      $unset: {
        twoFactorSecret: 1,
        backupCodes: 1,
      },
      $set: {
        isTwoFactorEnabled: false,
      },
    });
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    // Verify current 2FA code
    const isValid = await this.verifyCode(userId, code);

    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'AUTH_007');
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Update user with new backup codes
    await User.findByIdAndUpdate(userId, {
      $set: { backupCodes: hashedBackupCodes },
    });

    return backupCodes;
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await User.findById(userId).select('isTwoFactorEnabled');
    return user?.isTwoFactorEnabled ?? false;
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesCount(userId: string): Promise<number> {
    const user = await User.findById(userId).select('+backupCodes');
    return user?.backupCodes?.length ?? 0;
  }
}

export const twoFactorService = new TwoFactorService();
