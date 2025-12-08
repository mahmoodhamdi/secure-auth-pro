import { Types, Document } from 'mongoose';
import { UserRole } from './auth.types.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorSecret?: string;
  isTwoFactorEnabled: boolean;
  backupCodes?: string[];
  oauthProviders: {
    google?: { id: string; email: string };
    github?: { id: string; email: string };
    facebook?: { id: string; email: string };
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): SafeUserObject;
}

export interface SafeUserObject {
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

export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenId: Types.ObjectId;
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
