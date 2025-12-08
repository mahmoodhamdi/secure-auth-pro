import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express.types.js';
import { User } from '../models/User.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { Session } from '../models/Session.model.js';
import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';

/**
 * Get user profile
 * GET /api/users/profile
 */
export const getProfile = async (
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

    res.json({
      success: true,
      data: { user: req.currentUser.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateProfile = async (
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

    const { firstName, lastName, avatar } = req.body;

    // Update allowed fields only
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      req.currentUser._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new AppError('User not found', 404, 'USER_001');
    }

    res.json({
      success: true,
      data: { user: updatedUser.toSafeObject() },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * PUT /api/users/password
 */
export const changePassword = async (
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

    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.currentUser._id.toString(),
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * DELETE /api/users/account
 */
export const deleteAccount = async (
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

    const userId = req.currentUser._id;

    // Delete all refresh tokens
    await RefreshToken.deleteMany({ userId });

    // Delete all sessions
    await Session.deleteMany({ userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
