import { sessionService } from '../../src/services/session.service';
import { Session } from '../../src/models/Session.model';
import { RefreshToken } from '../../src/models/RefreshToken.model';
import { User } from '../../src/models/User.model';
import { authService } from '../../src/services/auth.service';
import { Types } from 'mongoose';

describe('SessionService', () => {
  let testUser: { _id: Types.ObjectId; email: string };
  let testSessionId: string;
  let testRefreshTokenId: Types.ObjectId;

  beforeEach(async () => {
    // Create a test user
    const result = await authService.register({
      email: 'session-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Session',
      lastName: 'Test',
    });
    testUser = { _id: result.user._id, email: result.user.email };

    // Verify email to allow login
    await User.findByIdAndUpdate(testUser._id, { isEmailVerified: true });

    // Create a login session
    const loginResult = await authService.login(
      { email: testUser.email, password: 'TestPassword123!' },
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Get the session created
    const session = await Session.findOne({ userId: testUser._id });
    if (session) {
      testSessionId = session._id.toString();
      testRefreshTokenId = session.refreshTokenId;
    }
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for user', async () => {
      const sessions = await sessionService.getActiveSessions(testUser._id.toString());

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0]).toHaveProperty('userId');
      expect(sessions[0]).toHaveProperty('isActive', true);
    });

    it('should return empty array for user with no sessions', async () => {
      // Create a new user without sessions
      const newUser = await User.create({
        email: 'nosessions@example.com',
        password: 'TestPassword123!',
        firstName: 'No',
        lastName: 'Sessions',
      });

      const sessions = await sessionService.getActiveSessions(newUser._id.toString());
      expect(sessions).toEqual([]);
    });

    it('should sort sessions by last activity descending', async () => {
      // Create another session by logging in again
      await authService.login(
        { email: testUser.email, password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0 Chrome'
      );

      const sessions = await sessionService.getActiveSessions(testUser._id.toString());

      expect(sessions.length).toBe(2);
      // Most recent should be first
      if (sessions.length >= 2) {
        expect(new Date(sessions[0].lastActivity).getTime())
          .toBeGreaterThanOrEqual(new Date(sessions[1].lastActivity).getTime());
      }
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      await sessionService.revokeSession(testSessionId, testUser._id.toString());

      const session = await Session.findById(testSessionId);
      expect(session?.isActive).toBe(false);

      // Check refresh token is also revoked
      const refreshToken = await RefreshToken.findById(testRefreshTokenId);
      expect(refreshToken?.isRevoked).toBe(true);
    });

    it('should throw NotFoundError for non-existent session', async () => {
      const fakeSessionId = new Types.ObjectId().toString();

      await expect(
        sessionService.revokeSession(fakeSessionId, testUser._id.toString())
      ).rejects.toThrow('Session not found');
    });

    it('should throw NotFoundError when revoking another user session', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'TestPassword123!',
        firstName: 'Other',
        lastName: 'User',
      });

      await expect(
        sessionService.revokeSession(testSessionId, otherUser._id.toString())
      ).rejects.toThrow('Session not found');
    });

    it('should throw ForbiddenError for already revoked session', async () => {
      // First revoke
      await sessionService.revokeSession(testSessionId, testUser._id.toString());

      // Try to revoke again
      await expect(
        sessionService.revokeSession(testSessionId, testUser._id.toString())
      ).rejects.toThrow('Session already revoked');
    });
  });

  describe('revokeAllSessions', () => {
    beforeEach(async () => {
      // Create multiple sessions
      await authService.login(
        { email: testUser.email, password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0 Chrome'
      );
      await authService.login(
        { email: testUser.email, password: 'TestPassword123!' },
        '192.168.1.3',
        'Mozilla/5.0 Firefox'
      );
    });

    it('should revoke all sessions', async () => {
      const result = await sessionService.revokeAllSessions(testUser._id.toString());

      expect(result.revokedCount).toBe(3);

      const activeSessions = await Session.find({
        userId: testUser._id,
        isActive: true,
      });
      expect(activeSessions).toHaveLength(0);
    });

    it('should exclude current session when specified', async () => {
      const result = await sessionService.revokeAllSessions(
        testUser._id.toString(),
        testSessionId
      );

      expect(result.revokedCount).toBe(2);

      // Current session should still be active
      const currentSession = await Session.findById(testSessionId);
      expect(currentSession?.isActive).toBe(true);
    });
  });

  describe('countActiveSessions', () => {
    it('should return correct count of active sessions', async () => {
      const count = await sessionService.countActiveSessions(testUser._id.toString());
      expect(count).toBe(1);

      // Add more sessions
      await authService.login(
        { email: testUser.email, password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0'
      );

      const newCount = await sessionService.countActiveSessions(testUser._id.toString());
      expect(newCount).toBe(2);
    });

    it('should return 0 for user with no sessions', async () => {
      const newUser = await User.create({
        email: 'nocount@example.com',
        password: 'TestPassword123!',
        firstName: 'No',
        lastName: 'Count',
      });

      const count = await sessionService.countActiveSessions(newUser._id.toString());
      expect(count).toBe(0);
    });
  });

  describe('updateActivity', () => {
    it('should update session last activity timestamp', async () => {
      const beforeSession = await Session.findById(testSessionId);
      const beforeTime = beforeSession?.lastActivity;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await sessionService.updateActivity(testSessionId);

      const afterSession = await Session.findById(testSessionId);
      expect(afterSession?.lastActivity.getTime()).toBeGreaterThan(beforeTime!.getTime());
    });
  });

  describe('getSessionByRefreshToken', () => {
    it('should return session for valid refresh token', async () => {
      const session = await sessionService.getSessionByRefreshToken(
        testRefreshTokenId.toString()
      );

      expect(session).toBeDefined();
      expect(session?.isActive).toBe(true);
    });

    it('should return null for non-existent refresh token', async () => {
      const fakeTokenId = new Types.ObjectId().toString();
      const session = await sessionService.getSessionByRefreshToken(fakeTokenId);

      expect(session).toBeNull();
    });

    it('should return null for revoked session', async () => {
      await sessionService.revokeSession(testSessionId, testUser._id.toString());

      const session = await sessionService.getSessionByRefreshToken(
        testRefreshTokenId.toString()
      );

      expect(session).toBeNull();
    });
  });
});
