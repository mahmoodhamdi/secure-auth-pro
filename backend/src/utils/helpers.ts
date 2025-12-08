import { Types } from 'mongoose';
import UAParser from 'ua-parser-js';

/**
 * Check if a string is a valid MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

/**
 * Parse user agent string to extract device info
 */
export const parseUserAgent = (
  userAgent?: string
): { device?: string; browser?: string; os?: string } => {
  if (!userAgent) {
    return {};
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    device: result.device.type || 'desktop',
    browser: result.browser.name
      ? `${result.browser.name} ${result.browser.version || ''}`
      : undefined,
    os: result.os.name ? `${result.os.name} ${result.os.version || ''}` : undefined,
  };
};

/**
 * Get client IP address from request
 */
export const getClientIp = (req: {
  ip?: string;
  headers: { 'x-forwarded-for'?: string; 'x-real-ip'?: string };
}): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.headers['x-real-ip'] || req.ip || 'unknown';
};

/**
 * Calculate token expiry date from string (e.g., '15m', '7d')
 */
export const calculateExpiry = (expiryString: string): Date => {
  const match = expiryString.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid expiry format. Use format like "15m", "1h", "7d"');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const now = new Date();

  switch (unit) {
    case 's':
      return new Date(now.getTime() + value * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
};

/**
 * Mask email for display (e.g., j***@example.com)
 */
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }

  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 3))}${local[local.length - 1]}@${domain}`;
};

/**
 * Sleep utility for async operations
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Omit sensitive fields from object
 */
export const omitFields = <T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): Partial<T> => {
  const result = { ...obj };
  fields.forEach((field) => delete result[field]);
  return result;
};

/**
 * Generate pagination metadata
 */
export const getPaginationMeta = (
  total: number,
  page: number,
  limit: number
): { page: number; limit: number; total: number; totalPages: number } => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
