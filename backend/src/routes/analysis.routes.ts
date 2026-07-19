import { Router } from 'express';
import { getAnalysis, runAnalysis } from '../controllers/analysis.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, runAnalysis);
router.get('/:owner/:repo', requireAuth, getAnalysis);

export default router;
