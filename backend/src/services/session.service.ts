import { Session } from '../models/Session.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { SessionInfo } from '../types/auth.types.js';
import { Types } from 'mongoose';

class SessionService {
  /**
   * Get all active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await Session.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    })
      .sort({ lastActivity: -1 })
      .lean();

    return sessions as SessionInfo[];
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await Session.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    if (!session.isActive) {
      throw new ForbiddenError('Session already revoked');
    }

    // Deactivate session
    session.isActive = false;
    await session.save();

    // Revoke associated refresh token
    await RefreshToken.updateOne(
      { _id: session.refreshTokenId },
      { $set: { isRevoked: true } }
    );
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<{ revokedCount: number }> {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      isActive: true,
    };

    if (currentSessionId) {
      query._id = { $ne: new Types.ObjectId(currentSessionId) };
    }

    // Get sessions to revoke
    const sessionsToRevoke = await Session.find(query).select('refreshTokenId');
    const refreshTokenIds = sessionsToRevoke.map((s) => s.refreshTokenId);

    // Deactivate sessions
    const result = await Session.updateMany(query, { $set: { isActive: false } });

    // Revoke associated refresh tokens
    if (refreshTokenIds.length > 0) {
      await RefreshToken.updateMany(
        { _id: { $in: refreshTokenIds } },
        { $set: { isRevoked: true } }
      );
    }

    return { revokedCount: result.modifiedCount };
  }

  /**
   * Update session last activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    await Session.updateOne(
      { _id: new Types.ObjectId(sessionId) },
      { $set: { lastActivity: new Date() } }
    );
  }

  /**
   * Get session by refresh token ID
   */
  async getSessionByRefreshToken(refreshTokenId: string): Promise<SessionInfo | null> {
    const session = await Session.findOne({
      refreshTokenId: new Types.ObjectId(refreshTokenId),
      isActive: true,
    }).lean();

    return session as SessionInfo | null;
  }

  /**
   * Count active sessions for a user
   */
  async countActiveSessions(userId: string): Promise<number> {
    return Session.countDocuments({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });
  }

  /**
   * Clean up expired sessions (called periodically)
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    // Find sessions with revoked refresh tokens
    const revokedTokens = await RefreshToken.find({ isRevoked: true }).select('_id');
    const revokedTokenIds = revokedTokens.map((t) => t._id);

    // Deactivate associated sessions
    const result = await Session.updateMany(
      {
        refreshTokenId: { $in: revokedTokenIds },
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    return { deletedCount: result.modifiedCount };
  }
}

export const sessionService = new SessionService();
