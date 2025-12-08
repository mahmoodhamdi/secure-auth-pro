import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import {
  enable2FA,
  verify2FASetup,
  verify2FALogin,
  disable2FA,
  verifyBackupCode,
} from '../controllers/twoFactor.controller.js';
import {
  authenticate,
  loadUser,
  validateBody,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  twoFactorLimiter,
  registrationLimiter,
} from '../middleware/index.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verify2FASchema,
  verify2FASetupSchema,
  backupCodeSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', registrationLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
router.post('/verify-email', validateBody(verifyEmailSchema), verifyEmail);

// 2FA login routes (partially authenticated)
router.post('/2fa/verify', twoFactorLimiter, validateBody(verify2FASchema), verify2FALogin);
router.post('/2fa/backup', twoFactorLimiter, validateBody(backupCodeSchema), verifyBackupCode);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, loadUser, getCurrentUser);
router.post('/resend-verification', authenticate, emailVerificationLimiter, resendVerificationEmail);

// 2FA management routes (protected)
router.post('/2fa/enable', authenticate, loadUser, enable2FA);
router.post('/2fa/verify-setup', authenticate, loadUser, validateBody(verify2FASetupSchema), verify2FASetup);
router.post('/2fa/disable', authenticate, loadUser, validateBody(verify2FASetupSchema), disable2FA);

export default router;
