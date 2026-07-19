import { Router } from 'express';
import { getRepository, listRepos } from '../controllers/repos.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listRepos);
router.get('/:owner/:repo', requireAuth, getRepository);

export default router;
