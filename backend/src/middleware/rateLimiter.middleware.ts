import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { ApiResponse } from '../types/express.types.js';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many requests, please try again later',
    },
  } as ApiResponse,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many login attempts, please try again after 15 minutes',
    },
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    // Use IP + email as key for login attempts
    const email = req.body?.email || '';
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    return `${ip}-${email}`;
  },
});

/**
 * Very strict rate limiter for password reset
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many password reset attempts, please try again after 1 hour',
    },
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    return `pwd-reset-${ip}-${email}`;
  },
});

/**
 * Rate limiter for email verification resend
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many verification email requests, please try again later',
    },
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for 2FA attempts
 */
export const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many 2FA attempts, please try again after 15 minutes',
    },
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for registration
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    success: false,
    error: {
      code: 'AUTH_008',
      message: 'Too many registration attempts, please try again later',
    },
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});
