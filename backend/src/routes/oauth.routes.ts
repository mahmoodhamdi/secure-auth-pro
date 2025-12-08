import { Router } from 'express';
import {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
  facebookAuth,
  facebookCallback,
  getOAuthStatus,
  unlinkOAuthProvider,
} from '../controllers/oauth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', ...googleCallback);

// GitHub OAuth
router.get('/github', githubAuth);
router.get('/github/callback', ...githubCallback);

// Facebook OAuth
router.get('/facebook', facebookAuth);
router.get('/facebook/callback', ...facebookCallback);

// OAuth management (protected routes)
router.get('/oauth/status', authenticate, getOAuthStatus);
router.delete('/oauth/:provider', authenticate, unlinkOAuthProvider);

export default router;
