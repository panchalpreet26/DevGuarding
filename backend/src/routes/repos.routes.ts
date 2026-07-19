import { Router } from 'express';
import {
  getRepository,
  listAvailableRepos,
  listRepos,
  saveRepoSelection,
} from '../controllers/repos.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listRepos);
router.get('/available', requireAuth, listAvailableRepos);
router.put('/selection', requireAuth, saveRepoSelection);
router.get('/:owner/:repo', requireAuth, getRepository);

export default router;
