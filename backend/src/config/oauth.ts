import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { config } from './env.js';
import { User } from '../models/User.model.js';
import { OAuthProfile, OAuthProvider } from '../types/auth.types.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize Passport OAuth strategies
 */
export const initializePassport = (): void => {
  // Serialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { _id: string })._id);
  });

  // Deserialize user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
          callbackURL: config.oauth.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const oauthProfile: OAuthProfile = {
              id: profile.id,
              email: profile.emails?.[0]?.value || '',
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              avatar: profile.photos?.[0]?.value,
              provider: 'google',
            };
            done(null, oauthProfile);
          } catch (error) {
            logger.error('Google OAuth error:', error);
            done(error as Error, undefined);
          }
        }
      )
    );
    logger.info('Google OAuth strategy initialized');
  }

  // GitHub OAuth Strategy
  if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.oauth.github.clientId,
          clientSecret: config.oauth.github.clientSecret,
          callbackURL: config.oauth.github.callbackUrl,
          scope: ['user:email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: {
            id: string;
            emails?: { value: string }[];
            displayName?: string;
            username?: string;
            photos?: { value: string }[];
          },
          done: (error: Error | null, user?: OAuthProfile) => void
        ) => {
          try {
            const nameParts = (profile.displayName || profile.username || '').split(' ');
            const oauthProfile: OAuthProfile = {
              id: profile.id,
              email: profile.emails?.[0]?.value || '',
              firstName: nameParts[0] || 'GitHub',
              lastName: nameParts.slice(1).join(' ') || 'User',
              avatar: profile.photos?.[0]?.value,
              provider: 'github',
            };
            done(null, oauthProfile);
          } catch (error) {
            logger.error('GitHub OAuth error:', error);
            done(error as Error, undefined);
          }
        }
      )
    );
    logger.info('GitHub OAuth strategy initialized');
  }

  // Facebook OAuth Strategy
  if (config.oauth.facebook.clientId && config.oauth.facebook.clientSecret) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: config.oauth.facebook.clientId,
          clientSecret: config.oauth.facebook.clientSecret,
          callbackURL: config.oauth.facebook.callbackUrl,
          profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const oauthProfile: OAuthProfile = {
              id: profile.id,
              email: profile.emails?.[0]?.value || '',
              firstName: profile.name?.givenName || 'Facebook',
              lastName: profile.name?.familyName || 'User',
              avatar: profile.photos?.[0]?.value,
              provider: 'facebook',
            };
            done(null, oauthProfile);
          } catch (error) {
            logger.error('Facebook OAuth error:', error);
            done(error as Error, undefined);
          }
        }
      )
    );
    logger.info('Facebook OAuth strategy initialized');
  }
};

/**
 * Check if OAuth provider is configured
 */
export const isOAuthProviderConfigured = (provider: OAuthProvider): boolean => {
  switch (provider) {
    case 'google':
      return !!(config.oauth.google.clientId && config.oauth.google.clientSecret);
    case 'github':
      return !!(config.oauth.github.clientId && config.oauth.github.clientSecret);
    case 'facebook':
      return !!(config.oauth.facebook.clientId && config.oauth.facebook.clientSecret);
    default:
      return false;
  }
};

export { passport };
