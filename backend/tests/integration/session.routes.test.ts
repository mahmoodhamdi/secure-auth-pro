import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';
import { Session } from '../../src/models/Session.model';
import { authService } from '../../src/services/auth.service';

describe('Session Routes', () => {
  let accessToken: string;
  let userId: string;
  let sessionId: string;

  beforeEach(async () => {
    // Create and login a test user
    const result = await authService.register({
      email: 'session-routes-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Session',
      lastName: 'Test',
    });

    userId = result.user._id.toString();

    await User.findByIdAndUpdate(result.user._id, { isEmailVerified: true });

    const loginResult = await authService.login(
      { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
      '127.0.0.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    if ('accessToken' in loginResult) {
      accessToken = loginResult.accessToken;
    }

    // Get the session ID
    const session = await Session.findOne({ userId });
    if (session) {
      sessionId = session._id.toString();
    }
  });

  describe('GET /api/users/sessions', () => {
    it('should return active sessions for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
    });

    it('should include session details', async () => {
      const response = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      const session = response.body.data.sessions[0];
      expect(session).toHaveProperty('_id');
      expect(session).toHaveProperty('userAgent');
      expect(session).toHaveProperty('ipAddress');
      expect(session).toHaveProperty('isActive');
      expect(session).toHaveProperty('lastActivity');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/users/sessions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should show multiple sessions', async () => {
      // Create additional sessions by logging in again
      await authService.login(
        { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0 Firefox'
      );

      await authService.login(
        { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
        '10.0.0.1',
        'Mozilla/5.0 Chrome'
      );

      const response = await request(app)
        .get('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.sessions.length).toBe(3);
    });
  });

  describe('DELETE /api/users/sessions/:id', () => {
    let secondSessionId: string;

    beforeEach(async () => {
      // Create another session
      await authService.login(
        { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0 Firefox'
      );

      const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
      secondSessionId = sessions[0]._id.toString();
    });

    it('should revoke a specific session', async () => {
      const response = await request(app)
        .delete(`/api/users/sessions/${secondSessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify session is revoked
      const session = await Session.findById(secondSessionId);
      expect(session?.isActive).toBe(false);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/users/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow revoking another user session', async () => {
      // Create another user
      const otherResult = await authService.register({
        email: 'other-user@example.com',
        password: 'TestPassword123!',
        firstName: 'Other',
        lastName: 'User',
      });

      await User.findByIdAndUpdate(otherResult.user._id, { isEmailVerified: true });

      const otherLoginResult = await authService.login(
        { email: 'other-user@example.com', password: 'TestPassword123!' },
        '127.0.0.1',
        'Mozilla/5.0'
      );

      let otherAccessToken = '';
      if ('accessToken' in otherLoginResult) {
        otherAccessToken = otherLoginResult.accessToken;
      }

      // Try to revoke first user's session with second user's token
      const response = await request(app)
        .delete(`/api/users/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${otherAccessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/users/sessions/${sessionId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/users/sessions', () => {
    beforeEach(async () => {
      // Create multiple sessions
      await authService.login(
        { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
        '192.168.1.2',
        'Mozilla/5.0 Firefox'
      );

      await authService.login(
        { email: 'session-routes-test@example.com', password: 'TestPassword123!' },
        '10.0.0.1',
        'Mozilla/5.0 Chrome'
      );
    });

    it('should revoke all sessions except current', async () => {
      // Count sessions before revoking
      const sessionsBefore = await Session.find({ userId, isActive: true });

      // Pass current session ID to exclude it from revocation
      const response = await request(app)
        .delete(`/api/users/sessions?current=${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.revokedCount).toBe(sessionsBefore.length - 1);

      // Verify only one session remains active (the current one)
      const activeSessions = await Session.find({ userId, isActive: true });
      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0]._id.toString()).toBe(sessionId);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/users/sessions');

      expect(response.status).toBe(401);
    });

    it('should handle case with only one session', async () => {
      // First, revoke all other sessions
      await request(app)
        .delete('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      // Now try again with only one session
      const response = await request(app)
        .delete('/api/users/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.revokedCount).toBe(0);
    });
  });
});
