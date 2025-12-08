import { User } from '../models/User.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { Session } from '../models/Session.model.js';
import { generateAccessToken, generateRefreshToken } from '../config/jwt.js';
import { config } from '../config/env.js';
import { generateRandomToken } from '../utils/encryption.js';
import { parseUserAgent, calculateExpiry } from '../utils/helpers.js';
import { AppError, ConflictError } from '../utils/errors.js';
import { OAuthProfile, OAuthProvider, LoginResponse } from '../types/auth.types.js';
import { IUser } from '../types/user.types.js';
import { emailService } from './email.service.js';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../utils/encryption.js';

class OAuthService {
  /**
   * Handle OAuth login/registration
   */
  async handleOAuthCallback(
    profile: OAuthProfile,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ user: IUser; accessToken: string; isNewUser: boolean }> {
    const { id, email, firstName, lastName, avatar, provider } = profile;

    if (!email) {
      throw new AppError('Email is required from OAuth provider', 400, 'OAUTH_001');
    }

    // Try to find user by OAuth provider ID
    let user = await this.findUserByOAuthId(provider, id);
    let isNewUser = false;

    if (!user) {
      // Try to find user by email
      user = await User.findOne({ email });

      if (user) {
        // Link OAuth account to existing user
        await this.linkOAuthAccount(user, provider, id, email);
      } else {
        // Create new user
        user = await this.createOAuthUser(profile);
        isNewUser = true;
      }
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is disabled', 403, 'AUTH_003');
    }

    // Create session and generate tokens
    const authResult = await this.createOAuthSession(user, ipAddress, userAgent);

    // Send welcome email for new users
    if (isNewUser) {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        'oauth-verified' // Special token for OAuth users
      ).catch((err) => {
        // Log but don't fail if email fails
        console.error('Failed to send welcome email:', err);
      });
    }

    return {
      user,
      accessToken: authResult.accessToken,
      isNewUser,
    };
  }

  /**
   * Find user by OAuth provider ID
   */
  private async findUserByOAuthId(
    provider: OAuthProvider,
    providerId: string
  ): Promise<IUser | null> {
    const query: Record<string, unknown> = {};
    query[`oauthProviders.${provider}.id`] = providerId;
    return User.findOne(query);
  }

  /**
   * Link OAuth account to existing user
   */
  private async linkOAuthAccount(
    user: IUser,
    provider: OAuthProvider,
    providerId: string,
    providerEmail: string
  ): Promise<void> {
    // Check if this provider is already linked to another account
    const existingLink = await this.findUserByOAuthId(provider, providerId);
    if (existingLink && existingLink._id.toString() !== user._id.toString()) {
      throw new ConflictError(
        `This ${provider} account is already linked to another user`,
        'OAUTH_002'
      );
    }

    // Update user with OAuth provider info
    const updateQuery: Record<string, unknown> = {};
    updateQuery[`oauthProviders.${provider}`] = {
      id: providerId,
      email: providerEmail,
    };

    await User.findByIdAndUpdate(user._id, { $set: updateQuery });
  }

  /**
   * Create new user from OAuth profile
   */
  private async createOAuthUser(profile: OAuthProfile): Promise<IUser> {
    const { id, email, firstName, lastName, avatar, provider } = profile;

    // Generate a random password for OAuth users (they won't use it)
    const randomPassword = generateRandomToken(32) + 'Aa1!';

    const oauthProviders: Record<string, { id: string; email: string }> = {};
    oauthProviders[provider] = { id, email };

    const user = await User.create({
      email,
      password: randomPassword,
      firstName: firstName || 'User',
      lastName: lastName || provider.charAt(0).toUpperCase() + provider.slice(1),
      avatar,
      isEmailVerified: true, // OAuth emails are pre-verified
      oauthProviders,
    });

    return user;
  }

  /**
   * Create OAuth session with tokens
   */
  private async createOAuthSession(
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
   * Unlink OAuth provider from user account
   */
  async unlinkOAuthProvider(userId: string, provider: OAuthProvider): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new AppError('User not found', 404, 'USER_001');
    }

    // Check if user has a password set (required if unlinking last OAuth provider)
    const hasPassword = user.password && !user.password.startsWith('oauth-');
    const linkedProviders = this.getLinkedProviders(user);

    if (linkedProviders.length <= 1 && !hasPassword) {
      throw new AppError(
        'Cannot unlink the last OAuth provider. Please set a password first.',
        400,
        'OAUTH_001'
      );
    }

    // Unlink the provider
    const updateQuery: Record<string, unknown> = {};
    updateQuery[`oauthProviders.${provider}`] = 1;

    await User.findByIdAndUpdate(userId, { $unset: updateQuery });
  }

  /**
   * Get linked OAuth providers for a user
   */
  getLinkedProviders(user: IUser): OAuthProvider[] {
    const providers: OAuthProvider[] = [];

    if (user.oauthProviders?.google?.id) providers.push('google');
    if (user.oauthProviders?.github?.id) providers.push('github');
    if (user.oauthProviders?.facebook?.id) providers.push('facebook');

    return providers;
  }

  /**
   * Get OAuth connection status for a user
   */
  async getOAuthStatus(userId: string): Promise<{
    google: boolean;
    github: boolean;
    facebook: boolean;
  }> {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404, 'USER_001');
    }

    return {
      google: !!user.oauthProviders?.google?.id,
      github: !!user.oauthProviders?.github?.id,
      facebook: !!user.oauthProviders?.facebook?.id,
    };
  }
}

export const oauthService = new OAuthService();
