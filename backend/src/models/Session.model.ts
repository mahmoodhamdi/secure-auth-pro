import mongoose, { Schema } from 'mongoose';
import { ISession } from '../types/user.types.js';

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenId: {
      type: Schema.Types.ObjectId,
      ref: 'RefreshToken',
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    device: {
      type: String,
    },
    browser: {
      type: String,
    },
    os: {
      type: String,
    },
    location: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshTokenId: 1 });

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = async function (userId: string) {
  return this.find({ userId, isActive: true })
    .sort({ lastActivity: -1 })
    .select('-__v');
};

// Static method to deactivate session
sessionSchema.statics.deactivateSession = async function (sessionId: string, userId: string) {
  return this.updateOne(
    { _id: sessionId, userId },
    { $set: { isActive: false } }
  );
};

// Static method to deactivate all user sessions
sessionSchema.statics.deactivateAllUserSessions = async function (
  userId: string,
  exceptSessionId?: string
) {
  const query: Record<string, unknown> = { userId, isActive: true };
  if (exceptSessionId) {
    query._id = { $ne: exceptSessionId };
  }
  return this.updateMany(query, { $set: { isActive: false } });
};

// Static method to update last activity
sessionSchema.statics.updateActivity = async function (sessionId: string) {
  return this.updateOne({ _id: sessionId }, { $set: { lastActivity: new Date() } });
};

// Static method to deactivate session by refresh token
sessionSchema.statics.deactivateByRefreshToken = async function (refreshTokenId: string) {
  return this.updateOne({ refreshTokenId }, { $set: { isActive: false } });
};

export const Session = mongoose.model<ISession>('Session', sessionSchema);
