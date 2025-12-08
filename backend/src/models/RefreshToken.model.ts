import mongoose, { Schema } from 'mongoose';
import { IRefreshToken } from '../types/user.types.js';

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacedByToken: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });

// TTL index to automatically remove expired tokens after 30 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = async function (token: string) {
  return this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to revoke all user tokens
refreshTokenSchema.statics.revokeAllUserTokens = async function (userId: string) {
  return this.updateMany({ userId, isRevoked: false }, { $set: { isRevoked: true } });
};

// Static method to revoke specific token
refreshTokenSchema.statics.revokeToken = async function (token: string) {
  return this.updateOne({ token }, { $set: { isRevoked: true } });
};

// Instance method to revoke and replace
refreshTokenSchema.methods.revokeAndReplace = async function (newToken: string) {
  this.isRevoked = true;
  this.replacedByToken = newToken;
  return this.save();
};

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
