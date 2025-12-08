import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/user.controller.js';
import {
  getSessions,
  revokeSession,
  revokeAllSessions,
} from '../controllers/session.controller.js';
import {
  authenticate,
  loadUser,
  validateBody,
  validateParams,
} from '../middleware/index.js';
import {
  updateProfileSchema,
  sessionIdSchema,
} from '../validators/user.validator.js';
import { changePasswordSchema } from '../validators/auth.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate, loadUser);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validateBody(updateProfileSchema), updateProfile);
router.put('/password', validateBody(changePasswordSchema), changePassword);
router.delete('/account', deleteAccount);

// Session routes
router.get('/sessions', getSessions);
router.delete('/sessions/:id', validateParams(sessionIdSchema), revokeSession);
router.delete('/sessions', revokeAllSessions);

export default router;
