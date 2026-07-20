import { Router } from 'express';
import {
  authStatus,
  getMe,
  githubAppInstallCallback,
  githubOAuthCallback,
  logout,
  logoutAll,
  startGithubAppInstall,
  startGithubOAuth,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const authStartLimit = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'auth-start' });
const authMeLimit = rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'auth-me' });

router.get('/status', authStatus);
router.get('/github', authStartLimit, startGithubOAuth);
router.get('/github/callback', authStartLimit, githubOAuthCallback);
router.get('/github/app/install', requireAuth, authStartLimit, startGithubAppInstall);
router.get('/github/app/callback', requireAuth, authStartLimit, githubAppInstallCallback);
router.get('/me', authMeLimit, getMe);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);

export default router;
