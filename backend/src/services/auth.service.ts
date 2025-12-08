import { User } from '../models/User.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { Session } from '../models/Session.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTempToken,
  verifyRefreshToken,
  getTokenExpirySeconds,
} from '../config/jwt.js';
import { addToBlacklist } from '../config/redis.js';
import { config } from '../config/env.js';
import {
  generateRandomToken,
  hashToken,
  hashPassword,
} from '../utils/encryption.js';
import { parseUserAgent, calculateExpiry } from '../utils/helpers.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  AppError,
} from '../utils/errors.js';
import { RegisterDto, LoginDto } from '../validators/auth.validator.js';
import { IUser } from '../types/user.types.js';
import { LoginResponse, TwoFactorResponse, AuthTokens } from '../types/auth.types.js';
import { emailService } from './email.service.js';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDto): Promise<{ user: IUser; message: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Generate email verification token
    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    // Create user
    const user = await User.create({
      ...data,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: calculateExpiry('24h'),
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

    return {
      user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login user
   */
  async login(
    data: LoginDto,
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResponse | TwoFactorResponse> {
    // Find user with password
    const user = await User.findOne({ email: data.email }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is disabled', 'AUTH_003');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ForbiddenError('Please verify your email first', 'AUTH_002');
    }

    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      const tempToken = generateTempToken(user._id.toString());
      return {
        requires2FA: true,
        tempToken,
      };
    }

    // Generate tokens and create session
    return this.createAuthSession(user, ipAddress, userAgent);
  }

  /**
   * Create authentication session with tokens
   */
  async createAuthSession(
    user: IUser,
    ipAddress: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    const tokenId = uuidv4();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user._id.toString(), tokenId);

    // Calculate refresh token expiry
    const refreshExpiry = calculateExpiry(config.jwt.refreshExpiry);

    // Store refresh token
    const refreshTokenDoc = await RefreshToken.create({
      userId: user._id,
      token: hashToken(refreshToken),
      expiresAt: refreshExpiry,
      userAgent,
      ipAddress,
    });

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent);

    // Create session
    await Session.create({
      userId: user._id,
      refreshTokenId: refreshTokenDoc._id,
      userAgent: userAgent || 'Unknown',
      ipAddress,
      ...deviceInfo,
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toSafeObject(),
      accessToken,
    };
  }

  /**
   * Logout user
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    const expirySeconds = getTokenExpirySeconds(accessToken);
    if (expirySeconds > 0) {
      await addToBlacklist(accessToken, expirySeconds);
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      const tokenDoc = await RefreshToken.findOne({ token: hashedToken });

      if (tokenDoc) {
        tokenDoc.isRevoked = true;
        await tokenDoc.save();

        // Deactivate associated session
        await Session.updateOne(
          { refreshTokenId: tokenDoc._id },
          { $set: { isActive: false } }
        );
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    const hashedToken = hashToken(refreshToken);

    // Find token in database
    const tokenDoc = await RefreshToken.findOne({
      token: hashedToken,
      isRevoked: false,
    });

    if (!tokenDoc) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      tokenDoc.isRevoked = true;
      await tokenDoc.save();
      throw new UnauthorizedError('Refresh token expired');
    }

    // Find user
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    // Update session activity
    await Session.updateOne(
      { refreshTokenId: tokenDoc._id },
      { $set: { lastActivity: new Date() } }
    );

    return { accessToken };
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    // Save token to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = calculateExpiry('1h');
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = hashToken(token);

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'AUTH_005');
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all refresh tokens (force re-login on all devices)
    await RefreshToken.updateMany(
      { userId: user._id, isRevoked: false },
      { $set: { isRevoked: true } }
    );

    // Deactivate all sessions
    await Session.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false } }
    );

    // Send confirmation email
    await emailService.sendPasswordChangedEmail(user.email, user.firstName);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'AUTH_005');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    if (user.isEmailVerified) {
      throw new AppError('Email already verified', 400, 'AUTH_002');
    }

    // Generate new verification token
    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = calculateExpiry('24h');
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect', 'USER_003');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send notification email
    await emailService.sendPasswordChangedEmail(user.email, user.firstName);
  }
}

export const authService = new AuthService();
