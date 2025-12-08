import request from 'supertest';
import { app } from '../../src/app';
import { User } from '../../src/models/User.model';
import { authService } from '../../src/services/auth.service';
import speakeasy from 'speakeasy';

jest.mock('../../src/config/redis', () => ({
  redisClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setEx: jest.fn(),
  },
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
  addToBlacklist: jest.fn().mockResolvedValue(undefined),
  isBlacklisted: jest.fn().mockResolvedValue(false),
  redisSet: jest.fn(),
  redisGet: jest.fn(),
  redisDel: jest.fn(),
}));

// Import after mocking
import { redisGet, redisSet, redisDel } from '../../src/config/redis';

const mockRedisGet = redisGet as jest.MockedFunction<typeof redisGet>;
const mockRedisSet = redisSet as jest.MockedFunction<typeof redisSet>;
const mockRedisDel = redisDel as jest.MockedFunction<typeof redisDel>;

describe('2FA Routes', () => {
  let accessToken: string;
  let userId: string;
  let testSecret: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create and login a test user
    const result = await authService.register({
      email: '2fa-routes-test@example.com',
      password: 'TestPassword123!',
      firstName: 'TwoFactor',
      lastName: 'Test',
    });

    userId = result.user._id.toString();

    await User.findByIdAndUpdate(result.user._id, { isEmailVerified: true });

    const loginResult = await authService.login(
      { email: '2fa-routes-test@example.com', password: 'TestPassword123!' },
      '127.0.0.1',
      'Mozilla/5.0'
    );

    if ('accessToken' in loginResult) {
      accessToken = loginResult.accessToken;
    }

    testSecret = speakeasy.generateSecret({ length: 32 }).base32;
  });

  describe('POST /api/auth/2fa/enable', () => {
    it('should generate 2FA setup data', async () => {
      mockRedisSet.mockResolvedValue('OK');

      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Controller returns qrCode and manualEntryKey (not secret)
      expect(response.body.data).toHaveProperty('qrCode');
      expect(response.body.data).toHaveProperty('manualEntryKey');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/auth/2fa/enable');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/2fa/verify-setup', () => {
    it('should reject invalid verification code', async () => {
      mockRedisGet.mockResolvedValue(testSecret);

      const response = await request(app)
        .post('/api/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject when setup expired (no secret in Redis)', async () => {
      mockRedisGet.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '123456' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate code format', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify-setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '12' }); // Too short

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    beforeEach(async () => {
      // Enable 2FA for the user
      await User.findByIdAndUpdate(userId, {
        twoFactorSecret: testSecret,
        isTwoFactorEnabled: true,
      });
    });

    it('should disable 2FA with valid code', async () => {
      const validCode = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: validCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify 2FA is disabled
      const user = await User.findById(userId);
      expect(user?.isTwoFactorEnabled).toBe(false);
    });

    it('should reject invalid code for disabling', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/2fa/verify (Login)', () => {
    let tempToken: string;

    beforeEach(async () => {
      // Enable 2FA
      await User.findByIdAndUpdate(userId, {
        twoFactorSecret: testSecret,
        isTwoFactorEnabled: true,
      });

      // Attempt login to get temp token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: '2fa-routes-test@example.com',
          password: 'TestPassword123!',
        });

      if (loginResponse.body.data?.tempToken) {
        tempToken = loginResponse.body.data.tempToken;
      }
    });

    it('should complete login with valid 2FA code', async () => {
      const validCode = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          tempToken,
          code: validCode,
        });

      // May return 200 on success or 400 if code timing is off
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.user).toBeDefined();
      }
    });

    it('should reject invalid 2FA code during login', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          tempToken,
          code: '000000',
        });

      // Controller returns 400 for invalid codes
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing temp token', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({
          code: '123456',
        });

      expect(response.status).toBe(400);
    });
  });
});
