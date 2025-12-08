import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/express.types.js';
import { sessionService } from '../services/session.service.js';

/**
 * Get all active sessions
 * GET /api/users/sessions
 */
export const getSessions = async (
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

    const sessions = await sessionService.getActiveSessions(
      req.currentUser._id.toString()
    );

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke a specific session
 * DELETE /api/users/sessions/:id
 */
export const revokeSession = async (
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

    const { id } = req.params;

    await sessionService.revokeSession(id, req.currentUser._id.toString());

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke all sessions except current
 * DELETE /api/users/sessions
 */
export const revokeAllSessions = async (
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

    // Get current session ID from query param (optional)
    const currentSessionId = req.query.current as string | undefined;

    const result = await sessionService.revokeAllSessions(
      req.currentUser._id.toString(),
      currentSessionId
    );

    res.json({
      success: true,
      data: result,
      message: `${result.revokedCount} session(s) revoked successfully`,
    });
  } catch (error) {
    next(error);
  }
};
