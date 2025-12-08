import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express.types.js';
import { authService } from '../services/auth.service.js';
import { config } from '../config/env.js';
import { hashToken } from '../utils/encryption.js';
import { getClientIp } from '../utils/helpers.js';
import { LoginResponse, TwoFactorResponse } from '../types/auth.types.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: { user: result.user.toSafeObject() },
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<LoginResponse | TwoFactorResponse>>,
  next: NextFunction
): Promise<void> => {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(req.body, ipAddress, userAgent);

    // Check if 2FA is required
    if ('requires2FA' in result) {
      res.json({
        success: true,
        data: result,
        message: 'Two-factor authentication required',
      });
      return;
    }

    // Set refresh token in HTTP-only cookie
    // Note: In a real implementation, you'd also return the refresh token
    // For now, we're just returning the access token

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1] || '';
    const refreshToken = req.cookies?.refreshToken;

    await authService.logout(accessToken, refreshToken);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Refresh token not provided',
        },
      });
      return;
    }

    const result = await authService.refreshAccessToken(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.forgotPassword(req.body.email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.verifyEmail(req.body.token);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now login.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Unauthorized',
        },
      });
      return;
    }

    await authService.resendVerificationEmail(req.user.userId);

    res.json({
      success: true,
      message: 'Verification email sent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Unauthorized',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: { user: req.currentUser.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};
