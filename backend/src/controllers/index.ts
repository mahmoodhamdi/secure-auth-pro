export {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
} from './auth.controller.js';

export {
  enable2FA,
  verify2FASetup,
  verify2FALogin,
  verifyBackupCode,
  disable2FA,
  regenerateBackupCodes,
} from './twoFactor.controller.js';

export {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from './user.controller.js';

export {
  getSessions,
  revokeSession,
  revokeAllSessions,
} from './session.controller.js';
