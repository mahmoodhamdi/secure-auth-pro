import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express.types.js';
import { twoFactorService } from '../services/twoFactor.service.js';
import { authService } from '../services/auth.service.js';
import { verifyTempToken } from '../config/jwt.js';
import { getClientIp } from '../utils/helpers.js';
import { User } from '../models/User.model.js';
import { AppError } from '../utils/errors.js';

/**
 * Enable 2FA - Generate setup data
 * POST /api/auth/2fa/enable
 */
export const enable2FA = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    // Check if 2FA is already enabled
    if (req.currentUser.isTwoFactorEnabled) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_007', message: '2FA is already enabled' },
      });
      return;
    }

    const setupData = await twoFactorService.generateSetup(
      req.currentUser._id.toString(),
      req.currentUser.email
    );

    res.json({
      success: true,
      data: {
        qrCode: setupData.qrCode,
        manualEntryKey: setupData.manualEntryKey,
      },
      message: 'Scan the QR code with your authenticator app, then verify with a code.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA setup and enable
 * POST /api/auth/2fa/verify-setup
 */
export const verify2FASetup = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    const { code } = req.body;

    const result = await twoFactorService.verifyAndEnable(
      req.currentUser._id.toString(),
      code
    );

    res.json({
      success: true,
      data: {
        backupCodes: result.backupCodes,
      },
      message: '2FA enabled successfully. Save your backup codes in a safe place.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA code during login
 * POST /api/auth/2fa/verify
 */
export const verify2FALogin = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, tempToken } = req.body;

    // Verify temp token
    const { userId } = verifyTempToken(tempToken);

    // Verify 2FA code
    const isValid = await twoFactorService.verifyCode(userId, code);

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_007', message: 'Invalid verification code' },
      });
      return;
    }

    // Get user and create session
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_001');
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const loginResult = await authService.createAuthSession(user, ipAddress, userAgent);

    res.json({
      success: true,
      data: loginResult,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify backup code during login
 * POST /api/auth/2fa/backup
 */
export const verifyBackupCode = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, tempToken } = req.body;

    // Verify temp token
    const { userId } = verifyTempToken(tempToken);

    // Verify backup code
    const isValid = await twoFactorService.verifyAndUseBackupCode(userId, code);

    if (!isValid) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_007', message: 'Invalid backup code' },
      });
      return;
    }

    // Get user and create session
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_001');
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const loginResult = await authService.createAuthSession(user, ipAddress, userAgent);

    // Get remaining backup codes count
    const remainingCodes = await twoFactorService.getBackupCodesCount(userId);

    res.json({
      success: true,
      data: {
        ...loginResult,
        remainingBackupCodes: remainingCodes,
      },
      message: `Login successful. You have ${remainingCodes} backup codes remaining.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
export const disable2FA = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    // Check if 2FA is enabled
    if (!req.currentUser.isTwoFactorEnabled) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_007', message: '2FA is not enabled' },
      });
      return;
    }

    const { code } = req.body;

    await twoFactorService.disable(req.currentUser._id.toString(), code);

    res.json({
      success: true,
      message: '2FA has been disabled.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate backup codes
 * POST /api/auth/2fa/regenerate-backup
 */
export const regenerateBackupCodes = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    if (!req.currentUser.isTwoFactorEnabled) {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_007', message: '2FA is not enabled' },
      });
      return;
    }

    const { code } = req.body;

    const backupCodes = await twoFactorService.regenerateBackupCodes(
      req.currentUser._id.toString(),
      code
    );

    res.json({
      success: true,
      data: { backupCodes },
      message: 'New backup codes generated. Save them in a safe place.',
    });
  } catch (error) {
    next(error);
  }
};
