import { Router } from 'express';
import {
  authStatus,
  getMe,
  githubOAuthCallback,
  logout,
  startGithubOAuth,
} from '../controllers/auth.controller.js';

const router = Router();

router.get('/status', authStatus);
router.get('/github', startGithubOAuth);
router.get('/github/callback', githubOAuthCallback);
router.get('/me', getMe);
router.post('/logout', logout);

export default router;
