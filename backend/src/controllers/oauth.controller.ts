import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { config } from '../config/env.js';
import { oauthService } from '../services/oauth.service.js';
import { isOAuthProviderConfigured } from '../config/oauth.js';
import { OAuthProfile, OAuthProvider } from '../types/auth.types.js';
import { AuthenticatedRequest, ApiResponse } from '../types/express.types.js';
import { getClientIp } from '../utils/helpers.js';
import { AppError } from '../utils/errors.js';

// Cookie options for refresh token
const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * Generate OAuth callback handler
 */
const createOAuthCallbackHandler = (provider: OAuthProvider) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = req.user as OAuthProfile;

      if (!profile) {
        throw new AppError('OAuth authentication failed', 401, 'OAUTH_001');
      }

      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];

      const result = await oauthService.handleOAuthCallback(
        profile,
        ipAddress,
        userAgent
      );

      // Redirect to frontend with token
      const redirectUrl = new URL(`${config.frontendUrl}/auth/oauth-callback`);
      redirectUrl.searchParams.set('token', result.accessToken);
      redirectUrl.searchParams.set('isNewUser', result.isNewUser.toString());

      res.redirect(redirectUrl.toString());
    } catch (error) {
      // Redirect to frontend with error
      const errorUrl = new URL(`${config.frontendUrl}/auth/login`);
      errorUrl.searchParams.set('error', 'oauth_failed');
      errorUrl.searchParams.set(
        'message',
        error instanceof AppError ? error.message : 'OAuth authentication failed'
      );

      res.redirect(errorUrl.toString());
    }
  };
};

/**
 * Google OAuth - Initiate
 * GET /api/auth/google
 */
export const googleAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isOAuthProviderConfigured('google')) {
    res.status(501).json({
      success: false,
      error: { code: 'OAUTH_001', message: 'Google OAuth is not configured' },
    });
    return;
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
};

/**
 * Google OAuth - Callback
 * GET /api/auth/google/callback
 */
export const googleCallback = [
  (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.frontendUrl}/auth/login?error=oauth_failed`,
    })(req, res, next);
  },
  createOAuthCallbackHandler('google'),
];

/**
 * GitHub OAuth - Initiate
 * GET /api/auth/github
 */
export const githubAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isOAuthProviderConfigured('github')) {
    res.status(501).json({
      success: false,
      error: { code: 'OAUTH_001', message: 'GitHub OAuth is not configured' },
    });
    return;
  }

  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })(req, res, next);
};

/**
 * GitHub OAuth - Callback
 * GET /api/auth/github/callback
 */
export const githubCallback = [
  (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('github', {
      session: false,
      failureRedirect: `${config.frontendUrl}/auth/login?error=oauth_failed`,
    })(req, res, next);
  },
  createOAuthCallbackHandler('github'),
];

/**
 * Facebook OAuth - Initiate
 * GET /api/auth/facebook
 */
export const facebookAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!isOAuthProviderConfigured('facebook')) {
    res.status(501).json({
      success: false,
      error: { code: 'OAUTH_001', message: 'Facebook OAuth is not configured' },
    });
    return;
  }

  passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
  })(req, res, next);
};

/**
 * Facebook OAuth - Callback
 * GET /api/auth/facebook/callback
 */
export const facebookCallback = [
  (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate('facebook', {
      session: false,
      failureRedirect: `${config.frontendUrl}/auth/login?error=oauth_failed`,
    })(req, res, next);
  },
  createOAuthCallbackHandler('facebook'),
];

/**
 * Get OAuth connection status
 * GET /api/auth/oauth/status
 */
export const getOAuthStatus = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    const status = await oauthService.getOAuthStatus(req.user.userId);

    res.json({
      success: true,
      data: {
        connections: status,
        available: {
          google: isOAuthProviderConfigured('google'),
          github: isOAuthProviderConfigured('github'),
          facebook: isOAuthProviderConfigured('facebook'),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unlink OAuth provider
 * DELETE /api/auth/oauth/:provider
 */
export const unlinkOAuthProvider = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_001', message: 'Unauthorized' },
      });
      return;
    }

    const { provider } = req.params;

    if (!['google', 'github', 'facebook'].includes(provider)) {
      res.status(400).json({
        success: false,
        error: { code: 'VAL_001', message: 'Invalid OAuth provider' },
      });
      return;
    }

    await oauthService.unlinkOAuthProvider(req.user.userId, provider as OAuthProvider);

    res.json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully`,
    });
  } catch (error) {
    next(error);
  }
};
