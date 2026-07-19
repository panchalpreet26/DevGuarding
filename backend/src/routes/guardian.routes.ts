import { Router } from 'express';
import { compareGuardian, getGuardianReport } from '../controllers/guardian.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/compare', requireAuth, compareGuardian);
router.get('/:owner/:repo', requireAuth, getGuardianReport);

export default router;
