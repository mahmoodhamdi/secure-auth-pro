import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from './env.js';
import { TokenPayload, RefreshTokenPayload } from '../types/auth.types.js';
import { IUser } from '../types/user.types.js';
import { InvalidTokenError, TokenExpiredError } from '../utils/errors.js';

/**
 * Generate access token
 */
export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry,
    issuer: 'secureauth-pro',
    subject: user._id.toString(),
  };

  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string, tokenId: string): string => {
  const payload: RefreshTokenPayload = {
    userId,
    tokenId,
  };

  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry,
    issuer: 'secureauth-pro',
    subject: userId,
  };

  return jwt.sign(payload, config.jwt.refreshSecret, options);
};

/**
 * Generate temporary token for 2FA
 */
export const generateTempToken = (userId: string): string => {
  const payload = { userId, type: '2fa' };

  const options: SignOptions = {
    expiresIn: '5m', // 5 minutes to complete 2FA
    issuer: 'secureauth-pro',
  };

  return jwt.sign(payload, config.jwt.secret, options);
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'secureauth-pro',
    }) as JwtPayload & TokenPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'secureauth-pro',
    }) as JwtPayload & RefreshTokenPayload;

    return {
      userId: decoded.userId,
      tokenId: decoded.tokenId,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
};

/**
 * Verify temporary 2FA token
 */
export const verifyTempToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'secureauth-pro',
    }) as JwtPayload & { userId: string; type: string };

    if (decoded.type !== '2fa') {
      throw new InvalidTokenError();
    }

    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('2FA session expired');
    }
    throw new InvalidTokenError();
  }
};

/**
 * Decode token without verification (for getting expiry time)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};

/**
 * Get token expiry time in seconds
 */
export const getTokenExpirySeconds = (token: string): number => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) {
    return 0;
  }
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
};
