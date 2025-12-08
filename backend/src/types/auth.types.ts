import { Types } from 'mongoose';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export type UserRole = 'user' | 'admin';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: SafeUser;
  accessToken: string;
}

export interface TwoFactorResponse {
  requires2FA: true;
  tempToken: string;
}

export interface SafeUser {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: OAuthProvider;
}

export type OAuthProvider = 'google' | 'github' | 'facebook';

export interface SessionInfo {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userAgent: string;
  ipAddress: string;
  device?: string;
  browser?: string;
  os?: string;
  location?: string;
  isActive: boolean;
  lastActivity: Date;
  createdAt: Date;
}
