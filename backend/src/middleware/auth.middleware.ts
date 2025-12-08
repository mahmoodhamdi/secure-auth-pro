import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types.js';
import { verifyAccessToken } from '../config/jwt.js';
import { isBlacklisted } from '../config/redis.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { User } from '../models/User.model.js';
import { UserRole } from '../types/auth.types.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Check if token is blacklisted
    const blacklisted = await isBlacklisted(token);
    if (blacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user payload to request
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const blacklisted = await isBlacklisted(token);
        if (!blacklisted) {
          const decoded = verifyAccessToken(token);
          req.user = decoded;
        }
      }
    }

    next();
  } catch {
    // Ignore errors and continue without authentication
    next();
  }
};

/**
 * Load current user from database
 */
export const loadUser = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is disabled', 'AUTH_003');
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('User not authenticated'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
};

/**
 * Require email verification middleware
 */
export const requireVerifiedEmail = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new UnauthorizedError('User not loaded');
    }

    if (!req.currentUser.isEmailVerified) {
      throw new ForbiddenError('Please verify your email first', 'AUTH_002');
    }

    next();
  } catch (error) {
    next(error);
  }
};
