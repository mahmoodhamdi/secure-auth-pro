import { User } from '../../src/models/User.model';
import { authService } from '../../src/services/auth.service';
import { Types } from 'mongoose';
import speakeasy from 'speakeasy';

// Get the mocked Redis functions
const mockRedis = {
  redisGet: jest.fn(),
  redisSet: jest.fn(),
  redisDel: jest.fn(),
};

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
import { twoFactorService } from '../../src/services/twoFactor.service';
import { redisGet, redisSet, redisDel } from '../../src/config/redis';

const mockRedisGet = redisGet as jest.MockedFunction<typeof redisGet>;
const mockRedisSet = redisSet as jest.MockedFunction<typeof redisSet>;
const mockRedisDel = redisDel as jest.MockedFunction<typeof redisDel>;

describe('TwoFactorService', () => {
  let testUser: { _id: Types.ObjectId; email: string; firstName: string };
  let testSecret: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a test user
    const result = await authService.register({
      email: '2fa-test@example.com',
      password: 'TestPassword123!',
      firstName: 'TwoFactor',
      lastName: 'Test',
    });
    testUser = {
      _id: result.user._id,
      email: result.user.email,
      firstName: result.user.firstName,
    };

    // Generate a test secret
    testSecret = speakeasy.generateSecret({ length: 32 }).base32;
  });

  describe('generateSetup', () => {
    it('should generate 2FA setup with QR code', async () => {
      mockRedisSet.mockResolvedValue(undefined);

      const result = await twoFactorService.generateSetup(
        testUser._id.toString(),
        testUser.email
      );

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('verifyAndEnable', () => {
    it('should enable 2FA with valid code', async () => {
      mockRedisGet.mockResolvedValue(testSecret);
      mockRedisDel.mockResolvedValue(1);

      // Generate valid TOTP code
      const validCode = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const result = await twoFactorService.verifyAndEnable(
        testUser._id.toString(),
        validCode
      );

      expect(result.success).toBe(true);
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes).toHaveLength(10);

      // Verify user is updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.isTwoFactorEnabled).toBe(true);
    });

    it('should throw error when setup expired', async () => {
      mockRedisGet.mockResolvedValue(null);

      await expect(
        twoFactorService.verifyAndEnable(testUser._id.toString(), '123456')
      ).rejects.toThrow('2FA setup expired');
    });

    it('should throw error for invalid code', async () => {
      mockRedisGet.mockResolvedValue(testSecret);

      await expect(
        twoFactorService.verifyAndEnable(testUser._id.toString(), '000000')
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('verifyCode', () => {
    beforeEach(async () => {
      // Enable 2FA for the test user
      await User.findByIdAndUpdate(testUser._id, {
        twoFactorSecret: testSecret,
        isTwoFactorEnabled: true,
      });
    });

    it('should verify valid TOTP code', async () => {
      const validCode = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const isValid = await twoFactorService.verifyCode(
        testUser._id.toString(),
        validCode
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const isValid = await twoFactorService.verifyCode(
        testUser._id.toString(),
        '000000'
      );

      expect(isValid).toBe(false);
    });

    it('should throw error for user without 2FA enabled', async () => {
      // Disable 2FA
      await User.findByIdAndUpdate(testUser._id, {
        $unset: { twoFactorSecret: 1 },
        isTwoFactorEnabled: false,
      });

      await expect(
        twoFactorService.verifyCode(testUser._id.toString(), '123456')
      ).rejects.toThrow('2FA not enabled');
    });
  });

  describe('disable', () => {
    beforeEach(async () => {
      await User.findByIdAndUpdate(testUser._id, {
        twoFactorSecret: testSecret,
        isTwoFactorEnabled: true,
      });
    });

    it('should disable 2FA with valid code', async () => {
      const validCode = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      await twoFactorService.disable(testUser._id.toString(), validCode);

      const user = await User.findById(testUser._id);
      expect(user?.isTwoFactorEnabled).toBe(false);
    });

    it('should reject disable request with invalid code', async () => {
      await expect(
        twoFactorService.disable(testUser._id.toString(), '000000')
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        isTwoFactorEnabled: true,
      });

      const isEnabled = await twoFactorService.is2FAEnabled(testUser._id.toString());
      expect(isEnabled).toBe(true);
    });

    it('should return false when 2FA is disabled', async () => {
      const isEnabled = await twoFactorService.is2FAEnabled(testUser._id.toString());
      expect(isEnabled).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const fakeUserId = new Types.ObjectId().toString();
      const isEnabled = await twoFactorService.is2FAEnabled(fakeUserId);
      expect(isEnabled).toBe(false);
    });
  });

  describe('getBackupCodesCount', () => {
    it('should return correct backup codes count', async () => {
      const mockBackupCodes = ['code1', 'code2', 'code3', 'code4', 'code5'];
      await User.findByIdAndUpdate(testUser._id, {
        backupCodes: mockBackupCodes,
      });

      const count = await twoFactorService.getBackupCodesCount(testUser._id.toString());
      expect(count).toBe(5);
    });

    it('should return 0 when no backup codes', async () => {
      const count = await twoFactorService.getBackupCodesCount(testUser._id.toString());
      expect(count).toBe(0);
    });
  });
});
